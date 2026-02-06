"""
Configuration de l'application FastAPI
Gère les variables d'environnement et les paramètres de l'application
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """Configuration de l'application"""
    
    # Application
    APP_NAME: str = "Coupe Universitaire UCL 2026 API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Base de données
    DATABASE_URL: str = "sqlite:///./data/coupe_ucl_2026.db"
    DATABASE_PATH: Optional[str] = None  # Pour Docker (chemin absolu)

    # Sécurité
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 heures (configurable via env)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = [
        os.getenv("API_URL", "http://localhost:8000"),
        os.getenv("ADMIN_FRONTEND_NEXTJS_URL", "http://localhost:3000"),
        os.getenv("PUBLIC_FRONTEND_NEXTJS_URL", "http://localhost:3100"),
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # Google OAuth (pour plus tard)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    
    # Whitelist pour l'authentification staff
    ALLOWED_EMAIL_DOMAINS: List[str] = []
    ALLOWED_EMAILS: List[str] = []
    
    # URLs attendues (à fournir dans le .env ou valeurs par défaut)
    API_URL: str = "http://localhost:8000"
    ADMIN_FRONTEND_NEXTJS_URL: str = "http://localhost:3000"
    PUBLIC_FRONTEND_NEXTJS_URL: str = "http://localhost:3100"
    SQLite_DATABASE_URL: str = "sqlite:///./data/coupe_ucl_2026.db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "forbid"


# Instance globale des settings
settings = Settings()

# Ajuster DATABASE_URL si DATABASE_PATH est fourni (Docker)
if settings.DATABASE_PATH:
    settings.DATABASE_URL = f"sqlite:///{settings.DATABASE_PATH}"

# Créer le dossier data si nécessaire
if "sqlite" in settings.DATABASE_URL:
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if db_path.startswith("./"):
        db_path = db_path[2:]
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

