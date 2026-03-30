import requests
import re
import os
from dotenv import load_dotenv

load_dotenv()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

def scan_codebase(repo_url):
    """
    Scans a GitHub repository for security issues.
    repo_url example: https://github.com/username/reponame
    """
    findings = []
    score = 100

    # Parse the repo URL to get owner and repo name
    # e.g. https://github.com/alice/myapp → alice, myapp
    parts = repo_url.rstrip("/").split("/")
    if len(parts) < 5:
        return {
            "score": 0,
            "findings": [{
                "severity": "HIGH",
                "surface": "Codebase",
                "title": "Invalid GitHub URL",
                "fix": "Enter a full GitHub URL like: https://github.com/username/reponame"
            }]
        }

    owner = parts[-2]
    repo = parts[-1]

    headers = {}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"

    repo_info = requests.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers).json()
    default_branch = repo_info.get("default_branch", "main")

    # --- CHECK 1: Does .gitignore exist? ---
    try:
        r = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/contents/.gitignore",
            headers=headers, timeout=5
        )
        if r.status_code == 404:
            findings.append({
                "severity": "HIGH",
                "surface": "Codebase",
                "title": "No .gitignore file found",
                "fix": "Create a .gitignore file to prevent accidentally committing secrets, node_modules, and .env files"
            })
            score -= 15
        else:
            findings.append({
                "severity": "PASS",
                "surface": "Codebase",
                "title": ".gitignore file exists",
                "fix": ""
            })
    except:
        findings.append({
        "severity": "INFO",
        "surface": "System",
        "title": "Error occurred while checking for .gitignore",
        "fix": "Check API connectivity or input data"
    })

    # --- CHECK 2: Check package.json for vulnerable dependencies ---
    try:
        r = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/contents/package.json",
            headers=headers, timeout=5
        )
        if r.status_code == 200:
            import base64, json
            content = base64.b64decode(r.json()["content"]).decode("utf-8")
            pkg = json.loads(content)
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

            # Ask Google's OSV (Open Source Vulnerability) database
            for dep_name, dep_version in list(deps.items())[:10]:  # check first 10
                version = dep_version.replace("^", "").replace("~", "").replace(">=", "")
                osv_payload = {
                    "package": {"name": dep_name, "ecosystem": "npm"},
                    "version": version
                }
                try:
                    osv_r = requests.post(
                        "https://api.osv.dev/v1/query",
                        json=osv_payload,
                        timeout=5
                    )
                    if osv_r.status_code == 200:
                        vulns = osv_r.json().get("vulns", [])
                        if vulns:
                            findings.append({
                                "severity": "HIGH",
                                "surface": "Codebase",
                                "title": f"{dep_name}@{version} has {len(vulns)} known vulnerability/vulnerabilities",
                                "fix": f"Run: npm install {dep_name}@latest to upgrade to the secure version"
                            })
                            score -= 15
                except:
                    pass
    except:
        pass

    # --- CHECK 3: Scan files for hardcoded secrets ---
    secret_patterns = [
        (r'AKIA[0-9A-Z]{16}', 'AWS Access Key'),
        (r'sk_live_[0-9a-zA-Z]{24}', 'Stripe Live Secret Key'),
        (r'AIza[0-9A-Za-z\-_]{35}', 'Google API Key'),
        (r'password\s*=\s*["\'][^"\']{6,}["\']', 'Hardcoded password'),
        (r'secret\s*=\s*["\'][^"\']{6,}["\']', 'Hardcoded secret'),
    ]

    try:
        # Get the list of files in the repo
        r = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1",
            headers=headers, timeout=5
        )
        if r.status_code == 200:
            tree = r.json().get("tree", [])
            # Only scan small text files
            code_files = [
                f for f in tree
                if f["type"] == "blob"
                and f.get("size", 0) < 100000
                and any(f["path"].endswith(ext) for ext in [".js", ".py", ".env", ".json", ".ts", ".php"])
            ]

            secrets_found = []
            priority_keywords = [".env", "config", "settings", "secrets"]

            priority_files = []
            normal_files = []

            for f in code_files:
                if any(keyword in f["path"].lower() for keyword in priority_keywords):
                    priority_files.append(f)
                else:
                    normal_files.append(f)
            
            files_to_scan = priority_files + normal_files
            
            for file in files_to_scan[:20]:  # limit to 20 files
                try:
                    raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{file['path']}"
                    
                    response = requests.get(raw_url, timeout=5)

                    if response.status_code != 200:
                        findings.append({
                            "severity": "INFO",
                            "surface": "Codebase",
                            "title": f"Failed to fetch file: {file['path']}",
                            "fix": f"HTTP {response.status_code} returned. Check repository access or rate limits."
                        })
                    else:
                        content = response.text

                        for pattern, secret_name in secret_patterns:
                            match = re.search(pattern, content, re.IGNORECASE)
                            if match:
                                secrets_found.append({
                                    "type": secret_name,
                                    "file": file['path'],
                                    "snippet": match.group(0)[:50]  # show part of the secret safely
                                })

                except requests.exceptions.Timeout:
                    findings.append({
                        "severity": "INFO",
                        "surface": "System",
                        "title": f"Timeout while scanning file: {file['path']}",
                        "fix": "Increase timeout or optimize scanning"
                    })

                except requests.exceptions.RequestException as e:
                    findings.append({
                        "severity": "INFO",
                        "surface": "System",
                        "title": f"Request error for file {file['path']}: {str(e)}",
                        "fix": "Check network or API limits"
                    })

                except Exception as e:
                    findings.append({
                        "severity": "LOW",
                        "surface": "System",
                        "title": f"Unexpected error scanning {file['path']}: {str(e)}",
                        "fix": "Investigate edge case"
                    })

            if secrets_found:
                for secret in secrets_found[:3]:  # report max 3
                    findings.append({
                        "severity": "CRITICAL",
                        "surface": "Codebase",
                        "title": f"Secret found: {secret}",
                        "fix": "Remove this immediately, rotate the key, and use environment variables (.env) instead"
                    })
                    score -= 30
            else:
                findings.append({
                    "severity": "PASS",
                    "surface": "Codebase",
                    "title": "No hardcoded secrets detected in scanned files",
                    "fix": ""
                })
    except:
        pass

    score = max(0, score)
    return {"score": score, "findings": findings}