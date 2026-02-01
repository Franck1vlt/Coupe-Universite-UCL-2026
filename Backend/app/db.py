"""
Configuration SQLAlchemy et gestion de la base de données
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Création du moteur SQLAlchemy
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=settings.DEBUG,  # Affiche les requêtes SQL en mode debug
)

# Session locale
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base pour les modèles
class Base(DeclarativeBase):
    pass


def get_db():
    """
    Dépendance FastAPI pour obtenir une session de base de données
    Usage:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialise la base de données en créant toutes les tables
    Les tables sont créées automatiquement au démarrage de l'application
    """
    import app.models  # Importe les modèles pour les enregistrer auprès de Base

    Base.metadata.create_all(bind=engine)

