from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from website_scanner import scan_website
from app_scanner import scan_app
from code_scanner import scan_codebase
from scorer import calculate_final_score

app = FastAPI(title="SecurePulse API")

# This allows your frontend (running on a different port) to talk to your backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define what data the frontend will send us
class ScanRequest(BaseModel):
    website_url: str = ""
    app_url: str = ""
    repo_url: str = ""

@app.get("/")
def root():
    return {"status": "SecurePulse API is running"}

@app.post("/scan")
def run_scan(request: ScanRequest):
    """
    Main scan endpoint.
    Frontend sends 3 URLs, we scan all 3 and return results.
    """
    all_findings = []
    website_score = 100
    app_score = 100
    code_score = 100

    # Scan website if URL was provided
    if request.website_url:
        result = scan_website(request.website_url)
        website_score = result["score"]
        all_findings.extend(result["findings"])

    # Scan app if URL was provided
    if request.app_url:
        result = scan_app(request.app_url)
        app_score = result["score"]
        all_findings.extend(result["findings"])

    # Scan codebase if repo URL was provided
    if request.repo_url:
        result = scan_codebase(request.repo_url)
        code_score = result["score"]
        all_findings.extend(result["findings"])

    # Calculate final grade
    final = calculate_final_score(website_score, app_score, code_score)

    # Sort findings: CRITICAL first, then HIGH, then MEDIUM, then INFO, then PASS
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "INFO": 3, "PASS": 4}
    all_findings.sort(key=lambda x: severity_order.get(x["severity"], 5))

    return {
        "final": final,
        "scores": {
            "website": website_score,
            "app": app_score,
            "codebase": code_score
        },
        "findings": all_findings
    }