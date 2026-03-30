import requests
import re
import os
import base64
import json
import logging
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────
SCORE_DEDUCTIONS = {
    "no_gitignore":        15,
    "vulnerable_dep":      15,
    "secret_found":        30,
    "no_security_policy":   5,
    "no_dependabot":        5,
    "no_readme":            5,
}

SECRET_PATTERNS = [
    (r'AKIA[0-9A-Z]{16}',                          "AWS Access Key ID"),
    (r'sk_live_[0-9a-zA-Z]{24,}',                  "Stripe Live Secret Key"),
    (r'rk_live_[0-9a-zA-Z]{24,}',                  "Stripe Restricted Key"),
    (r'AIza[0-9A-Za-z\-_]{35}',                    "Google API Key"),
    (r'ghp_[0-9a-zA-Z]{36}',                       "GitHub Personal Access Token"),
    (r'-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----', "Private Key"),
    (r'(?i)password\s*[:=]\s*["\'][^"\']{8,}["\']', "Hardcoded Password"),
    (r'(?i)secret\s*[:=]\s*["\'][^"\']{8,}["\']',   "Hardcoded Secret"),
    (r'(?i)api[_-]?key\s*[:=]\s*["\'][^"\']{8,}["\']', "Hardcoded API Key"),
    (r'(?i)auth[_-]?token\s*[:=]\s*["\'][^"\']{8,}["\']', "Hardcoded Auth Token"),
]

SCANNABLE_EXTENSIONS = {
    ".js", ".jsx", ".ts", ".tsx", ".py", ".php",
    ".rb", ".go", ".java", ".env", ".json", ".yaml", ".yml",
    ".toml", ".ini", ".cfg", ".conf",
}

PRIORITY_KEYWORDS = [".env", "config", "settings", "secret", "credential", "auth", "key"]

MAX_FILES_TO_SCAN = 25
MAX_FILE_SIZE_BYTES = 150_000
MAX_DEPS_TO_CHECK = 15
MAX_SECRETS_TO_REPORT = 5


# ── Helpers ────────────────────────────────────────────────────

def _github_headers() -> dict:
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def _redact_secret(raw_match: str) -> str:
    """Show only enough of the match to identify it without exposing the value."""
    if len(raw_match) <= 8:
        return "***"
    return raw_match[:4] + "***" + raw_match[-2:]


def _parse_repo_url(repo_url: str) -> tuple[str, str] | None:
    """Return (owner, repo) or None if the URL is invalid."""
    cleaned = repo_url.rstrip("/")
    if cleaned.endswith(".git"):
        cleaned = cleaned[:-4]
    parts = cleaned.split("/")
    if len(parts) >= 5 and "github.com" in parts:
        return parts[-2], parts[-1]
    return None


def _get_json(url: str, headers: dict, timeout: int = 8) -> dict | None:
    """GET a URL and return parsed JSON, or None on any error."""
    try:
        r = requests.get(url, headers=headers, timeout=timeout)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        logger.warning("HTTP error fetching %s: %s", url, e)
        return None
    except requests.exceptions.RequestException as e:
        logger.warning("Request error fetching %s: %s", url, e)
        return None


def _get_text(url: str, timeout: int = 8) -> str | None:
    """GET a URL and return the response text, or None on any error."""
    try:
        r = requests.get(url, timeout=timeout)
        r.raise_for_status()
        return r.text
    except requests.exceptions.RequestException as e:
        logger.warning("Failed to fetch %s: %s", url, e)
        return None


# ── Individual checks ──────────────────────────────────────────

def _check_gitignore(owner: str, repo: str, headers: dict) -> tuple[list, int]:
    findings, deduction = [], 0
    data = _get_json(
        f"https://api.github.com/repos/{owner}/{repo}/contents/.gitignore",
        headers
    )
    if data is None:
        findings.append({
            "severity": "HIGH",
            "surface": "Codebase",
            "title": "No .gitignore file found",
            "fix": "Add a .gitignore to prevent committing secrets, node_modules, build artifacts, and .env files.",
        })
        deduction = SCORE_DEDUCTIONS["no_gitignore"]
    else:
        findings.append({
            "severity": "PASS",
            "surface": "Codebase",
            "title": ".gitignore is present",
            "fix": "",
        })
    return findings, deduction


