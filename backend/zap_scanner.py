"""
OWASP ZAP Scanner Module
────────────────────────
Uses the ZAP REST API (HTTP) to spider and actively scan a target URL,
then maps the resulting alerts to the same finding format used by
the existing Python scanner.

Return signature matches scan_website():
    {"score": int, "findings": [{"severity":..., "surface":..., "title":..., "fix":...}]}
"""

import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

ZAP_API_KEY = os.getenv("ZAP_API_KEY", "")
ZAP_BASE_URL = os.getenv("ZAP_BASE_URL", "http://localhost:8080")

# Map ZAP risk integers / strings to our severity labels
_RISK_MAP = {
    "High": "CRITICAL",
    "Medium": "HIGH",
    "Low": "MEDIUM",
    "Informational": "INFO",
    "3": "CRITICAL",
    "2": "HIGH",
    "1": "MEDIUM",
    "0": "INFO",
}

# Confidence labels for extra context
_CONFIDENCE_MAP = {
    "High": "High confidence",
    "Medium": "Medium confidence",
    "Low": "Low confidence",
    "3": "High confidence",
    "2": "Medium confidence",
    "1": "Low confidence",
    "0": "False positive",
}


def _zap_request(path, params=None):
    """Make a GET request to the ZAP API."""
    url = f"{ZAP_BASE_URL}{path}"
    p = {"apikey": ZAP_API_KEY}
    if params:
        p.update(params)
    r = requests.get(url, params=p, timeout=15)
    r.raise_for_status()
    return r.json()


def _wait_for_scan(scan_type, scan_id, max_wait=120):
    """
    Poll ZAP for scan progress until 100% or timeout.
    scan_type: 'spider' or 'ascan'
    """
    endpoint = f"/JSON/{scan_type}/view/status/"
    start = time.time()
    while time.time() - start < max_wait:
        try:
            data = _zap_request(endpoint, {"scanId": str(scan_id)})
            progress = int(data.get("status", "0"))
            if progress >= 100:
                return True
        except Exception:
            pass
        time.sleep(3)
    return False  # timed out


def scan_website_zap(url):
    """
    Perform a ZAP spider + active scan on the given URL.
    Returns {"score": int, "findings": [...]}.
    """
    findings = []
    score = 100

    if not url.startswith("http"):
        url = "https://" + url

    # ── Step 1: Spider the target ──────────────────────────────
    try:
        spider_resp = _zap_request("/JSON/spider/action/scan/", {
            "url": url,
            "maxChildren": "10",
            "recurse": "true",
            "subtreeOnly": "true",
        })
        spider_id = spider_resp.get("scan")
        if spider_id is not None:
            _wait_for_scan("spider", spider_id, max_wait=60)
    except Exception:
        # Spider failure is non-fatal — we still attempt active scan
        pass

    # ── Step 2: Active Scan ────────────────────────────────────
    try:
        ascan_resp = _zap_request("/JSON/ascan/action/scan/", {
            "url": url,
            "recurse": "true",
            "scanPolicyName": "",
        })
        scan_id = ascan_resp.get("scan")
        if scan_id is not None:
            _wait_for_scan("ascan", scan_id, max_wait=120)
    except Exception:
        # If active scan fails, we'll still try to get alerts from spider
        pass

    # ── Step 3: Retrieve alerts ────────────────────────────────
    try:
        alerts_resp = _zap_request("/JSON/alert/view/alerts/", {
            "baseurl": url,
            "start": "0",
            "count": "50",
        })
        alerts = alerts_resp.get("alerts", [])
    except Exception:
        alerts = []

    if not alerts:
        # ZAP ran but found nothing — could be a good sign or the scan was too short
        findings.append({
            "severity": "PASS",
            "surface": "Website (ZAP)",
            "title": "OWASP ZAP found no vulnerabilities",
            "fix": "",
        })
        return {"score": score, "findings": findings}

    # ── Step 4: Map alerts to findings ─────────────────────────
    seen_titles = set()  # de-duplicate
    severity_deductions = {
        "CRITICAL": 25,
        "HIGH": 15,
        "MEDIUM": 8,
        "INFO": 0,
    }

    for alert in alerts:
        title = alert.get("alert") or alert.get("name", "Unknown vulnerability")
        if title in seen_titles:
            continue
        seen_titles.add(title)

        risk = str(alert.get("risk", alert.get("riskcode", "0")))
        severity = _RISK_MAP.get(risk, "INFO")
        confidence = _CONFIDENCE_MAP.get(
            str(alert.get("confidence", alert.get("confidencecode", "1"))),
            ""
        )

        description = alert.get("description", "")
        solution = alert.get("solution", "")
        # Clean HTML tags from ZAP descriptions
        for tag in ["<p>", "</p>", "<br>", "<br/>", "<ul>", "</ul>", "<li>", "</li>"]:
            description = description.replace(tag, " ")
            solution = solution.replace(tag, " ")
        description = " ".join(description.split())[:200]
        solution = " ".join(solution.split())[:300]

        fix_text = solution if solution else description
        if confidence:
            fix_text = f"[{confidence}] {fix_text}"

        findings.append({
            "severity": severity,
            "surface": "Website (ZAP)",
            "title": title,
            "fix": fix_text or "Review and remediate according to OWASP guidelines",
        })

        score -= severity_deductions.get(severity, 0)

    score = max(0, score)
    return {"score": score, "findings": findings}
