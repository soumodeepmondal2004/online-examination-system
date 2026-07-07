from datetime import datetime, date as py_date
from typing import Optional, List, Dict
from sqlmodel import SQLModel, Field, Relationship, JSON


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    role: str = Field(nullable=False)  # admin, faculty, student
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)

    # Relationships
    student: Optional["Student"] = Relationship(back_populates="user", sa_relationship_kwargs={"uselist": False})
    teacher: Optional["Teacher"] = Relationship(back_populates="user", sa_relationship_kwargs={"uselist": False})

class Student(SQLModel, table=True):
    __tablename__ = "students"
    id: int = Field(primary_key=True, foreign_key="users.id")
    full_name: str = Field(nullable=False)
    roll_number: str = Field(index=True, unique=True, nullable=False)
    face_encoding: Optional[str] = Field(default=None) # JSON-serialized face list/embedding vector

    # Relationships
    user: User = Relationship(back_populates="student")
    answers: List["StudentAnswer"] = Relationship(back_populates="student")
    results: List["Result"] = Relationship(back_populates="student")
    attendance_logs: List["AttendanceLog"] = Relationship(back_populates="student")
    proctoring_logs: List["ProctoringLog"] = Relationship(back_populates="student")
    predictions: List["PerformancePrediction"] = Relationship(back_populates="student")
    chat_history: List["ChatHistory"] = Relationship(back_populates="student")

class Teacher(SQLModel, table=True):
    __tablename__ = "teachers"
    id: int = Field(primary_key=True, foreign_key="users.id")
    full_name: str = Field(nullable=False)
    department: str = Field(nullable=False)

    # Relationships
    user: User = Relationship(back_populates="teacher")
    exams: List["Exam"] = Relationship(back_populates="teacher")
    uploaded_materials: List["StudyMaterial"] = Relationship(back_populates="teacher")

class Course(SQLModel, table=True):
    __tablename__ = "courses"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(nullable=False)
    code: str = Field(unique=True, nullable=False)

    # Relationships
    subjects: List["Subject"] = Relationship(back_populates="course")

class Subject(SQLModel, table=True):
    __tablename__ = "subjects"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(nullable=False)
    code: str = Field(unique=True, nullable=False)
    course_id: int = Field(foreign_key="courses.id")

    # Relationships
    course: Course = Relationship(back_populates="subjects")
    exams: List["Exam"] = Relationship(back_populates="subject")
    attendance: List["Attendance"] = Relationship(back_populates="subject")
    study_materials: List["StudyMaterial"] = Relationship(back_populates="subject")

