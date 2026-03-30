import requests
import re
import zipfile
import io
import os
import tempfile
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

def scan_app(url_or_path):
    # ── Route: APK file path or URL? ──────────────────────────
    if url_or_path.endswith(".apk") or os.path.isfile(url_or_path):
        return scan_apk(url_or_path)
    else:
        return scan_webapp(url_or_path)


# ═══════════════════════════════════════════════════════════════
# WEB APP SCANNER
# ═══════════════════════════════════════════════════════════════
def scan_webapp(url):
    findings = []

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

    # ── Scoring — mirrors website_scanner structure ────────────
    # access_score  : max 25
    # secret_score  : max 35
    # input_score   : max 25
    # config_score  : max 15
    # Total         : 100
    access_score = 25
    secret_score = 35
    input_score  = 25
    config_score = 15

    # ── Fetch homepage ─────────────────────────────────────────
    homepage_html = ""
    homepage_headers = {}
    response = None
    try:
        for try_url in [base_url, f"https://www.{bare_domain}"]:
            try:
                response = session.get(
                    try_url, timeout=12, allow_redirects=True
                )
                if response.status_code < 400:
                    homepage_html = response.text
                    homepage_headers = {
                        k.lower(): v
                        for k, v in response.headers.items()
                    }
                    break
            except Exception:
                continue

        if not homepage_html:
            raise Exception("Could not reach app")

    except Exception:
        findings.append({
            "severity": "INFO", "surface": "Application",
            "title": "Application blocked automated scanning (bot protection detected)",
            "fix": "This app uses WAF/bot protection that blocks scanners. "
                   "This is actually a good security sign."
        })
        return {"score": 45, "findings": findings}

    soup = BeautifulSoup(homepage_html, "html.parser")

    # ─────────────────────────────────────────────────────────
    # CATEGORY 1: Access control (max 25)
    # ─────────────────────────────────────────────────────────

    # ── Check 1a: Admin panels exposed without login ──────────
    admin_paths = [
        "/admin", "/admin/dashboard", "/wp-admin",
        "/administrator", "/dashboard", "/phpmyadmin",
        "/manager", "/cpanel", "/wp-login.php",
        "/admin/login",
    ]
    admin_exposed = False
    for path in admin_paths:
        try:
            r = session.get(
                f"{base_url}{path}", timeout=5, allow_redirects=True
            )
            if r.status_code == 200:
                html_lower = r.text.lower()
                has_login = (
                    'type="password"' in html_lower or
                    "type='password'" in html_lower or
                    "forgot password" in html_lower
                )
                is_exposed_dashboard = not has_login and (
                    "dashboard" in html_lower or
                    "admin panel" in html_lower or
                    "control panel" in html_lower or
                    "logged in as" in html_lower
                )
                if is_exposed_dashboard:
                    admin_exposed = True
                    access_score = max(0, access_score - 20)
                    findings.append({
                        "severity": "CRITICAL", "surface": "Application",
                        "title": f"Admin panel accessible without authentication: {path}",
                        "fix": f"Add authentication to {path} immediately. "
                               "Anyone can access admin functions right now."
                    })
                    break
        except Exception:
            pass

    if not admin_exposed:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No unauthenticated admin panels found",
            "fix": ""
        })

    # ── Check 1b: Directory listing ───────────────────────────
    dir_listing_found = False
    for path in ["/uploads/", "/files/", "/static/", "/assets/", "/backup/"]:
        try:
            r = session.get(
                f"{base_url}{path}", timeout=4, allow_redirects=False
            )
            if r.status_code == 200:
                h = r.text.lower()
                if "index of /" in h or (
                    "parent directory" in h and "<a href" in h
                ):
                    dir_listing_found = True
                    access_score = max(0, access_score - 15)
                    findings.append({
                        "severity": "HIGH", "surface": "Application",
                        "title": f"Directory listing enabled at {path}",
                        "fix": "Disable directory listing. "
                               "nginx: autoindex off;  Apache: Options -Indexes"
                    })
                    break
        except Exception:
            pass

    if not dir_listing_found:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "Directory listing is disabled",
            "fix": ""
        })

    # ── Check 1c: Subdomains attack surface ───────────────────
    try:
        r = requests.get(
            f"https://crt.sh/?q=%25.{domain}&output=json", timeout=10
        )
        if r.status_code == 200:
            subdomains = set()
            for entry in r.json():
                for sub in entry.get("name_value", "").split("\n"):
                    sub = sub.strip().lstrip("*.")
                    if domain in sub and sub != domain and not sub.startswith("www."):
                        subdomains.add(sub)
            if len(subdomains) > 20:
                access_score = max(0, access_score - 5)
                findings.append({
                    "severity": "MEDIUM", "surface": "Application",
                    "title": f"Large attack surface: {len(subdomains)} subdomains found",
                    "fix": f"Sample: {', '.join(list(subdomains)[:4])}. "
                           "Decommission unused subdomains."
                })
            elif subdomains:
                findings.append({
                    "severity": "INFO", "surface": "Application",
                    "title": f"{len(subdomains)} subdomains found via certificate logs",
                    "fix": f"Known: {', '.join(list(subdomains)[:5])}. Ensure each is secured."
                })
    except Exception:
        pass

    # ─────────────────────────────────────────────────────────
    # CATEGORY 2: Secret / sensitive data leaks (max 35)
    # ─────────────────────────────────────────────────────────
    secret_patterns = [
        (r'AKIA[0-9A-Z]{16}',                           "AWS Access Key ID"),
        (r'sk_live_[0-9a-zA-Z]{24,}',                   "Stripe Live Secret Key"),
        (r'AIza[0-9A-Za-z\-_]{35}',                     "Google API Key"),
        (r'ghp_[0-9a-zA-Z]{36}',                        "GitHub Personal Access Token"),
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

    # Scan inline scripts
    for tag in soup.find_all("script"):
        content = tag.string or ""
        if len(content.strip()) < 30:
            continue
        for pattern, name in secret_patterns:
            if re.search(pattern, content):
                secrets_found.append(f"{name} in inline script")

    # Scan external JS files
    for tag in soup.find_all("script", src=True):
        js_src = tag.get("src", "")
        try:
            js_url = (js_src if js_src.startswith("http")
                      else urljoin(base_url, js_src))
            if any(cdn in js_url for cdn in cdn_domains):
                continue
            js_content = session.get(js_url, timeout=6).text
            if len(js_content) > 800000:
                continue
            for pattern, name in secret_patterns:
                if re.search(pattern, js_content):
                    fname = js_url.split("/")[-1].split("?")[0]
                    secrets_found.append(f"{name} in {fname}")
        except Exception:
            pass

    seen = set()
    for secret in secrets_found:
        if secret not in seen:
            seen.add(secret)
            secret_score = max(0, secret_score - 15)
            findings.append({
                "severity": "CRITICAL", "surface": "Application",
                "title": f"Secret credential found in public code: {secret}",
                "fix": "Remove immediately. Rotate/revoke the key. "
                       "Use server-side environment variables."
            })

    if not secrets_found:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No hardcoded secrets found in JavaScript",
            "fix": ""
        })

    # ── Check: Forms over HTTP ────────────────────────────────
    forms = soup.find_all("form")
    insecure_forms = [
        f for f in forms
        if (f.get("action") or "").startswith("http://")
    ]
    if insecure_forms:
        secret_score = max(0, secret_score - 10)
        findings.append({
            "severity": "HIGH", "surface": "Application",
            "title": f"{len(insecure_forms)} form(s) submit data over HTTP",
            "fix": "Change form action URLs from http:// to https://"
        })
    elif forms:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": f"{len(forms)} form(s) found — all submit over HTTPS",
            "fix": ""
        })

    # ─────────────────────────────────────────────────────────
    # CATEGORY 3: Input validation (max 25)
    # ─────────────────────────────────────────────────────────

    # ── XSS probe ─────────────────────────────────────────────
    xss_marker = "SECPULSE9823"
    xss_probe  = f"<{xss_marker}>"
    xss_found  = False
    try:
        get_forms = [
            f for f in soup.find_all("form")
            if f.get("method", "get").lower() == "get"
        ]
        for form in get_forms[:2]:
            action  = form.get("action") or base_url
            form_url = (action if action.startswith("http")
                        else urljoin(base_url, action))
            inputs = form.find_all(
                "input",
                {"type": lambda t: t not in ["hidden", "submit", "button"]}
            )
            params = {
                i.get("name", "q"): xss_probe
                for i in inputs[:3] if i.get("name")
            }
            if params:
                r = session.get(form_url, params=params, timeout=5)
                if xss_marker in r.text and xss_probe in r.text:
                    xss_found = True
                    input_score = max(0, input_score - 15)
                    findings.append({
                        "severity": "CRITICAL", "surface": "Application",
                        "title": "Reflected XSS vulnerability detected",
                        "fix": "Escape all user input before rendering in HTML. "
                               "Use a templating engine with auto-escaping."
                    })
                    break
    except Exception:
        pass

    # ── SQL injection probe ───────────────────────────────────
    sql_errors = [
        "you have an error in your sql syntax",
        "warning: mysql", "unclosed quotation mark",
        "sqlstate", "pg_query():", "ora-01756",
        "microsoft ole db provider for sql server",
    ]
    sqli_found = False
    try:
        r = session.get(f"{base_url}?id=1'", timeout=5)
        resp_lower = r.text.lower()
        for err in sql_errors:
            if err in resp_lower:
                sqli_found = True
                input_score = max(0, input_score - 20)
                findings.append({
                    "severity": "CRITICAL", "surface": "Application",
                    "title": "Possible SQL injection vulnerability detected",
                    "fix": "Use parameterized queries / prepared statements. "
                           "Never concatenate user input into SQL strings."
                })
                break
    except Exception:
        pass

    # ── Error page leak ───────────────────────────────────────
    tech_leaks = [
        ("traceback (most recent call last)", "Python stack trace exposed"),
        ("fatal error:",                       "PHP fatal error exposed"),
        ("mysql_fetch",                        "MySQL error details exposed"),
        ("sqlstate[",                          "Database SQL state exposed"),
        ("django.core.exceptions",             "Django framework info exposed"),
        ("laravel",                            "Laravel framework info exposed"),
        ("webpack://",                         "Webpack source map exposed"),
    ]
    try:
        r = session.get(
            f"{base_url}/this_page_does_not_exist_sp_9823", timeout=5
        )
        err_lower = r.text.lower()
        for keyword, description in tech_leaks:
            if keyword in err_lower:
                input_score = max(0, input_score - 8)
                findings.append({
                    "severity": "MEDIUM", "surface": "Application",
                    "title": f"Error page leaks technical details: {description}",
                    "fix": "Create a custom error page. "
                           "Disable debug mode in production."
                })
                break
    except Exception:
        pass

    if not xss_found and not sqli_found:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No XSS or SQL injection indicators found",
            "fix": ""
        })

    # ─────────────────────────────────────────────────────────
    # CATEGORY 4: Configuration security (max 15)
    # ─────────────────────────────────────────────────────────

    # ── Mixed content ─────────────────────────────────────────
    if base_url.startswith("https"):
        http_matches = re.findall(
            r'(?:src|href|action)\s*=\s*["\']http://[^"\']+["\']',
            homepage_html.lower()
        )
        if http_matches:
            config_score = max(0, config_score - 8)
            findings.append({
                "severity": "MEDIUM", "surface": "Application",
                "title": f"Mixed content: {len(http_matches)} HTTP resource(s) on HTTPS page",
                "fix": "Change all resource URLs to https:// or use // prefix"
            })
        else:
            findings.append({
                "severity": "PASS", "surface": "Application",
                "title": "No mixed HTTP/HTTPS content detected",
                "fix": ""
            })

    # ── API docs exposed ──────────────────────────────────────
    api_exposed = False
    for path in ["/api/docs", "/swagger", "/swagger-ui.html",
                 "/api-docs", "/openapi.json", "/graphql"]:
        try:
            r = session.get(
                f"{base_url}{path}", timeout=4, allow_redirects=False
            )
            if r.status_code == 200:
                ct = r.headers.get("content-type", "").lower()
                body = r.text.lower()
                if ("application/json" in ct or "swagger" in body
                        or "openapi" in body or "graphql" in body):
                    api_exposed = True
                    config_score = max(0, config_score - 8)
                    findings.append({
                        "severity": "MEDIUM", "surface": "Application",
                        "title": f"API documentation publicly accessible at {path}",
                        "fix": "Restrict API docs to authenticated users in production."
                    })
                    break
        except Exception:
            pass

    if not api_exposed:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No publicly exposed API documentation found",
            "fix": ""
        })

    # ── robots.txt sensitive paths ────────────────────────────
    try:
        r = session.get(f"{base_url}/robots.txt", timeout=5)
        if r.status_code == 200 and "disallow" in r.text.lower():
            sensitive_kw = [
                "admin", "backup", "config", "database",
                "secret", "private", "internal", "password"
            ]
            disallowed = re.findall(r'Disallow:\s*(.+)', r.text, re.IGNORECASE)
            risky = [
                p.strip() for p in disallowed
                if any(k in p.lower() for k in sensitive_kw)
            ]
            if risky:
                config_score = max(0, config_score - 5)
                findings.append({
                    "severity": "LOW", "surface": "Application",
                    "title": f"robots.txt reveals {len(risky)} sensitive path(s)",
                    "fix": f"Paths: {', '.join(risky[:3])}. "
                           "robots.txt is PUBLIC — don't list secret paths here."
                })
    except Exception:
        pass

    # ── security.txt ──────────────────────────────────────────
    try:
        r = session.get(f"{base_url}/.well-known/security.txt", timeout=4)
        if r.status_code == 200 and "contact" in r.text.lower():
            findings.append({
                "severity": "PASS", "surface": "Application",
                "title": "security.txt present — responsible disclosure enabled",
                "fix": ""
            })
        else:
            findings.append({
                "severity": "INFO", "surface": "Application",
                "title": "No security.txt file found",
                "fix": "Add /.well-known/security.txt with a contact email "
                       "for security researchers"
            })
    except Exception:
        pass

    final_score = access_score + secret_score + input_score + config_score
    final_score = max(0, min(100, final_score))
    return {"score": final_score, "findings": findings}


