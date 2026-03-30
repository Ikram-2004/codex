"""
CRUD Operations
───────────────
All database read/write functions for SecurePulse.
"""

import hashlib
import secrets
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import User, Scan, ScanFinding, Ticket, ChatHistory


def utcnow():
    return datetime.now(timezone.utc)


# ── Password Hashing ──────────────────────────────────────────
# Using SHA-256 + salt for simplicity in a hackathon MVP.
# For production, use bcrypt or argon2.

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}${hashed}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, stored_hash = password_hash.split("$", 1)
        test_hash = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
        return test_hash == stored_hash
    except Exception:
        return False


# ══════════════════════════════════════════════════════════════
#  USER CRUD
# ══════════════════════════════════════════════════════════════

def create_user(db: Session, email: str, name: str, password: str, company: str = "") -> User:
    """Register a new user. Returns the User object."""
    user = User(
        email=email.lower().strip(),
        name=name.strip(),
        password_hash=hash_password(password),
        company=company,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Check email + password. Returns User or None."""
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    # Update last login
    user.last_login = utcnow()
    db.commit()
    return user


def get_user_by_id(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.lower().strip()).first()


def update_user_preferences(db: Session, user_id: str, preferences: dict) -> User | None:
    """Update user's questionnaire preferences."""
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    if preferences.get("project_type"):
        user.pref_project_type = preferences["project_type"]
    if preferences.get("security_concern"):
        user.pref_security_concern = preferences["security_concern"]
    if preferences.get("experience_level"):
        user.pref_experience_level = preferences["experience_level"]
    if preferences.get("detail_level"):
        user.pref_detail_level = preferences["detail_level"]
    if preferences.get("deployment_env"):
        user.pref_deployment_env = preferences["deployment_env"]

    db.commit()
    db.refresh(user)
    return user


def update_user_profile(db: Session, user_id: str, name: str = None, company: str = None) -> User | None:
    """Update user's profile info (name, company)."""
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    if name is not None:
        user.name = name.strip()
    if company is not None:
        user.company = company.strip()

    db.commit()
    db.refresh(user)
    return user


# ══════════════════════════════════════════════════════════════
#  SCAN CRUD
# ══════════════════════════════════════════════════════════════

def save_scan(
    db: Session,
    user_id: str | None,
    website_url: str,
    app_url: str,
    repo_url: str,
    scanner_type: str,
    final_result: dict,
    scores: dict,
    findings: list[dict],
) -> Scan:
    """Persist a scan and its findings to the database."""
    # Count findings by severity
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "INFO": 0, "PASS": 0}
    for f in findings:
        sev = f.get("severity", "INFO")
        if sev in severity_counts:
            severity_counts[sev] += 1

    scan = Scan(
        user_id=user_id,
        website_url=website_url,
        app_url=app_url,
        repo_url=repo_url,
        scanner_type=scanner_type,
        final_score=final_result.get("score", 0),
        grade=final_result.get("grade", "F"),
        message=final_result.get("message", ""),
        color=final_result.get("color", "red"),
        website_score=scores.get("website"),
        app_score=scores.get("app"),
        code_score=scores.get("codebase"),
        critical_count=severity_counts["CRITICAL"],
        high_count=severity_counts["HIGH"],
        medium_count=severity_counts["MEDIUM"],
        info_count=severity_counts["INFO"],
        pass_count=severity_counts["PASS"],
    )
    db.add(scan)
    db.flush()   # get scan.id before adding findings

    for f in findings:
        finding = ScanFinding(
            scan_id=scan.id,
            severity=f.get("severity", "INFO"),
            surface=f.get("surface", ""),
            title=f.get("title", ""),
            fix=f.get("fix", ""),
        )
        db.add(finding)

    db.commit()
    db.refresh(scan)
    return scan


def get_scan_by_id(db: Session, scan_id: str) -> Scan | None:
    return db.query(Scan).filter(Scan.id == scan_id).first()


def get_scans_by_user(db: Session, user_id: str, limit: int = 50) -> list[Scan]:
    """Get all scans for a user, most recent first."""
    return (
        db.query(Scan)
        .filter(Scan.user_id == user_id)
        .order_by(Scan.scan_date.desc())
        .limit(limit)
        .all()
    )


def get_recent_scans(db: Session, limit: int = 20) -> list[Scan]:
    """Get the most recent scans (for dashboard / demo)."""
    return (
        db.query(Scan)
        .order_by(Scan.scan_date.desc())
        .limit(limit)
        .all()
    )


def get_scan_history_summary(db: Session, user_id: str) -> list[dict]:
    """Return a simplified list of past scans for the frontend."""
    scans = get_scans_by_user(db, user_id, limit=20)
    return [
        {
            "id": s.id,
            "date": s.scan_date.isoformat() if s.scan_date else "",
            "website_url": s.website_url,
            "app_url": s.app_url,
            "repo_url": s.repo_url,
            "score": s.final_score,
            "grade": s.grade,
            "color": s.color,
            "critical": s.critical_count,
            "high": s.high_count,
            "medium": s.medium_count,
            "findings_count": (
                s.critical_count + s.high_count + s.medium_count +
                s.info_count + s.pass_count
            ),
        }
        for s in scans
    ]


