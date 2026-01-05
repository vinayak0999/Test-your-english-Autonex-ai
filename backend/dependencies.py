from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
from models import User
from config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        user_id: int = payload.get("id")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Handle Admin User (not in DB, uses environment credentials)
    if email == settings.ADMIN_EMAIL and role == "admin":
        # Create a virtual Admin user object (not persisted)
        class VirtualAdmin:
            id = 0
            email = settings.ADMIN_EMAIL
            full_name = "Super Admin"
            role = "admin"
            organization_id = None
        return VirtualAdmin()
        
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user

async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return current_user
