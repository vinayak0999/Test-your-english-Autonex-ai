from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from config import settings
import asyncpg
from urllib.parse import urlparse, unquote

# Database URL Logic for Railway vs Local
database_url = settings.DATABASE_URL
original_url = database_url

# Handle PostgreSQL URL format - ensure asyncpg driver is used
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgresql://") and "+asyncpg" not in database_url:
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Determine if using PostgreSQL or SQLite
is_postgres = "postgresql" in database_url

# Check if using Transaction pooler (port 6543) - needs special handling
is_transaction_pooler = ":6543/" in database_url

# Create Async Engine with appropriate settings  
if is_postgres:
    if is_transaction_pooler:
        # Transaction pooler (6543) - use async_creator with statement_cache_size=0
        # Parse the URL for asyncpg direct connection
        parsed = urlparse(original_url.replace("postgres://", "postgresql://"))
        
        async def create_connection():
            """Create asyncpg connection with statement_cache_size=0 for pgbouncer"""
            return await asyncpg.connect(
                host=parsed.hostname,
                port=parsed.port or 6543,
                user=parsed.username,
                password=unquote(parsed.password) if parsed.password else None,
                database=parsed.path.lstrip("/"),
                statement_cache_size=0,  # CRITICAL: Disable for pgbouncer transaction mode
            )
        
        engine = create_async_engine(
            database_url,
            echo=False,
            future=True,
            poolclass=NullPool,
            async_creator=create_connection,  # Use custom creator
        )
    else:
        # Session pooler (5432) or Direct connection - prepared statements OK
        engine = create_async_engine(
            database_url,
            echo=False,
            future=True,
            poolclass=NullPool,
        )
else:
    # SQLite for local development
    engine = create_async_engine(
        database_url,
        echo=False,
        future=True,
        connect_args={"check_same_thread": False}
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
