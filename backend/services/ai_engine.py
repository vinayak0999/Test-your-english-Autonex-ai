import asyncio
from concurrent.futures import ThreadPoolExecutor
import anthropic
import json
import re
from config import settings

# Dedicated thread pool for AI tasks
ai_executor = ThreadPoolExecutor(max_workers=3)

print("Loading AI Engine... Claude 3.5 Sonnet (This happens once)")

# Claude client — created fresh per call (lightweight, no network cost at creation)
_claude = None
MODEL = "claude-haiku-4-5-20251001"

def _get_claude():
    """Always create a fresh client reading the current key from settings."""
    key = settings.ANTHROPIC_API_KEY
    return anthropic.Anthropic(api_key=key)

# --- Lightweight Similarity Functions (No Heavy ML Dependencies) ---

def _normalize_text(text: str) -> set:
    """Normalize text to set of words for comparison"""
    if not text:
        return set()
    text = re.sub(r'[^\w\s]', '', text.lower())
    return set(text.split())

def _sync_get_vector_similarity(text1: str, text2: str) -> float:
    """Lightweight word overlap similarity (Jaccard similarity)"""
    if not text1 or not text2:
        return 0.0
    words1 = _normalize_text(text1)
    words2 = _normalize_text(text2)
    if not words1 or not words2:
        return 0.0
    intersection = len(words1 & words2)
    union = len(words1 | words2)
    return intersection / union if union > 0 else 0.0

async def get_vector_similarity(text1: str, text2: str) -> float:
    """Async Wrapper (Non-Blocking)"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(ai_executor, _sync_get_vector_similarity, text1, text2)

def _sync_check_key_ideas(student_text: str, key_ideas: list) -> float:
    """Check if student text contains key ideas using word matching"""
    if not key_ideas:
        return 1.0
    student_words = _normalize_text(student_text)
    match_count = 0
    for idea in key_ideas:
        idea_words = _normalize_text(idea)
        if idea_words and len(student_words & idea_words) / len(idea_words) > 0.5:
            match_count += 1
    return min(match_count / len(key_ideas), 1.0)

async def check_key_ideas(student_text: str, key_ideas: list) -> float:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(ai_executor, _sync_check_key_ideas, student_text, key_ideas)


# ============================================================
# CORE CLAUDE CALLER
# ============================================================

def _call_claude(prompt: str) -> dict:
    """Thread-safe Claude 3.5 Sonnet call — returns parsed JSON dict"""
    try:
        client = _get_claude()
        message = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text.strip()
        # Strip any markdown code fences
        text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
        text = text.strip()
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"Claude JSON parse error: {e}\nRaw: {text[:300]}")
        return {"relevance": 1, "grammar": 5, "feedback": "AI parse error"}
    except Exception as e:
        print(f"Claude API error: {e}")
        return {"relevance": 1, "grammar": 5, "feedback": f"AI Error: {str(e)}"}


async def evaluate_english_quality(text: str, context_type: str) -> dict:
    """
    Legacy function — kept for backward compatibility.
    IELTS-Style Evaluation using Claude 3.5 Sonnet.
    """
    prompt = f"""You are a strict IELTS Examiner. Evaluate this student answer for the task: "{context_type}".

Student Answer: "{text}"

Criteria (0-9 Scale):
1. Task Achievement: Did they answer the specific question? If OFF-TOPIC, give 0 immediately.
2. Coherence & Cohesion: Flow, linking words, logic.
3. Lexical Resource: Range of vocabulary, precision.
4. Grammatical Range & Accuracy: Syntax errors, sentence complexity.

Strict Rules:
- If answer is completely irrelevant or gibberish -> score 0.
- Be harsh on basic vocabulary.