def get_scan_details(db: Session, scan_id: str) -> dict | None:
    """Full scan result with all findings — for revisiting past scans."""
    scan = get_scan_by_id(db, scan_id)
    if not scan:
        return None

    findings = [
        {
            "severity": f.severity,
            "surface": f.surface,
            "title": f.title,
            "fix": f.fix,
        }
        for f in scan.findings
    ]

    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "INFO": 3, "PASS": 4}
    findings.sort(key=lambda x: severity_order.get(x["severity"], 5))

    return {
        "final": {
            "score": scan.final_score,
            "grade": scan.grade,
            "message": scan.message,
            "color": scan.color,
        },
        "scores": {
            "website": scan.website_score,
            "app": scan.app_score,
            "codebase": scan.code_score,
        },
        "findings": findings,
        "meta": {
            "id": scan.id,
            "date": scan.scan_date.isoformat() if scan.scan_date else "",
            "website_url": scan.website_url,
            "app_url": scan.app_url,
            "repo_url": scan.repo_url,
            "scanner_type": scan.scanner_type,
        },
    }


# ══════════════════════════════════════════════════════════════
#  TICKET CRUD
# ══════════════════════════════════════════════════════════════

def create_ticket(
    db: Session,
    name: str,
    email: str,
    subject: str,
    priority: str,
    description: str,
    user_id: str | None = None,
    scan_id: str | None = None,
) -> Ticket:
    ticket_number = f"TKT-{utcnow().strftime('%Y%m%d%H%M%S')}"
    ticket = Ticket(
        ticket_number=ticket_number,
        user_id=user_id,
        name=name,
        email=email,
        subject=subject,
        priority=priority,
        description=description,
        scan_id=scan_id,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def get_tickets_by_user(db: Session, user_id: str) -> list[Ticket]:
    return (
        db.query(Ticket)
        .filter(Ticket.user_id == user_id)
        .order_by(Ticket.created_at.desc())
        .all()
    )


def get_tickets_by_email(db: Session, email: str) -> list[Ticket]:
    return (
        db.query(Ticket)
        .filter(Ticket.email == email.lower().strip())
        .order_by(Ticket.created_at.desc())
        .all()
    )


# ══════════════════════════════════════════════════════════════
#  CHAT HISTORY CRUD
# ══════════════════════════════════════════════════════════════

def save_chat_message(
    db: Session,
    role: str,
    content: str,
    user_id: str | None = None,
    session_id: str | None = None,
    chat_type: str = "advisor",
    scan_context: dict | None = None,
) -> ChatHistory:
    msg = ChatHistory(
        user_id=user_id,
        session_id=session_id or "",
        role=role,
        content=content,
        chat_type=chat_type,
        scan_context=scan_context,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_chat_history(
    db: Session,
    user_id: str,
    chat_type: str = "advisor",
    limit: int = 50,
) -> list[dict]:
    messages = (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == user_id, ChatHistory.chat_type == chat_type)
        .order_by(ChatHistory.created_at.asc())
        .limit(limit)
        .all()
    )
    return [
        {
            "role": m.role,
            "content": m.content,
            "timestamp": m.created_at.isoformat() if m.created_at else "",
        }
        for m in messages
    ]


# ══════════════════════════════════════════════════════════════
#  DASHBOARD STATS
# ══════════════════════════════════════════════════════════════

def get_dashboard_stats(db: Session, user_id: str) -> dict:
    """Aggregate stats for the user's dashboard."""
    scans = get_scans_by_user(db, user_id, limit=100)
    if not scans:
        return {
            "total_scans": 0,
            "avg_score": 0,
            "best_grade": "-",
            "latest_score": 0,
            "critical_total": 0,
            "high_total": 0,
            "score_trend": [],
        }

    total = len(scans)
    avg_score = round(sum(s.final_score for s in scans) / total)
    best_score = max(s.final_score for s in scans)
    grade_map = {90: "A", 75: "B", 55: "C", 35: "D", 0: "F"}
    best_grade = "F"
    for threshold, grade in sorted(grade_map.items(), reverse=True):
        if best_score >= threshold:
            best_grade = grade
            break

    critical_total = sum(s.critical_count for s in scans)
    high_total = sum(s.high_count for s in scans)

    # Score trend (last 10 scans, oldest → newest)
    recent = list(reversed(scans[:10]))
    score_trend = [
        {
            "date": s.scan_date.strftime("%b %d") if s.scan_date else "",
            "score": s.final_score,
        }
        for s in recent
    ]

    return {
        "total_scans": total,
        "avg_score": avg_score,
        "best_grade": best_grade,
        "latest_score": scans[0].final_score,
        "critical_total": critical_total,
        "high_total": high_total,
        "score_trend": score_trend,
    }