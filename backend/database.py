import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./securepulse.db")

# Render uses postgresql:// already, but this handles both just in case
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Render injects ?sslmode=require into the URL — SQLAlchemy handles this
# automatically, but we need to make sure we don't break it
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,       # Render free tier has a 97-connection limit
        max_overflow=10,   # keep this conservative on free tier
        echo=False,
    )

logger.info("Database: %s", "SQLite (local)" if IS_SQLITE else "PostgreSQL (Render)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import User, Scan, ScanFinding, Ticket, ChatHistory, Badge, UserBadge  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialised.")
