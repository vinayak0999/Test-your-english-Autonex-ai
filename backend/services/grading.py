from services.ai_engine import (
    get_vector_similarity, 
    check_key_ideas, 
    evaluate_english_quality,
    evaluate_video_strict,
    evaluate_image_strict,
    evaluate_reading_strict
)

async def grade_video_question(student_text: str, reference_caption: str, key_ideas: list, video_context: str = ""):
    """
    Grading Logic for Video Question (15 Marks)
    Uses STRICT rubric-based AI evaluation.
    """
    
    # Handle empty answers
    if not student_text or not student_text.strip():
        return {
            "score": 0, 
            "breakdown": {
                "error": "No answer provided",
                "grammar_structure_score": 0,
                "vocabulary_word_choice_score": 0,
                "clarity_meaning_score": 0,
                "instruction_compliance_score": 0,
                "spelling_formatting_score": 0,
                "feedback": "No answer was provided."
            }
        }
    
    # Use strict evaluation
    try:
        eval_result = await evaluate_video_strict(
            user_answer=student_text,
            correct_answer=reference_caption or "",
            video_context=video_context or "Video description task"
        )
    except Exception as e:
        print(f"Video Eval Error: {e}")
        eval_result = {"total_score": 0, "passed": False, "feedback": f"Evaluation Error: {str(e)}"}
    
    # Extract score and breakdown
    total_score = eval_result.get('total_score', 0)
    
    return {
        "score": round(total_score, 1),
        "breakdown": {
            "grammar_structure_score": eval_result.get('grammar_structure_score', 0),
            "vocabulary_word_choice_score": eval_result.get('vocabulary_word_choice_score', 0),
            "clarity_meaning_score": eval_result.get('clarity_meaning_score', 0),
            "instruction_compliance_score": eval_result.get('instruction_compliance_score', 0),
            "spelling_formatting_score": eval_result.get('spelling_formatting_score', 0),
            "passed": eval_result.get('passed', False),
            "feedback": eval_result.get('feedback', ''),
            "grade_justification": eval_result.get('grade_justification', '')
        }
    }


async def grade_image_question(student_text: str, reference_caption: str, key_ideas: list, image_context: str = ""):
    """
    Grading Logic for Image Question (15 Marks)
    Uses STRICT rubric-based AI evaluation.
    """
    
    # Handle empty answers
    if not student_text or not student_text.strip():
        return {
            "score": 0, 
            "breakdown": {
                "error": "No answer provided",
                "grammar_structure_score": 0,
                "vocabulary_word_choice_score": 0,
                "clarity_meaning_score": 0,
                "instruction_compliance_score": 0,
                "spelling_formatting_score": 0,
                "feedback": "No answer was provided."
            }
        }
    
    # Use strict evaluation
    eval_result = await evaluate_image_strict(
        user_answer=student_text,
        correct_answer=reference_caption or "",
        image_context=image_context or "Image description task"
    )
    
    # Extract score and breakdown
    total_score = eval_result.get('total_score', 0)
    
    return {
        "score": round(total_score, 1),
        "breakdown": {
            "grammar_structure_score": eval_result.get('grammar_structure_score', 0),
            "vocabulary_word_choice_score": eval_result.get('vocabulary_word_choice_score', 0),
            "clarity_meaning_score": eval_result.get('clarity_meaning_score', 0),
            "instruction_compliance_score": eval_result.get('instruction_compliance_score', 0),
            "spelling_formatting_score": eval_result.get('spelling_formatting_score', 0),
            "passed": eval_result.get('passed', False),
            "feedback": eval_result.get('feedback', ''),
            "grade_justification": eval_result.get('grade_justification', '')
        }
    }


async def grade_reading_question(student_text: str, original_passage: str, reference_summary: str, key_ideas: list):
    """
    Grading Logic for Reading Summary (15 Marks)
    Includes Copy-Paste Detection + STRICT rubric-based AI evaluation.
    """
    # Handle empty answers
    if not student_text or not student_text.strip():
        return {
            "score": 0, 
            "breakdown": {
                "error": "No answer provided",
                "key_idea_coverage_score": 0,
                "paraphrasing_score": 0,
                "grammar_structure_score": 0,
                "coherence_flow_score": 0,
                "vocabulary_precision_score": 0,
                "feedback": "No answer was provided."
            }
        }
    
    # 1. Copy-Paste Detection (quick check before AI eval)
    copy_score = await get_vector_similarity(student_text, original_passage or "")
    if copy_score > 0.85:  # If 85% similar to original text -> It's copied
        return {
            "score": 0, 
            "breakdown": {
                "error": "Plagiarism Detected (Too similar to passage)",
                "similarity_to_passage": f"{round(copy_score*100)}%",
                "feedback": "Your summary appears to be copied directly from the passage. Write in your own words."
            }
        }

    # 2. Use strict evaluation
    eval_result = await evaluate_reading_strict(
        user_summary=student_text,
        original_passage=original_passage or "",
        reference_summary=reference_summary or "",
        key_ideas=key_ideas or []
    )
    
    # Extract score and breakdown
    total_score = eval_result.get('total_score', 0)
    
    return {
        "score": round(total_score, 1),
        "breakdown": {
            "key_idea_coverage_score": eval_result.get('key_idea_coverage_score', 0),
            "paraphrasing_score": eval_result.get('paraphrasing_score', 0),
            "grammar_structure_score": eval_result.get('grammar_structure_score', 0),
            "coherence_flow_score": eval_result.get('coherence_flow_score', 0),
            "vocabulary_precision_score": eval_result.get('vocabulary_precision_score', 0),
            "passed": eval_result.get('passed', False),
            "key_ideas_found": eval_result.get('key_ideas_found', []),
            "key_ideas_missing": eval_result.get('key_ideas_missing', []),
            "feedback": eval_result.get('feedback', ''),
            "grade_justification": eval_result.get('grade_justification', '')
        }
    }


async def grade_jumble_question(student_text: str, correct_answer: str, marks: int):
    """
    Grading Logic for Jumble (Simple Exact/Fuzzy Match)
    """
    if not student_text:
        return {"score": 0, "breakdown": {"result": "Incorrect", "correct_answer": correct_answer}}

    # Normalize: lower case, strip punctuation if needed
    is_correct = student_text.strip().lower() == correct_answer.strip().lower()
    
    score = marks if is_correct else 0
    return {
        "score": score,
        "breakdown": {
            "result": "Correct" if is_correct else "Incorrect",
            "student_answer": student_text
        }
    }


async def grade_mcq_question(student_answer: str, correct_answer: str, marks: int):
    """
    Grading Logic for MCQ (Exact Match).
    Handles both single string "A" and JSON string '{"blank1": "A", ...}'
    """
    if not student_answer:
        return {"score": 0, "breakdown": {"result": "Incorrect"}}

    # Handle JSON matching (for Contextual Fill-in-blanks)
    try:
        import json
        student_json = json.loads(student_answer)
        correct_json = json.loads(correct_answer)
        
        # Compare dictionaries
        is_correct = student_json == correct_json
    except:
        # Fallback to simple string compare (for Grammar/Reading MCQ)
        is_correct = student_answer.strip().upper() == correct_answer.strip().upper()

    score = marks if is_correct else 0
    
    return {
        "score": score,
        "breakdown": {
            "result": "Correct" if is_correct else "Incorrect",
            "selected": student_answer
        }
    }

