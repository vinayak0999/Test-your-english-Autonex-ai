import os
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from config import settings
from contextlib import asynccontextmanager

# Import your routers
from routers import auth, admin, exam 

# Create public/videos directory if it doesn't exist
if not os.path.exists(settings.VIDEO_DIR):
    os.makedirs(settings.VIDEO_DIR)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"⚠️ Database initialization warning: {e}")
        # Don't crash - tables might already exist
    yield

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# --- GLOBAL EXCEPTION HANDLER (CRASH PROTECTION) ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return JSON instead of crashing"""
    print(f"❌ Unhandled Exception on {request.url.path}: {str(exc)}")
    print(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please try again.",
            "path": str(request.url.path),
            "error_type": type(exc).__name__
        }
    )
# ---------------------------------------------------

# --- CORS MIDDLEWARE (Configurable Origins) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -----------------------------------------------

# MOUNT VIDEO DIRECTORY
app.mount("/static/videos", StaticFiles(directory=settings.VIDEO_DIR), name="videos")

# Include Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(exam.router)

@app.get("/")
def health_check():
    return {"status": "Running", "video_storage": settings.VIDEO_DIR}

@app.get("/health")
async def detailed_health_check():
    """Detailed health check for monitoring"""
    from sqlalchemy import text
    db_status = "unknown"
    try:
        # Quick DB check
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)[:50]}"
    
    return {
        "status": "running",
        "database": db_status,
        "video_storage": settings.VIDEO_DIR
    }
