import os
from fastapi import FastAPI
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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

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
