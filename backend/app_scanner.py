import requests
from bs4 import BeautifulSoup
import re

def scan_app(url):
    """
    Scans a running web application for security issues.
    """
    findings = []
    score = 100

    if not url.startswith("http"):
        url = "https://" + url

    domain = url.replace("https://", "").replace("http://", "").split("/")[0]

    # --- CHECK 1: Exposed admin panels ---
    admin_paths = [
        "/admin",
        "/admin/login",
        "/wp-admin",
        "/administrator",
        "/dashboard",
        "/phpmyadmin",
        "/manager",
        "/cpanel",
    ]

    for path in admin_paths:
        try:
            test_url = f"https://{domain}{path}"
            r = requests.get(test_url, timeout=3, allow_redirects=True)
            if r.status_code == 200:
                findings.append({
                    "severity": "CRITICAL",
                    "surface": "Application",
                    "title": f"Admin panel exposed without login: {path}",
                    "fix": f"Add authentication to {path}. This page should never be publicly accessible"
                })
                score -= 30
                break  # one is enough to report
        except:
            pass

    # --- CHECK 2: API keys leaked in JavaScript files ---
    # Patterns that look like real API keys
    secret_patterns = [
        (r'AKIA[0-9A-Z]{16}', 'AWS Access Key'),
        (r'sk_live_[0-9a-zA-Z]{24}', 'Stripe Live Secret Key'),
        (r'AIza[0-9A-Za-z\-_]{35}', 'Google API Key'),
        (r'ghp_[0-9a-zA-Z]{36}', 'GitHub Personal Access Token'),
        (r'xox[baprs]-[0-9a-zA-Z]{10,48}', 'Slack Token'),
    ]

    try:
        # Get the homepage and look for JS file links
        response = requests.get(url, timeout=5)
        soup = BeautifulSoup(response.text, 'html.parser')
        script_tags = soup.find_all('script', src=True)

        for script in script_tags[:5]:  # check first 5 JS files only
            js_url = script['src']
            if not js_url.startswith('http'):
                js_url = f"https://{domain}{js_url}"
            
            try:
                js_content = requests.get(js_url, timeout=3).text
                for pattern, key_name in secret_patterns:
                    if re.search(pattern, js_content):
                        findings.append({
                            "severity": "CRITICAL",
                            "surface": "Application",
                            "title": f"{key_name} found in public JavaScript file",
                            "fix": f"Remove this key from your code immediately. Rotate the key now. Never hardcode secrets — use environment variables instead"
                        })
                        score -= 35
            except:
                pass
    except:
        pass

    # --- CHECK 3: Subdomains (uses free crt.sh service) ---
    try:
        crt_url = f"https://crt.sh/?q=%25.{domain}&output=json"
        r = requests.get(crt_url, timeout=8)
        if r.status_code == 200:
            data = r.json()
            subdomains = set()
            for entry in data:
                name = entry.get("name_value", "")
                for sub in name.split("\n"):
                    if domain in sub and sub != domain:
                        subdomains.add(sub.strip())
            
            if len(subdomains) > 0:
                findings.append({
                    "severity": "INFO",
                    "surface": "Application",
                    "title": f"Found {len(subdomains)} subdomains via certificate logs",
                    "fix": f"Review these subdomains: {', '.join(list(subdomains)[:5])}. Make sure each one is secured"
                })
    except:
        pass

    # Pad score if no issues found
    if score == 100:
        findings.append({
            "severity": "PASS",
            "surface": "Application",
            "title": "No obvious application vulnerabilities detected",
            "fix": ""
        })

    score = max(0, score)
    return {"score": score, "findings": findings}