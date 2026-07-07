from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
import os
import shutil

from app.core.database import get_session
from app.models.models import User, StudyMaterial, ChatHistory
from app.api.deps import get_current_active_user
from app.schemas import schemas
from app.services.ai_assistant import index_pdf_document, chat_with_document, summarize_document, generate_document_quiz

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- UPLOAD STUDY MATERIAL ---

@router.post("/upload")
def upload_material(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    subject_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Only faculty can upload study materials.")
        
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    # Save file to uploads folder
    file_path = os.path.join(UPLOAD_DIR, f"{datetime.now().timestamp()}_{file.filename}")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File saving error: {str(e)}")
        
    # Create DB entry
    material = StudyMaterial(
        subject_id=subject_id,
        title=title,
        file_path=file_path,
        uploaded_by=current_user.id,
        processed=False
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    
    # Process text parsing and chunk embedding index in the background
    # P2-2 FIX: Do NOT pass request-scoped db — background task creates its own session
    background_tasks.add_task(run_indexing, material.id, file_path)

    return material

def run_indexing(material_id: int, file_path: str):
    """Background task: index PDF into vector store. Creates its own DB session (P2-2 fix)."""
    try:
        index_pdf_document(material_id, file_path)
        # Mark as processed in database using a fresh session (not request-scoped)
        from app.core.database import Session as dbSession, engine
        with dbSession(engine) as session:
            mat = session.get(StudyMaterial, material_id)
            if mat:
                mat.processed = True
                session.add(mat)
                session.commit()
    except Exception as e:
        print(f"Background indexing error: {e}")

# --- GET STUDY MATERIALS ---

@router.get("/materials", response_model=List[schemas.StudyMaterialOut])
def get_materials(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    # P4-4 FIX: Use StudyMaterialOut to avoid exposing server file_path
    return db.exec(select(StudyMaterial)).all()

# --- CHAT / RAG ENDPOINT ---

@router.post("/chat")
def chat_pdf(
    payload: schemas.ChatPayload,  # P4-2 FIX: Using schemas.ChatPayload
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    material = db.get(StudyMaterial, payload.material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found.")
        
    # Index document if not cached (due to server restart)
    from app.services.ai_assistant import vector_db_cache
    if payload.material_id not in vector_db_cache:
        index_pdf_document(payload.material_id, material.file_path)

    # Get response
    ai_response = chat_with_document(payload.material_id, payload.message)
    
    # Save chat history (only for students)
    if current_user.role == "student":
        history = ChatHistory(
            student_id=current_user.id,
            message=payload.message,
            response=ai_response
        )
        db.add(history)
        db.commit()
        
    return {"response": ai_response}

# --- SUMMARIZE ENDPOINT ---

@router.get("/summarize/{material_id}")
def summarize_pdf(
    material_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    material = db.get(StudyMaterial, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found.")
        
    from app.services.ai_assistant import vector_db_cache
    if material_id not in vector_db_cache:
        index_pdf_document(material_id, material.file_path)
        
    summary_text = summarize_document(material_id)
    
    # Cache summary in db if possible
    material.summary = summary_text
    db.add(material)
    db.commit()
    
    return {"summary": summary_text}

# --- PRACTICE MCQS QUIZ ENDPOINT ---

@router.get("/quiz/{material_id}")
def get_material_quiz(
    material_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    material = db.get(StudyMaterial, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found.")
        
    from app.services.ai_assistant import vector_db_cache
    if material_id not in vector_db_cache:
        index_pdf_document(material_id, material.file_path)
        
    quiz = generate_document_quiz(material_id)
    return {"quiz": quiz}
