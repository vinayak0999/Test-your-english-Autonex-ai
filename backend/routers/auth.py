from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
from models import User, Organization
from schemas import UserCreate, UserLogin, Token, UserResponse
from utils import get_password_hash, verify_password, create_access_token
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

# PUBLIC: Get organizations for signup dropdown
@router.get("/organizations")
async def get_public_organizations(db: AsyncSession = Depends(get_db)):
    """Public endpoint: List active organizations for signup dropdown"""
    result = await db.execute(
        select(Organization).where(Organization.is_active == True).order_by(Organization.name)
    )
    orgs = result.scalars().all()
    return [{"id": o.id, "name": o.name} for o in orgs]

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # 1. Check if email exists
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create new user with organization_id
    hashed_pw = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_pw,
        full_name=user.full_name,
        organization_id=user.organization_id,  # New: org ID
        organization_name=user.organization_name,   # Updated field name
        role="student"
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    
    # --- BLOCK ADMIN from Student Login Route ---
    if user_credentials.email == settings.ADMIN_EMAIL:
        raise HTTPException(
            status_code=403, 
            detail="Admin users must login at /admin/login"
        )
    # -----------------------------------------------

    # 2. Normal User Login (Database Check)
    result = await db.execute(select(User).where(User.email == user_credentials.email))
    user = result.scalars().first()

    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=403, detail="Invalid Credentials")

    access_token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "user_name": user.full_name
    }

# ADMIN-ONLY Login Endpoint
@router.post("/admin-login", response_model=Token)
async def admin_login(user_credentials: UserLogin):
    """Separate login endpoint for admin users only"""
    
    if user_credentials.email != settings.ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="This login is for administrators only")
    
    if user_credentials.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin credentials")
    
    access_token = create_access_token(
        data={"sub": settings.ADMIN_EMAIL, "role": "admin", "id": 0}
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": "admin",
        "user_name": "Super Admin"
    }
