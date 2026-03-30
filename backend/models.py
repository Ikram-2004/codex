"""
SQLAlchemy ORM Models
─────────────────────
Defines all database tables for SecurePulse.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Text, DateTime,
    ForeignKey, JSON, Boolean
)
from sqlalchemy.orm import relationship
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


# ── Users ──────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    company = Column(String, default="")
    created_at = Column(DateTime, default=utcnow)
    last_login = Column(DateTime, default=utcnow)

    # Preferences (from questionnaire)
    pref_project_type = Column(String, default="")
    pref_security_concern = Column(String, default="")
    pref_experience_level = Column(String, default="")
    pref_detail_level = Column(String, default="")
    pref_deployment_env = Column(String, default="")

    # Relationships
    scans = relationship("Scan", back_populates="user", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="user", cascade="all, delete-orphan")
    chat_histories = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")
    badges = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")


# ── Scans ──────────────────────────────────────────────────────

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    scan_date = Column(DateTime, default=utcnow)

    # Input URLs
    website_url = Column(String, default="")
    app_url = Column(String, default="")
    repo_url = Column(String, default="")
    scanner_type = Column(String, default="python")

    # Results
    final_score = Column(Integer, default=0)
    grade = Column(String, default="F")
    message = Column(String, default="")
    color = Column(String, default="red")

    website_score = Column(Integer, nullable=True)
    app_score = Column(Integer, nullable=True)
    code_score = Column(Integer, nullable=True)

    # Total counts
    critical_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    info_count = Column(Integer, default=0)
    pass_count = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="scans")
    findings = relationship("ScanFinding", back_populates="scan", cascade="all, delete-orphan")


class ScanFinding(Base):
    __tablename__ = "scan_findings"

    id = Column(String, primary_key=True, default=generate_uuid)
    scan_id = Column(String, ForeignKey("scans.id"), nullable=False, index=True)

    severity = Column(String, nullable=False)   # CRITICAL, HIGH, MEDIUM, INFO, PASS
    surface = Column(String, nullable=False)     # Website, Application, Codebase
    title = Column(String, nullable=False)
    fix = Column(Text, default="")

    scan = relationship("Scan", back_populates="findings")


# ── Badges (Gamification) ─────────────────────────────────────

class Badge(Base):
    __tablename__ = "badges"

    id = Column(String, primary_key=True, default=generate_uuid)
    slug = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    icon = Column(String, default="🏅")
    category = Column(String, nullable=False)       # fix, score, streak, surface, milestone
    surface = Column(String, default="any")          # any, website, app, repo
    threshold = Column(Integer, default=0)           # numeric threshold (e.g. score >= 75)
    color = Column(String, default="#6c5ce7")        # accent color for display
    sort_order = Column(Integer, default=0)

    user_badges = relationship("UserBadge", back_populates="badge")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    badge_id = Column(String, ForeignKey("badges.id"), nullable=False, index=True)
    scan_id = Column(String, ForeignKey("scans.id"), nullable=True)
    earned_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="badges")
    badge = relationship("Badge", back_populates="user_badges")
    scan = relationship("Scan")


# ── Support Tickets ────────────────────────────────────────────

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_number = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)

    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    priority = Column(String, default="medium")      # low, medium, high, critical
    description = Column(Text, default="")
    status = Column(String, default="open")           # open, in_progress, resolved, closed
    scan_id = Column(String, nullable=True)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="tickets")


# ── Chat History ───────────────────────────────────────────────

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String, default=generate_uuid, index=True)

    role = Column(String, nullable=False)        # user, assistant
    content = Column(Text, nullable=False)
    chat_type = Column(String, default="advisor")  # advisor, support
    created_at = Column(DateTime, default=utcnow)

    # Optional scan context snapshot
    scan_context = Column(JSON, nullable=True)

    user = relationship("User", back_populates="chat_histories")
