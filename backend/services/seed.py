"""
Database Seeding Script
Creates sample Organizations, Admin, and Student users for testing.
Run with: python3 -m services.seed (from backend directory)
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from passlib.context import CryptContext
from database import AsyncSessionLocal, engine, Base
from models import User, Test, Question, TestResult, Organization

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_tables():
    """Create all database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("📦 Database tables created/verified.")

async def seed_data():
    await create_tables()
    
    async with AsyncSessionLocal() as db:
        print("🌱 Starting Database Seed...")

        # 1. Create Sample Organizations
        org_names = [
            ("Acme Corp", "acme"),
            ("Tech Solutions", "techsol"),
            ("Global Innovations", "global")
        ]
        
        for name, slug in org_names:
            result = await db.execute(select(Organization).where(Organization.slug == slug))
            if not result.scalars().first():
                org = Organization(name=name, slug=slug)
                db.add(org)
                print(f"✅ Created Organization: {name}")
        
        await db.commit()
        
        # Get org IDs for later
        acme_result = await db.execute(select(Organization).where(Organization.slug == "acme"))
        acme_org = acme_result.scalars().first()

        # 2. Create Student User (with organization)
        student_email = "student@autonex.com"
        result = await db.execute(select(User).where(User.email == student_email))
        existing_student = result.scalars().first()
        
        if not existing_student:
            student = User(
                email=student_email,
                full_name="John Doe (Candidate)",
                hashed_password=pwd_context.hash("student123"),
                role="student",
                organization_id=acme_org.id if acme_org else None
            )
            db.add(student)
            print(f"✅ Created Student: {student_email} / student123 (Acme Corp)")
        else:
            print(f"ℹ️ Student {student_email} already exists.")

        await db.commit()
        print("✨ Seeding Complete!")
        print("\n--- Login Credentials ---")
        print("Admin:   admin@autonex.com / admin123 (from .env)")
        print("Student: student@autonex.com / student123 (Org: Acme Corp)")
        print("\n--- Organizations ---")
        print("1. Acme Corp")
        print("2. Tech Solutions")
        print("3. Global Innovations")

if __name__ == "__main__":
    asyncio.run(seed_data())
