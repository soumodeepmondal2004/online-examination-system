from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from typing import Literal
from datetime import datetime, date

# --- AUTH SCHEMAS ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    # P3-4 FIX: Only "student" or "faculty" can self-register. Admin accounts are seeded only.
    role: Literal["student", "faculty"]

    # Extra fields depending on role
    full_name: str
    roll_number: Optional[str] = None # required if role is student
    department: Optional[str] = None  # required if role is faculty

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    full_name: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StudentOut(BaseModel):
    id: int
    full_name: str
    roll_number: str
    class Config:
        from_attributes = True

class TeacherOut(BaseModel):
    id: int
    full_name: str
    department: str
    class Config:
        from_attributes = True

class UserProfileOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    student: Optional[StudentOut] = None
    teacher: Optional[TeacherOut] = None
    class Config:
        from_attributes = True

# --- EXAM SCHEMAS ---

class QuestionCreate(BaseModel):
    question_text: str
    # P4-6 FIX: Validate that question_type is one of the two allowed values
    question_type: Literal["MCQ", "SUBJECTIVE"] = "MCQ"
    options: Optional[List[str]] = None  # List of options for MCQ
    correct_answer: str  # correct option letter (e.g. "A") or keywords
    marks: int = 1

class QuestionOut(BaseModel):
    id: int
    exam_id: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    marks: int
    class Config:
        from_attributes = True

class ExamCreate(BaseModel):
    title: str
    description: str
    subject_id: int
    duration_minutes: int
    start_time: datetime
    end_time: datetime
    randomize_questions: bool = False
    questions: List[QuestionCreate]

class ExamOut(BaseModel):
    id: int
    title: str
    description: str
    subject_id: int
    teacher_id: int
    duration_minutes: int
    start_time: datetime
    end_time: datetime
    randomize_questions: bool
    class Config:
        from_attributes = True

class ExamDetailOut(ExamOut):
    questions: List[QuestionOut]
    class Config:
        from_attributes = True

# --- SUBMISSION SCHEMAS ---

class AnswerSubmit(BaseModel):
    question_id: int
    selected_option: Optional[str] = None
    subjective_answer: Optional[str] = None

class ExamSubmit(BaseModel):
    answers: List[AnswerSubmit]

class ResultOut(BaseModel):
    id: int
    student_id: int
    exam_id: int
    total_score: int
    percentage: float
    grade: str
    status: str
    submitted_at: datetime
    exam_title: Optional[str] = None
    class Config:
        from_attributes = True

# --- ATTENDANCE SCHEMAS ---

class ImagePayload(BaseModel):
    """P4-1 FIX: Moved from attendance.py to the central schemas module."""
    image_base64: str

class AttendanceMark(BaseModel):
    subject_id: int
    image_base64: str  # Webcam image payload

class AttendanceLogOut(BaseModel):
    id: int
    attendance_id: int
    student_id: int
    student_name: str
    roll_number: str
    status: str
    timestamp: Optional[datetime] = None
    verification_method: str
    class Config:
        from_attributes = True

# --- PROCTORING SCHEMAS ---

class ProctoringLogCreate(BaseModel):
    event_type: str  # tab_switch, gaze_away, multiple_faces, no_face
    warning_count: int = 1

class ProctoringLogOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    roll_number: str
    exam_id: int
    exam_title: str
    event_type: str
    timestamp: datetime
    warning_count: int
    class Config:
        from_attributes = True

# --- AI ASSISTANT SCHEMAS ---

class ChatPayload(BaseModel):
    """P4-2 FIX: Moved from assistant.py to the central schemas module."""
    material_id: int
    message: str

class StudyMaterialOut(BaseModel):
    """P4-4 FIX: Safe output schema that does not expose server file_path."""
    id: int
    subject_id: int
    title: str
    uploaded_by: int
    summary: Optional[str] = None
    processed: bool
    class Config:
        from_attributes = True

# --- PREDICTION SCHEMAS ---

class PerformancePredictionOut(BaseModel):
    id: int
    student_id: int
    predicted_grade: str
    risk_level: str
    success_probability: float
    calculated_at: datetime
    class Config:
        from_attributes = True

# --- BASE DATA STRUCTURES ---

class SubjectCreate(BaseModel):
    name: str
    code: str
    course_id: int

class SubjectOut(BaseModel):
    id: int
    name: str
    code: str
    course_id: int
    class Config:
        from_attributes = True

class CourseCreate(BaseModel):
    name: str
    code: str

class CourseOut(BaseModel):
    id: int
    name: str
    code: str
    subjects: List[SubjectOut] = []
    class Config:
        from_attributes = True
