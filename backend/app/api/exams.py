from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
import json
import random

from app.core.database import get_session
from app.models.models import User, Course, Subject, Exam, Question, StudentAnswer, Result, Student
from app.schemas import schemas
from app.api.deps import get_current_active_user

router = APIRouter()

# --- COURSE ENDPOINTS ---

@router.post("/courses", response_model=schemas.CourseOut)
def create_course(
    course_in: schemas.CourseCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can register courses.")
    
    existing = db.exec(select(Course).where(Course.code == course_in.code)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Course code already registered.")
        
    course = Course(name=course_in.name, code=course_in.code)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

@router.get("/courses", response_model=List[schemas.CourseOut])
def get_courses(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    return db.exec(select(Course)).all()

# --- SUBJECT ENDPOINTS ---

@router.post("/subjects", response_model=schemas.SubjectOut)
def create_subject(
    subject_in: schemas.SubjectCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Not authorized to create subjects.")
        
    existing = db.exec(select(Subject).where(Subject.code == subject_in.code)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already registered.")
        
    subject = Subject(name=subject_in.name, code=subject_in.code, course_id=subject_in.course_id)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.get("/subjects", response_model=List[schemas.SubjectOut])
def get_subjects(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    return db.exec(select(Subject)).all()

# --- RESULTS QUERIES ---
# P1-4 FIX: These specific routes MUST come before the /{exam_id} dynamic route

@router.get("/results/my", response_model=List[schemas.ResultOut])
def get_my_results(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Results check only available to students.")
        
    results = db.exec(select(Result).where(Result.student_id == current_user.id)).all()
    output_results = []
    for r in results:
        exam = db.get(Exam, r.exam_id)
        output_results.append({
            "id": r.id,
            "student_id": r.student_id,
            "exam_id": r.exam_id,
            "total_score": r.total_score,
            "percentage": r.percentage,
            "grade": r.grade,
            "status": r.status,
            "submitted_at": r.submitted_at,
            "exam_title": exam.title if exam else "Unknown Exam"
        })
    return output_results

@router.get("/results/all", response_model=List[schemas.ResultOut])
def get_all_results(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    results = db.exec(select(Result)).all()
    output_results = []
    for r in results:
        exam = db.get(Exam, r.exam_id)
        output_results.append({
            "id": r.id,
            "student_id": r.student_id,
            "exam_id": r.exam_id,
            "total_score": r.total_score,
            "percentage": r.percentage,
            "grade": r.grade,
            "status": r.status,
            "submitted_at": r.submitted_at,
            "exam_title": exam.title if exam else "Unknown Exam"
        })
    return output_results

# --- EXAM ENDPOINTS ---

@router.post("/", response_model=schemas.ExamOut)
def create_exam(
    exam_in: schemas.ExamCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Only faculty can schedule exams.")
        
    exam = Exam(
        title=exam_in.title,
        description=exam_in.description,
        subject_id=exam_in.subject_id,
        teacher_id=current_user.id,
        duration_minutes=exam_in.duration_minutes,
        start_time=exam_in.start_time,
        end_time=exam_in.end_time,
        randomize_questions=exam_in.randomize_questions
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    
    # Save associated questions
    for q in exam_in.questions:
        question = Question(
            exam_id=exam.id,
            question_text=q.question_text,
            question_type=q.question_type,
            options=json.dumps(q.options) if q.options else None,
            correct_answer=q.correct_answer,
            marks=q.marks
        )
        db.add(question)
    
    db.commit()
    db.refresh(exam)
    return exam

@router.get("/", response_model=List[schemas.ExamOut])
def get_exams(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role == "student":
        # P3-2 FIX: Push the filter into SQL instead of loading all exams into memory
        now = datetime.now()
        return db.exec(select(Exam).where(Exam.end_time > now)).all()
    elif current_user.role == "faculty":
        # Return exams created by this teacher
        return db.exec(select(Exam).where(Exam.teacher_id == current_user.id)).all()
    else:
        # Admin gets everything
        return db.exec(select(Exam)).all()

@router.get("/{exam_id}", response_model=schemas.ExamDetailOut)
def get_exam_details(
    exam_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")
        
    # Check if student is within the valid timeframe
    if current_user.role == "student":
        now = datetime.now()
        if now < exam.start_time or now > exam.end_time:
            raise HTTPException(status_code=400, detail="Examination portal is currently closed for this schedule.")
            
        # Check if student already attempted the exam
        attempted = db.exec(select(Result).where(Result.exam_id == exam_id).where(Result.student_id == current_user.id)).first()
        if attempted:
            raise HTTPException(status_code=400, detail="You have already submitted this examination.")

    # Convert options back to list of strings
    formatted_questions = []
    questions_list = exam.questions
    
    if exam.randomize_questions and current_user.role == "student":
        # Create a copy and shuffle
        questions_list = list(questions_list)
        random.shuffle(questions_list)

    for q in questions_list:
        opts = json.loads(q.options) if q.options else None
        formatted_questions.append({
            "id": q.id,
            "exam_id": q.exam_id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "options": opts,
            "marks": q.marks
        })
        
    return {
        "id": exam.id,
        "title": exam.title,
        "description": exam.description,
        "subject_id": exam.subject_id,
        "teacher_id": exam.teacher_id,
        "duration_minutes": exam.duration_minutes,
        "start_time": exam.start_time,
        "end_time": exam.end_time,
        "randomize_questions": exam.randomize_questions,
        "questions": formatted_questions
    }

# --- SUBMISSION AND AUTOGRADING ---

@router.post("/{exam_id}/submit", response_model=schemas.ResultOut)
def submit_exam(
    exam_id: int,
    submission: schemas.ExamSubmit,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit exam sheets.")
        
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")
        
    # Check if student already submitted
    existing_result = db.exec(
        select(Result).where(Result.exam_id == exam_id).where(Result.student_id == current_user.id)
    ).first()
    if existing_result:
        raise HTTPException(status_code=400, detail="Exam already submitted.")

    total_score = 0
    total_possible_marks = sum(q.marks for q in exam.questions)
    
    # Process answers
    for answer_in in submission.answers:
        question = db.get(Question, answer_in.question_id)
        if not question or question.exam_id != exam_id:
            continue
            
        is_evaluated = False
        score = 0
        
        # 1. Autograding logic
        if question.question_type == "MCQ":
            if answer_in.selected_option == question.correct_answer:
                score = question.marks
            is_evaluated = True
            total_score += score
            
        elif question.question_type == "SUBJECTIVE":
            # Keyword matching scoring fallback
            text_ans = (answer_in.subjective_answer or "").lower()
            keywords = [k.strip().lower() for k in question.correct_answer.split(",")]
            
            if keywords and text_ans:
                matched = sum(1 for kw in keywords if kw in text_ans)
                match_ratio = matched / len(keywords)
                # Assign partial marks proportional to keyword presence
                score = round(match_ratio * question.marks)
            is_evaluated = True # Mark evaluated by auto-keyword generator (can be adjusted by teacher)
            total_score += score

        student_answer = StudentAnswer(
            student_id=current_user.id,
            exam_id=exam_id,
            question_id=answer_in.question_id,
            selected_option=answer_in.selected_option,
            subjective_answer=answer_in.subjective_answer,
            is_evaluated=is_evaluated,
            score=score
        )
        db.add(student_answer)

    # 2. Result tabulation
    percentage = (total_score / total_possible_marks * 100) if total_possible_marks > 0 else 0
    
    # Grading Scale
    if percentage >= 90: grade = 'A'
    elif percentage >= 80: grade = 'B'
    elif percentage >= 70: grade = 'C'
    elif percentage >= 50: grade = 'D'
    else: grade = 'F'
    
    status_label = "pass" if percentage >= 50 else "fail"
    
    result = Result(
        student_id=current_user.id,
        exam_id=exam_id,
        total_score=total_score,
        percentage=round(percentage, 2),
        grade=grade,
        status=status_label
    )
    
    db.add(result)
    db.commit()
    db.refresh(result)
    return result
