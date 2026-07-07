import os
import pickle
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from sqlmodel import Session, select
from sklearn.ensemble import RandomForestClassifier

from app.models.models import Student, Result, AttendanceLog

MODEL_PATH = "student_predictor.pkl"

def generate_synthetic_data() -> Tuple[np.ndarray, np.ndarray]:
    """Generate 100 synthetic student records to train the classifier."""
    np.random.seed(42)
    # Features: [Attendance Rate (0 to 1), Assignment Average (0 to 100), Previous GPA (0.0 to 4.0)]
    X = []
    y = [] # Class labels: 0=High Risk (F), 1=Medium Risk (C/D), 2=Low Risk (A/B)
    
    for _ in range(150):
        attendance = np.random.uniform(0.5, 1.0)
        assignments = np.random.uniform(40, 100)
        prev_gpa = np.random.uniform(2.0, 4.0)
        
        # Determine risk classification logic
        score = (attendance * 40) + (assignments * 0.4) + (prev_gpa * 5)
        
        if score < 50 or attendance < 0.65:
            label = 0 # High Risk
        elif score < 72:
            label = 1 # Medium Risk
        else:
            label = 2 # Low Risk
            
        X.append([attendance, assignments, prev_gpa])
        y.append(label)
        
    return np.array(X), np.array(y)

def train_model():
    """Train the RandomForestClassifier model and save it to disk."""
    print("Training Student Performance Classifier...")
    X, y = generate_synthetic_data()
    
    model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
    model.fit(X, y)
    
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    print("Classifier trained and saved successfully.")

def get_trained_model() -> RandomForestClassifier:
    """Load the model, training it first if not present on disk."""
    if not os.path.exists(MODEL_PATH):
        train_model()
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)

def run_prediction(attendance_rate: float, assignment_marks: float, prev_gpa: float) -> Dict:
    """
    Run inference on student metrics.
    Returns: { predicted_grade, risk_level, success_probability }
    """
    model = get_trained_model()
    
    features = np.array([[attendance_rate, assignment_marks, prev_gpa]])
    prediction = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0] # Probabilities for classes [0, 1, 2]
    
    # Class mapping
    # 0 = High Risk (F)
    # 1 = Medium Risk (C/D)
    # 2 = Low Risk (A/B)
    
    success_probability = float(probabilities[1] + probabilities[2]) # Probability of not failing
    
    if prediction == 0:
        predicted_grade = 'F'
        risk_level = 'high'
    elif prediction == 1:
        # Choose a C/D range based on assignment marks
        predicted_grade = 'C' if assignment_marks > 60 else 'D'
        risk_level = 'medium'
    else:
        # A/B range
        predicted_grade = 'A' if assignment_marks > 85 else 'B'
        risk_level = 'low'
        
    return {
        "predicted_grade": predicted_grade,
        "risk_level": risk_level,
        "success_probability": round(success_probability, 2)
    }

def predict_student_profile(student_id: int, db: Session) -> Dict:
    """Aggregate student database metrics and predict performance."""
    # 1. Fetch attendance rate
    logs = db.exec(select(AttendanceLog).where(AttendanceLog.student_id == student_id)).all()
    if logs:
        presents = sum(1 for l in logs if l.status == "present")
        attendance_rate = presents / len(logs)
    else:
        # Default fallback if empty
        attendance_rate = 0.85
        
    # 2. Fetch average exam marks
    results = db.exec(select(Result).where(Result.student_id == student_id)).all()
    if results:
        avg_exam_mark = sum(r.percentage for r in results) / len(results)
    else:
        avg_exam_mark = 78.0  # Default fallback
        
    # 3. P3-3 FIX: Compute prev_gpa from actual result grades instead of hardcoding 3.2
    # Grade to GPA mapping (standard 4.0 scale)
    grade_to_gpa = {'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0}
    if results:
        gpa_values = [grade_to_gpa.get(r.grade, 2.0) for r in results]
        prev_gpa = sum(gpa_values) / len(gpa_values)
    else:
        prev_gpa = 3.2  # Default for new students with no history
    
    # Run prediction
    prediction_result = run_prediction(attendance_rate, avg_exam_mark, prev_gpa)
    return prediction_result

