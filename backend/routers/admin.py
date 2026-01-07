
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from database import get_db
from models import User, Test, Question, TestResult, Organization
from schemas import TestCreate, QuestionBase, TestResponse, QuestionCreate, TestTemplateConfig, TestUpdate
from dependencies import require_admin
from config import settings
from services.generator import QuestionBankService

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

# --- ORGANIZATION ENDPOINTS ---
@router.get("/organizations")
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all organizations for management"""
    result = await db.execute(select(Organization).order_by(Organization.name))
    orgs = result.scalars().all()
    return [{
        "id": o.id, 
        "name": o.name, 
        "slug": o.slug,
        "is_active": o.is_active if hasattr(o, 'is_active') else True,
        "created_at": o.created_at.isoformat() if o.created_at else None
    } for o in orgs]

from pydantic import BaseModel as PydanticModel

class OrgCreate(PydanticModel):
    name: str
    slug: str

class OrgUpdate(PydanticModel):
    name: str = None
    slug: str = None
    is_active: bool = None

@router.post("/organizations")
async def create_organization(
    org_data: OrgCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Create a new organization"""
    org = Organization(name=org_data.name, slug=org_data.slug)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return {"id": org.id, "name": org.name, "slug": org.slug, "is_active": True}

@router.patch("/organizations/{org_id}")
async def update_organization(
    org_id: int,
    updates: OrgUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update organization details"""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalars().first()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if updates.name is not None:
        org.name = updates.name
    if updates.slug is not None:
        org.slug = updates.slug
    if updates.is_active is not None:
        org.is_active = updates.is_active
    
    await db.commit()
    return {"status": "updated", "organization": org.name}

@router.delete("/organizations/{org_id}")
async def delete_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete organization (fails if users exist)"""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalars().first()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check for users
    user_result = await db.execute(select(User).where(User.organization_id == org_id).limit(1))
    if user_result.scalars().first():
        raise HTTPException(status_code=400, detail="Cannot delete organization with existing users")
    
    await db.delete(org)
    await db.commit()
    return {"status": "deleted", "org_id": org_id}

# --- DASHBOARD STATS ENDPOINT ---
@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get statistics for admin dashboard"""
    from sqlalchemy import func
    
    # Count total tests
    tests_result = await db.execute(select(func.count(Test.id)))
    total_tests = tests_result.scalar() or 0
    
    # Count total students (users with role='student')
    students_result = await db.execute(
        select(func.count(User.id)).where(User.role == 'student')
    )
    total_students = students_result.scalar() or 0
    
    # Count total submissions
    submissions_result = await db.execute(select(func.count(TestResult.id)))
    total_submissions = submissions_result.scalar() or 0
    
    # Count active tests
    active_tests_result = await db.execute(
        select(func.count(Test.id)).where(Test.is_active == True)
    )
    active_tests = active_tests_result.scalar() or 0
    
    return {
        "total_tests": total_tests,
        "total_students": total_students,
        "total_submissions": total_submissions,
        "active_tests": active_tests
    }

# --- TEST MANAGEMENT ENDPOINTS ---
@router.get("/tests")
async def list_all_tests(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all tests with question count for management dashboard"""
    result = await db.execute(
        select(Test).options(selectinload(Test.organization)).order_by(Test.created_at.desc())
    )
    tests = result.scalars().all()
    
    return [{
        "id": t.id,
        "title": t.title,
        "duration_minutes": t.duration_minutes,
        "total_marks": t.total_marks,
        "is_active": t.is_active,
        "organization_id": t.organization_id,
        "organization_name": t.organization.name if t.organization else "All Organizations",
        "question_count": len(t.questions) if t.questions else 0,
        "created_at": t.created_at.isoformat() if t.created_at else None
    } for t in tests]

@router.patch("/tests/{test_id}")
async def update_test(
    test_id: int,
    updates: TestUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update test settings (title, active status, organization)"""
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalars().first()
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Apply updates
    if updates.title is not None:
        test.title = updates.title
    if updates.duration_minutes is not None:
        test.duration_minutes = updates.duration_minutes
    if updates.instructions is not None:
        test.instructions = updates.instructions
    if updates.is_active is not None:
        test.is_active = updates.is_active
    if updates.organization_id is not None:
        test.organization_id = updates.organization_id if updates.organization_id != 0 else None
    
    await db.commit()
    await db.refresh(test)
    return {"status": "updated", "test": test.title}

@router.delete("/tests/{test_id}")
async def delete_test(
    test_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete a test and all its questions"""
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalars().first()
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    await db.delete(test)
    await db.commit()
    return {"status": "deleted", "test_id": test_id}

# 1. Create a New Test (Legacy endpoint)
@router.post("/tests/create")
async def create_test(test: TestCreate, db: AsyncSession = Depends(get_db), _: dict = Depends(require_admin)):
    new_test = Test(
        title=test.title,
        duration_minutes=test.duration_minutes,
        total_marks=test.total_marks,
        instructions=test.instructions,
        organization_id=test.organization_id
    )
    db.add(new_test)
    await db.commit()
    await db.refresh(new_test)
    
    return new_test

@router.post("/generate-test", response_model=TestResponse)
async def generate_test_from_template(
    config: TestTemplateConfig,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Creates a test TEMPLATE. Questions are NOT pre-generated.
    Each user gets uniquely randomized questions when they start the exam.
    
    The sections config is stored in template_config, and questions
    are generated dynamically per user from the question banks.
    """
    # Calculate total marks from sections
    total_marks = 0
    template_sections = []
    
    for section in config.sections:
        q_type = section.get("type")
        count = section.get("count", 0)
        marks = section.get("marks", 0)
        total_marks += count * marks
        template_sections.append({
            "type": q_type,
            "count": count,
            "marks": marks
        })
    
    # Create Test with template_config (no fixed questions stored)
    new_test = Test(
        title=config.title,
        duration_minutes=config.duration_minutes,
        total_marks=total_marks,  # Calculated from sections
        instructions=config.instructions,
        organization_id=config.organization_id,
        template_config=template_sections  # Store the template for dynamic question generation
    )
    db.add(new_test)
    await db.commit()
    await db.refresh(new_test)
    
    return new_test

# 2. Upload Video (Self-Hosted Logic)
@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...), _: dict = Depends(require_admin)):
    """
    Saves video to 'public/videos' and returns the URL path.
    Example return: '/static/videos/test1_q1.mp4'
    """
    file_location = os.path.join(settings.VIDEO_DIR, file.filename)
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/static/videos/{file.filename}"}

# 3. Add Question to Test
@router.post("/tests/{test_id}/questions")
async def add_question(
    test_id: int, 
    question: QuestionBase, 
    db: AsyncSession = Depends(get_db), 
    _: dict = Depends(require_admin)):
    # Verify test exists
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalars().first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    new_question = Question(
        test_id=test_id,
        question_type=question.question_type,
        content_url_or_text=question.content_url_or_text,
        reference_context=question.reference_context,
        key_ideas=question.key_ideas,
        marks=question.marks
    )
    db.add(new_question)
    await db.commit()
    return {"status": "Question Added"}

# 4. Get All Test Results (Recruiter Dashboard)
@router.get("/results")
async def get_all_results(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Recruiter View: Get ALL test submissions with User and Test details.
    """
    # Join TestResult -> User, TestResult -> Test
    query = select(TestResult).options(
        selectinload(TestResult.user),
        selectinload(TestResult.test)
    ).order_by(TestResult.total_score.desc())  # Highest Score first
    
    result = await db.execute(query)
    submissions = result.scalars().all()
    
    # Flatten data for the frontend table
    data = []
    for sub in submissions:
        data.append({
            "id": sub.id,
            "candidate_name": sub.user.full_name if sub.user else "Unknown",
            "candidate_email": sub.user.email if sub.user else "N/A",
            "test_id": sub.test_id,
            "test_title": sub.test.title if sub.test else "Unknown Test",
            "total_score": round(sub.total_score, 1) if sub.total_score else 0,
            "max_marks": sub.test.total_marks if sub.test else 100,
            "percentage": round((sub.total_score / sub.test.total_marks) * 100) if sub.test and sub.test.total_marks else 0,
            "tab_switches": sub.flags or 0,  # Tab switch count stored in flags
            "date": sub.completed_at.strftime("%Y-%m-%d %H:%M") if sub.completed_at else "N/A"
        })
    
    return data


# 5. Get Detailed Result by ID (Admin Detailed Report)
@router.get("/results/{result_id}")
async def get_detailed_result(
    result_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Admin Detailed Report: Get detailed breakdown for a specific test result.
    Shows: Question, Correct Answer, User Answer, Score, Tab Switch Count
    """
    # Get result with relationships
    result = await db.execute(
        select(TestResult)
        .options(
            selectinload(TestResult.user),
            selectinload(TestResult.test)
        )
        .where(TestResult.id == result_id)
    )
    exam_result = result.scalars().first()
    
    if not exam_result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    return {
        "id": exam_result.id,
        "candidate": {
            "name": exam_result.user.full_name if exam_result.user else "Unknown",
            "email": exam_result.user.email if exam_result.user else "N/A"
        },
        "test": {
            "id": exam_result.test_id,
            "title": exam_result.test.title if exam_result.test else "Unknown Test"
        },
        "total_score": round(exam_result.total_score, 1) if exam_result.total_score else 0,
        "max_marks": exam_result.test.total_marks if exam_result.test else 100,
        "percentage": round((exam_result.total_score / exam_result.test.total_marks) * 100) if exam_result.test and exam_result.test.total_marks else 0,
        "tab_switches": exam_result.flags or 0,
        "submitted_at": exam_result.completed_at.strftime("%Y-%m-%d %H:%M") if exam_result.completed_at else "N/A",
        "status": exam_result.status,
        # Detailed breakdown per question
        "breakdown": exam_result.ai_breakdown or []
    }