Output ONLY valid JSON in this exact format, no other text:
{{
    "relevance": 0 or 1,
    "grammar": 0-10,
    "vocab_score": 0-10,
    "coherence_score": 0-10,
    "feedback": "Concise feedback focused on improvements."
}}"""

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(ai_executor, _call_claude, prompt)
        return result
    except Exception as e:
        print(f"Eval Error: {e}")
        return {"relevance": 1, "grammar": 5, "feedback": "System Error"}


# ============================================================
# STRICT EVALUATION FUNCTIONS (15-Mark Rubric-Based)
# ============================================================

async def evaluate_video_strict(user_answer: str, correct_answer: str, video_context: str) -> dict:
    """
    Strict Video Question Evaluation (15 Marks Total)
    - Grammar & Structure: 4 marks
    - Vocabulary & Word Choice: 4 marks
    - Clarity & Meaning: 3 marks
    - Instruction Compliance: 2 marks
    - Spelling & Formatting: 2 marks
    """
    prompt = f"""You are a STRICT English teacher grading a proficiency test. You do NOT give participation points. You FAIL students who deserve to fail.

VIDEO DESCRIPTION: {video_context}
CORRECT ANSWER: "{correct_answer}"
USER'S ANSWER: "{user_answer}"

TOTAL MARKS: 15

BE BRUTALLY HONEST. This is NOT about being nice - it's about English proficiency.

CRITICAL RULES:
1. If the main content is WRONG (wrong object/action), maximum possible score is 6/15 (FAIL)
2. If they're vague when they should be specific, it shows they DON'T understand
3. Multiple spelling errors = they can't spell = LOW marks
4. Missing key details = they didn't pay attention = LOW marks
5. "Close enough" is NOT acceptable in language learning

EVALUATION CRITERIA:

1. GRAMMAR & STRUCTURE (4 marks):
   - Missing ONE article (a, an, the) = -1 mark
   - Wrong preposition = -1 mark
   - Incomplete sentence = -2 marks
   - Multiple grammar errors = 0 marks

2. VOCABULARY & WORD CHOICE (4 marks):
   - Did they identify the CORRECT objects from the video?
   - Generic words (stuff, things, outside) instead of specific ones = -2 marks minimum
   - Wrong object entirely = 0 marks
   - Vague = Poor English = Low marks

3. CLARITY & MEANING (3 marks):
   - Does it MATCH the correct answer's meaning?
   - Missing key descriptors = -1 mark each
   - If answer is vague/unclear/wrong = 0-1 marks maximum

4. INSTRUCTION COMPLIANCE (2 marks):
   - MUST start with EXACTLY: "walk to" OR "turn right to" OR "turn left to"
   - "walking", "walked", "go to" = WRONG = 0 marks
   - All or nothing: 2 marks or 0 marks

5. SPELLING & FORMATTING (2 marks):
   - ONE spelling error = -1 mark
   - TWO+ spelling errors = 0 marks

SCORING PHILOSOPHY:
- If they got the main content WRONG = FAIL (below 8/15)
- If they were vague/generic = LOW marks (below 10/15)
- Only give high marks (13+) if answer is truly GOOD
- Most students should score 6-12, NOT 12-15

Output ONLY valid JSON, no other text:
{{
    "grammar_structure_score": 0-4,
    "vocabulary_word_choice_score": 0-4,
    "clarity_meaning_score": 0-3,
    "instruction_compliance_score": 0 or 2,
    "spelling_formatting_score": 0-2,
    "total_score": 0-15,
    "passed": true or false,
    "feedback": "Specific, constructive feedback explaining deductions",
    "grade_justification": "Brief breakdown of why each score was given"
}}"""

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(ai_executor, _call_claude, prompt)
        return result
    except Exception as e:
        print(f"Video Eval Error: {e}")
        return {"total_score": 0, "passed": False, "feedback": "Evaluation Error"}


async def evaluate_image_strict(user_answer: str, correct_answer: str, image_context: str) -> dict:
    """
    Strict Image Question Evaluation (15 Marks Total)
    Same rubric as video but focused on visual description.
    """
    prompt = f"""You are a STRICT English teacher grading a proficiency test. You do NOT give participation points.

IMAGE DESCRIPTION: {image_context}
CORRECT ANSWER: "{correct_answer}"
USER'S ANSWER: "{user_answer}"

TOTAL MARKS: 15

EVALUATION CRITERIA:

1. GRAMMAR & STRUCTURE (4 marks):
   - Missing articles (a, an, the) = -1 mark each
   - Wrong preposition/verb form = -1 mark
   - Incomplete/run-on sentence = -2 marks

2. VOCABULARY & OBJECT IDENTIFICATION (4 marks):
   - Did they identify the CORRECT objects in the image?
   - Wrong object = 0 marks
   - Vague description (thing, stuff) = -2 marks
   - Missing key objects = -1 mark each

