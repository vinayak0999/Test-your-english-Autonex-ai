from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

# Database URL Logic for Railway vs Local
database_url = settings.DATABASE_URL

# Handle PostgreSQL URL format (Railway uses postgres://)
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)

# Determine if using PostgreSQL or SQLite
is_postgres = "postgresql" in database_url

# Create Async Engine with appropriate settings
if is_postgres:
    # PostgreSQL with connection pooling (LOW limits for Supabase free tier)
    # Supabase free tier has very low connection limits!
    engine = create_async_engine(
        database_url,
        echo=False,
        future=True,
        pool_size=2,          # Keep only 2 connections (Supabase limit is ~13-15)
        max_overflow=3,       # Allow 3 more under load (total max 5)
        pool_pre_ping=True,   # Verify connections before use
        pool_recycle=60,      # Recycle connections after 1 min (faster cleanup)
        pool_timeout=30,      # Wait max 30 sec for connection
    )
else:
    # SQLite for local development (no pooling)
    engine = create_async_engine(
        database_url,
        echo=False,
        future=True,
        connect_args={"check_same_thread": False}  # SQLite specific
    )

# Create Session Factory
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

# Dependency for API Endpoints
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
