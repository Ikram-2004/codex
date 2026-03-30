from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from website_scanner import scan_website
from app_scanner import scan_app
from code_scanner import scan_codebase
from scorer import calculate_final_score

app = FastAPI(title="SecurePulse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScanRequest(BaseModel):
    website_url: str = ""
    app_url: str = ""
    repo_url: str = ""

def is_valid_url(url: str) -> bool:
    url = url.strip()
    if not url:
        return False
    if len(url) < 4:
        return False
    if not (url.startswith("http://") or url.startswith("https://")):
        return False
    domain = url.replace("https://", "").replace("http://", "").split("/")[0]
    if "." not in domain:
        return False
    return True

@app.get("/")
def root():
    return {"status": "SecurePulse API is running"}

@app.post("/scan")
def run_scan(request: ScanRequest):
    all_findings = []
    website_score = None
    app_score = None
    code_score = None

    if is_valid_url(request.website_url):
        result = scan_website(request.website_url)
        website_score = result["score"]
        all_findings.extend(result["findings"])

    if is_valid_url(request.app_url):
        result = scan_app(request.app_url)
        app_score = result["score"]
        all_findings.extend(result["findings"])

    if request.repo_url.strip() and "github.com" in request.repo_url:
        result = scan_codebase(request.repo_url)
        code_score = result["score"]
        all_findings.extend(result["findings"])

    # Calculate final score only from scanned surfaces
    scores_to_average = [s for s in [website_score, app_score, code_score] if s is not None]
    if scores_to_average:
        final = calculate_final_score(
            website_score if website_score is not None else None,
            app_score if app_score is not None else None,
            code_score if code_score is not None else None
        )
    else:
        final = {"score": 0, "grade": "F", "message": "No valid URLs provided", "color": "red"}

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