def _check_security_policy(owner: str, repo: str, headers: dict) -> tuple[list, int]:
    """Check for a SECURITY.md or .github/SECURITY.md file."""
    findings, deduction = [], 0
    found = False
    for path in ["SECURITY.md", ".github/SECURITY.md"]:
        data = _get_json(
            f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
            headers
        )
        if data is not None:
            found = True
            break

    if found:
        findings.append({
            "severity": "PASS",
            "surface": "Codebase",
            "title": "Security policy (SECURITY.md) is present",
            "fix": "",
        })
    else:
        findings.append({
            "severity": "INFO",
            "surface": "Codebase",
            "title": "No SECURITY.md found",
            "fix": "Add a SECURITY.md to document how to report vulnerabilities responsibly.",
        })
        deduction = SCORE_DEDUCTIONS["no_security_policy"]
    return findings, deduction

def _check_readme(owner: str, repo: str, headers: dict) -> tuple[list, int]:
    """Check if the repository has a README file."""
    findings = []
    deduction = 0

    # GitHub API automatically resolves README (case-insensitive)
    data = _get_json(
        f"https://api.github.com/repos/{owner}/{repo}/readme",
        headers
    )

    if data is None:
        findings.append({
            "severity": "INFO",
            "surface": "Codebase",
            "title": "No README.md found",
            "fix": "Add a README.md explaining setup, usage, and security considerations.",
        })
        deduction = SCORE_DEDUCTIONS["no_readme"]
    else:
        findings.append({
            "severity": "PASS",
            "surface": "Codebase",
            "title": "README.md is present",
            "fix": "",
        })

    return findings, deduction


def _check_dependabot(owner: str, repo: str, headers: dict) -> tuple[list, int]:
    """Check for a Dependabot config."""
    findings, deduction = [], 0
    data = _get_json(
        f"https://api.github.com/repos/{owner}/{repo}/contents/.github/dependabot.yml",
        headers
    )
    if data is not None:
        findings.append({
            "severity": "PASS",
            "surface": "Codebase",
            "title": "Dependabot is configured",
            "fix": "",
        })
    else:
        findings.append({
            "severity": "INFO",
            "surface": "Codebase",
            "title": "Dependabot not configured",
            "fix": "Add .github/dependabot.yml to automate dependency security updates.",
        })
        deduction = SCORE_DEDUCTIONS["no_dependabot"]
    return findings, deduction


def _check_npm_dependencies(owner: str, repo: str, headers: dict) -> tuple[list, int]:
    """Fetch package.json and check each dep against the OSV database."""
    findings, total_deduction = [], 0

    data = _get_json(
        f"https://api.github.com/repos/{owner}/{repo}/contents/package.json",
        headers
    )
    if data is None:
        return findings, 0  # No package.json — not an npm project, skip silently

    try:
        raw = base64.b64decode(data["content"]).decode("utf-8")
        pkg = json.loads(raw)
    except (KeyError, ValueError) as e:
        logger.warning("Could not parse package.json: %s", e)
        return findings, 0

    deps: dict = {
        **pkg.get("dependencies", {}),
        **pkg.get("devDependencies", {}),
    }

    if not deps:
        return findings, 0

    vulnerable_count = 0
    checked_count = 0

    for dep_name, dep_version in list(deps.items())[:MAX_DEPS_TO_CHECK]:
        # Strip semver range prefixes
        clean_version = re.sub(r'^[\^~>=<*]+ ?', '', dep_version).split(" ")[0]
        if not clean_version or clean_version in ("*", "latest"):
            continue

        try:
            osv_response = requests.post(
                "https://api.osv.dev/v1/query",
                json={
                    "package": {"name": dep_name, "ecosystem": "npm"},
                    "version": clean_version,
                },
                timeout=6,
            )
            osv_response.raise_for_status()
            vulns = osv_response.json().get("vulns", [])
            checked_count += 1

            if vulns:
                # Pull the severity from the first vuln if available
                severity_label = "HIGH"
                try:
                    severity_label = vulns[0]["severity"][0]["score"] if vulns[0].get("severity") else "HIGH"
                except (KeyError, IndexError, TypeError):
                    pass

                findings.append({
                    "severity": "HIGH",
                    "surface": "Codebase",
                    "title": f"{dep_name}@{clean_version} — {len(vulns)} known CVE(s)",
                    "fix": f"Run: npm install {dep_name}@latest",
                })
                total_deduction = min(
                    total_deduction + SCORE_DEDUCTIONS["vulnerable_dep"],
                    45  # cap dependency deductions at 45 points total
                )
                vulnerable_count += 1

        except requests.exceptions.RequestException as e:
            logger.warning("OSV query failed for %s@%s: %s", dep_name, clean_version, e)

    if checked_count > 0 and vulnerable_count == 0:
        findings.append({
            "severity": "PASS",
            "surface": "Codebase",
            "title": f"No known vulnerabilities in {checked_count} checked npm dependencies",
            "fix": "",
        })

    return findings, total_deduction


