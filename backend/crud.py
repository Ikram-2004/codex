"""
CRUD Operations
───────────────
All database read/write functions for SecurePulse.
"""

import hashlib
import secrets
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import User, Scan, ScanFinding, Ticket, ChatHistory, Badge, UserBadge


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


# ══════════════════════════════════════════════════════════════
#  GAMIFICATION / BADGES CRUD
# ══════════════════════════════════════════════════════════════

BADGE_CATALOG = [
    # ── Fix badges ──────────────────────────────────────────────
    {"slug": "first_blood",        "name": "First Blood",        "description": "Fix at least 1 issue on a re-scan",                    "icon": "🗡️",  "category": "fix",       "surface": "any",     "threshold": 1,   "color": "#e84393", "sort_order": 1},
    {"slug": "bug_squasher",       "name": "Bug Squasher",       "description": "Fix 5+ issues in a single re-scan",                   "icon": "🐛",  "category": "fix",       "surface": "any",     "threshold": 5,   "color": "#00b894", "sort_order": 2},
    {"slug": "clean_sweep",        "name": "Clean Sweep",        "description": "Reduce all findings to zero on a re-scan",             "icon": "🧹",  "category": "fix",       "surface": "any",     "threshold": 0,   "color": "#00cec9", "sort_order": 3},
    {"slug": "critical_eliminator","name": "Critical Eliminator","description": "Remove all critical findings from a scan",              "icon": "💀",  "category": "fix",       "surface": "any",     "threshold": 0,   "color": "#d63031", "sort_order": 4},
    {"slug": "high_risk_hunter",   "name": "High Risk Hunter",   "description": "Remove all high-severity findings from a scan",        "icon": "🎯",  "category": "fix",       "surface": "any",     "threshold": 0,   "color": "#ffa502", "sort_order": 5},
    # ── Score badges ────────────────────────────────────────────
    {"slug": "rising_star",        "name": "Rising Star",        "description": "Reach a security score of 50 or above",                "icon": "⭐",  "category": "score",     "surface": "any",     "threshold": 50,  "color": "#fdcb6e", "sort_order": 6},
    {"slug": "security_pro",       "name": "Security Pro",       "description": "Reach a security score of 75 or above",                "icon": "🛡️",  "category": "score",     "surface": "any",     "threshold": 75,  "color": "#6c5ce7", "sort_order": 7},
    {"slug": "fortress_builder",   "name": "Fortress Builder",   "description": "Reach a security score of 90 or above",                "icon": "🏰",  "category": "score",     "surface": "any",     "threshold": 90,  "color": "#0984e3", "sort_order": 8},
    {"slug": "perfect_score",      "name": "Perfect Score",      "description": "Achieve a perfect security score of 100",              "icon": "💯",  "category": "score",     "surface": "any",     "threshold": 100, "color": "#00b894", "sort_order": 9},
    {"slug": "comeback_kid",       "name": "Comeback Kid",       "description": "Improve your score by 20+ points in one re-scan",      "icon": "🔄",  "category": "score",     "surface": "any",     "threshold": 20,  "color": "#e17055", "sort_order": 10},
    # ── Streak badges ───────────────────────────────────────────
    {"slug": "improving",          "name": "Improving",          "description": "3 consecutive scans with improving scores",            "icon": "📈",  "category": "streak",    "surface": "any",     "threshold": 3,   "color": "#00cec9", "sort_order": 11},
    {"slug": "on_fire",            "name": "On Fire",            "description": "5 consecutive scans with improving scores",            "icon": "🔥",  "category": "streak",    "surface": "any",     "threshold": 5,   "color": "#ff7675", "sort_order": 12},
    # ── Surface badges ──────────────────────────────────────────
    {"slug": "web_guardian",       "name": "Web Guardian",       "description": "Reach score ≥ 75 on a website scan",                   "icon": "🌐",  "category": "surface",   "surface": "website", "threshold": 75,  "color": "#0984e3", "sort_order": 13},
    {"slug": "app_defender",       "name": "App Defender",       "description": "Reach score ≥ 75 on an application scan",              "icon": "📱",  "category": "surface",   "surface": "app",     "threshold": 75,  "color": "#6c5ce7", "sort_order": 14},
    {"slug": "code_sentinel",      "name": "Code Sentinel",      "description": "Reach score ≥ 75 on a repository scan",                "icon": "💻",  "category": "surface",   "surface": "repo",    "threshold": 75,  "color": "#e84393", "sort_order": 15},
    {"slug": "triple_shield",      "name": "Triple Shield",      "description": "Earn Web Guardian, App Defender & Code Sentinel",      "icon": "🏆",  "category": "surface",   "surface": "any",     "threshold": 3,   "color": "#fdcb6e", "sort_order": 16},
    # ── Milestone badges ────────────────────────────────────────
    {"slug": "security_champion",  "name": "Security Champion",  "description": "Earn 10 or more badges — you're a legend!",            "icon": "👑",  "category": "milestone", "surface": "any",     "threshold": 10,  "color": "#fdcb6e", "sort_order": 17},
]


