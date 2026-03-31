"""
OWASP ZAP Scanner Module
────────────────────────
Uses the ZAP REST API to spider and actively scan a target URL,
then maps the alerts to the same finding format as the Python scanner.
"""

import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

ZAP_API_KEY  = os.getenv("ZAP_API_KEY", "951t3ride8omhad3b85oj63712")
ZAP_BASE_URL = os.getenv("ZAP_BASE_URL", "http://localhost:8080")

# Map ZAP risk levels to SecurePulse severity labels
_RISK_MAP = {
    "High":          "CRITICAL",
    "Medium":        "HIGH",
    "Low":           "MEDIUM",
    "Informational": "INFO",
    "3": "CRITICAL",
    "2": "HIGH",
    "1": "MEDIUM",
    "0": "INFO",
}

_CONFIDENCE_MAP = {
    "High":   "High confidence",
    "Medium": "Medium confidence",
    "Low":    "Low confidence",
    "3": "High confidence",
    "2": "Medium confidence",
    "1": "Low confidence",
    "0": "False positive",
}


def _zap_get(path: str, params: dict = None) -> dict:
    """Make a GET request to the ZAP REST API."""
    url = f"{ZAP_BASE_URL}{path}"
    p = {"apikey": ZAP_API_KEY}
    if params:
        p.update(params)
    r = requests.get(url, params=p, timeout=15)
    r.raise_for_status()
    return r.json()


def _wait_for_zap(max_wait: int = 60) -> bool:
    """
    Poll ZAP until it responds or the timeout is reached.
    Returns True if ZAP is ready, False if it timed out.
    """
    start = time.time()
    while time.time() - start < max_wait:
        try:
            _zap_get("/JSON/core/view/version/")
            return True
        except Exception:
            time.sleep(3)
    return False


def _wait_for_scan(scan_type: str, scan_id: str, max_wait: int = 180) -> bool:
    """
    Poll ZAP scan progress until 100% complete or timeout.
    scan_type: 'spider' or 'ascan'
    """
    endpoint = f"/JSON/{scan_type}/view/status/"
    start = time.time()
    while time.time() - start < max_wait:
        try:
            data     = _zap_get(endpoint, {"scanId": str(scan_id)})
            progress = int(data.get("status", "0"))
            if progress >= 100:
                return True
        except Exception:
            pass
        time.sleep(3)
    return False   # timed out — results may be partial


