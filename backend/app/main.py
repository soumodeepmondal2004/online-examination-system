from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.api.auth import router as auth_router
from app.api.exams import router as exams_router
from app.api.attendance import router as attendance_router
from app.api.proctoring import router as proctoring_router
from app.api.assistant import router as assistant_router
from app.api.prediction import router as prediction_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the database (creates tables if they don't exist)
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS middleware — origins restricted to configured list (P1-2 fix)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(exams_router, prefix=f"{settings.API_V1_STR}/exams", tags=["Online Exams"])
app.include_router(attendance_router, prefix=f"{settings.API_V1_STR}/attendance", tags=["Face Attendance"])
app.include_router(proctoring_router, prefix=f"{settings.API_V1_STR}/proctoring", tags=["AI Proctoring"])
app.include_router(assistant_router, prefix=f"{settings.API_V1_STR}/assistant", tags=["AI Study Assistant"])
app.include_router(prediction_router, prefix=f"{settings.API_V1_STR}/prediction", tags=["Performance Prediction"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "AI-Powered Smart Online Examination System API is running successfully."
    }
