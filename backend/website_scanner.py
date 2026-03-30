import requests
import ssl
import socket
from datetime import datetime

def scan_website(url):
    """
    Scans a website URL for security issues.
    Returns a list of findings and a score out of 100.
    """
    findings = []
    score = 100  # start perfect, deduct for problems

    # Make sure URL starts with https://
    if not url.startswith("http"):
        url = "https://" + url

    domain = url.replace("https://", "").replace("http://", "").split("/")[0]

    # --- CHECK 1: SSL Certificate ---
    try:
        context = ssl.create_default_context()
        conn = context.wrap_socket(
            socket.socket(socket.AF_INET),
            server_hostname=domain
        )
        conn.settimeout(5)
        conn.connect((domain, 443))
        cert = conn.getpeercert()
        
        # Check expiry date
        expiry_str = cert['notAfter']
        expiry = datetime.strptime(expiry_str, "%b %d %H:%M:%S %Y %Z")
        days_left = (expiry - datetime.utcnow()).days
        
        if days_left < 0:
            findings.append({
                "severity": "CRITICAL",
                "surface": "Website",
                "title": "SSL certificate has expired",
                "fix": "Renew your SSL certificate immediately at letsencrypt.org (it's free)"
            })
            score -= 30
        elif days_left < 14:
            findings.append({
                "severity": "HIGH",
                "surface": "Website",
                "title": f"SSL certificate expires in {days_left} days",
                "fix": "Renew your SSL certificate at letsencrypt.org before it expires"
            })
            score -= 15
        else:
            findings.append({
                "severity": "PASS",
                "surface": "Website",
                "title": f"SSL certificate is valid ({days_left} days remaining)",
                "fix": ""
            })
    except Exception as e:
        findings.append({
            "severity": "CRITICAL",
            "surface": "Website",
            "title": "SSL certificate missing or invalid",
            "fix": "Your site must use HTTPS. Get a free SSL certificate at letsencrypt.org"
        })
        score -= 30

    # --- CHECK 2: HTTP Security Headers ---
    try:
        response = requests.get(url, timeout=5)
        headers = response.headers

        security_headers = {
            "X-Frame-Options": "Prevents your site from being embedded in iframes (clickjacking protection)",
            "X-Content-Type-Options": "Prevents browsers from guessing file types",
            "Strict-Transport-Security": "Forces browsers to always use HTTPS",
            "Content-Security-Policy": "Controls what content can load on your page",
        }

        for header, description in security_headers.items():
            if header not in headers:
                findings.append({
                    "severity": "MEDIUM",
                    "surface": "Website",
                    "title": f"Missing security header: {header}",
                    "fix": f"Add this to your server config: {header}. What it does: {description}"
                })
                score -= 8

    except Exception as e:
        findings.append({
            "severity": "HIGH",
            "surface": "Website",
            "title": "Could not reach the website",
            "fix": "Make sure the URL is correct and the site is publicly accessible"
        })
        score -= 20

    # --- CHECK 3: Exposed sensitive files ---
    sensitive_paths = [
        "/.env",
        "/.git/config",
        "/backup.zip",
        "/database.sql",
        "/wp-config.php",
        "/config.php",
    ]

    for path in sensitive_paths:
        try:
            test_url = f"https://{domain}{path}"
            r = requests.get(test_url, timeout=3)
            if r.status_code == 200:
                findings.append({
                    "severity": "CRITICAL",
                    "surface": "Website",
                    "title": f"Sensitive file publicly accessible: {path}",
                    "fix": f"Block access to {path} immediately. Add it to your .htaccess or nginx config"
                })
                score -= 25
        except:
            pass  # site returned error = good, file not exposed

    score = max(0, score)  # don't go below 0
    return {"score": score, "findings": findings}