def seed_badges(db: Session) -> None:
    """Insert badge catalog if not already seeded (idempotent)."""
    existing = db.query(Badge).count()
    if existing >= len(BADGE_CATALOG):
        return  # already seeded

    for b in BADGE_CATALOG:
        exists = db.query(Badge).filter(Badge.slug == b["slug"]).first()
        if not exists:
            badge = Badge(**b)
            db.add(badge)
    db.commit()


def _user_has_badge(db: Session, user_id: str, slug: str) -> bool:
    """Check if user already has a specific badge."""
    return (
        db.query(UserBadge)
        .join(Badge)
        .filter(UserBadge.user_id == user_id, Badge.slug == slug)
        .first()
    ) is not None


def _award_badge(db: Session, user_id: str, slug: str, scan_id: str | None = None) -> dict | None:
    """Award a badge to a user. Returns badge info dict or None if already owned."""
    if _user_has_badge(db, user_id, slug):
        return None

    badge = db.query(Badge).filter(Badge.slug == slug).first()
    if not badge:
        return None

    ub = UserBadge(user_id=user_id, badge_id=badge.id, scan_id=scan_id)
    db.add(ub)
    db.flush()
    return {
        "slug": badge.slug,
        "name": badge.name,
        "description": badge.description,
        "icon": badge.icon,
        "category": badge.category,
        "color": badge.color,
    }


