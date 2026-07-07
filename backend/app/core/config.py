from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Online Exam System"
    API_V1_STR: str = "/api"
    # REQUIRED: Must be set via .env — no fallback to prevent accidental exposure
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours (was 7 days — P5-2)

    # Database url (SQLite by default, can be replaced by PostgreSQL string)
    DATABASE_URL: str = "sqlite:///./exam_system.db"

    # CORS — restrict to known origins (P1-2)
    # Comma-separated list. e.g. "http://localhost:5173,https://yourdomain.com"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # API Keys for AI features
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    # Feature flags
    USE_DEEPFACE: Optional[bool] = False

    def get_allowed_origins(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into a list."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore unrecognized env vars instead of crashing

settings = Settings()
