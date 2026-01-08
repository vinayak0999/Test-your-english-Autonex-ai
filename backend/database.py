from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from config import settings

# Database URL Logic for Railway vs Local
database_url = settings.DATABASE_URL

# Handle PostgreSQL URL format - ensure asyncpg driver is used
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgresql://") and "+asyncpg" not in database_url:
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Determine if using PostgreSQL or SQLite
is_postgres = "postgresql" in database_url

# Create Async Engine with appropriate settings
if is_postgres:
    # PostgreSQL with NullPool and disabled prepared statements for pgbouncer
    # Use server_settings to disable prepared statement caching
    engine = create_async_engine(
        database_url,
        echo=False,
        future=True,
        poolclass=NullPool,  # No pooling - pgbouncer handles this
        connect_args={
            "server_settings": {"plan_cache_mode": "force_custom_plan"},
            "prepared_statement_cache_size": 0,  # Disable prepared statements
        }
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
