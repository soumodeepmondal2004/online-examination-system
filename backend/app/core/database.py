from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)

def init_db():
    # P5-1 FIX: Import the entire models module to register ALL 12 SQLModel table classes
    # before SQLModel.metadata.create_all() is called.
    import app.models.models as _models  # noqa: F401 — side-effect import to register tables
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
