from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from app.core.database import get_session
from app.models.models import User, Student, Exam, ProctoringLog
from app.schemas import schemas
from app.api.deps import get_current_active_user

router = APIRouter()

# --- LOG PROCTORING INFRACTION ---

@router.post("/log-warning/{exam_id}")
def log_proctoring_warning(
    exam_id: int,
    payload: schemas.ProctoringLogCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Proctoring logs only accepted for students.")
        
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")
        
    # Get current warning count for this student in this exam
    previous_logs = db.exec(
        select(ProctoringLog)
        .where(ProctoringLog.student_id == current_user.id)
        .where(ProctoringLog.exam_id == exam_id)
    ).all()
    
    current_warning_count = len(previous_logs) + 1
    
    log = ProctoringLog(
        student_id=current_user.id,
        exam_id=exam_id,
        event_type=payload.event_type,
        warning_count=current_warning_count,
        timestamp=datetime.now()
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    
    return {"status": "success", "warning_count": current_warning_count}

# --- GET PROCTORING LOGS ---

@router.get("/logs", response_model=List[schemas.ProctoringLogOut])
def get_proctoring_logs(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    logs = db.exec(select(ProctoringLog)).all()
    
    result = []
    for l in logs:
        student = db.get(Student, l.student_id)
        exam = db.get(Exam, l.exam_id)
        result.append({
            "id": l.id,
            "student_id": l.student_id,
            "student_name": student.full_name if student else "Unknown Student",
            "roll_number": student.roll_number if student else "N/A",
            "exam_id": l.exam_id,
            "exam_title": exam.title if exam else "Unknown Exam",
            "event_type": l.event_type,
            "timestamp": l.timestamp,
            "warning_count": l.warning_count
        })
    return result
