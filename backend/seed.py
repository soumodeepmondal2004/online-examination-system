from datetime import datetime, timedelta, date
import json
from sqlmodel import Session, create_engine, select
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.database import init_db
from app.models.models import User, Student, Teacher, Course, Subject, Exam, Question, Result, Attendance, AttendanceLog, PerformancePrediction

def seed_database():
    engine = create_engine(settings.DATABASE_URL)
    
    # Initialize schema
    init_db()
    
    with Session(engine) as session:
        # Check if database is already seeded
        existing = session.exec(select(User)).first()
        if existing:
            print("Database already contains data. Seeding skipped.")
            return

        print("Seeding database...")

        # 1. Create Users
        admin_user = User(
            email="admin@exam.com",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        )
        faculty_user = User(
            email="faculty@exam.com",
            hashed_password=get_password_hash("faculty123"),
            role="faculty"
        )
        student_user = User(
            email="student@exam.com",
            hashed_password=get_password_hash("student123"),
            role="student"
        )
        
        session.add(admin_user)
        session.add(faculty_user)
        session.add(student_user)
        session.commit() # Save to get IDs

        # 2. Create Teacher & Student profiles
        teacher = Teacher(
            id=faculty_user.id,
            full_name="Dr. Alan Turing",
            department="Computer Science & Engineering"
        )
        
        student = Student(
            id=student_user.id,
            full_name="Grace Hopper",
            roll_number="CS-2026-089"
        )
        
        session.add(teacher)
        session.add(student)
        session.commit()

        # 3. Create Course
        course = Course(
            name="Bachelor of Computer Science",
            code="B-CS"
        )
        session.add(course)
        session.commit()

        # 4. Create Subjects
        subject1 = Subject(
            name="Design and Analysis of Algorithms",
            code="CS-301",
            course_id=course.id
        )
        subject2 = Subject(
            name="Database Management Systems",
            code="CS-302",
            course_id=course.id
        )
        session.add(subject1)
        session.add(subject2)
        session.commit()

        # 5. Create active live Exam
        now = datetime.now()
        exam = Exam(
            title="Algorithms Midterm Exam",
            description="Covers sorting, searching, divide & conquer, and dynamic programming.",
            subject_id=subject1.id,
            teacher_id=teacher.id,
            duration_minutes=30,
            start_time=now - timedelta(minutes=5),  # Started 5 mins ago
            end_time=now + timedelta(hours=24),     # Open for 24 hours
            randomize_questions=True
        )
        session.add(exam)
        session.commit()

        # 6. Add Questions
        q1 = Question(
            exam_id=exam.id,
            question_text="What is the average time complexity of Quick Sort?",
            question_type="MCQ",
            options=json.dumps(["O(N)", "O(N log N)", "O(N^2)", "O(log N)"]),
            correct_answer="B",
            marks=2
        )
        q2 = Question(
            exam_id=exam.id,
            question_text="Which of the following data structures is typically used to implement Breadth First Search (BFS)?",
            question_type="MCQ",
            options=json.dumps(["Stack", "Queue", "Priority Queue", "Linked List"]),
            correct_answer="B",
            marks=2
        )
        q3 = Question(
            exam_id=exam.id,
            question_text="Describe the divide-and-conquer strategy and give one example of an algorithm that utilizes it.",
            question_type="SUBJECTIVE",
            correct_answer="divide, conquer, combine, mergesort, quicksort",
            marks=5
        )
        session.add(q1)
        session.add(q2)
        session.add(q3)
        session.commit()

        # 7. Create attendance entry for yesterday
        yesterday = date.today() - timedelta(days=1)
        attendance = Attendance(
            subject_id=subject1.id,
            date=yesterday
        )
        session.add(attendance)
        session.commit()

        attendance_log = AttendanceLog(
            attendance_id=attendance.id,
            student_id=student.id,
            status="present",
            timestamp=datetime.combine(yesterday, datetime.min.time()) + timedelta(hours=10),
            verification_method="face_recognition"
        )
        session.add(attendance_log)
        session.commit()

        # 8. Create mock performance predictions
        pred = PerformancePrediction(
            student_id=student.id,
            predicted_grade="A",
            risk_level="low",
            success_probability=0.94,
            calculated_at=datetime.now()
        )
        session.add(pred)
        session.commit()

        print("Database seeded successfully!")
        print("\nCredential Details:")
        print("------------------")
        print("Student Portal Login: student@exam.com | student123")
        print("Faculty Portal Login: faculty@exam.com | faculty123")
        print("Admin Portal Login:   admin@exam.com   | admin123")

if __name__ == "__main__":
    seed_database()
