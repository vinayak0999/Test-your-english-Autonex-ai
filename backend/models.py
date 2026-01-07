from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, Text, JSON, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from database import Base


class Organization(Base):
    """
    Multi-tenancy support: Organizations can have their own users and tests.
    """
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    slug = Column(String, unique=True, index=True)  # URL-friendly identifier
    is_active = Column(Boolean, default=True)  # Enable/disable org
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    users = relationship("User", back_populates="organization")
    tests = relationship("Test", back_populates="organization")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String, default="student")  # "student" or "admin"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Organization relationship (nullable for backward compatibility)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    organization = relationship("Organization", back_populates="users")
    
    # Legacy field for backward compatibility
    organization_name = Column("organization", String, index=True, nullable=True)
    
    # Relationships
    results = relationship("TestResult", back_populates="user")


class Test(Base):
    __tablename__ = "tests"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    duration_minutes = Column(Integer)
    total_marks = Column(Integer, default=100)
    instructions = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Organization relationship (nullable = public test)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    organization = relationship("Organization", back_populates="tests")
    
    # Template config for random question generation per user
    # Format: [{"type": "video", "count": 2, "marks": 15}, {"type": "reading", "count": 3, "marks": 10}, ...]
    template_config = Column(JSON, nullable=True)
    
    # Relationships with CASCADE DELETE
    questions = relationship("Question", back_populates="test", lazy="selectin", cascade="all, delete-orphan")
    results = relationship("TestResult", backref="test", cascade="all, delete-orphan")
    exam_sessions = relationship("ExamSession", back_populates="test", cascade="all, delete-orphan")


class Question(Base):
    """
    Flexible question model supporting multiple question types.
    
    Content (JSONB) structure varies by type:
        - video: {"url": "/static/videos/...", "poster": "..."}
        - reading: {"passage": "...", "prompt": "Summarize..."}
        - image: {"url": "...", "prompt": "Describe..."}
        - mcq: {"question": "...", "options": [...], "correct": 0}
        - cognitive: {"pattern": [...], "prompt": "..."}
    
    GradingConfig (JSONB) structure:
        {
            "reference": "Ideal answer text",
            "key_ideas": ["idea1", "idea2"],
            "weights": {"similarity": 6, "ideas": 5, "grammar": 4}
        }
    """
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), index=True)
    question_type = Column(String)  # video, reading, image, mcq, cognitive, etc.
    marks = Column(Integer)
    
    # FLEXIBLE: Content stored as JSON (structure depends on question_type)
    content = Column(JSON, default={})
    
    # FLEXIBLE: AI grading configuration
    grading_config = Column(JSON, default={})
    
    # Legacy fields for backward compatibility (will be deprecated)
    content_url_or_text = Column(Text, nullable=True)
    reference_context = Column(Text, nullable=True)
    key_ideas = Column(JSON, nullable=True)
    
    # Relationships
    test = relationship("Test", back_populates="questions")
    
    @hybrid_property
    def content_data(self):
        """Get content, falling back to legacy field if needed"""
        if self.content:
            return self.content
        # Fallback for legacy data
        return {
            "url": self.content_url_or_text,
            "text": self.content_url_or_text
        }
    
    @hybrid_property
    def grading_data(self):
        """Get grading config, falling back to legacy fields if needed"""
        if self.grading_config:
            return self.grading_config
        # Fallback for legacy data
        return {
            "reference": self.reference_context,
            "key_ideas": self.key_ideas or []
        }


class TestResult(Base):
    __tablename__ = "test_results"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    test_id = Column(Integer, ForeignKey("tests.id"))
    
    total_score = Column(Float, default=0.0)
    ai_breakdown = Column(JSON)  # Detailed scores per question
    admin_override_score = Column(Float, nullable=True)  # Manual override
    flags = Column(Integer, default=0)  # Tab-switch count
    status = Column(String, default="submitted", index=True)  # submitted, graded
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="results")
    # Note: 'test' relationship defined in Test model with cascade


class ExamSession(Base):
    """
    Stores per-user exam state with randomly generated questions.
    Each user gets a unique set of questions when starting a test.
    """
    __tablename__ = "exam_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), index=True)
    
    # The randomly generated questions for this specific user
    # Format: [{"temp_id": 1, "type": "video", "content": {...}, "grading_config": {...}, "marks": 15}, ...]
    generated_questions = Column(JSON)
    
    # Student answers stored here during exam
    # Format: {"temp_id_1": "answer text", "temp_id_2": "answer text", ...}
    answers = Column(JSON, default={})
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_completed = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User")
    test = relationship("Test", back_populates="exam_sessions")
