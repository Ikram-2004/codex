from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from website_scanner import scan_website
from zap_scanner import scan_website_zap
from app_scanner import scan_app
from code_scanner import scan_codebase
from scorer import calculate_final_score
from chat import get_chat_response
from support import (
    KNOWLEDGE_DOMAINS,
    search_knowledge_base,
    get_live_chat_response
)
from database import get_db, init_db
import crud

import asyncio
import json
import time
import tempfile
import os
import shutil
from datetime import datetime

app = FastAPI(title="SecurePulse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Initialize database on startup ────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()

# ── Global SSE event queue ─────────────────────────────────────
event_queue: asyncio.Queue = asyncio.Queue(maxsize=500)

# ── Request models ─────────────────────────────────────────────

class UserPreferences(BaseModel):
    project_type: str = ""
    security_concern: str = ""
    experience_level: str = ""
    detail_level: str = ""
    deployment_env: str = ""

class ScanRequest(BaseModel):
    website_url: str = ""
    app_url: str = ""
    repo_url: str = ""
    scanner_type: str = "python"   # "python" | "zap"
    user_preferences: Optional[UserPreferences] = None
    user_id: Optional[str] = None  # link scan to a logged-in user

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    scan_context: Optional[dict] = None
    user_preferences: Optional[UserPreferences] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None

class TicketRequest(BaseModel):
    name: str
    email: str
    subject: str
    priority: str = "medium"
    description: str
    scan_id: Optional[str] = None
    user_id: Optional[str] = None

class SearchRequest(BaseModel):
    query: str

class LiveChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_id: Optional[str] = None

class CommandRequest(BaseModel):
    name: str
    email: str
    company: str = ""
    message: str
    urgency: str = "medium"

# ── Auth models ────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str
    company: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdatePreferencesRequest(BaseModel):
    user_id: str
    preferences: UserPreferences

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


# ══════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ══════════════════════════════════════════════════════════════

@app.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing = crud.get_user_by_email(db, req.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = crud.create_user(db, req.email, req.name, req.password, req.company)
    return {
        "success": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "company": user.company,
            "created_at": user.created_at.isoformat() if user.created_at else "",
        },
    }


@app.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate and return user data."""
    user = crud.authenticate_user(db, req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "success": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "company": user.company,
            "preferences": {
                "project_type": user.pref_project_type,
                "security_concern": user.pref_security_concern,
                "experience_level": user.pref_experience_level,
                "detail_level": user.pref_detail_level,
                "deployment_env": user.pref_deployment_env,
            },
        },
    }


@app.get("/auth/user/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get user profile by ID."""
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "company": user.company,
        "created_at": user.created_at.isoformat() if user.created_at else "",
        "preferences": {
            "project_type": user.pref_project_type,
            "security_concern": user.pref_security_concern,
            "experience_level": user.pref_experience_level,
            "detail_level": user.pref_detail_level,
            "deployment_env": user.pref_deployment_env,
        },
    }


@app.put("/auth/preferences")
def update_preferences(req: UpdatePreferencesRequest, db: Session = Depends(get_db)):
    """Update user questionnaire preferences."""
    user = crud.update_user_preferences(db, req.user_id, req.preferences.dict())
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"success": True, "message": "Preferences updated"}


# ══════════════════════════════════════════════════════════════
#  CORE ROUTES
# ══════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"status": "SecurePulse API is running", "version": "3.0-db"}


@app.get("/events")
async def sse_events():
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


@app.post("/upload/apk")
async def upload_apk(file: UploadFile = File(...)):
    if not file.filename.endswith(".apk"):
        raise HTTPException(status_code=400, detail="File must be an APK")

    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"file_path": file_path}


@app.post("/scan")
def run_scan(request: ScanRequest, db: Session = Depends(get_db)):
    all_findings = []
    website_score = None
    app_score = None
    code_score = None

    if is_valid_url(request.website_url):
        if request.scanner_type == "zap":
            try:
                result = scan_website_zap(request.website_url)
            except Exception as zap_err:
                # Fallback to Python scanner if ZAP fails
                result = scan_website(request.website_url)
                result["findings"].insert(0, {
                    "severity": "INFO",
                    "surface": "Website",
                    "title": f"ZAP scanner unavailable, fell back to Python scanner ({str(zap_err)[:80]})",
                    "fix": "Make sure OWASP ZAP is running and configured in your .env file",
                })
        else:
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

    # ── Save scan to database ──────────────────────────────
    scores_dict = {"website": website_score, "app": app_score, "codebase": code_score}
    scan_record = crud.save_scan(
        db=db,
        user_id=request.user_id,
        website_url=request.website_url,
        app_url=request.app_url,
        repo_url=request.repo_url,
        scanner_type=request.scanner_type,
        final_result=final,
        scores=scores_dict,
        findings=all_findings,
    )

    return {
        "scan_id": scan_record.id,
        "final": final,
        "scores": scores_dict,
        "findings": all_findings,
    }


# ── Scan History ───────────────────────────────────────────────

@app.get("/scans/history/{user_id}")
def scan_history(user_id: str, db: Session = Depends(get_db)):
    """Get scan history for a user."""
    history = crud.get_scan_history_summary(db, user_id)
    return {"scans": history, "total": len(history)}


@app.get("/scans/{scan_id}")
def scan_details(scan_id: str, db: Session = Depends(get_db)):
    """Get full details of a past scan."""
    details = crud.get_scan_details(db, scan_id)
    if not details:
        raise HTTPException(status_code=404, detail="Scan not found")
    return details


# ── Dashboard Stats ────────────────────────────────────────────

