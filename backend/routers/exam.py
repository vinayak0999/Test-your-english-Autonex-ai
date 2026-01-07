from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Test, Question, TestResult, User
from dependencies import get_current_user
from services.grading import (
    grade_video_question, 
    grade_image_question,
    grade_reading_question, 
    grade_jumble_question, 
    grade_mcq_question
)
from pydantic import BaseModel

router = APIRouter(prefix="/exam", tags=["Student Exam"])

# 0. List All Available Tests (Filtered by Organization)
@router.get("/available-tests")
async def get_available_tests(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Fetches all active tests for the student's organization (or public tests).
    """
    from sqlalchemy import or_
    
    # Base query: active tests
    query = select(Test).options(selectinload(Test.questions)).where(Test.is_active == True)
    
    # Filter by organization: show tests for user's org OR public tests (org_id=None)
    if user.organization_id:
        query = query.where(
            or_(
                Test.organization_id == user.organization_id,
                Test.organization_id == None  # Public tests
            )
        )
    # If user has no org, they see only public tests
    else:
        query = query.where(Test.organization_id == None)
    
    result = await db.execute(query)
    tests = result.scalars().all()
    
    # Get all completed tests for this user
    user_results = await db.execute(
        select(TestResult).where(TestResult.user_id == user.id)
    )
    completed_map = {r.test_id: r.id for r in user_results.scalars().all()}
    
    # Build response with completion status
    response = []
    for t in tests:
        is_completed = t.id in completed_map
        response.append({
            "id": t.id,
            "title": t.title,
            "duration": t.duration_minutes,
            "total_marks": t.total_marks,
            "question_count": len(t.questions) if t.questions else 0,
            "completed": is_completed,
            "result_id": completed_map.get(t.id) if is_completed else None
        })
    
    return response


# 0.5. Get User's Completed Test Results (including inactive tests)
@router.get("/my-results")
async def get_my_results(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Get all results for the current user, including results from inactive tests.
    Users have the right to see their results even if test becomes inactive.
    """
    result = await db.execute(
        select(TestResult)
        .options(selectinload(TestResult.test))
        .where(TestResult.user_id == user.id)
        .order_by(TestResult.completed_at.desc())
    )
    results = result.scalars().all()
    
    return [
        {
            "result_id": r.id,
            "test_id": r.test_id,
            "test_title": r.test.title if r.test else "Deleted Test",
            "test_active": r.test.is_active if r.test else False,
            "total_score": round(r.total_score, 1) if r.total_score else 0,
            "max_marks": r.test.total_marks if r.test else 100,
            "percentage": round((r.total_score / r.test.total_marks) * 100) if r.test and r.test.total_marks else 0,
            "completed_at": r.completed_at.strftime("%Y-%m-%d %H:%M") if r.completed_at else "N/A"
        }
        for r in results
    ]

# 1. Get Exam Paper (Start Test) - WITH SECURITY CHECKS & RANDOM QUESTIONS
@router.get("/tests/{test_id}")
async def get_test_paper(test_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    from sqlalchemy import or_
    from models import ExamSession
    from services.generator import QuestionBankService
    from datetime import datetime, timedelta
    
    # Fetch test with questions
    result = await db.execute(
        select(Test).options(selectinload(Test.questions)).where(Test.id == test_id)
    )
    test = result.scalars().first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # SECURITY CHECK 1: Test must be active
    if not test.is_active:
        raise HTTPException(status_code=403, detail="This test is no longer available")
    
    # SECURITY CHECK 2: Organization access control
    if test.organization_id:
        # Test is for specific org - user must belong to that org
        if user.organization_id != test.organization_id:
            raise HTTPException(status_code=403, detail="You are not authorized to access this test")
    # If test.organization_id is None, it's public - allow anyone
    
    # SECURITY CHECK 3: Single attempt - check if already completed
    existing_result = await db.execute(
        select(TestResult).where(
            TestResult.user_id == user.id,
            TestResult.test_id == test_id
        )
    )
    already_attempted = existing_result.scalars().first()
    
    if already_attempted:
        return {
            "already_completed": True,
            "result_id": already_attempted.id,
            "message": "You have already completed this test"
        }
    
    # Check for existing active exam session (in case user refreshed page)
    existing_session = await db.execute(
        select(ExamSession).where(
            ExamSession.user_id == user.id,
            ExamSession.test_id == test_id,
            ExamSession.is_completed == False
        )
    )
    session = existing_session.scalars().first()
    
    # If session exists, return the same questions (consistency on refresh)
    if session:
        safe_questions = []
        for q in session.generated_questions:
            safe_questions.append({
                "id": q["temp_id"],
                "type": q["type"],
                "content": q["content"],
                "marks": q["marks"]
            })
        return {
            "already_completed": False,
            "session_id": session.id,
            "title": test.title,
            "duration": test.duration_minutes,
            "questions": safe_questions
        }
    
    # TEMPLATE MODE: Generate random questions for this user
    if test.template_config:
        generated_questions = []
        temp_id = 1
        
        for section in test.template_config:
            section_type = section.get("type")
            count = section.get("count", 1)
            marks = section.get("marks", 5)
            
            # Generate random questions from bank
            section_questions = QuestionBankService.generate_questions(
                section_type=section_type,
                count=count,
                marks_per_question=marks
            )
            
            # Add temp_id for tracking
            for q in section_questions:
                q["temp_id"] = temp_id
                q["type"] = section_type
                generated_questions.append(q)
                temp_id += 1
        
        # Create exam session with the generated questions
        new_session = ExamSession(
            user_id=user.id,
            test_id=test_id,
            generated_questions=generated_questions,
            answers={},
            expires_at=datetime.now() + timedelta(minutes=test.duration_minutes + 5)
        )
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        
        # Return safe questions (without grading config)
        safe_questions = []
        for q in generated_questions:
            safe_questions.append({
                "id": q["temp_id"],
                "type": q["type"],
                "content": q["content"],
                "marks": q["marks"]
            })
        
        return {
            "already_completed": False,
            "session_id": new_session.id,
            "title": test.title,
            "duration": test.duration_minutes,
            "questions": safe_questions
        }
    
    # LEGACY MODE: Use fixed questions stored in database
    safe_questions = []
    for q in test.questions:
        question_content = q.content_data if q.content else {
            "url": q.content_url_or_text,
            "text": q.content_url_or_text
        }
        safe_questions.append({
            "id": q.id,
            "type": q.question_type,
            "content": question_content,
            "marks": q.marks
        })
        
    return {
        "already_completed": False,
        "title": test.title,
        "duration": test.duration_minutes,
        "questions": safe_questions
    }

# 2. Submit Answer & Auto-Grade
class AnswerSchema(BaseModel):
    question_id: int
    student_text: str

@router.post("/submit-answer")
async def submit_single_answer(
    answer: AnswerSchema, 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)):
    # 1. Fetch Question Logic
    result = await db.execute(select(Question).where(Question.id == answer.question_id))
    question = result.scalars().first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question invalid")

    # 2. Route to correct Grading Logic
    score_data = {}
    
    if question.question_type == "video":
        # Get video context from content field
        video_context = question.content.get("title", "Video description task") if question.content else "Video description task"
        score_data = await grade_video_question(
            answer.student_text, 
            question.reference_context, 
            question.key_ideas,
            video_context
        )
    elif question.question_type == "image":
        # Get image context from content field
        image_context = question.content.get("title", "Image description task") if question.content else "Image description task"
        score_data = await grade_image_question(
            answer.student_text, 
            question.reference_context, 
            question.key_ideas,
            image_context
        )
    elif question.question_type == "reading":
        score_data = await grade_reading_question(
            answer.student_text,
            question.content_url_or_text, # Original Passage
            question.reference_context,   # Ideal Summary
            question.key_ideas
        )
    else:
        # Fallback for now
        score_data = {"score": 0, "breakdown": "Manual Grading Required"}

    # 3. Save Partial Result (Logic to be expanded to save full test)
    # For now, we return the AI score immediately for testing
    return {
        "question_id": answer.question_id,
        "ai_score": score_data
    }

# 3. Finish Exam & Compile Score
class ExamSubmission(BaseModel):
    answers: dict # { question_id: "student text" }
    flags: int = 0  # Tab switch count (default 0)
    tab_switches: int = 0  # Explicit tab switch count
    session_id: Optional[int] = None  # For template-based tests with random questions

@router.post("/tests/{test_id}/finish")
async def finish_exam(
    test_id: int, 
    submission: ExamSubmission, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    """
    1. Validates test is active and user has access.
    2. Grades ALL answers (from session or fixed questions).
    3. Stores complete record with answers for admin review.
    """
    from models import ExamSession
    
    # SECURITY: Fetch and validate test
    test_result = await db.execute(select(Test).where(Test.id == test_id))
    test = test_result.scalars().first()
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if not test.is_active:
        raise HTTPException(status_code=403, detail="This test is no longer accepting submissions")
    
    # Validate organization access
    if test.organization_id and user.organization_id != test.organization_id:
        raise HTTPException(status_code=403, detail="You are not authorized for this test")
    
    total_score = 0
    max_score = 0
    breakdown = []
    
    # Check if this is a session-based test (template mode)
    if submission.session_id:
        # TEMPLATE MODE: Get questions from session
        session_result = await db.execute(
            select(ExamSession).where(
                ExamSession.id == submission.session_id,
                ExamSession.user_id == user.id
            )
        )
        session = session_result.scalars().first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Exam session not found")
        
        if session.is_completed:
            raise HTTPException(status_code=400, detail="This exam has already been submitted")
        
        # Grade each question from generated_questions
        for q in session.generated_questions:
            max_score += q["marks"]
            temp_id = str(q["temp_id"])
            student_text = submission.answers.get(temp_id, "")
            
            grading_config = q.get("grading_config", {})
            question_type = q["type"]
            
            # --- AI GRADING LOGIC ---
            grade_data = {}
            if question_type == 'video':
                video_context = q["content"].get("title", "Video description task")
                grade_data = await grade_video_question(
                    student_text, 
                    grading_config.get("reference", ""),
                    grading_config.get("key_ideas", []),
                    video_context
                )
            elif question_type == 'image':
                image_context = q["content"].get("title", "Image description task")
                grade_data = await grade_image_question(
                    student_text, 
                    grading_config.get("reference", ""),
                    grading_config.get("key_ideas", []),
                    image_context
                )
            elif question_type == 'reading':
                passage = q["content"].get("passage", "")
                grade_data = await grade_reading_question(
                    student_text, 
                    passage,
                    grading_config.get("reference", ""),
                    grading_config.get("key_ideas", [])
                )
            elif question_type == 'jumble':
                grade_data = await grade_jumble_question(
                    student_text,
                    grading_config.get("correct_answer", ""),
                    q["marks"]
                )
            elif question_type.startswith('mcq'):
                grade_data = await grade_mcq_question(
                    student_text,
                    grading_config.get("correct_answer", ""),
                    q["marks"]
                )
            else:
                grade_data = {"score": 0, "breakdown": {"error": "Manual review needed"}}

            question_score = grade_data.get('score', 0)
            total_score += question_score
            
            correct_answer = grading_config.get("reference", grading_config.get("correct_answer", "N/A"))
            question_text = q["content"].get("passage", q["content"].get("question", q["content"].get("text", q["content"].get("url", ""))))
            
            breakdown.append({
                "question_id": q["temp_id"],
                "type": question_type,
                "question_text": question_text[:200] + "..." if len(str(question_text)) > 200 else str(question_text),
                "correct_answer": correct_answer[:500] if isinstance(correct_answer, str) else str(correct_answer),
                "student_answer": student_text[:500] if student_text else "No answer provided",
                "max_marks": q["marks"],
                "student_score": question_score,
                "ai_feedback": grade_data.get('breakdown', {})
            })
        
        # Mark session as completed
        session.is_completed = True
        session.answers = submission.answers
        
    else:
        # LEGACY MODE: Fetch all questions from database
        result = await db.execute(select(Question).where(Question.test_id == test_id))
        questions = result.scalars().all()

        for q in questions:
            max_score += q.marks
            student_text = submission.answers.get(str(q.id), "")
            
            grading = q.grading_data if q.grading_config else {
                "reference": q.reference_context,
                "key_ideas": q.key_ideas or []
            }
            
            grade_data = {}
            if q.question_type == 'video':
                video_context = q.content.get("title", "Video description task") if q.content else "Video description task"
                grade_data = await grade_video_question(
                    student_text, 
                    grading.get("reference", q.reference_context),
                    grading.get("key_ideas", q.key_ideas or []),
                    video_context
                )
            elif q.question_type == 'image':
                image_context = q.content.get("title", "Image description task") if q.content else "Image description task"
                grade_data = await grade_image_question(
                    student_text, 
                    grading.get("reference", q.reference_context),
                    grading.get("key_ideas", q.key_ideas or []),
                    image_context
                )
            elif q.question_type == 'reading':
                passage = q.content.get("passage", q.content_url_or_text) if q.content else q.content_url_or_text
                grade_data = await grade_reading_question(
                    student_text, 
                    passage,
                    grading.get("reference", q.reference_context),
                    grading.get("key_ideas", q.key_ideas or [])
                )
            elif q.question_type == 'jumble':
                grade_data = await grade_jumble_question(
                    student_text,
                    grading.get("correct_answer", ""),
                    q.marks
                )
            elif q.question_type.startswith('mcq'):
                grade_data = await grade_mcq_question(
                    student_text,
                    grading.get("correct_answer", ""),
                    q.marks
                )
            else:
                grade_data = {"score": 0, "breakdown": {"error": "Manual review needed"}}

            question_score = grade_data.get('score', 0)
            total_score += question_score
            
            correct_answer = grading.get("reference", grading.get("correct_answer", "N/A"))
            question_text = ""
            if q.content:
                question_text = q.content.get("passage", q.content.get("question", q.content.get("text", "")))
            else:
                question_text = q.content_url_or_text or ""
            
            breakdown.append({
                "question_id": q.id,
                "type": q.question_type,
                "question_text": question_text[:200] + "..." if len(question_text) > 200 else question_text,
                "correct_answer": correct_answer[:500] if isinstance(correct_answer, str) else str(correct_answer),
                "student_answer": student_text[:500] if student_text else "No answer provided",
                "max_marks": q.marks,
                "student_score": question_score,
                "ai_feedback": grade_data.get('breakdown', {})
            })

    # Save to Database (prevent duplicates)
    existing_result = await db.execute(
        select(TestResult).where(
            TestResult.user_id == user.id,
            TestResult.test_id == test_id
        )
    )
    existing = existing_result.scalars().first()
    
    if existing:
        # Update existing result
        existing.total_score = total_score
        existing.ai_breakdown = breakdown
        existing.status = "graded"
        existing.flags = submission.flags or submission.tab_switches
        final_result = existing
    else:
        # Create new result
        final_result = TestResult(
            user_id=user.id,
            test_id=test_id,
            total_score=total_score,
            ai_breakdown=breakdown,
            status="graded",
            flags=submission.flags or submission.tab_switches
        )
        db.add(final_result)

    await db.commit()
    await db.refresh(final_result)

    return {"result_id": final_result.id}

# 4. Get Result Details
@router.get("/results/{result_id}")
async def get_result_details(
    result_id: int, 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = await db.execute(select(TestResult).where(TestResult.id == result_id))
    exam_result = result.scalars().first()
    
    if not exam_result:
        raise HTTPException(status_code=404, detail="Result not found")
        
    # Security: Ensure student owns this result (or is admin)
    if exam_result.user_id != user.id and user.role != 'admin':
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "total_score": exam_result.total_score,
        "breakdown": exam_result.ai_breakdown,
        "date": exam_result.submitted_at
    }
