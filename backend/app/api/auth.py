from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.models import User, Student, Teacher
from app.schemas import schemas
from app.api.deps import get_current_active_user

router = APIRouter()

@router.post("/register", response_model=schemas.UserProfileOut)
def register_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_session)
):
    # Check if user already exists
    existing_user = db.exec(select(User).where(User.email == user_in.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
        
    # Create the base user
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        role=user_in.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create profile based on role
    if user_in.role == "student":
        if not user_in.roll_number:
            db.delete(user)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Roll number is required for student registration."
            )
        # Check if roll number already exists
        existing_roll = db.exec(select(Student).where(Student.roll_number == user_in.roll_number)).first()
        if existing_roll:
            db.delete(user)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A student with this roll number already exists."
            )
        student = Student(
            id=user.id,
            full_name=user_in.full_name,
            roll_number=user_in.roll_number
        )
        db.add(student)
        
    elif user_in.role == "faculty":
        if not user_in.department:
            db.delete(user)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department is required for faculty registration."
            )
        teacher = Teacher(
            id=user.id,
            full_name=user_in.full_name,
            department=user_in.department
        )
        db.add(teacher)
        
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=schemas.Token)
def login(
    user_in: schemas.UserLogin,
    db: Session = Depends(get_session)
):
    user = db.exec(select(User).where(User.email == user_in.email)).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,  # P3-1 fix: 401 not 400
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,  # P4-5 fix: 403 not 400
            detail="Inactive user"
        )
        
    full_name = "Admin"
    if user.role == "student" and user.student:
        full_name = user.student.full_name
    elif user.role == "faculty" and user.teacher:
        full_name = user.teacher.full_name
        
    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": full_name
    }

@router.post("/login-oauth2", response_model=schemas.Token)
def login_oauth2(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_session)
):
    user = db.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,  # P3-1 fix
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,  # P4-5 fix
            detail="Inactive user"
        )
        
    full_name = "Admin"
    if user.role == "student" and user.student:
        full_name = user.student.full_name
    elif user.role == "faculty" and user.teacher:
        full_name = user.teacher.full_name
        
    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": full_name
    }

@router.get("/me", response_model=schemas.UserProfileOut)
def read_users_me(
    current_user: User = Depends(get_current_active_user)
):
    return current_user
