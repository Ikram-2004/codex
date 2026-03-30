import requests
import re
import zipfile
import io
import os
import tempfile
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from website_scanner import scan_website

def scan_app(url_or_path):
    # ── Route: APK file path or URL? ──────────────────────────
    if url_or_path.endswith(".apk") or os.path.isfile(url_or_path):
        return scan_apk(url_or_path)
    else:
        return scan_webapp(url_or_path)


# ═══════════════════════════════════════════════════════════════
# WEB APP SCANNER
# Scoring strategy: website_scanner result is the anchor score.
# App-layer checks apply small adjustments on top so the final
# stays within ~15 pts of website_scanner — realistic & consistent.
# ═══════════════════════════════════════════════════════════════
def scan_webapp(url):
    findings = []

    try:
        ws_result = scan_website(url)
        ws_score = ws_result.get("score", 50)
        for f in ws_result.get("findings", []):
            if f.get("surface") == "Website":
                f["surface"] = "Application"
            findings.append(f)
    except Exception:
        ws_score = 50

    if not url.startswith("http"):
        url = "https://" + url

    parsed = urlparse(url)
    domain = parsed.netloc or parsed.path.split("/")[0]
    if domain.startswith("www."):
        bare_domain = domain[4:]
    else:
        bare_domain = domain
    base_url = f"https://{domain}"

    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    })

    # ── Adjustment system ─────────────────────────────────────
    # ws_score is the anchor. Each app-layer check nudges it:
    #   good finding  → +3 to +5 pts
    #   bad finding   → -5 to -8 pts
    # Total adjustment is capped at ±15 so we stay realistic.
    adjustment = 0

    # ── Fetch homepage ─────────────────────────────────────────
    homepage_html = ""
    response = None
    try:
        for try_url in [base_url, f"https://www.{bare_domain}"]:
            try:
                response = session.get(try_url, timeout=12, allow_redirects=True)
                if response.status_code < 400:
                    homepage_html = response.text
                    break
            except Exception:
                continue

        if not homepage_html:
            raise Exception("Could not reach app")

    except Exception:
        findings.append({
            "severity": "INFO", "surface": "Application",
            "title": "Application blocked automated scanning (bot protection active)",
            "fix": "WAF/bot protection is blocking scanners — this is a good security sign."
        })
        # WAF is a positive signal — keep score near ws_score
        final = max(0, min(100, ws_score + 3))
        return {"score": final, "findings": findings}

    soup = BeautifulSoup(homepage_html, "html.parser")

    # ─────────────────────────────────────────────────────────
    # CHECK 1: Admin panels exposed without authentication (-8)
    # ─────────────────────────────────────────────────────────
    admin_paths = [
        "/admin", "/admin/dashboard", "/wp-admin",
        "/administrator", "/dashboard", "/phpmyadmin",
        "/manager", "/cpanel", "/wp-login.php", "/admin/login",
    ]
    admin_exposed = False
    for path in admin_paths:
        try:
            r = session.get(f"{base_url}{path}", timeout=5, allow_redirects=True)
            if r.status_code == 200:
                h = r.text.lower()
                has_login = 'type="password"' in h or "type='password'" in h or "forgot password" in h
                is_exposed = not has_login and (
                    "dashboard" in h or "admin panel" in h or
                    "control panel" in h or "logged in as" in h
                )
                if is_exposed:
                    admin_exposed = True
                    adjustment -= 8
                    findings.append({
                        "severity": "CRITICAL", "surface": "Application",
                        "title": f"Admin panel accessible without authentication: {path}",
                        "fix": f"Add authentication to {path} immediately."
                    })
                    break
        except Exception:
            pass

    if not admin_exposed:
        adjustment += 3
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No unauthenticated admin panels found",
            "fix": ""
        })

    # ─────────────────────────────────────────────────────────
    # CHECK 2: Directory listing (-5)
    # ─────────────────────────────────────────────────────────
    dir_exposed = False
    for path in ["/uploads/", "/files/", "/static/", "/assets/", "/backup/"]:
        try:
            r = session.get(f"{base_url}{path}", timeout=4, allow_redirects=False)
            if r.status_code == 200:
                h = r.text.lower()
                if "index of /" in h or ("parent directory" in h and "<a href" in h):
                    dir_exposed = True
                    adjustment -= 5
                    findings.append({
                        "severity": "HIGH", "surface": "Application",
                        "title": f"Directory listing enabled at {path}",
                        "fix": "Disable: nginx: autoindex off;  Apache: Options -Indexes"
                    })
                    break
        except Exception:
            pass

    if not dir_exposed:
        adjustment += 2
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "Directory listing is disabled",
            "fix": ""
        })

    # ─────────────────────────────────────────────────────────
    # CHECK 3: Hardcoded secrets in JS (-7 each, max -14)
    # ─────────────────────────────────────────────────────────
    secret_patterns = [
        (r'AKIA[0-9A-Z]{16}',                           "AWS Access Key ID"),
        (r'sk_live_[0-9a-zA-Z]{24,}',                   "Stripe Live Key"),
        (r'AIza[0-9A-Za-z\-_]{35}',                     "Google API Key"),
        (r'ghp_[0-9a-zA-Z]{36}',                        "GitHub Token"),
        (r'xox[baprs]-[0-9a-zA-Z\-]{10,48}',           "Slack Token"),
        (r'-----BEGIN (RSA |EC )?PRIVATE KEY-----',     "Private Key"),
        (r'SG\.[a-zA-Z0-9\-_]{22}\.[a-zA-Z0-9\-_]{43}',"SendGrid API Key"),
        (r'sq0atp-[0-9A-Za-z\-_]{22}',                  "Square Access Token"),
    ]
    cdn_domains = [
        "googleapis.com", "cloudflare.com", "jsdelivr.net",
        "unpkg.com", "jquery.com", "bootstrapcdn.com",
        "cdnjs.com", "fontawesome.com", "gstatic.com",
    ]

    secrets_found = []
    for tag in soup.find_all("script"):
        content = tag.string or ""
        if len(content.strip()) < 30:
            continue
        for pattern, name in secret_patterns:
            if re.search(pattern, content):
                secrets_found.append(f"{name} in inline script")

    for tag in soup.find_all("script", src=True):
        js_src = tag.get("src", "")
        try:
            js_url = js_src if js_src.startswith("http") else urljoin(base_url, js_src)
            if any(cdn in js_url for cdn in cdn_domains):
                continue
            js_content = session.get(js_url, timeout=6).text
            if len(js_content) > 800000:
                continue
            for pattern, name in secret_patterns:
                if re.search(pattern, js_content):
                    fname_short = js_url.split("/")[-1].split("?")[0]
                    secrets_found.append(f"{name} in {fname_short}")
        except Exception:
            pass

    seen = set()
    for secret in secrets_found:
        if secret not in seen:
            seen.add(secret)
            adjustment = max(adjustment - 7, adjustment - 14)  # cap at -14 total from secrets
            findings.append({
                "severity": "CRITICAL", "surface": "Application",
                "title": f"Secret credential in public JS: {secret}",
                "fix": "Remove immediately. Rotate the key. Use server-side env vars."
            })

    if not secrets_found:
        adjustment += 3
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No hardcoded secrets found in JavaScript",
            "fix": ""
        })

    # ─────────────────────────────────────────────────────────
    # CHECK 4: Forms over HTTP (-5)
    # ─────────────────────────────────────────────────────────
    forms = soup.find_all("form")
    insecure_forms = [f for f in forms if (f.get("action") or "").startswith("http://")]
    if insecure_forms:
        adjustment -= 5
        findings.append({
            "severity": "HIGH", "surface": "Application",
            "title": f"{len(insecure_forms)} form(s) submit data over HTTP",
            "fix": "Change form action URLs from http:// to https://"
        })
    elif forms:
        adjustment += 2
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": f"{len(forms)} form(s) found — all submit over HTTPS",
            "fix": ""
        })

    # ─────────────────────────────────────────────────────────
    # CHECK 5: Reflected XSS probe (-8)
    # ─────────────────────────────────────────────────────────
    xss_marker = "SECPULSE9823"
    xss_probe  = f"<{xss_marker}>"
    xss_found  = False
    try:
        get_forms = [f for f in soup.find_all("form") if f.get("method", "get").lower() == "get"]
        for form in get_forms[:2]:
            action   = form.get("action") or base_url
            form_url = action if action.startswith("http") else urljoin(base_url, action)
            inputs   = form.find_all("input", {"type": lambda t: t not in ["hidden", "submit", "button"]})
            params   = {i.get("name", "q"): xss_probe for i in inputs[:3] if i.get("name")}
            if params:
                r = session.get(form_url, params=params, timeout=5)
                if xss_marker in r.text and xss_probe in r.text:
                    xss_found = True
                    adjustment -= 8
                    findings.append({
                        "severity": "CRITICAL", "surface": "Application",
                        "title": "Reflected XSS vulnerability detected",
                        "fix": "Escape all user input before rendering. Use a templating engine."
                    })
                    break
    except Exception:
        pass

    # ─────────────────────────────────────────────────────────
    # CHECK 6: SQL injection probe (-8)
    # ─────────────────────────────────────────────────────────
    sql_errors = [
        "you have an error in your sql syntax", "warning: mysql",
        "unclosed quotation mark", "sqlstate", "pg_query():",
        "ora-01756", "microsoft ole db provider for sql server",
    ]
    sqli_found = False
    try:
        r = session.get(f"{base_url}?id=1'", timeout=5)
        for err in sql_errors:
            if err in r.text.lower():
                sqli_found = True
                adjustment -= 8
                findings.append({
                    "severity": "CRITICAL", "surface": "Application",
                    "title": "SQL injection vulnerability indicator detected",
                    "fix": "Use parameterized queries. Never concatenate user input into SQL."
                })
                break
    except Exception:
        pass

    if not xss_found and not sqli_found:
        adjustment += 3
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No XSS or SQL injection indicators found",
            "fix": ""
        })

    # ─────────────────────────────────────────────────────────
    # CHECK 7: Error page information leak (-4)
    # ─────────────────────────────────────────────────────────
    tech_leaks = [
        ("traceback (most recent call last)", "Python stack trace exposed"),
        ("fatal error:",                       "PHP fatal error exposed"),
        ("mysql_fetch",                        "MySQL error exposed"),
        ("sqlstate[",                          "Database state exposed"),
        ("django.core.exceptions",             "Django internals exposed"),
        ("webpack://",                         "Webpack source map exposed"),
    ]
    try:
        r = session.get(f"{base_url}/sp_nonexistent_9823", timeout=5)
        for kw, desc in tech_leaks:
            if kw in r.text.lower():
                adjustment -= 4
                findings.append({
                    "severity": "MEDIUM", "surface": "Application",
                    "title": f"Error page leaks technical detail: {desc}",
                    "fix": "Disable debug mode in production. Add a custom 404/500 page."
                })
                break
    except Exception:
        pass

    # ─────────────────────────────────────────────────────────
    # CHECK 8: Mixed content on HTTPS page (-4)
    # ─────────────────────────────────────────────────────────
    if base_url.startswith("https"):
        http_matches = re.findall(
            r'(?:src|href|action)\s*=\s*["\']http://[^"\']+["\']',
            homepage_html.lower()
        )
        if http_matches:
            adjustment -= 4
            findings.append({
                "severity": "MEDIUM", "surface": "Application",
                "title": f"Mixed content: {len(http_matches)} HTTP resource(s) on HTTPS page",
                "fix": "Change all resource URLs to https:// or use // prefix"
            })
        else:
            adjustment += 2
            findings.append({
                "severity": "PASS", "surface": "Application",
                "title": "No mixed HTTP/HTTPS content detected",
                "fix": ""
            })

    # ─────────────────────────────────────────────────────────
    # CHECK 9: Exposed API docs (-4)
    # ─────────────────────────────────────────────────────────
    api_exposed = False
    for path in ["/api/docs", "/swagger", "/swagger-ui.html",
                 "/api-docs", "/openapi.json", "/graphql"]:
        try:
            r = session.get(f"{base_url}{path}", timeout=4, allow_redirects=False)
            if r.status_code == 200:
                ct   = r.headers.get("content-type", "").lower()
                body = r.text.lower()
                if "application/json" in ct or "swagger" in body or "openapi" in body or "graphql" in body:
                    api_exposed = True
                    adjustment -= 4
                    findings.append({
                        "severity": "MEDIUM", "surface": "Application",
                        "title": f"API documentation publicly accessible: {path}",
                        "fix": "Restrict API docs to authenticated users in production."
                    })
                    break
        except Exception:
            pass

    if not api_exposed:
        adjustment += 2
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No publicly exposed API documentation found",
            "fix": ""
        })

    # ─────────────────────────────────────────────────────────
    # CHECK 10: robots.txt sensitive paths (-3) / security.txt (+2)
    # ─────────────────────────────────────────────────────────
    try:
        r = session.get(f"{base_url}/robots.txt", timeout=5)
        if r.status_code == 200 and "disallow" in r.text.lower():
            risky_kw  = ["admin", "backup", "config", "database", "secret", "private", "password"]
            disallowed = re.findall(r'Disallow:\s*(.+)', r.text, re.IGNORECASE)
            risky = [p.strip() for p in disallowed if any(k in p.lower() for k in risky_kw)]
            if risky:
                adjustment -= 3
                findings.append({
                    "severity": "LOW", "surface": "Application",
                    "title": f"robots.txt reveals {len(risky)} sensitive path(s)",
                    "fix": f"Paths: {', '.join(risky[:3])}. Don't list secret paths in a public file."
                })
    except Exception:
        pass

    try:
        r = session.get(f"{base_url}/.well-known/security.txt", timeout=4)
        if r.status_code == 200 and "contact" in r.text.lower():
            adjustment += 2
            findings.append({
                "severity": "PASS", "surface": "Application",
                "title": "security.txt present — responsible disclosure enabled",
                "fix": ""
            })
        else:
            findings.append({
                "severity": "INFO", "surface": "Application",
                "title": "No security.txt found",
                "fix": "Add /.well-known/security.txt with a security contact email."
            })
    except Exception:
        pass

    # ─────────────────────────────────────────────────────────
    # CHECK 11: Subdomain attack surface (info only, -3 if huge)
    # ─────────────────────────────────────────────────────────
    try:
        r = requests.get(f"https://crt.sh/?q=%25.{domain}&output=json", timeout=10)
        if r.status_code == 200:
            subdomains = set()
            for entry in r.json():
                for sub in entry.get("name_value", "").split("\n"):
                    sub = sub.strip().lstrip("*.")
                    if domain in sub and sub != domain and not sub.startswith("www."):
                        subdomains.add(sub)
            if len(subdomains) > 20:
                adjustment -= 3
                findings.append({
                    "severity": "MEDIUM", "surface": "Application",
                    "title": f"Large attack surface: {len(subdomains)} subdomains found",
                    "fix": f"Sample: {', '.join(list(subdomains)[:4])}. Decommission unused ones."
                })
            elif subdomains:
                findings.append({
                    "severity": "INFO", "surface": "Application",
                    "title": f"{len(subdomains)} subdomain(s) found via certificate logs",
                    "fix": f"Known: {', '.join(list(subdomains)[:5])}. Ensure each is secured."
                })
    except Exception:
        pass

    # ── Final score: ws_score anchored, capped at ±15 pts ────
    adjustment = max(-15, min(15, adjustment))
    final_score = max(0, min(100, ws_score + adjustment))
    return {"score": final_score, "findings": findings}


