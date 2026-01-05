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
    # PostgreSQL with connection pooling
    engine = create_async_engine(
        database_url,
        echo=False,
        future=True,
        pool_size=5,          # Maintain 5 connections
        max_overflow=10,      # Allow 10 more under load
        pool_pre_ping=True,   # Verify connections before use
        pool_recycle=300,     # Recycle connections after 5 min
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
