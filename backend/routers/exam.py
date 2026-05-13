import random
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
    grade_image_count_question,
    grade_reading_question, 
    grade_jumble_question, 
    grade_mcq_question,
    grade_typing_question
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
        
        # Calculate question count - from stored questions or template config
        if t.questions:
            q_count = len(t.questions)
        elif t.template_config:
            q_count = sum(section.get("count", 0) for section in t.template_config)
        else:
            q_count = 0
            
        response.append({
            "id": t.id,
            "title": t.title,
            "duration": t.duration_minutes,
            "total_marks": t.total_marks,
            "question_count": q_count,
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
                # Preserve generator-set type (e.g. mcq-multi-image); fall back to section_type
                if "question_type" not in q:
                    q["type"] = section_type
                else:
                    q["type"] = q.get("question_type", section_type)
                generated_questions.append(q)
                temp_id += 1
        
        # Shuffle all questions so they appear in random order regardless of section
        random.shuffle(generated_questions)

        # Re-assign temp_ids after shuffle so they stay sequential
        for idx, q in enumerate(generated_questions, 1):
            q["temp_id"] = idx

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
    disqualified: bool = False  # Whether user was auto-disqualified for violations

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
    
    # =====================================================
    # STEP 1: SAVE ANSWERS FIRST (PREVENT DATA LOSS)
    # =====================================================
    # Check for existing result or create new one with status="submitted"
    existing_result = await db.execute(
        select(TestResult).where(
            TestResult.user_id == user.id,
            TestResult.test_id == test_id
        )
    )
    existing = existing_result.scalars().first()
    
    if existing and existing.status == "graded":
        # Already graded, return existing result
        return {"result_id": existing.id}
    
    # Save answers immediately (before any grading)
    if existing:
        existing.flags = submission.flags or submission.tab_switches
        existing.status = "submitted"  # Mark as submitted, grading pending
        final_result = existing
    else:
        final_result = TestResult(
            user_id=user.id,
            test_id=test_id,
            total_score=0,  # Will update after grading
            ai_breakdown=[],  # Will update after grading
            status="submitted",  # Not yet graded
            flags=submission.flags or submission.tab_switches
        )
        db.add(final_result)
    
    # COMMIT ANSWERS FIRST - This ensures data is saved even if grading fails
    await db.commit()
    await db.refresh(final_result)
    saved_result_id = final_result.id
    
    # =====================================================
    # STEP 2: NOW GRADE (safe - answers already saved)
    # =====================================================
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
                content = q.get("content") or {}
                video_context = content.get("title", "Video description task")
                grade_data = await grade_video_question(
                    student_text, 
                    grading_config.get("reference", ""),
                    grading_config.get("key_ideas", []),
                    video_context
                )
            elif question_type == 'image':
                content = q.get("content") or {}
                image_context = content.get("title", "Image description task")
                grade_data = await grade_image_question(
                    student_text, 
                    grading_config.get("reference", ""),
                    grading_config.get("key_ideas", []),
                    image_context
                )
            elif question_type == 'reading':
                content = q.get("content") or {}
                passage = content.get("passage", "")
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
            elif question_type.startswith('mcq') or question_type == 'mcq-annotation':
                grade_data = await grade_mcq_question(
                    student_text,
                    grading_config.get("correct_answer", ""),
                    q["marks"]
                )
            elif question_type == 'mcq-multi-image':
                # student_text is JSON: {"0": "c", "1": "d", "2": "b"}
                import json as _json
                try:
                    answers = _json.loads(student_text) if student_text else {}
                except:
                    answers = {}
                sub_images   = grading_config.get("sub_images", [])
                mpi          = grading_config.get("marks_per_image", 4)
                total_score  = 0
                breakdown    = {}
                for i, sub in enumerate(sub_images):
                    given  = str(answers.get(str(i), "")).strip().lower()
                    expect = str(sub.get("correct_answer", "")).strip().lower()
                    if given == expect:
                        total_score += mpi
                        breakdown[f"image_{i+1}"] = {"score": mpi, "correct": True}
                    else:
                        breakdown[f"image_{i+1}"] = {"score": 0, "correct": False, "expected": expect, "given": given}
                grade_data = {"score": total_score, "breakdown": breakdown}
            elif question_type in ('typing', 'typing-easy', 'typing-advanced'):
                import json as json_lib
                print(f"[TYPING DEBUG] temp_id={temp_id}, raw student_text='{student_text[:200] if student_text else 'EMPTY'}'")
                try:
                    answer_data = json_lib.loads(student_text)
                    typed_text = answer_data.get("typed_text", "")
                    client_time = answer_data.get("time_seconds", 0)
                    print(f"[TYPING DEBUG] Parsed OK: typed_text_len={len(typed_text)}, time={client_time}")
                except:
                    typed_text = student_text
                    client_time = 0
                    print(f"[TYPING DEBUG] JSON parse failed, using raw text")

                # Server-side time validation
                time_limit = grading_config.get("time_limit", 60)
                if session and session.started_at:
                    from datetime import datetime, timezone
                    elapsed = (datetime.now(timezone.utc) - session.started_at.replace(tzinfo=timezone.utc)).total_seconds()
                    if client_time > 0 and client_time <= elapsed + 5:
                        time_taken = client_time
                    else:
                        time_taken = min(elapsed, time_limit)
                else:
                    time_taken = min(client_time, time_limit) if client_time > 0 else time_limit

                grade_data = await grade_typing_question(
                    typed_text,
                    grading_config.get("original_passage", ""),
                    time_taken,
                    q["marks"],
                    grading_mode=grading_config.get("grading_mode", "both")
                )
            elif question_type == 'image-count':
                grade_data = await grade_image_count_question(
                    student_text,
                    grading_config.get("correct_answer", 0),
                    q["marks"],
                    grading_config.get("tolerance", 0)
                )
            else:
                grade_data = {"score": 0, "breakdown": {"error": "Manual review needed"}}

            question_score = grade_data.get('score', 0)
            # Only MCQ and Jumble questions contribute to the raw score accumulation.
            # Typing and Visual scores are always 0 (handled in section_summary).
            total_score += question_score
            
            correct_answer = grading_config.get("reference", grading_config.get("correct_answer", grading_config.get("original_passage", "N/A")))
            content = q.get("content") or {}
            question_text = content.get("question", content.get("text", content.get("content", "")))
            
            # Get content URL for media (video/image)
            content_url = content.get("url", "")
            
            # Get passage for reading questions
            passage = content.get("passage", "")
            
            # Get options for MCQ questions
            options = content.get("options", {})
            
            # Get jumble parts for Jumble questions
            jumble_parts = content.get("jumble", {})
            
            breakdown.append({
                "question_id": q["temp_id"],
                "type": question_type,
                "content_url": content_url,  # For video/image display
                "passage": passage,  # For reading questions
                "question_text": question_text[:500] if question_text else "",
                "options": options,  # For MCQ questions (A, B, C options)
                "jumble": jumble_parts,  # For Jumble questions (A, B, C, D parts)
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
        
        # If no questions found, check if this is a template test that needs session_id
        if not questions and test.template_config:
            raise HTTPException(
                status_code=400, 
                detail="This test requires a session_id. Please start the test from the dashboard."
            )

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
            elif q.question_type.startswith('mcq') or q.question_type == 'mcq-annotation':
                grade_data = await grade_mcq_question(
                    student_text,
                    grading.get("correct_answer", ""),
                    q.marks
                )
            elif q.question_type == 'mcq-multi-image':
                import json as _json
                try:
                    answers = _json.loads(student_text) if student_text else {}
                except:
                    answers = {}
                sub_images   = grading.get("sub_images", [])
                mpi          = grading.get("marks_per_image", 4)
                total_score  = 0
                breakdown    = {}
                for i, sub in enumerate(sub_images):
                    given  = str(answers.get(str(i), "")).strip().lower()
                    expect = str(sub.get("correct_answer", "")).strip().lower()
                    if given == expect:
                        total_score += mpi
                        breakdown[f"image_{i+1}"] = {"score": mpi, "correct": True}
                    else:
                        breakdown[f"image_{i+1}"] = {"score": 0, "correct": False, "expected": expect, "given": given}
                grade_data = {"score": total_score, "breakdown": breakdown}
            elif q.question_type == 'typing':
                import json as json_lib
                try:
                    answer_data = json_lib.loads(student_text)
                    typed_text = answer_data.get("typed_text", "")
                    client_time = answer_data.get("time_seconds", 0)
                except:
                    typed_text = student_text
                    client_time = 0
                time_limit = grading.get("time_limit", 120)
                time_taken = min(client_time, time_limit) if client_time > 0 else time_limit
                grade_data = await grade_typing_question(
                    typed_text,
                    grading.get("original_passage", q.content_url_or_text or ""),
                    time_taken,
                    q.marks
                )
            else:
                grade_data = {"score": 0, "breakdown": {"error": "Manual review needed"}}

            question_score = grade_data.get('score', 0)
            total_score += question_score
            
            correct_answer = grading.get("reference", grading.get("correct_answer", "N/A"))
            
            # Extract content fields
            content_url = ""
            passage = ""
            question_text = ""
            
            if q.content:
                content_url = q.content.get("url", "")
                passage = q.content.get("passage", "")
                question_text = q.content.get("question", q.content.get("text", ""))
            else:
                # Legacy mode - content_url_or_text could be URL or passage
                if q.question_type in ['video', 'image']:
                    content_url = q.content_url_or_text or ""
                else:
                    passage = q.content_url_or_text or ""
            
            breakdown.append({
                "question_id": q.id,
                "type": q.question_type,
                "content_url": content_url,  # For video/image display
                "passage": passage,  # For reading questions
                "question_text": question_text[:500] if question_text else "",
                "correct_answer": correct_answer[:500] if isinstance(correct_answer, str) else str(correct_answer),
                "student_answer": student_text[:500] if student_text else "No answer provided",
                "max_marks": q.marks,
                "student_score": question_score,
                "ai_feedback": grade_data.get('breakdown', {})
            })

    # =====================================================
    # COMPUTE SECTION SUMMARY (new evaluation format)
    # =====================================================
    VISUAL_TYPES = {'video', 'video-robot', 'image'}
    TYPING_TYPES = {'typing', 'typing-easy', 'typing-advanced'}

    mcq_jumble_qs = [b for b in breakdown if b['type'] not in VISUAL_TYPES and b['type'] not in TYPING_TYPES]
    typing_qs     = [b for b in breakdown if b['type'] in TYPING_TYPES]
    visual_qs     = [b for b in breakdown if b['type'] in VISUAL_TYPES]

    # --- MCQ + Jumble section ---
    mcq_correct = sum(b['student_score'] for b in mcq_jumble_qs)
    mcq_max     = sum(b['max_marks']     for b in mcq_jumble_qs)
    mcq_pct     = round((mcq_correct / mcq_max) * 100, 1) if mcq_max > 0 else 0.0

    # --- Typing section ---
    typing_tasks = []
    for b in typing_qs:
        fb  = b.get('ai_feedback', {})
        wpm = fb.get('net_wpm', 0)
        acc = fb.get('accuracy', 0)
        typing_tasks.append({
            'question_id': b['question_id'],
            'type':        b['type'],
            'wpm':         wpm,
            'accuracy':    acc,
            'passed':      acc >= 80
        })
    avg_wpm       = round(sum(t['wpm']      for t in typing_tasks) / len(typing_tasks), 1) if typing_tasks else 0
    avg_accuracy  = round(sum(t['accuracy'] for t in typing_tasks) / len(typing_tasks), 1) if typing_tasks else 100
    typing_passed = all(t['passed'] for t in typing_tasks) if typing_tasks else True
    typing_fail_reasons = [
        f"Task {i+1} accuracy {t['accuracy']}% is below 80%"
        for i, t in enumerate(typing_tasks) if not t['passed']
    ]

    # --- Visual section ---
    visual_ranks = []
    for b in visual_qs:
        fb   = b.get('ai_feedback', {})
        rank = fb.get('rank', 'Bad')
        visual_ranks.append({
            'question_id': b['question_id'],
            'type':        b['type'],
            'rank':        rank,
            'feedback':    fb.get('feedback', ''),
            'passed':      rank in ('Good', 'Medium')
        })
    visual_passed_count = sum(1 for q in visual_ranks if q['passed'])
    visual_total        = len(visual_ranks)
    visual_pass_pct     = round((visual_passed_count / visual_total) * 100) if visual_total > 0 else 100
    visual_passed = all(q['passed'] for q in visual_ranks) if visual_ranks else True

    section_summary = {
        'mcq_jumble': {
            'score_pct':      mcq_pct,
            'correct_marks':  mcq_correct,
            'max_marks':      mcq_max,
            'question_count': len(mcq_jumble_qs)
        },
        'typing': {
            'tasks':          typing_tasks,
            'avg_wpm':        avg_wpm,
            'avg_accuracy':   avg_accuracy,
            'benchmark_wpm':  30,
            'passed':         typing_passed,
            'fail_reasons':   typing_fail_reasons,
            'question_count': len(typing_qs)
        },
        'visual': {
            'questions':      visual_ranks,
            'passed':         visual_passed,
            'pass_pct':       visual_pass_pct,
            'passed_count':   visual_passed_count,
            'question_count': visual_total
        },
        'overall_passed': typing_passed and visual_passed
    }

    # total_score = raw MCQ+Jumble correct marks (NOT a percentage)
    # percentage is computed on-the-fly from correct_marks / mcq_max
    total_score = mcq_correct


    try:
        # Fetch the result we saved in Step 1
        result_to_update = await db.execute(
            select(TestResult).where(TestResult.id == saved_result_id)
        )
        final_result = result_to_update.scalars().first()
        
        # Store structured breakdown: version 2 format with section_summary
        final_result.total_score = total_score  # MCQ+Jumble % (0-100)
        final_result.ai_breakdown = {
            "version": 2,
            "section_summary": section_summary,
            "questions": breakdown
        }
        final_result.status = "graded"
        
        await db.commit()
        await db.refresh(final_result)
    except Exception as e:
        # Grading failed but answers are already saved!
        # Log the error and return the result ID (user can view partial result)
        print(f"[GRADING ERROR] Result {saved_result_id}: {str(e)}")
        # Don't raise - answers are safe, just grading failed
        return {"result_id": saved_result_id, "warning": "Grading encountered an issue, please contact admin"}

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

    # Handle both old (list) and new (dict version=2) breakdown formats
    raw_breakdown = exam_result.ai_breakdown
    if isinstance(raw_breakdown, dict) and raw_breakdown.get("version") == 2:
        questions   = raw_breakdown.get("questions", [])
        section_sum = raw_breakdown.get("section_summary", {})
    else:
        questions   = raw_breakdown if isinstance(raw_breakdown, list) else []
        section_sum = {}

    return {
        "total_score":     exam_result.total_score,
        "section_summary": section_sum,
        "breakdown":       questions,
        "date":            exam_result.submitted_at
    }
