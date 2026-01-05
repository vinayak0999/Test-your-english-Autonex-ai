from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime

# --- Organization Schemas ---
class OrganizationBase(BaseModel):
    name: str
    slug: str

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationResponse(OrganizationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    organization_name: Optional[str] = None  # Using organization_name to avoid SQLAlchemy relationship conflict

class UserCreate(UserBase):
    password: str
    organization_id: Optional[int] = None  # For org dropdown

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    organization_id: Optional[int] = None

    class Config:
        from_attributes = True

# --- Token Schema ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_name: str

# --- Question Schemas ---
class QuestionBase(BaseModel):
    question_type: str
    marks: int
    
    # New flexible fields
    content: Optional[Dict[str, Any]] = {}
    grading_config: Optional[Dict[str, Any]] = {}
    
    # Legacy fields (for backward compatibility)
    content_url_or_text: Optional[str] = None
    reference_context: Optional[str] = None
    key_ideas: Optional[List[str]] = []

class QuestionCreate(QuestionBase):
    pass

class QuestionResponse(QuestionBase):
    id: int
    test_id: int

    class Config:
        from_attributes = True

# --- Test Schemas ---
class TestTemplateConfig(BaseModel):
    title: str
    duration_minutes: int
    total_marks: int
    instructions: str
    sections: List[Dict[str, Any]] 
    # Example: [{"type": "jumble", "count": 20, "marks": 1}, ...]
    organization_id: Optional[int] = None

class TestCreate(BaseModel):
    title: str
    duration_minutes: int
    total_marks: int
    instructions: str
    questions: List[QuestionBase]
    organization_id: Optional[int] = None

class TestResponse(BaseModel):
    id: int
    title: str
    duration_minutes: int
    total_marks: int
    instructions: str
    is_active: bool
    organization_id: Optional[int] = None
    question_count: Optional[int] = None

    class Config:
        from_attributes = True

class TestUpdate(BaseModel):
    """Schema for updating test settings"""
    title: Optional[str] = None
    duration_minutes: Optional[int] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = None
    organization_id: Optional[int] = None

# --- Exam Submission Schemas ---
class AnswerSubmission(BaseModel):
    question_id: int
    student_text: str

class ExamSubmission(BaseModel):
    answers: Dict[str, str]  # { "question_id": "student text" }
    flags: int = 0

# --- Result Schemas ---
class ResultResponse(BaseModel):
    id: int
    total_score: float
    ai_breakdown: List[Dict[str, Any]]
    status: str
    submitted_at: datetime
    flags: int = 0

    class Config:
        from_attributes = True
