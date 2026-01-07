import os
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, List

class Settings(BaseSettings):
    # App Config
    APP_NAME: str = "Autonex AI Evaluator"
    SECRET_KEY: str  # Required - no default, must be set in .env
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    
    # Admin Credentials (from environment)
    ADMIN_EMAIL: str = "admin@autonex.com"
    ADMIN_PASSWORD: str  # Required - no default, must be set in .env
    
    # Database Config
    # Default is SQLite (local), set DATABASE_URL for PostgreSQL
    DATABASE_URL: str = "sqlite+aiosqlite:///./test_english.db"
    
    # CORS Configuration
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000"
    
    # AI Config
    OPENAI_API_KEY: str = "sk-placeholder"
    GEMINI_API_KEY: str = "placeholder_key"

    # File Storage for Videos
    VIDEO_DIR: str = "public/videos"

    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError('SECRET_KEY must be at least 32 characters for security')
        if v == "your-32-character-or-longer-secret-key-here-change-in-prod":
            raise ValueError('Please change SECRET_KEY to a unique value')
        return v
    
    @field_validator('ADMIN_PASSWORD')
    @classmethod
    def validate_admin_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('ADMIN_PASSWORD must be at least 8 characters')
        return v
    
    def get_cors_origins(self) -> List[str]:
        """Parse CORS_ORIGINS string into list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"

settings = Settings()
