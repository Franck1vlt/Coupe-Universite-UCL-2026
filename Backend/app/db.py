"""
Configuration SQLAlchemy et gestion de la base de données
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Création du moteur SQLAlchemy
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=settings.DEBUG,  # Affiche les requêtes SQL en mode debug
)

# Activer WAL mode et busy_timeout pour SQLite (meilleure concurrence en écriture)
if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

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