3. CLARITY & DETAIL (3 marks):
   - Does description match the image accurately?
   - Missing important details = -1 mark each
   - Confusing/unclear = 0-1 marks

4. INSTRUCTION COMPLIANCE (2 marks):
   - Must follow the exact format requested
   - Binary: 2 marks or 0 marks

5. SPELLING & FORMATTING (2 marks):
   - ONE spelling error = -1 mark
   - TWO+ spelling errors = 0 marks

STRICT RULES:
- Wrong content = maximum 6/15
- Vague answers = maximum 10/15
- Multiple errors = FAIL

Output ONLY valid JSON, no other text:
{{
    "grammar_structure_score": 0-4,
    "vocabulary_word_choice_score": 0-4,
    "clarity_meaning_score": 0-3,
    "instruction_compliance_score": 0 or 2,
    "spelling_formatting_score": 0-2,
    "total_score": 0-15,
    "passed": true or false,
    "feedback": "Specific feedback explaining deductions",
    "grade_justification": "Brief breakdown of scores"
}}"""

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(ai_executor, _call_claude, prompt)
        return result
    except Exception as e:
        print(f"Image Eval Error: {e}")
        return {"total_score": 0, "passed": False, "feedback": "Evaluation Error"}


async def evaluate_reading_strict(user_summary: str, original_passage: str, reference_summary: str, key_ideas: list) -> dict:
    """
    Strict Reading Summary Evaluation (15 Marks Total)
    - Key Idea Coverage: 5 marks
    - Paraphrasing Quality: 4 marks
    - Grammar & Structure: 3 marks
    - Coherence & Flow: 2 marks
    - Vocabulary Precision: 1 mark
    """
    key_ideas_str = ", ".join(key_ideas) if key_ideas else "Not specified"

    prompt = f"""You are a STRICT English teacher grading a reading comprehension summary. Be harsh but fair.

ORIGINAL PASSAGE: "{original_passage[:500]}..."
REFERENCE SUMMARY: "{reference_summary}"
KEY IDEAS TO COVER: {key_ideas_str}
USER'S SUMMARY: "{user_summary}"

TOTAL MARKS: 15

EVALUATION CRITERIA:

1. KEY IDEA COVERAGE (5 marks):
   - Award 1 mark for each key idea correctly mentioned
   - Missing key ideas = direct mark deduction
   - Added incorrect information = -1 mark

2. PARAPHRASING QUALITY (4 marks):
   - Direct copy-paste = 0 marks (AUTOMATIC FAIL for this section)
   - Good paraphrasing with own words = 4 marks
   - Partial paraphrasing = 2-3 marks
   - Mostly copied = 0-1 marks

3. GRAMMAR & STRUCTURE (3 marks):
   - Complete, well-formed sentences = 3 marks
   - Minor errors = 2 marks
   - Multiple errors = 1 mark
   - Major errors = 0 marks

4. COHERENCE & FLOW (2 marks):
   - Logical order, smooth transitions = 2 marks
   - Choppy but understandable = 1 mark
   - Disorganized = 0 marks

5. VOCABULARY PRECISION (1 mark):
   - Appropriate academic vocabulary = 1 mark
   - Basic/repetitive vocabulary = 0 marks

STRICT RULES:
- Copy-paste from passage = maximum 5/15
- Missing half the key ideas = maximum 8/15
- Incoherent summary = maximum 6/15

Output ONLY valid JSON, no other text:
{{
    "key_idea_coverage_score": 0-5,
    "paraphrasing_score": 0-4,
    "grammar_structure_score": 0-3,
    "coherence_flow_score": 0-2,
    "vocabulary_precision_score": 0-1,
    "total_score": 0-15,
    "passed": true or false,
    "key_ideas_found": ["list of key ideas student mentioned"],
    "key_ideas_missing": ["list of key ideas student missed"],
    "feedback": "Specific feedback on summary quality",
    "grade_justification": "Brief breakdown of scores"
}}"""

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(ai_executor, _call_claude, prompt)
        return result
    except Exception as e:
        print(f"Reading Eval Error: {e}")
        return {"total_score": 0, "passed": False, "feedback": "Evaluation Error"}