def _check_secrets(
    owner: str, repo: str, default_branch: str, headers: dict, tree: list
) -> tuple[list, int]:
    """Scan repository files for hardcoded secrets."""
    findings, total_deduction = [], 0

    scannable = [
        f for f in tree
        if f.get("type") == "blob"
        and f.get("size", 0) < MAX_FILE_SIZE_BYTES
        and os.path.splitext(f["path"])[1].lower() in SCANNABLE_EXTENSIONS
    ]

    # Prioritise files more likely to contain secrets
    priority = [f for f in scannable if any(kw in f["path"].lower() for kw in PRIORITY_KEYWORDS)]
    normal   = [f for f in scannable if f not in priority]
    files_to_scan = (priority + normal)[:MAX_FILES_TO_SCAN]

    secrets_found: list[dict] = []

    for file_info in files_to_scan:
        path = file_info["path"]
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{path}"
        content = _get_text(raw_url)

        if content is None:
            logger.debug("Skipped %s (fetch failed)", path)
            continue

        for pattern, secret_name in SECRET_PATTERNS:
            match = re.search(pattern, content, re.IGNORECASE | re.MULTILINE)
            if match and len(secrets_found) < MAX_SECRETS_TO_REPORT:
                secrets_found.append({
                    "name": secret_name,
                    "file": path,
                    "preview": _redact_secret(match.group(0)),
                })

        if len(secrets_found) >= MAX_SECRETS_TO_REPORT:
            break

    if secrets_found:
        for secret in secrets_found:
            findings.append({
                "severity": "CRITICAL",
                "surface": "Codebase",
                "title": f"Exposed secret in {secret['file']}: {secret['name']} ({secret['preview']})",
                "fix": (
                    "1. Remove the secret from the file immediately. "
                    "2. Rotate / revoke the key. "
                    "3. Use environment variables or a secrets manager instead. "
                    "4. Consider using git-filter-repo to purge it from history."
                ),
            })
            total_deduction = min(
                total_deduction + SCORE_DEDUCTIONS["secret_found"],
                60  # cap secret deductions at 60 points
            )
    else:
        findings.append({
            "severity": "PASS",
            "surface": "Codebase",
            "title": f"No hardcoded secrets detected across {len(files_to_scan)} scanned files",
            "fix": "",
        })

    return findings, total_deduction


# ── Public entry point ─────────────────────────────────────────

def scan_codebase(repo_url: str) -> dict:
    """
    Scan a GitHub repository for common security issues.

    Returns:
        {
            "score": int (0–100),
            "findings": list[dict]   — each with severity, surface, title, fix
        }
    """
    parsed = _parse_repo_url(repo_url)
    if not parsed:
        return {
            "score": 0,
            "findings": [{
                "severity": "HIGH",
                "surface": "Codebase",
                "title": "Invalid GitHub repository URL",
                "fix": "Provide a full URL in the format: https://github.com/username/reponame",
            }],
        }

    owner, repo = parsed
    headers = _github_headers()
    all_findings: list[dict] = []
    total_deduction = 0

    # ── Fetch repo metadata ────────────────────────────────────
    repo_info = _get_json(f"https://api.github.com/repos/{owner}/{repo}", headers)
    if repo_info is None:
        return {
            "score": 0,
            "findings": [{
                "severity": "HIGH",
                "surface": "Codebase",
                "title": "Repository not found or not accessible",
                "fix": "Check that the URL is correct and the repository is public (or your token has access).",
            }],
        }

    default_branch = repo_info.get("default_branch", "main")

    # ── Fetch file tree once (reused by secret scanner) ───────
    tree_data = _get_json(
        f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1",
        headers,
    )
    tree = tree_data.get("tree", []) if tree_data else []
    if not tree:
        logger.warning("Could not retrieve file tree for %s/%s", owner, repo)

    # ── Run checks ─────────────────────────────────────────────
    checks = [
        _check_gitignore(owner, repo, headers),
        _check_security_policy(owner, repo, headers),
        _check_readme(owner, repo, headers),
        _check_dependabot(owner, repo, headers),
        _check_npm_dependencies(owner, repo, headers),
        _check_secrets(owner, repo, default_branch, headers, tree),
    ]

    for findings, deduction in checks:
        all_findings.extend(findings)
        total_deduction += deduction

    final_score = max(0, min(100, 100 - total_deduction))

    return {
        "score": final_score,
        "findings": all_findings,
    }
