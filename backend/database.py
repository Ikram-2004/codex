"""
Database Engine & Session Factory
──────────────────────────────────
SQLite + SQLAlchemy for zero-setup persistence.
The .db file lives alongside the backend code.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./securepulse.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},   # SQLite needs this for FastAPI
    echo=False,                                   # Set True to debug SQL queries
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session, auto-closes after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables if they don't exist yet."""
    from models import User, Scan, ScanFinding, Ticket, ChatHistory, Badge, UserBadge  # noqa: F401
    Base.metadata.create_all(bind=engine)