# ═══════════════════════════════════════════════════════════════
# APK SCANNER
# Scoring mirrors website_scanner: earn points for good practices,
# deduct for bad ones. Realistic scores, not "start at 100".
# ─────────────────────────────────────────────────────────────
# manifest_score : max 30  (permissions, flags, sdk, components)
# network_score  : max 25  (cleartext, pinning, config)
# code_score     : max 25  (obfuscation, secrets, root, logs)
# binary_score   : max 20  (cert, dex size, native libs, webview)
# Total          : 100
# ═══════════════════════════════════════════════════════════════
def scan_apk(apk_path):
    findings = []

    manifest_score = 30
    network_score  = 25
    code_score     = 25
    binary_score   = 20

    # ── Load APK ──────────────────────────────────────────────
    try:
        if apk_path.startswith("http"):
            r = requests.get(apk_path, timeout=30)
            apk_bytes = io.BytesIO(r.content)
        else:
            apk_bytes = open(apk_path, "rb")
        zf = zipfile.ZipFile(apk_bytes)
    except Exception as e:
        findings.append({
            "severity": "HIGH", "surface": "Application",
            "title": f"Could not read APK file: {str(e)[:80]}",
            "fix": "Ensure the file is a valid, non-corrupted APK."
        })
        return {"score": 0, "findings": findings}

    file_list = zf.namelist()

    # ─────────────────────────────────────────────────────────
    # CATEGORY 1: Manifest security (max 30)
    # ─────────────────────────────────────────────────────────
    dangerous_permissions = {
        "READ_CONTACTS":          ("HIGH",     6, "Read all device contacts"),
        "WRITE_CONTACTS":         ("HIGH",     6, "Modify all contacts"),
        "ACCESS_FINE_LOCATION":   ("HIGH",     6, "Precise GPS location"),
        "ACCESS_COARSE_LOCATION": ("MEDIUM",   3, "Approximate location"),
        "RECORD_AUDIO":           ("HIGH",     6, "Access microphone"),
        "CAMERA":                 ("MEDIUM",   3, "Access camera"),
        "READ_SMS":               ("CRITICAL", 8, "Read all SMS messages"),
        "SEND_SMS":               ("CRITICAL", 8, "Send SMS (financial risk)"),
        "RECEIVE_SMS":            ("HIGH",     6, "Intercept incoming SMS"),
        "READ_CALL_LOG":          ("HIGH",     6, "Access call history"),
        "PROCESS_OUTGOING_CALLS": ("HIGH",     6, "Intercept phone calls"),
        "READ_EXTERNAL_STORAGE":  ("MEDIUM",   3, "Read files from storage"),
        "WRITE_EXTERNAL_STORAGE": ("MEDIUM",   3, "Write files to storage"),
        "GET_ACCOUNTS":           ("MEDIUM",   3, "List device accounts"),
        "USE_CREDENTIALS":        ("HIGH",     6, "Access account credentials"),
        "BLUETOOTH_ADMIN":        ("MEDIUM",   3, "Admin control of Bluetooth"),
        "CHANGE_WIFI_STATE":      ("LOW",      2, "Change Wi-Fi settings"),
        "NFC":                    ("LOW",      2, "Use NFC chip"),
        "SYSTEM_ALERT_WINDOW":    ("HIGH",     6, "Draw over other apps"),
        "BIND_DEVICE_ADMIN":      ("CRITICAL", 8, "Device administrator rights"),
    }

    manifest_text = ""
    try:
        manifest_raw = zf.read("AndroidManifest.xml")
        # Strip null bytes — decodes binary AXML string pool to readable text
        manifest_text = manifest_raw.replace(b'\x00', b'').decode("utf-8", errors="ignore")

        # ── Permissions ──────────────────────────────────────
        found_dangerous = []
        total_perm_pts  = 0
        for perm, (sev, pts, desc) in dangerous_permissions.items():
            if perm in manifest_text:
                found_dangerous.append(perm)
                total_perm_pts += pts
                findings.append({
                    "severity": sev, "surface": "Application",
                    "title": f"Dangerous permission: android.permission.{perm}",
                    "fix": f"Allows: {desc}. Remove if not needed for core functionality."
                })
        # Cap permission deduction at 18 pts so flag checks still matter
        manifest_score = max(0, manifest_score - min(total_perm_pts, 18))

        if not found_dangerous:
            findings.append({
                "severity": "PASS", "surface": "Application",
                "title": "No dangerous permissions declared in AndroidManifest",
                "fix": ""
            })

        # ── Debuggable flag ──────────────────────────────────
        if "debuggable" in manifest_text and "true" in manifest_text[
                manifest_text.lower().find("debuggable"):
                manifest_text.lower().find("debuggable") + 30].lower():
            manifest_score = max(0, manifest_score - 8)
            findings.append({
                "severity": "CRITICAL", "surface": "Application",
                "title": "App is debuggable (android:debuggable=true)",
                "fix": "Set android:debuggable='false'. Debuggable APKs allow "
                       "runtime debugging and trivial reverse engineering."
            })
        else:
            findings.append({
                "severity": "PASS", "surface": "Application",
                "title": "App is not debuggable",
                "fix": ""
            })

        # ── allowBackup ──────────────────────────────────────
        if 'allowbackup="true"' in manifest_text.lower() or \
           "allowBackup" not in manifest_text:
            manifest_score = max(0, manifest_score - 4)
            findings.append({
                "severity": "MEDIUM", "surface": "Application",
                "title": "App data backup enabled (android:allowBackup=true or unset)",
                "fix": "Set android:allowBackup='false' to prevent "
                       "data extraction via `adb backup`."
            })
        else:
            findings.append({
                "severity": "PASS", "surface": "Application",
                "title": "App data backup is disabled",
                "fix": ""
            })

        # ── Exported components ──────────────────────────────
        exported_count = manifest_text.lower().count('exported="true"')
        if exported_count > 5:
            manifest_score = max(0, manifest_score - 6)
            findings.append({
                "severity": "HIGH", "surface": "Application",
                "title": f"{exported_count} exported components — large attack surface",
                "fix": "Only export components that external apps genuinely need. "
                       "Unexported components should use exported=false explicitly."
            })
        elif exported_count > 2:
            manifest_score = max(0, manifest_score - 3)
            findings.append({
                "severity": "MEDIUM", "surface": "Application",
                "title": f"{exported_count} exported components in manifest",
                "fix": "Ensure each exported component validates caller identity."
            })

        # ── targetSdkVersion ────────────────────────────────
        sdk_match = re.search(r'targetSdkVersion[^\d]*(\d+)', manifest_text, re.IGNORECASE)
        if sdk_match:
            tsdk = int(sdk_match.group(1))
            if tsdk >= 31:
                findings.append({
                    "severity": "PASS", "surface": "Application",
                    "title": f"Targets modern Android SDK (API {tsdk})",
                    "fix": ""
                })
            elif tsdk >= 28:
                manifest_score = max(0, manifest_score - 2)
                findings.append({
                    "severity": "LOW", "surface": "Application",
                    "title": f"Targets Android SDK {tsdk} — update to 31+",
                    "fix": "Higher targetSdkVersion enforces stricter security defaults."
                })
            else:
                manifest_score = max(0, manifest_score - 5)
                findings.append({
                    "severity": "MEDIUM", "surface": "Application",
                    "title": f"Targets outdated Android SDK {tsdk}",
                    "fix": "Update targetSdkVersion to 33+ for modern security protections."
                })

    except KeyError:
        manifest_score = max(0, manifest_score - 15)
        findings.append({
            "severity": "HIGH", "surface": "Application",
            "title": "AndroidManifest.xml not found in APK",
            "fix": "This may not be a valid Android APK."
        })

    # ─────────────────────────────────────────────────────────
    # CATEGORY 2: Network security (max 25)
    # ─────────────────────────────────────────────────────────

    # ── network_security_config.xml ──────────────────────────
    net_cfg_files = [f for f in file_list if "network_security_config" in f.lower()]
    if net_cfg_files:
        try:
            cfg_raw   = zf.read(net_cfg_files[0])
            cfg_clean = cfg_raw.replace(b'\x00', b'').decode("utf-8", errors="ignore")

            if "cleartexttrafficpermitted" in cfg_clean.lower() and \
               "true" in cfg_clean.lower():
                network_score = max(0, network_score - 10)
                findings.append({
                    "severity": "HIGH", "surface": "Application",
                    "title": "App allows cleartext HTTP traffic (cleartextTrafficPermitted=true)",
                    "fix": "Set cleartextTrafficPermitted='false' to enforce HTTPS."
                })
            else:
                findings.append({
                    "severity": "PASS", "surface": "Application",
                    "title": "Network security config blocks cleartext HTTP traffic",
                    "fix": ""
                })

            if "trust-anchors" in cfg_clean.lower() and "user" in cfg_clean.lower():
                network_score = max(0, network_score - 8)
                findings.append({
                    "severity": "HIGH", "surface": "Application",
                    "title": "App trusts user-installed certificates",
                    "fix": "Remove user certificate trust — enables SSL interception "
                           "by anyone who installs a certificate on the device."
                })

            if "pin-set" in cfg_clean.lower() or "pin sha256" in cfg_clean.lower():
                findings.append({
                    "severity": "PASS", "surface": "Application",
                    "title": "SSL certificate pinning configured",
                    "fix": ""
                })
            else:
                network_score = max(0, network_score - 5)
                findings.append({
                    "severity": "MEDIUM", "surface": "Application",
                    "title": "No SSL certificate pinning configured",
                    "fix": "Add <pin-set> to network_security_config.xml to prevent "
                           "MITM attacks even if a CA is compromised."
                })
        except Exception:
            pass
    else:
        network_score = max(0, network_score - 8)
        findings.append({
            "severity": "MEDIUM", "surface": "Application",
            "title": "No network_security_config.xml found",
            "fix": "Add res/xml/network_security_config.xml to restrict trusted CAs "
                   "and disable cleartext traffic."
        })

    # ── Build file list for content scanning ─────────────────
    files_to_scan = sorted(
        [f for f in file_list
         if any(f.endswith(ext) for ext in
                [".dex", ".xml", ".json", ".properties", ".txt", ".cfg", ".js", ".html"])
         and not any(skip in f for skip in
                     ["res/drawable", "res/layout", "res/mipmap",
                      "res/anim", "res/color", "res/font"])],
        key=lambda x: (not x.endswith(".dex"), x)
    )

    # ── Hardcoded HTTP URLs ───────────────────────────────────
    http_urls_found = []
    for fname in files_to_scan[:20]:
        try:
            raw = zf.read(fname)
            if fname.endswith(".xml"):
                raw = raw.replace(b'\x00', b'')
            content = raw.decode("utf-8", errors="ignore")
            if len(content) > 15_000_000:
                continue
            urls = re.findall(r'http://[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}', content)
            real = [u for u in urls if not any(s in u for s in [
                "schemas.android.com", "www.w3.org", "localhost",
                "127.0.0.1", "example.com", "xmlpull.org"
            ])]
            http_urls_found.extend(real[:2])
        except Exception:
            pass

    if http_urls_found:
        network_score = max(0, network_score - 6)
        unique_http = list(set(http_urls_found))
        findings.append({
            "severity": "MEDIUM", "surface": "Application",
            "title": f"{len(unique_http)} insecure HTTP endpoint(s) hardcoded in app",
            "fix": f"Replace with HTTPS. Examples: {', '.join(unique_http[:3])}"
        })
    else:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No insecure HTTP URLs hardcoded in app",
            "fix": ""
        })

    # ─────────────────────────────────────────────────────────
    # CATEGORY 3: Code security (max 25)
    # ─────────────────────────────────────────────────────────

    # ── Hardcoded secrets ─────────────────────────────────────
    secret_patterns = [
        (r'AKIA[0-9A-Z]{16}',                       "AWS Access Key"),
        (r'sk_live_[0-9a-zA-Z]{24,}',               "Stripe Live Key"),
        (r'AIza[0-9A-Za-z\-_]{35}',                 "Google API Key"),
        (r'ghp_[0-9a-zA-Z]{36}',                    "GitHub Token"),
        (r'-----BEGIN (RSA |EC )?PRIVATE KEY-----', "Private Key"),
        (r'password\s*=\s*["\'][^"\']{8,}["\']',    "Hardcoded password"),
        (r'secret\s*=\s*["\'][^"\']{8,}["\']',      "Hardcoded secret"),
        (r'api_key\s*=\s*["\'][^"\']{8,}["\']',     "Hardcoded API key"),
        (r'jdbc:[a-z]+://[^\s"\']{10,}',             "Hardcoded DB connection URL"),
        (r'Bearer\s+[a-zA-Z0-9\-_]{20,}',           "Hardcoded Bearer token"),
    ]

    apk_secrets = []
    for fname in files_to_scan[:30]:
        try:
            raw = zf.read(fname)
            if fname.endswith(".xml"):
                raw = raw.replace(b'\x00', b'')
            content = raw.decode("utf-8", errors="ignore")
            if len(content) > 15_000_000:
                continue
            for pattern, name in secret_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    apk_secrets.append(f"{name} in {fname}")
        except Exception:
            pass

    seen_secrets = set()
    for secret in apk_secrets:
        if secret not in seen_secrets:
            seen_secrets.add(secret)
            code_score = max(0, code_score - 10)
            findings.append({
                "severity": "CRITICAL", "surface": "Application",
                "title": f"Hardcoded secret found in APK: {secret}",
                "fix": "Remove immediately. Use Android Keystore or server-side secrets. "
                       "Anyone can extract hardcoded values from an APK with free tools."
            })

    if not apk_secrets:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No hardcoded secrets found in APK files",
            "fix": ""
        })

    # ── Code obfuscation (ProGuard / R8) ──────────────────────
    has_obfuscation = any(
        "mapping.txt" in f or "proguard" in f.lower() or "r8" in f.lower()
        for f in file_list
    )
    if has_obfuscation:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "Code obfuscation (ProGuard/R8) detected",
            "fix": ""
        })
    else:
        code_score = max(0, code_score - 7)
        findings.append({
            "severity": "MEDIUM", "surface": "Application",
            "title": "No code obfuscation detected (ProGuard/R8 not enabled)",
            "fix": "Enable minifyEnabled true in build.gradle. "
                   "Without obfuscation the APK is trivially reverse engineered."
        })

    # ── Root detection ────────────────────────────────────────
    root_kw = [b"isRooted", b"RootBeer", b"checkRoot", b"detectRoot",
               b"busybox", b"superuser", b"Superuser.apk"]
    root_detected = False
    for fname in files_to_scan[:15]:
        try:
            info = zf.getinfo(fname)
            if info.file_size > 15_000_000:
                continue
            raw = zf.read(fname)
            if any(kw in raw for kw in root_kw):
                root_detected = True
                break
        except Exception:
            pass

    if root_detected:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "Root detection implemented",
            "fix": ""
        })
    else:
        code_score = max(0, code_score - 5)
        findings.append({
            "severity": "LOW", "surface": "Application",
            "title": "No root detection found",
            "fix": "Add root detection (e.g., RootBeer) if the app handles "
                   "sensitive data — rooted devices can bypass security controls."
        })

    # ── Debug logging in production code ──────────────────────
    log_kw = [b"Log.d(", b"Log.v(", b"System.out.print", b"printStackTrace"]
    logs_found = False
    for fname in files_to_scan[:10]:
        try:
            info = zf.getinfo(fname)
            if info.file_size > 15_000_000:
                continue
            raw = zf.read(fname)
            if any(p in raw for p in log_kw):
                logs_found = True
                break
        except Exception:
            pass

    if logs_found:
        code_score = max(0, code_score - 3)
        findings.append({
            "severity": "LOW", "surface": "Application",
            "title": "Debug logging statements detected in production code",
            "fix": "Strip Log.d / System.out calls from release builds. "
                   "Add ProGuard rules: -assumenosideeffects class android.util.Log { *; }"
        })

    # ─────────────────────────────────────────────────────────
    # CATEGORY 4: Binary / packaging integrity (max 20)
    # ─────────────────────────────────────────────────────────

    # ── APK signature certificate ─────────────────────────────
    cert_files = [f for f in file_list
                  if f.endswith(".RSA") or f.endswith(".DSA") or f.endswith(".EC")]
    if cert_files:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "APK is signed with a certificate",
            "fix": ""
        })
    else:
        binary_score = max(0, binary_score - 10)
        findings.append({
            "severity": "HIGH", "surface": "Application",
            "title": "No APK signature certificate found",
            "fix": "Sign the APK before distribution. Unsigned APKs cannot be "
                   "installed on stock Android and may be tampered."
        })

    # ── DEX file count (code surface area) ───────────────────
    dex_files = [f for f in file_list if re.match(r'classes\d*\.dex$', f)]
    if len(dex_files) > 3:
        binary_score = max(0, binary_score - 4)
        findings.append({
            "severity": "LOW", "surface": "Application",
            "title": f"Large app: {len(dex_files)} DEX files — increased attack surface",
            "fix": "Review and remove unused libraries. Use R8 full-mode to shrink code."
        })
    elif dex_files:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": f"App code size is reasonable ({len(dex_files)} DEX file(s))",
            "fix": ""
        })

    # ── Native libraries (.so) ────────────────────────────────
    native_libs = [f for f in file_list if f.endswith(".so")]
    if native_libs:
        binary_score = max(0, binary_score - 3)
        findings.append({
            "severity": "INFO", "surface": "Application",
            "title": f"{len(native_libs)} native library/libraries (.so) bundled",
            "fix": "Native code bypasses the Java sandbox. Ensure all .so files "
                   "are from trusted sources and are kept up to date."
        })

    # ── Embedded WebView assets ───────────────────────────────
    webview_files = [f for f in file_list
                     if "assets/" in f and
                     any(f.endswith(ext) for ext in [".html", ".js", ".htm"])]
    if len(webview_files) > 5:
        binary_score = max(0, binary_score - 5)
        findings.append({
            "severity": "MEDIUM", "surface": "Application",
            "title": f"Embedded web content: {len(webview_files)} HTML/JS assets — WebView risk",
            "fix": "WebViews are prone to XSS and JavaScript injection. "
                   "Disable setJavaScriptEnabled() unless absolutely required."
        })
    elif webview_files:
        binary_score = max(0, binary_score - 2)
        findings.append({
            "severity": "LOW", "surface": "Application",
            "title": f"{len(webview_files)} embedded HTML/JS asset(s) present",
            "fix": "Verify WebView security settings are locked down."
        })

    zf.close()

    final_score = manifest_score + network_score + code_score + binary_score
    final_score = max(0, min(100, final_score))
    return {"score": final_score, "findings": findings}