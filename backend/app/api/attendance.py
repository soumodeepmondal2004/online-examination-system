from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, date

from app.core.database import get_session
from app.models.models import User, Student, Attendance, AttendanceLog, Subject
from app.schemas import schemas
from app.api.deps import get_current_active_user
from app.services.face_recognition import save_registered_face, verify_student_face

router = APIRouter()

# --- FACE REGISTRATION ---

@router.post("/register-face")
def register_face(
    payload: schemas.ImagePayload,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can register biometric profiles.")
        
    student = db.get(Student, current_user.id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
        
    try:
        file_path = save_registered_face(current_user.id, payload.image_base64)
        
        # Save face image path to student profile
        student.face_encoding = file_path
        db.add(student)
        db.commit()
        db.refresh(student)
        return {"status": "success", "message": "Biometric face profile registered."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Face registration failed: {str(e)}")

# --- MARK ATTENDANCE VIA WEBCAM ---

@router.post("/mark")
def mark_attendance(
    payload: schemas.AttendanceMark,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can mark attendance.")
        
    student = db.get(Student, current_user.id)
    if not student or not student.face_encoding:
        raise HTTPException(status_code=400, detail="Please register your face biometric profile first.")
        
    # Verify the face snapshot
    is_match, confidence = verify_student_face(current_user.id, payload.image_base64)
    if not is_match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                f"Face verification failed (confidence: {confidence:.0%}). "
                "Please ensure your face is well-lit, centered, and unobstructed. "
                "If this keeps failing, re-register your face profile."
            )
        )
        
    # Find or create today's attendance slot for this subject
    today = date.today()
    attendance = db.exec(
        select(Attendance)
        .where(Attendance.subject_id == payload.subject_id)
        .where(Attendance.date == today)
    ).first()
    
    if not attendance:
        attendance = Attendance(subject_id=payload.subject_id, date=today)
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        
    # Check if student already marked present
    existing_log = db.exec(
        select(AttendanceLog)
        .where(AttendanceLog.attendance_id == attendance.id)
        .where(AttendanceLog.student_id == current_user.id)
    ).first()
    
    if existing_log and existing_log.status == "present":
        return {"status": "already_marked", "message": "Attendance already marked as present today.", "confidence": confidence}
        
    if existing_log:
        existing_log.status = "present"
        existing_log.timestamp = datetime.now()
        existing_log.verification_method = "face_recognition"
        db.add(existing_log)
    else:
        log = AttendanceLog(
            attendance_id=attendance.id,
            student_id=current_user.id,
            status="present",
            timestamp=datetime.now(),
            verification_method="face_recognition"
        )
        db.add(log)
        
    db.commit()
    return {"status": "success", "message": f"Face verified ({confidence:.0%} confidence). Attendance marked present.", "confidence": confidence}

# --- GET ATTENDANCE LOGS ---

@router.get("/logs/my", response_model=List[schemas.AttendanceLogOut])
def get_my_logs(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Logs check restricted to students.")
        
    logs = db.exec(select(AttendanceLog).where(AttendanceLog.student_id == current_user.id)).all()
    
    result = []
    for l in logs:
        # Resolve student name & roll number
        student = db.get(Student, l.student_id)
        result.append({
            "id": l.id,
            "attendance_id": l.attendance_id,
            "student_id": l.student_id,
            "student_name": student.full_name if student else "Unknown",
            "roll_number": student.roll_number if student else "N/A",
            "status": l.status,
            "timestamp": l.timestamp,
            "verification_method": l.verification_method
        })
    return result

@router.get("/logs", response_model=List[schemas.AttendanceLogOut])
def get_all_logs(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    logs = db.exec(select(AttendanceLog)).all()
    
    result = []
    for l in logs:
        student = db.get(Student, l.student_id)
        result.append({
            "id": l.id,
            "attendance_id": l.attendance_id,
            "student_id": l.student_id,
            "student_name": student.full_name if student else "Unknown",
            "roll_number": student.roll_number if student else "N/A",
            "status": l.status,
            "timestamp": l.timestamp,
            "verification_method": l.verification_method
        })
    return result

# --- STUDENT: DELETE OWN TODAY'S ATTENDANCE ---

@router.delete("/logs/my/today")
def delete_my_today_attendance(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can use this endpoint.")

    today = date.today()

    # Find today's attendance slot(s)
    today_slots = db.exec(
        select(Attendance).where(Attendance.date == today)
    ).all()

    if not today_slots:
        raise HTTPException(status_code=404, detail="No attendance record found for today.")

    slot_ids = [slot.id for slot in today_slots]

    # Find this student's log for today
    my_log = db.exec(
        select(AttendanceLog)
        .where(AttendanceLog.student_id == current_user.id)
        .where(AttendanceLog.attendance_id.in_(slot_ids))
    ).first()

    if not my_log:
        raise HTTPException(status_code=404, detail="No attendance record found for you today.")

    db.delete(my_log)
    db.commit()
    return {"status": "deleted", "message": "Today's attendance record has been deleted."}


# --- DELETE A SINGLE ATTENDANCE LOG ---

@router.delete("/logs/{log_id}")
def delete_attendance_log(
    log_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Only faculty or admin can delete attendance logs.")

    log = db.get(AttendanceLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Attendance log not found.")

    db.delete(log)
    db.commit()
    return {"status": "deleted", "message": f"Attendance log {log_id} deleted."}

# --- DELETE ALL OF TODAY'S ATTENDANCE LOGS ---

@router.delete("/logs/today/all")
def delete_todays_attendance(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Only faculty or admin can delete attendance records.")

    today = date.today()

    # Find all attendance slots for today
    today_slots = db.exec(
        select(Attendance).where(Attendance.date == today)
    ).all()

    if not today_slots:
        return {"status": "no_records", "message": "No attendance records found for today.", "deleted": 0}

    slot_ids = [slot.id for slot in today_slots]

    # Delete all logs for those slots
    logs_to_delete = db.exec(
        select(AttendanceLog).where(AttendanceLog.attendance_id.in_(slot_ids))
    ).all()

    count = len(logs_to_delete)
    for log in logs_to_delete:
        db.delete(log)

    # Also delete the attendance slot records themselves
    for slot in today_slots:
        db.delete(slot)

    db.commit()
    return {"status": "success", "message": f"Deleted {count} attendance record(s) for {today}.", "deleted": count}