@app.get("/dashboard/{user_id}")
def dashboard_stats(user_id: str, db: Session = Depends(get_db)):
    """Get aggregated dashboard statistics for a user."""
    stats = crud.get_dashboard_stats(db, user_id)
    return stats


# ══════════════════════════════════════════════════════════════
#  CHAT ROUTES (now with DB persistence)
# ══════════════════════════════════════════════════════════════

@app.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        # Save user message to DB
        if request.user_id and messages:
            last_msg = messages[-1]
            crud.save_chat_message(
                db=db,
                role=last_msg["role"],
                content=last_msg["content"],
                user_id=request.user_id,
                session_id=request.session_id,
                chat_type="advisor",
                scan_context=request.scan_context,
            )

        # Build preferences context for personalization
        prefs_context = None
        if request.user_preferences:
            p = request.user_preferences
            prefs_context = {
                "project_type": p.project_type,
                "security_concern": p.security_concern,
                "experience_level": p.experience_level,
                "detail_level": p.detail_level,
                "deployment_env": p.deployment_env,
            }

        response_text = await get_chat_response(messages, request.scan_context, prefs_context)

        # Save assistant response to DB
        if request.user_id:
            crud.save_chat_message(
                db=db,
                role="assistant",
                content=response_text,
                user_id=request.user_id,
                session_id=request.session_id,
                chat_type="advisor",
            )

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


@app.get("/chat/history/{user_id}")
def chat_history(user_id: str, chat_type: str = "advisor", db: Session = Depends(get_db)):
    """Get chat history for a user."""
    history = crud.get_chat_history(db, user_id, chat_type)
    return {"messages": history}


# ══════════════════════════════════════════════════════════════
#  SUPPORT ROUTES (now with DB persistence)
# ══════════════════════════════════════════════════════════════

@app.get("/support/knowledge")
async def get_knowledge_domains():
    """Return all knowledge domains and their articles (without full content)."""
    domains_summary = []
    for domain in KNOWLEDGE_DOMAINS:
        domains_summary.append({
            "id": domain["id"],
            "icon": domain["icon"],
            "color": domain["color"],
            "title": domain["title"],
            "desc": domain["desc"],
            "articles": [{"title": a["title"]} for a in domain["articles"]]
        })
    return {"domains": domains_summary}


@app.get("/support/knowledge/{domain_id}/{article_index}")
async def get_article(domain_id: str, article_index: int):
    """Return the full content of a specific article."""
    for domain in KNOWLEDGE_DOMAINS:
        if domain["id"] == domain_id:
            if 0 <= article_index < len(domain["articles"]):
                article = domain["articles"][article_index]
                return {
                    "domain": domain["title"],
                    "domain_color": domain["color"],
                    "title": article["title"],
                    "content": article["content"]
                }
    return {"error": "Article not found"}, 404


@app.post("/support/search")
async def search_support(request: SearchRequest):
    """AI-powered search through knowledge base."""
    try:
        result = await search_knowledge_base(request.query)
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "answer": f"Search error: {str(e)}", "articles": []}


@app.post("/ticket")
async def create_ticket_endpoint(request: TicketRequest, db: Session = Depends(get_db)):
    """Create a support ticket — now persisted to DB."""
    ticket = crud.create_ticket(
        db=db,
        name=request.name,
        email=request.email,
        subject=request.subject,
        priority=request.priority,
        description=request.description,
        user_id=request.user_id,
        scan_id=request.scan_id,
    )
    return {
        "success": True,
        "ticket_id": ticket.ticket_number,
        "message": f"Ticket {ticket.ticket_number} created successfully. You'll receive a response at {request.email} within 2 hours.",
        "priority": request.priority,
        "estimated_response": "< 2 hours" if request.priority in ["high", "critical"] else "< 24 hours"
    }


@app.get("/tickets/{user_id}")
def get_user_tickets(user_id: str, db: Session = Depends(get_db)):
    """Get all tickets for a user."""
    tickets = crud.get_tickets_by_user(db, user_id)
    return {
        "tickets": [
            {
                "id": t.id,
                "ticket_number": t.ticket_number,
                "subject": t.subject,
                "priority": t.priority,
                "status": t.status,
                "created_at": t.created_at.isoformat() if t.created_at else "",
                "description": t.description[:200],
            }
            for t in tickets
        ]
    }


@app.post("/support/livechat")
async def live_chat(request: LiveChatRequest, db: Session = Depends(get_db)):
    """AI-powered live support chat — now with DB persistence."""
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        # Save user message
        if request.user_id and messages:
            last_msg = messages[-1]
            crud.save_chat_message(
                db=db,
                role=last_msg["role"],
                content=last_msg["content"],
                user_id=request.user_id,
                chat_type="support",
            )

        response = await get_live_chat_response(messages)

        # Save assistant response
        if request.user_id:
            crud.save_chat_message(
                db=db,
                role="assistant",
                content=response,
                user_id=request.user_id,
                chat_type="support",
            )

        return {"success": True, "response": response}
    except Exception as e:
        return {"success": False, "response": f"Chat error: {str(e)}"}


@app.post("/support/command")
async def connect_with_command(request: CommandRequest):
    """Submit a request to connect with the security command team."""
    request_id = f"CMD-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    urgency_times = {
        "low": "within 48 hours",
        "medium": "within 24 hours",
        "high": "within 4 hours",
        "critical": "within 1 hour"
    }
    return {
        "success": True,
        "request_id": request_id,
        "message": f"Your request {request_id} has been routed to our security command team. A senior engineer will contact {request.email} {urgency_times.get(request.urgency, 'within 24 hours')}.",
        "estimated_response": urgency_times.get(request.urgency, "within 24 hours")
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