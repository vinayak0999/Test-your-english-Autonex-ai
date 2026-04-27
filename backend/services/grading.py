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
    try:
        eval_result = await evaluate_image_strict(
            user_answer=student_text,
            correct_answer=reference_caption or "",
            image_context=image_context or "Image description task"
        )
    except Exception as e:
        print(f"Image Eval Error: {e}")
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
    try:
        eval_result = await evaluate_reading_strict(
            user_summary=student_text,
            original_passage=original_passage or "",
            reference_summary=reference_summary or "",
            key_ideas=key_ideas or []
        )
    except Exception as e:
        print(f"Reading Eval Error: {e}")
        eval_result = {"total_score": 0, "passed": False, "feedback": f"Evaluation Error: {str(e)}"}
    
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
    Grading Logic for Jumble (Lenient Match)
    - Extracts sequence of letters (A, B, C, D, etc.)
    - Ignores spaces between letters
    - Ignores punctuation and capitalization
    - "ABCD" matches "A B C D" matches "A, B, C, D"
    """
    import re
    
    if not student_text:
        return {"score": 0, "breakdown": {"result": "Incorrect", "correct_answer": correct_answer}}

    def extract_letter_sequence(text: str) -> list:
        """Extract uppercase letters in order - A, B, C, D etc."""
        # Extract all letters, uppercase them
        text = text.upper()
        # For jumble answers, we only care about the letter sequence (A, B, C, D)
        # Extract single capital letters that are likely part labels
        letters = re.findall(r'[A-Z]', text)
        return letters
    
    # Extract letter sequences from both answers
    student_letters = extract_letter_sequence(student_text)
    correct_letters = extract_letter_sequence(correct_answer)
    
    is_correct = student_letters == correct_letters
    
    score = marks if is_correct else 0
    return {
        "score": score,
        "breakdown": {
            "result": "Correct" if is_correct else "Incorrect",
            "student_answer": student_text,
            "expected": correct_answer,
            "student_sequence": " ".join(student_letters),
            "expected_sequence": " ".join(correct_letters),
            "comparison_note": "Compared letter sequence only (spaces ignored)"
        }
    }


async def grade_mcq_question(student_answer: str, correct_answer: str, marks: int):
    """
    Grading Logic for MCQ (Exact Match).
    Handles both single string "A" and JSON string '{"blank1": "A", ...}'
    """
    if not student_answer:
        return {"score": 0, "breakdown": {"result": "Incorrect", "reason": "No answer provided"}}
    
    # Defensive: If correct_answer is missing, return incorrect
    if not correct_answer:
        return {"score": 0, "breakdown": {"result": "Error", "reason": "Missing correct answer in grading config"}}

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
            "selected": student_answer,
            "expected": correct_answer
        }
    }


async def grade_typing_question(student_text: str, original_passage: str,
                                 time_taken_seconds: float, marks: int):
    """
    Grading Logic for Typing Speed Test.
    - Speed: Words Per Minute (WPM) — industry standard: 5 chars = 1 word
    - Accuracy: Correct entries / Total entries TYPED (not passage length)
    - Benchmark: 30 WPM with 90% accuracy = PASS
    """
    if not student_text or not student_text.strip():
        return {
            "score": 0,
            "breakdown": {
                "gross_wpm": 0, "net_wpm": 0, "accuracy": 0,
                "total_chars_typed": 0, "correct_chars": 0, "errors": 0,
                "time_seconds": 0, "completion": 0,
                "speed_score": 0, "accuracy_score": 0,
                "passed": False, "benchmark_wpm": 30, "benchmark_accuracy": 90,
                "result": "No answer",
                "feedback": "No typing input was provided."
            }
        }

    # --- Calculate Gross WPM ---
    typed_chars = len(student_text)
    time_minutes = max(time_taken_seconds / 60, 0.1)
    gross_wpm = (typed_chars / 5) / time_minutes

    # --- Calculate Accuracy (industry standard: correct / typed) ---
    correct_chars = 0
    for i in range(typed_chars):
        if i < len(original_passage) and student_text[i] == original_passage[i]:
            correct_chars += 1

    accuracy = (correct_chars / typed_chars) * 100 if typed_chars > 0 else 0

    # --- Errors = typed - correct (NOT passage - correct) ---
    errors = typed_chars - correct_chars

    # --- Completion (separate metric) ---
    completion = min((typed_chars / len(original_passage)) * 100, 100) if original_passage else 0

    # --- Net WPM ---
    error_rate = errors / time_minutes
    net_wpm = max(gross_wpm - error_rate, 0)

    # --- Scoring (dynamic based on marks parameter) ---
    speed_marks = round(marks * 0.53)
    accuracy_marks = marks - speed_marks

    speed_score = min((net_wpm / 30) * speed_marks, speed_marks)

    if accuracy < 70:
        accuracy_score = 0
        speed_score = 0
    else:
        accuracy_score = (accuracy / 100) * accuracy_marks

    total_score = speed_score + accuracy_score
    if net_wpm < 15:
        total_score = min(total_score, marks / 3)

    passed = net_wpm >= 30 and accuracy >= 90

    if passed:
        feedback = f"Great job! {round(net_wpm)} WPM with {round(accuracy)}% accuracy meets the benchmark."
    elif accuracy < 70:
        feedback = f"Accuracy too low ({round(accuracy)}%). Focus on typing correctly before speed."
    elif net_wpm < 30:
        feedback = f"Speed is {round(net_wpm)} WPM (need 30+). Practice to improve typing speed."
    else:
        feedback = f"Speed is good ({round(net_wpm)} WPM) but accuracy needs work ({round(accuracy)}%)."

    return {
        "score": round(total_score, 1),
        "breakdown": {
            "gross_wpm": round(gross_wpm, 1),
            "net_wpm": round(net_wpm, 1),
            "accuracy": round(accuracy, 1),
            "completion": round(completion, 1),
            "total_chars_typed": typed_chars,
            "correct_chars": correct_chars,
            "errors": errors,
            "time_seconds": round(time_taken_seconds, 1),
            "speed_score": round(speed_score, 1),
            "accuracy_score": round(accuracy_score, 1),
            "passed": passed,
            "benchmark_wpm": 30,
            "benchmark_accuracy": 90,
            "result": "Pass" if passed else "Fail",
            "feedback": feedback
        }
    }