def evaluate_badges(db: Session, user_id: str, current_scan: Scan) -> list[dict]:
    """
    Compare the current scan against previous scans for the same target(s).
    Award any newly-earned badges. Returns a list of newly awarded badge dicts.
    """
    if not user_id:
        return []

    newly_earned: list[dict] = []
    scan_id = current_scan.id
    score = current_scan.final_score

    # ── Find previous scan for the same target(s) ──────────────
    prev_scan = None
    q = db.query(Scan).filter(
        Scan.user_id == user_id,
        Scan.id != current_scan.id,
    )
    # Match by any overlapping URL
    from sqlalchemy import or_
    url_filters = []
    if current_scan.website_url:
        url_filters.append(Scan.website_url == current_scan.website_url)
    if current_scan.app_url:
        url_filters.append(Scan.app_url == current_scan.app_url)
    if current_scan.repo_url:
        url_filters.append(Scan.repo_url == current_scan.repo_url)

    if url_filters:
        prev_scan = (
            q.filter(or_(*url_filters))
            .order_by(Scan.scan_date.desc())
            .first()
        )

    # ── Fix badges (require a previous scan to compare) ────────
    if prev_scan:
        prev_issues = prev_scan.critical_count + prev_scan.high_count + prev_scan.medium_count
        curr_issues = current_scan.critical_count + current_scan.high_count + current_scan.medium_count
        fixed_count = max(0, prev_issues - curr_issues)

        if fixed_count >= 1:
            b = _award_badge(db, user_id, "first_blood", scan_id)
            if b: newly_earned.append(b)

        if fixed_count >= 5:
            b = _award_badge(db, user_id, "bug_squasher", scan_id)
            if b: newly_earned.append(b)

        if curr_issues == 0 and prev_issues > 0:
            b = _award_badge(db, user_id, "clean_sweep", scan_id)
            if b: newly_earned.append(b)

        if prev_scan.critical_count > 0 and current_scan.critical_count == 0:
            b = _award_badge(db, user_id, "critical_eliminator", scan_id)
            if b: newly_earned.append(b)

        if prev_scan.high_count > 0 and current_scan.high_count == 0:
            b = _award_badge(db, user_id, "high_risk_hunter", scan_id)
            if b: newly_earned.append(b)

        if score - prev_scan.final_score >= 20:
            b = _award_badge(db, user_id, "comeback_kid", scan_id)
            if b: newly_earned.append(b)

    # ── Score badges (absolute thresholds) ─────────────────────
    score_badges = [
        (50,  "rising_star"),
        (75,  "security_pro"),
        (90,  "fortress_builder"),
        (100, "perfect_score"),
    ]
    for threshold, slug in score_badges:
        if score >= threshold:
            b = _award_badge(db, user_id, slug, scan_id)
            if b: newly_earned.append(b)

    # ── Surface-specific score badges ──────────────────────────
    if current_scan.website_score is not None and current_scan.website_score >= 75:
        b = _award_badge(db, user_id, "web_guardian", scan_id)
        if b: newly_earned.append(b)

    if current_scan.app_score is not None and current_scan.app_score >= 75:
        b = _award_badge(db, user_id, "app_defender", scan_id)
        if b: newly_earned.append(b)

    if current_scan.code_score is not None and current_scan.code_score >= 75:
        b = _award_badge(db, user_id, "code_sentinel", scan_id)
        if b: newly_earned.append(b)

    # Triple Shield — all three surface badges
    surface_slugs = ["web_guardian", "app_defender", "code_sentinel"]
    if all(_user_has_badge(db, user_id, s) for s in surface_slugs):
        b = _award_badge(db, user_id, "triple_shield", scan_id)
        if b: newly_earned.append(b)

    # ── Streak badges ──────────────────────────────────────────
    user_scans = (
        db.query(Scan)
        .filter(Scan.user_id == user_id)
        .order_by(Scan.scan_date.desc())
        .limit(10)
        .all()
    )
    if len(user_scans) >= 3:
        streak = 1
        for i in range(len(user_scans) - 1):
            if user_scans[i].final_score > user_scans[i + 1].final_score:
                streak += 1
            else:
                break
        if streak >= 3:
            b = _award_badge(db, user_id, "improving", scan_id)
            if b: newly_earned.append(b)
        if streak >= 5:
            b = _award_badge(db, user_id, "on_fire", scan_id)
            if b: newly_earned.append(b)

    # ── Security Champion — 10+ badges earned ──────────────────
    total_badges = db.query(UserBadge).filter(UserBadge.user_id == user_id).count()
    if total_badges >= 10:
        b = _award_badge(db, user_id, "security_champion", scan_id)
        if b: newly_earned.append(b)

    db.commit()
    return newly_earned


def get_user_badges(db: Session, user_id: str) -> dict:
    """
    Return all badges with earned status for a user.
    Returns {earned: [...], locked: [...], total_earned: int, total: int}
    """
    all_badges = db.query(Badge).order_by(Badge.sort_order).all()
    earned_map = {}
    user_badges = (
        db.query(UserBadge)
        .filter(UserBadge.user_id == user_id)
        .all()
    )
    for ub in user_badges:
        earned_map[ub.badge_id] = ub

    earned = []
    locked = []
    for badge in all_badges:
        info = {
            "slug": badge.slug,
            "name": badge.name,
            "description": badge.description,
            "icon": badge.icon,
            "category": badge.category,
            "surface": badge.surface,
            "color": badge.color,
            "sort_order": badge.sort_order,
        }
        if badge.id in earned_map:
            ub = earned_map[badge.id]
            info["earned"] = True
            info["earned_at"] = ub.earned_at.isoformat() if ub.earned_at else ""
            info["scan_id"] = ub.scan_id
            earned.append(info)
        else:
            info["earned"] = False
            locked.append(info)

    return {
        "earned": earned,
        "locked": locked,
        "total_earned": len(earned),
        "total": len(all_badges),
    }
