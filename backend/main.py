from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from website_scanner import scan_website
from app_scanner import scan_app
from code_scanner import scan_codebase
from scorer import calculate_final_score
from chat import get_chat_response
import asyncio
import json
import time
from datetime import datetime

app = FastAPI(title="SecurePulse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global SSE event queue ─────────────────────────────────────
event_queue: asyncio.Queue = asyncio.Queue(maxsize=500)

# ── Request models ─────────────────────────────────────────────

class ScanRequest(BaseModel):
    website_url: str = ""
    app_url: str = ""
    repo_url: str = ""

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    scan_context: Optional[dict] = None

class TicketRequest(BaseModel):
    name: str
    email: str
    subject: str
    priority: str = "medium"
    description: str
    scan_id: Optional[str] = None

# ── Helpers ────────────────────────────────────────────────────

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


def classify_request(method: str, path: str, ua: str, status: int) -> dict:
    """Classify incoming request severity and type."""
    ua_lower = ua.lower()
    path_lower = path.lower()

    scanners = ["nuclei", "nmap", "sqlmap", "nikto", "burpsuite", "zgrab",
                "masscan", "dirbuster", "gobuster", "wfuzz", "hydra", "curl/"]
    is_scanner = any(s in ua_lower for s in scanners)

    sqli_patterns = ["union", "select", "drop", "insert", "--", "1=1", "or 1"]
    xss_patterns = ["<script", "javascript:", "onerror=", "alert("]
    traversal = ["../", "..\\", "etc/passwd", "windows/system32"]
    admin_paths = ["/admin", "/wp-admin", "/.env", "/config", "/phpmyadmin",
                   "/.git", "/backup", "/shell", "/cmd", "/eval"]

    full = path_lower + ua_lower
    if any(p in full for p in sqli_patterns):
        return {"sev": "CRITICAL", "type": "SQLi", "msg": "SQL injection probe detected"}
    if any(p in full for p in xss_patterns):
        return {"sev": "CRITICAL", "type": "XSS", "msg": "XSS payload in request"}
    if any(p in full for p in traversal):
        return {"sev": "CRITICAL", "type": "PathTraversal", "msg": "Directory traversal attempt"}
    if any(p in path_lower for p in admin_paths):
        return {"sev": "HIGH", "type": "Recon", "msg": f"Sensitive path probe: {path}"}
    if is_scanner:
        return {"sev": "HIGH", "type": "Scanner", "msg": f"Known scanner detected: {ua[:40]}"}
    if status == 404 and method == "GET":
        return {"sev": "INFO", "type": "Recon", "msg": f"404 probe: {path}"}
    if status >= 500:
        return {"sev": "HIGH", "type": "Error", "msg": f"Server error triggered: {path}"}
    if method in ["POST", "PUT", "DELETE"] and "/scan" not in path:
        return {"sev": "MEDIUM", "type": "Mutation", "msg": f"{method} on {path}"}
    return {"sev": "INFO", "type": "Request", "msg": f"{method} {path} → {status}"}


# ── Threat logger middleware ───────────────────────────────────

@app.middleware("http")
async def threat_logger(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000)

    # Skip /events itself to avoid feedback loop
    if request.url.path == "/events":
        return response

    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    method = request.method
    path = request.url.path
    status = response.status_code

    classification = classify_request(method, path, ua, status)

    event = {
        "ts": time.strftime("%H:%M:%S"),
        "ip": ip,
        "method": method,
        "path": path,
        "status": status,
        "ua": ua[:80],
        "duration_ms": duration_ms,
        **classification,
    }

    try:
        event_queue.put_nowait(event)
    except asyncio.QueueFull:
        pass

    return response


# ── Routes ─────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "SecurePulse API is running", "version": "2.0"}


@app.get("/events")
async def sse_events():
    """Server-Sent Events stream for live threat terminal."""
    async def generate():
        while True:
            try:
                event = await asyncio.wait_for(event_queue.get(), timeout=15.0)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


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


@app.post("/chat")
async def chat(request: ChatRequest):
    """PulseAssistant - Groq-powered security advisor chat endpoint."""
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        response_text = await get_chat_response(messages, request.scan_context)
        return {"response": response_text, "success": True}
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "authentication" in error_msg.lower():
            msg = "API key invalid. Please check your GROQ_API_KEY in the .env file."
        elif "429" in error_msg:
            msg = "Rate limit reached. Please wait a moment before sending another message."
        elif "timeout" in error_msg.lower():
            msg = "The request timed out. Please try again."
        else:
            msg = f"PulseAssistant encountered an error: {error_msg}"
        return {"response": msg, "success": False}


@app.post("/ticket")
async def create_ticket(request: TicketRequest):
    """Create a support ticket."""
    ticket_id = f"TKT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    return {
        "success": True,
        "ticket_id": ticket_id,
        "message": f"Ticket {ticket_id} created successfully. You'll receive a response at {request.email} within 2 hours.",
        "priority": request.priority,
        "estimated_response": "< 2 hours" if request.priority in ["high", "critical"] else "< 24 hours"
    }


@app.get("/status")
async def system_status():
    """Return current system status for the Support page."""
    return {
        "overall": "operational",
        "components": [
            {"name": "Global Nodes", "status": "operational", "latency_ms": 12},
            {"name": "Scan Engine", "status": "operational", "latency_ms": 340},
            {"name": "Vulnerability DB", "status": "operational", "updated": "2h ago"},
            {"name": "AI Advisor", "status": "operational", "latency_ms": 800},
            {"name": "API Gateway", "status": "operational", "latency_ms": 45},
        ],
        "incidents": [],
        "updates": [
            {
                "title": "Vulnerability Database v4.2",
                "time": "2h ago",
                "desc": "New signatures for quantum-resistant encryption bypass attempts have been added.",
                "type": "update"
            },
            {
                "title": "Scheduled Maintenance",
                "time": "1d ago",
                "desc": "APAC Regional Nodes underwent telemetry optimization successfully.",
                "type": "maintenance"
            },
            {
                "title": "Sentinel Core Patch 8.0",
                "time": "3d ago",
                "desc": "Major upgrade to the neural processing engine for predictive threat detection.",
                "type": "patch"
            }
        ]
    }