class Exam(SQLModel, table=True):
    __tablename__ = "exams"
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(nullable=False)
    description: str = Field(nullable=False)
    subject_id: int = Field(foreign_key="subjects.id")
    teacher_id: int = Field(foreign_key="teachers.id")
    duration_minutes: int = Field(nullable=False)
    start_time: datetime = Field(nullable=False)
    end_time: datetime = Field(nullable=False)
    randomize_questions: bool = Field(default=False)

    # Relationships
    subject: Subject = Relationship(back_populates="exams")
    teacher: Teacher = Relationship(back_populates="exams")
    questions: List["Question"] = Relationship(back_populates="exam", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    answers: List["StudentAnswer"] = Relationship(back_populates="exam", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    results: List["Result"] = Relationship(back_populates="exam", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    proctoring_logs: List["ProctoringLog"] = Relationship(back_populates="exam", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class Question(SQLModel, table=True):
    __tablename__ = "questions"
    id: Optional[int] = Field(default=None, primary_key=True)
    exam_id: int = Field(foreign_key="exams.id")
    question_text: str = Field(nullable=False)
    question_type: str = Field(default="MCQ") # MCQ or SUBJECTIVE
    options: Optional[str] = Field(default=None) # JSON-serialized list of strings for MCQ options
    correct_answer: str = Field(nullable=False) # MCQ option or keyword list for subjective evaluation
    marks: int = Field(default=1)

    # Relationships
    exam: Exam = Relationship(back_populates="questions")
    student_answers: List["StudentAnswer"] = Relationship(back_populates="question", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class StudentAnswer(SQLModel, table=True):
    __tablename__ = "student_answers"
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="students.id")
    exam_id: int = Field(foreign_key="exams.id")
    question_id: int = Field(foreign_key="questions.id")
    selected_option: Optional[str] = Field(default=None)
    subjective_answer: Optional[str] = Field(default=None)
    is_evaluated: bool = Field(default=False)
    score: int = Field(default=0)

    # Relationships
    student: Student = Relationship(back_populates="answers")
    exam: Exam = Relationship(back_populates="answers")
    question: Question = Relationship(back_populates="student_answers")

class Result(SQLModel, table=True):
    __tablename__ = "results"
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="students.id")
    exam_id: int = Field(foreign_key="exams.id")
    total_score: int = Field(nullable=False)
    percentage: float = Field(nullable=False)
    grade: str = Field(nullable=False)
    submitted_at: datetime = Field(default_factory=datetime.now)
    status: str = Field(nullable=False)  # pass, fail

    # Relationships
    student: Student = Relationship(back_populates="results")
    exam: Exam = Relationship(back_populates="results")

class Attendance(SQLModel, table=True):
    __tablename__ = "attendance"
    id: Optional[int] = Field(default=None, primary_key=True)
    subject_id: int = Field(foreign_key="subjects.id")
    date: py_date = Field(default_factory=py_date.today)

    # Relationships
    subject: Subject = Relationship(back_populates="attendance")
    logs: List["AttendanceLog"] = Relationship(back_populates="attendance", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class AttendanceLog(SQLModel, table=True):
    __tablename__ = "attendance_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    attendance_id: int = Field(foreign_key="attendance.id")
    student_id: int = Field(foreign_key="students.id")
    status: str = Field(default="absent") # present, absent
    timestamp: Optional[datetime] = Field(default=None)
    verification_method: str = Field(default="manual") # manual, face_recognition

    # Relationships
    attendance: Attendance = Relationship(back_populates="logs")
    student: Student = Relationship(back_populates="attendance_logs")

class StudyMaterial(SQLModel, table=True):
    __tablename__ = "study_materials"
    id: Optional[int] = Field(default=None, primary_key=True)
    subject_id: int = Field(foreign_key="subjects.id")
    title: str = Field(nullable=False)
    file_path: str = Field(nullable=False)
    uploaded_by: int = Field(foreign_key="teachers.id")
    summary: Optional[str] = Field(default=None)
    processed: bool = Field(default=False)

    # Relationships
    subject: Subject = Relationship(back_populates="study_materials")
    teacher: Teacher = Relationship(back_populates="uploaded_materials")

class ChatHistory(SQLModel, table=True):
    __tablename__ = "chat_history"
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="students.id")
    message: str = Field(nullable=False)
    response: str = Field(nullable=False)
    timestamp: datetime = Field(default_factory=datetime.now)

    # Relationships
    student: Student = Relationship(back_populates="chat_history")

class ProctoringLog(SQLModel, table=True):
    __tablename__ = "proctoring_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="students.id")
    exam_id: int = Field(foreign_key="exams.id")
    event_type: str = Field(nullable=False) # tab_switch, gaze_away, multiple_faces, no_face
    timestamp: datetime = Field(default_factory=datetime.now)
    warning_count: int = Field(default=1)

    # Relationships
    student: Student = Relationship(back_populates="proctoring_logs")
    exam: Exam = Relationship(back_populates="proctoring_logs")

class PerformancePrediction(SQLModel, table=True):
    __tablename__ = "performance_predictions"
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="students.id")
    predicted_grade: str = Field(nullable=False)
    risk_level: str = Field(nullable=False) # low, medium, high
    success_probability: float = Field(nullable=False)
    calculated_at: datetime = Field(default_factory=datetime.now)

    # Relationships
    student: Student = Relationship(back_populates="predictions")
