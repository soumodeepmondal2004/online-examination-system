from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Dict
from datetime import datetime

from app.core.database import get_session
from app.models.models import User, Student, PerformancePrediction
from app.schemas import schemas
from app.api.deps import get_current_active_user
from app.services.performance_predictor import predict_student_profile

router = APIRouter()

# --- GET MY PERFORMANCE PREDICTION (STUDENT) ---

@router.get("/my", response_model=schemas.PerformancePredictionOut)
def get_my_prediction(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Prediction only available to students.")
        
    student = db.get(Student, current_user.id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
        
    # Run prediction model
    pred = predict_student_profile(current_user.id, db)
    
    # P1-5 FIX: Upsert prediction — delete existing row before inserting a new one
    # so the table doesn't grow unboundedly with every page visit
    existing = db.exec(
        select(PerformancePrediction).where(PerformancePrediction.student_id == current_user.id)
    ).first()
    if existing:
        db.delete(existing)
        db.flush()
    
    prediction_entry = PerformancePrediction(
        student_id=current_user.id,
        predicted_grade=pred["predicted_grade"],
        risk_level=pred["risk_level"],
        success_probability=pred["success_probability"],
        calculated_at=datetime.now()
    )
    db.add(prediction_entry)
    db.commit()
    db.refresh(prediction_entry)
    
    return prediction_entry

# --- GET ALL STUDENT PREDICTIONS (FACULTY) ---

@router.get("/students", response_model=List[Dict])
def get_all_student_predictions(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    students = db.exec(select(Student)).all()
    
    results = []
    for student in students:
        pred = predict_student_profile(student.id, db)
        results.append({
            "student_name": student.full_name,
            "roll_number": student.roll_number,
            "predicted_grade": pred["predicted_grade"],
            "risk_level": pred["risk_level"],
            "success_probability": pred["success_probability"]
        })
    return results
