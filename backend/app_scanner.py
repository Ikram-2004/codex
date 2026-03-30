import requests
from bs4 import BeautifulSoup
import re

def scan_app(url):
    findings = []
    score = 100

    if not url.startswith("http"):
        url = "https://" + url

    domain = url.replace("https://", "").replace("http://", "").split("/")[0]

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    })

    # ─────────────────────────────────────────────
    # CHECK 1: Admin panel — only flag if NO login form present
    # ─────────────────────────────────────────────
    admin_paths = [
        "/admin", "/admin/login", "/wp-admin",
        "/administrator", "/dashboard",
        "/phpmyadmin", "/manager", "/cpanel",
    ]

    for path in admin_paths:
        try:
            test_url = f"https://{domain}{path}"
            r = session.get(test_url, timeout=5, allow_redirects=True)

            if r.status_code == 200:
                html_lower = r.text.lower()

                # Check if there's a login form — if yes it's PROTECTED, not exposed
                has_login = (
                    'type="password"' in html_lower or
                    "type='password'" in html_lower or
                    'name="password"' in html_lower or
                    "login" in html_lower and "form" in html_lower
                )

                # Check if it looks like a real admin dashboard (no login needed)
                looks_like_dashboard = (
                    "dashboard" in html_lower or
                    "admin panel" in html_lower or
                    "logged in" in html_lower or
                    "welcome, admin" in html_lower
                ) and not has_login

                if looks_like_dashboard:
                    findings.append({
                        "severity": "CRITICAL",
                        "surface": "Application",
                        "title": f"Admin panel accessible without login: {path}",
                        "fix": f"Add authentication to {path} immediately"
                    })
                    score -= 30
                    break

        except Exception:
            pass

    # ─────────────────────────────────────────────
    # CHECK 2: API keys leaked in JavaScript files
    # ─────────────────────────────────────────────
    secret_patterns = [
        (r'AKIA[0-9A-Z]{16}', 'AWS Access Key'),
        (r'sk_live_[0-9a-zA-Z]{24,}', 'Stripe Live Secret Key'),
        (r'AIza[0-9A-Za-z\-_]{35}', 'Google API Key'),
        (r'ghp_[0-9a-zA-Z]{36}', 'GitHub Personal Access Token'),
        (r'xox[baprs]-[0-9a-zA-Z\-]{10,}', 'Slack Token'),
        (r'-----BEGIN (RSA |EC )?PRIVATE KEY-----', 'Private Key'),
        (r'["\']?password["\']?\s*[:=]\s*["\'][^"\']{8,}["\']',
         'Hardcoded password in JS'),
    ]

    try:
        response = session.get(f"https://{domain}", timeout=8)
        soup = BeautifulSoup(response.text, 'html.parser')

        # Get both inline scripts AND external script files
        inline_scripts = [tag.string for tag in soup.find_all('script')
                          if tag.string and len(tag.string) > 50]
        external_scripts = [tag['src'] for tag in soup.find_all('script', src=True)]

        # Scan inline scripts
        for script_content in inline_scripts[:10]:
            for pattern, key_name in secret_patterns:
                if re.search(pattern, script_content or "", re.IGNORECASE):
                    findings.append({
                        "severity": "CRITICAL",
                        "surface": "Application",
                        "title": f"{key_name} found in inline JavaScript",
                        "fix": "Remove immediately. Move secrets to environment variables on your server."
                    })
                    score -= 35

        # Scan external JS files
        for js_src in external_scripts[:8]:
            try:
                js_url = js_src if js_src.startswith("http") else f"https://{domain}{js_src}"
                # Skip third-party CDN scripts — only scan your own files
                if domain not in js_url and any(
                    cdn in js_url for cdn in [
                        "googleapis", "cloudflare", "jsdelivr",
                        "jquery", "bootstrap", "cdn."
                    ]
                ):
                    continue

                js_content = session.get(js_url, timeout=5).text

                # Skip minified files that are huge — likely libraries not your code
                if len(js_content) > 500000:
                    continue

                for pattern, key_name in secret_patterns:
                    if re.search(pattern, js_content, re.IGNORECASE):
                        filename = js_url.split("/")[-1]
                        findings.append({
                            "severity": "CRITICAL",
                            "surface": "Application",
                            "title": f"{key_name} found in {filename}",
                            "fix": "Remove this key from your code. Rotate it immediately. Use .env files."
                        })
                        score -= 35

            except Exception:
                pass

    except Exception:
        pass

    # ─────────────────────────────────────────────
    # CHECK 3: Directory listing enabled
    # ─────────────────────────────────────────────
    try:
        test_paths = ["/images/", "/uploads/", "/files/", "/static/", "/assets/"]
        for path in test_paths:
            r = session.get(
                f"https://{domain}{path}",
                timeout=4, allow_redirects=False
            )
            if r.status_code == 200:
                html = r.text.lower()
                # Real directory listing shows "index of" or file links
                if "index of" in html or (
                    "parent directory" in html and "<a href" in html
                ):
                    findings.append({
                        "severity": "HIGH",
                        "surface": "Application",
                        "title": f"Directory listing enabled at {path}",
                        "fix": f"Disable directory listing. In nginx: autoindex off; "
                               f"In Apache: Options -Indexes"
                    })
                    score -= 20
                    break
    except Exception:
        pass

    # ─────────────────────────────────────────────
    # CHECK 4: Subdomains via certificate transparency
    # ─────────────────────────────────────────────
    try:
        r = requests.get(
            f"https://crt.sh/?q=%25.{domain}&output=json",
            timeout=10
        )
        if r.status_code == 200:
            data = r.json()
            subdomains = set()
            for entry in data:
                name = entry.get("name_value", "")
                for sub in name.split("\n"):
                    sub = sub.strip().lstrip("*.")
                    if (domain in sub and
                        sub != domain and
                        not sub.startswith("www.")):
                        subdomains.add(sub)

            if len(subdomains) > 10:
                findings.append({
                    "severity": "INFO",
                    "surface": "Application",
                    "title": f"Large attack surface: {len(subdomains)} subdomains found",
                    "fix": f"Review all subdomains. Common ones found: "
                           f"{', '.join(list(subdomains)[:4])}. "
                           f"Decommission any unused ones."
                })
            elif len(subdomains) > 0:
                findings.append({
                    "severity": "PASS",
                    "surface": "Application",
                    "title": f"{len(subdomains)} subdomains found — manageable surface area",
                    "fix": ""
                })
    except Exception:
        pass

    # ─────────────────────────────────────────────
    # CHECK 5: Error page information disclosure
    # ─────────────────────────────────────────────
    try:
        # Request a page that definitely doesn't exist
        r = session.get(
            f"https://{domain}/thispagedoesnotexist_securepulse_test_12345",
            timeout=5
        )
        error_text = r.text.lower()

        # Check if stack trace or framework info is exposed
        leak_keywords = [
            ("traceback (most recent call last)", "Python stack trace"),
            ("at com.sun.java", "Java stack trace"),
            ("system.web.httpexception", ".NET exception details"),
            ("fatal error:", "PHP fatal error"),
            ("mysql_fetch", "MySQL error details"),
            ("pg_query(): query failed", "PostgreSQL error details"),
            ("sqlstate[", "Database error with SQL state"),
            ("django.core.exceptions", "Django framework details"),
            ("laravel", "Laravel framework version"),
            ("rails (v", "Ruby on Rails version"),
        ]

        for keyword, description in leak_keywords:
            if keyword in error_text:
                findings.append({
                    "severity": "MEDIUM",
                    "surface": "Application",
                    "title": f"Error page leaks {description}",
                    "fix": "Configure a custom error page that shows no technical details. "
                           "Disable debug mode in production."
                })
                score -= 10
                break

    except Exception:
        pass

    if not findings:
        findings.append({
            "severity": "PASS",
            "surface": "Application",
            "title": "No application vulnerabilities detected",
            "fix": ""
        })

    score = max(0, score)
    return {"score": score, "findings": findings}