# ═══════════════════════════════════════════════════════════════
# APK SCANNER
# ═══════════════════════════════════════════════════════════════
def scan_apk(apk_path):
    findings = []

    # ── Scoring ───────────────────────────────────────────────
    # permissions   : max 30
    # secrets       : max 30
    # network       : max 25
    # code_safety   : max 15
    # Total         : 100
    perm_score    = 30
    secret_score  = 30
    network_score = 25
    code_score    = 15

    # ── Load APK (APK files are ZIP archives) ─────────────────
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
            "fix": "Make sure the APK file is valid and not corrupted"
        })
        return {"score": 0, "findings": findings}

    file_list = zf.namelist()

    # ─────────────────────────────────────────────────────────
    # CATEGORY 1: Permissions (max 30)
    # Read AndroidManifest.xml
    # ─────────────────────────────────────────────────────────
    dangerous_permissions = {
        "READ_CONTACTS":       ("HIGH",   8, "Access to all contacts"),
        "WRITE_CONTACTS":      ("HIGH",   8, "Modify all contacts"),
        "ACCESS_FINE_LOCATION":("HIGH",   8, "Precise GPS location"),
        "RECORD_AUDIO":        ("HIGH",   8, "Access microphone"),
        "CAMERA":              ("MEDIUM", 5, "Access camera"),
        "READ_SMS":            ("CRITICAL",10,"Read all SMS messages"),
        "SEND_SMS":            ("CRITICAL",10,"Send SMS (costs money)"),
        "READ_CALL_LOG":       ("HIGH",   8, "Access call history"),
        "PROCESS_OUTGOING_CALLS":("HIGH", 8, "Intercept phone calls"),
        "READ_EXTERNAL_STORAGE":("MEDIUM",4, "Read files from storage"),
        "WRITE_EXTERNAL_STORAGE":("MEDIUM",4,"Write files to storage"),
        "GET_ACCOUNTS":        ("MEDIUM", 4, "Access account list"),
        "USE_BIOMETRIC":       ("LOW",    2, "Use fingerprint/face"),
        "BLUETOOTH_ADMIN":     ("MEDIUM", 4, "Control Bluetooth"),
        "NFC":                 ("LOW",    2, "Use NFC chip"),
    }

    try:
        manifest_raw = zf.read("AndroidManifest.xml")
        # Try to decode as text — works for some APKs
        try:
            manifest_text = manifest_raw.decode("utf-8", errors="ignore")
        except Exception:
            manifest_text = str(manifest_raw)

        found_dangerous = []
        for perm, (severity, deduction, description) in dangerous_permissions.items():
            if perm in manifest_text:
                found_dangerous.append((perm, severity, deduction, description))
                perm_score = max(0, perm_score - deduction)
                findings.append({
                    "severity": severity, "surface": "Application",
                    "title": f"Dangerous permission declared: {perm}",
                    "fix": f"This permission allows: {description}. "
                           "Remove if not essential for core app functionality."
                })

        if not found_dangerous:
            findings.append({
                "severity": "PASS", "surface": "Application",
                "title": "No dangerous permissions declared in AndroidManifest",
                "fix": ""
            })

        # Check for debuggable flag
        if "android:debuggable=\"true\"" in manifest_text or "debuggable=true" in manifest_text.lower():
            code_score = max(0, code_score - 10)
            findings.append({
                "severity": "CRITICAL", "surface": "Application",
                "title": "App is set as debuggable in AndroidManifest",
                "fix": "Set android:debuggable='false' in AndroidManifest.xml. "
                       "Debuggable apps can be reverse engineered easily."
            })

        # Check for allowBackup
        if "android:allowBackup=\"true\"" in manifest_text:
            code_score = max(0, code_score - 5)
            findings.append({
                "severity": "MEDIUM", "surface": "Application",
                "title": "App data backup is enabled (android:allowBackup=true)",
                "fix": "Set android:allowBackup='false' to prevent "
                       "app data extraction via adb backup."
            })

        # Check for exported components
        exported_count = manifest_text.count('android:exported="true"')
        if exported_count > 3:
            perm_score = max(0, perm_score - 5)
            findings.append({
                "severity": "MEDIUM", "surface": "Application",
                "title": f"{exported_count} exported components found in manifest",
                "fix": "Review exported activities/services/receivers. "
                       "Only export components that genuinely need to be "
                       "accessible from other apps."
            })

    except KeyError:
        findings.append({
            "severity": "HIGH", "surface": "Application",
            "title": "AndroidManifest.xml not found in APK",
            "fix": "This may not be a valid Android APK file"
        })

    # ─────────────────────────────────────────────────────────
    # CATEGORY 2: Hardcoded secrets in APK (max 30)
    # Scan .dex files and assets for secrets
    # ─────────────────────────────────────────────────────────
    secret_patterns = [
        (r'AKIA[0-9A-Z]{16}',                        "AWS Access Key"),
        (r'sk_live_[0-9a-zA-Z]{24,}',                "Stripe Live Key"),
        (r'AIza[0-9A-Za-z\-_]{35}',                  "Google API Key"),
        (r'ghp_[0-9a-zA-Z]{36}',                     "GitHub Token"),
        (r'-----BEGIN (RSA |EC )?PRIVATE KEY-----',  "Private Key"),
        (r'password\s*=\s*["\'][^"\']{8,}["\']',     "Hardcoded password"),
        (r'secret\s*=\s*["\'][^"\']{8,}["\']',       "Hardcoded secret"),
        (r'api_key\s*=\s*["\'][^"\']{8,}["\']',      "Hardcoded API key"),
        (r'jdbc:[a-z]+://[^\s"\']{10,}',              "Hardcoded database URL"),
    ]

    apk_secrets = []
    files_to_scan = [
        f for f in file_list
        if any(f.endswith(ext) for ext in
               [".dex", ".xml", ".json", ".properties",
                ".txt", ".cfg", ".js", ".html"])
        and not any(skip in f for skip in
                    ["res/drawable", "res/layout", "res/mipmap"])
    ]

    for fname in files_to_scan[:30]:
        try:
            content = zf.read(fname).decode("utf-8", errors="ignore")
            if len(content) > 500000:
                continue
            for pattern, name in secret_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    apk_secrets.append(f"{name} in {fname}")
        except Exception:
            pass

    seen = set()
    for secret in apk_secrets:
        if secret not in seen:
            seen.add(secret)
            secret_score = max(0, secret_score - 15)
            findings.append({
                "severity": "CRITICAL", "surface": "Application",
                "title": f"Hardcoded secret in APK: {secret}",
                "fix": "Remove from code. Use Android Keystore or "
                       "server-side secrets instead. "
                       "Anyone who downloads this APK can extract this secret."
            })

    if not apk_secrets:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No hardcoded secrets found in APK files",
            "fix": ""
        })

    # ─────────────────────────────────────────────────────────
    # CATEGORY 3: Network security (max 25)
    # ─────────────────────────────────────────────────────────

    # ── Check network_security_config.xml ─────────────────────
    network_config_files = [
        f for f in file_list
        if "network_security_config" in f.lower()
    ]
    if network_config_files:
        try:
            config_content = zf.read(
                network_config_files[0]
            ).decode("utf-8", errors="ignore")

            if "cleartextTrafficPermitted=\"true\"" in config_content:
                network_score = max(0, network_score - 15)
                findings.append({
                    "severity": "HIGH", "surface": "Application",
                    "title": "App allows cleartext (HTTP) traffic",
                    "fix": "Set cleartextTrafficPermitted='false' in "
                           "network_security_config.xml to force HTTPS"
                })
            else:
                findings.append({
                    "severity": "PASS", "surface": "Application",
                    "title": "Network security config blocks cleartext traffic",
                    "fix": ""
                })

            if "<trust-anchors>" in config_content and \
               "user" in config_content.lower():
                network_score = max(0, network_score - 10)
                findings.append({
                    "severity": "HIGH", "surface": "Application",
                    "title": "App trusts user-installed certificates",
                    "fix": "Remove user certificate trust from network_security_config. "
                           "This allows SSL interception by anyone who installs "
                           "a certificate on the device."
                })
        except Exception:
            pass
    else:
        findings.append({
            "severity": "INFO", "surface": "Application",
            "title": "No network_security_config.xml found",
            "fix": "Add res/xml/network_security_config.xml to explicitly "
                   "configure which certificates to trust"
        })
        network_score = max(0, network_score - 5)

    # ── Check for HTTP URLs hardcoded in files ─────────────────
    http_urls_found = []
    for fname in files_to_scan[:20]:
        try:
            content = zf.read(fname).decode("utf-8", errors="ignore")
            urls = re.findall(r'http://[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}', content)
            real_urls = [
                u for u in urls
                if not any(skip in u for skip in
                           ["schemas.android.com", "www.w3.org",
                            "localhost", "127.0.0.1", "example.com"])
            ]
            http_urls_found.extend(real_urls[:2])
        except Exception:
            pass

    if http_urls_found:
        network_score = max(0, network_score - 8)
        findings.append({
            "severity": "MEDIUM", "surface": "Application",
            "title": f"HTTP (non-HTTPS) URLs hardcoded in app: "
                     f"{len(set(http_urls_found))} found",
            "fix": f"Change to HTTPS. Examples: "
                   f"{', '.join(list(set(http_urls_found))[:3])}"
        })
    else:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "No insecure HTTP URLs hardcoded in app",
            "fix": ""
        })

    # ─────────────────────────────────────────────────────────
    # CATEGORY 4: Code safety (max 15)
    # ─────────────────────────────────────────────────────────

    # ── Check for ProGuard/obfuscation (mapping.txt present) ──
    has_obfuscation = any(
        "mapping.txt" in f or "proguard" in f.lower()
        for f in file_list
    )
    if has_obfuscation:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "Code obfuscation (ProGuard/R8) is enabled",
            "fix": ""
        })
    else:
        code_score = max(0, code_score - 5)
        findings.append({
            "severity": "LOW", "surface": "Application",
            "title": "No code obfuscation detected",
            "fix": "Enable ProGuard/R8 in your build.gradle: "
                   "minifyEnabled true. Makes reverse engineering harder."
        })

    # ── Check for root detection ──────────────────────────────
    root_keywords = ["isRooted", "RootBeer", "su", "busybox", "superuser"]
    root_detected = False
    for fname in files_to_scan[:15]:
        try:
            content = zf.read(fname).decode("utf-8", errors="ignore")
            if any(kw in content for kw in root_keywords):
                root_detected = True
                break
        except Exception:
            pass

    if root_detected:
        findings.append({
            "severity": "PASS", "surface": "Application",
            "title": "Root detection implemented in app",
            "fix": ""
        })
    else:
        findings.append({
            "severity": "INFO", "surface": "Application",
            "title": "No root detection found",
            "fix": "Consider adding root detection for sensitive apps "
                   "using a library like RootBeer"
        })

    zf.close()

    final_score = perm_score + secret_score + network_score + code_score
    final_score = max(0, min(100, final_score))
    return {"score": final_score, "findings": findings}