def scan_website_zap(url: str) -> dict:
    """
    Perform a ZAP spider + active scan on the given URL.
    Returns {"score": int, "findings": list[dict]}.
    """
    findings: list[dict] = []
    score = 100

    if not url.startswith("http"):
        url = "https://" + url

    # ── Step 0: Confirm ZAP is reachable ──────────────────────
    if not _wait_for_zap(max_wait=30):
        findings.append({
            "severity": "INFO",
            "surface": "Website (ZAP)",
            "title": "ZAP scanner is not reachable",
            "fix": (
                f"Could not connect to ZAP at {ZAP_BASE_URL}. "
                "Make sure ZAP is running. "
                "Local: run the zap.sh daemon command. "
                "Docker: run 'docker start zap' or check 'docker-compose up zap'."
            ),
        })
        return {"score": 0, "findings": findings}

    # ── Step 1: Spider ─────────────────────────────────────────
    spider_id = None
    try:
        resp = _zap_get("/JSON/spider/action/scan/", {
            "url":          url,
            "maxChildren":  "10",
            "recurse":      "true",
            "subtreeOnly":  "true",
        })
        spider_id = resp.get("scan")
        if spider_id is not None:
            _wait_for_scan("spider", spider_id, max_wait=90)
    except Exception as e:
        findings.append({
            "severity": "INFO",
            "surface":  "Website (ZAP)",
            "title":    f"ZAP spider phase failed: {str(e)[:80]}",
            "fix":      "Active scan will still run against the base URL.",
        })

    # ── Step 2: Active Scan ────────────────────────────────────
    scan_id = None
    try:
        resp = _zap_get("/JSON/ascan/action/scan/", {
            "url":            url,
            "recurse":        "true",
            "scanPolicyName": "",
        })
        scan_id = resp.get("scan")
        if scan_id is not None:
            _wait_for_scan("ascan", scan_id, max_wait=180)
    except Exception as e:
        findings.append({
            "severity": "INFO",
            "surface":  "Website (ZAP)",
            "title":    f"ZAP active scan failed: {str(e)[:80]}",
            "fix":      "Results will include passive scanning alerts only.",
        })

    # ── Step 3: Fetch Alerts ───────────────────────────────────
    try:
        resp   = _zap_get("/JSON/alert/view/alerts/", {
            "baseurl": url,
            "start":   "0",
            "count":   "100",
        })
        alerts = resp.get("alerts", [])
    except Exception as e:
        findings.append({
            "severity": "HIGH",
            "surface":  "Website (ZAP)",
            "title":    f"Could not retrieve ZAP alerts: {str(e)[:80]}",
            "fix":      "Check that ZAP is still running and the API key is correct.",
        })
        return {"score": 50, "findings": findings}

    if not alerts:
        findings.append({
            "severity": "PASS",
            "surface":  "Website (ZAP)",
            "title":    "OWASP ZAP found no vulnerabilities",
            "fix":      "",
        })
        return {"score": score, "findings": findings}

    # ── Step 4: Map Alerts to Findings ────────────────────────
    severity_deductions = {
        "CRITICAL": 25,
        "HIGH":     15,
        "MEDIUM":   8,
        "INFO":     0,
    }

    seen_titles: set[str] = set()

    for alert in alerts:
        title = alert.get("alert") or alert.get("name", "Unknown vulnerability")
        if title in seen_titles:
            continue   # de-duplicate
        seen_titles.add(title)

        risk       = str(alert.get("risk", alert.get("riskcode", "0")))
        severity   = _RISK_MAP.get(risk, "INFO")
        confidence = _CONFIDENCE_MAP.get(
            str(alert.get("confidence", alert.get("confidencecode", "1"))), ""
        )

        # Strip HTML tags from ZAP descriptions
        desc     = alert.get("description", "")
        solution = alert.get("solution", "")
        for tag in ["<p>", "</p>", "<br>", "<br/>", "<ul>", "</ul>", "<li>", "</li>"]:
            desc     = desc.replace(tag, " ")
            solution = solution.replace(tag, " ")
        desc     = " ".join(desc.split())[:250]
        solution = " ".join(solution.split())[:350]

        fix_text = solution if solution else desc
        if confidence:
            fix_text = f"[{confidence}] {fix_text}"

        # Include the specific URL that triggered this alert
        alert_url = alert.get("url", "")
        if alert_url and alert_url != url:
            fix_text += f" | Triggered on: {alert_url[:80]}"

        findings.append({
            "severity": severity,
            "surface":  "Website (ZAP)",
            "title":    title,
            "fix":      fix_text or "Review and remediate according to OWASP guidelines.",
        })

        score -= severity_deductions.get(severity, 0)

    # ── Add scan summary ───────────────────────────────────────
    counts = {k: 0 for k in ["CRITICAL", "HIGH", "MEDIUM", "INFO"]}
    for f in findings:
        if f["severity"] in counts:
            counts[f["severity"]] += 1

    findings.insert(0, {
        "severity": "INFO",
        "surface":  "Website (ZAP)",
        "title":    (
            f"ZAP scan complete: {len(alerts)} alert(s) found — "
            f"{counts['CRITICAL']} Critical, {counts['HIGH']} High, "
            f"{counts['MEDIUM']} Medium, {counts['INFO']} Info"
        ),
        "fix": "Results from OWASP ZAP active + passive scan.",
    })

    score = max(0, min(100, score))
    return {"score": score, "findings": findings}