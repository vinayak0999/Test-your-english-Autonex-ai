import asyncio
import sys
sys.path.insert(0, '.')

from sqlalchemy.future import select
from sqlalchemy import delete
from database import AsyncSessionLocal
from models import User, TestResult, ExamSession

EMAIL = "vinayak@autonex.com"   # <-- change this

async def run():
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == EMAIL))).scalars().first()
        if not user:
            print(f"No user found: {EMAIL}")
            return

        r = await db.execute(delete(TestResult).where(TestResult.user_id == user.id))
        s = await db.execute(delete(ExamSession).where(ExamSession.user_id == user.id))
        await db.commit()
        print(f"Done. Deleted {r.rowcount} result(s) and {s.rowcount} session(s) for {EMAIL}")
        print("They can now retake the test.")

asyncio.run(run())
