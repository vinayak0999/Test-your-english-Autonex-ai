from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool
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

# Check if using Transaction pooler (port 6543) - needs special handling
is_transaction_pooler = ":6543/" in database_url

# ─────────────────────────────────────────────────────────────────────────────
# Create Async Engine with appropriate settings
# ─────────────────────────────────────────────────────────────────────────────
if is_postgres:
    if is_transaction_pooler:
        # PgBouncer / Transaction pooler: must disable prepared statements
        # and use NullPool because pgbouncer owns the pool
        connect_args = {
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
            "ssl": "require",
        }
        engine = create_async_engine(
            database_url,
            echo=False,
            future=True,
            poolclass=NullPool,          # pgbouncer manages pooling
            connect_args=connect_args,
        )
    else:
        # Direct PostgreSQL (Railway port 5432 / Supabase direct connection)
        # Use a small QueuePool so we reuse connections and avoid the
        # "SSL without ALPN" reconnect storm that NullPool causes.
        connect_args = {
            "ssl": "require",
            # Keepalive settings to prevent "unexpected EOF" on idle connections
            "server_settings": {
                "application_name": "autonex-backend",
            },
        }
        engine = create_async_engine(
            database_url,
            echo=False,
            future=True,
            poolclass=AsyncAdaptedQueuePool,
            pool_size=5,           # maintain up to 5 persistent connections
            max_overflow=10,       # allow 10 extra under load
            pool_timeout=30,       # wait 30s for a free connection
            pool_recycle=1800,     # recycle connections every 30 min
            pool_pre_ping=True,    # test connection before use (avoids stale conn errors)
            connect_args=connect_args,
        )
else:
    # SQLite for local development
    engine = create_async_engine(
        database_url,
        echo=False,
        future=True,
        connect_args={"check_same_thread": False},
    )

# Create Session Factory
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


# ─────────────────────────────────────────────────────────────────────────────
# Dependency for API Endpoints
# ─────────────────────────────────────────────────────────────────────────────
async def get_db():
    """
    Yields an AsyncSession with automatic commit/rollback.

    - Commits on success so the transaction is never left open.
    - Rolls back on any exception so the connection is returned clean.
    - Always closes the session so the connection goes back to the pool.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()       # flush any pending writes
        except Exception:
            await session.rollback()     # clean up open transactions
            raise
        finally:
            await session.close()        # return connection to pool
