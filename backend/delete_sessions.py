"""
Quick reset — delete all ExamSession records for a given test ID.
Run from the /backend directory:
    python3 delete_sessions.py

Edit TEST_ID below.
"""
import asyncio, os
from dotenv import load_dotenv

# Load .env from backend folder
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

TEST_ID = 32   # ← Change this to your Woven test ID

async def run():
    from database import AsyncSessionLocal
    from models import ExamSession, TestResult
    from sqlalchemy.future import select
    from sqlalchemy import delete

    async with AsyncSessionLocal() as db:
        # Delete exam sessions for this test
        r1 = await db.execute(delete(ExamSession).where(ExamSession.test_id == TEST_ID))
        # Also delete results so candidate can retake cleanly
        r2 = await db.execute(delete(TestResult).where(TestResult.test_id == TEST_ID))
        await db.commit()
        print(f"✅ Deleted {r1.rowcount} session(s) and {r2.rowcount} result(s) for test {TEST_ID}")
        print("   Start the test again — fresh questions will be generated.")

asyncio.run(run())
