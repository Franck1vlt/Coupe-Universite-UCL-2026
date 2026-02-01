"""
Routes d'authentification
Gère la connexion et la génération de tokens JWT
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
import jwt
import bcrypt

from app.db import get_db
from app.config import settings
from app.auth.permissions import Role, TokenData, get_current_user_required
from app.exceptions import create_success_response
from app.models.user import User


router = APIRouter(prefix="/auth", tags=["Authentication"])


# === Schémas Pydantic ===

class TokenResponse(BaseModel):
    """Réponse après authentification réussie"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class LoginRequest(BaseModel):
    """Requête de connexion"""
    username: str
    password: str


class UserInfo(BaseModel):
    """Informations de l'utilisateur actuel"""
    user_id: str
    username: str
    role: str


# === Fonctions utilitaires ===

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crée un token JWT

    Args:
        data: Données à encoder dans le token
        expires_delta: Durée de validité du token

    Returns:
        Token JWT encodé
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe contre son hash"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def verify_credentials_from_db(db: Session, username: str, password: str) -> Optional[dict]:
    """
    Vérifie les identifiants utilisateur contre la base de données

    Args:
        db: Session de base de données
        username: Nom d'utilisateur ou email
        password: Mot de passe

    Returns:
        Dict avec les infos utilisateur si valide, None sinon
    """
    # Chercher l'utilisateur par username ou email
    user = db.query(User).filter(
        (User.username == username) | (User.email == username)
    ).first()

    if not user:
        return None

    # Vérifier que l'utilisateur est actif
    if not user.is_active:
        return None

    # Vérifier le mot de passe
    if not user.hashed_password:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return {
        "user_id": str(user.id),
        "username": user.full_name or user.username or user.email,
        "role": user.role
    }


def verify_credentials_fallback(username: str, password: str) -> Optional[dict]:
    """
    Fallback: Vérifie les identifiants contre les variables d'environnement
    Utilisé uniquement si aucun utilisateur n'existe dans la base de données

    Args:
        username: Nom d'utilisateur
        password: Mot de passe

    Returns:
        Dict avec les infos utilisateur si valide, None sinon
    """
    import os

    # Vérifier Admin
    admin_username = os.getenv("ADMIN_USERNAME")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if admin_username and admin_password:
        if username == admin_username and password == admin_password:
            return {
                "user_id": "env_admin",
                "username": "Admin",
                "role": Role.ADMIN.value
            }

    # Vérifier Staff
    staff_username = os.getenv("STAFF_USERNAME")
    staff_password = os.getenv("STAFF_PASSWORD")
    if staff_username and staff_password:
        if username == staff_username and password == staff_password:
            return {
                "user_id": "env_staff",
                "username": "Staff",
                "role": Role.STAFF.value
            }

    # Vérifier Technicien
    tech_username = os.getenv("TECHNICIAN_USERNAME")
    tech_password = os.getenv("TECHNICIAN_PASSWORD")
    if tech_username and tech_password:
        if username == tech_username and password == tech_password:
            return {
                "user_id": "env_tech",
                "username": "Technician",
                "role": Role.TECHNICIEN.value
            }

    return None


def verify_credentials(db: Session, username: str, password: str) -> Optional[dict]:
    """
    Vérifie les identifiants utilisateur
    Essaie d'abord la base de données, puis les variables d'environnement en fallback

    Args:
        db: Session de base de données
        username: Nom d'utilisateur
        password: Mot de passe

    Returns:
        Dict avec les infos utilisateur si valide, None sinon
    """
    # Essayer d'abord la base de données
    user_data = verify_credentials_from_db(db, username, password)
    if user_data:
        return user_data

    # Si aucun utilisateur trouvé en DB, essayer les variables d'environnement
    # Ceci permet de garder la compatibilité avec l'ancien système
    return verify_credentials_fallback(username, password)


# === Endpoints ===

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authentifie un utilisateur et retourne un token JWT

    Le token contient:
    - sub: ID utilisateur
    - username: Nom d'utilisateur
    - role: Rôle (admin, staff, technicien)
    - exp: Date d'expiration
    """
    user_data = verify_credentials(db, login_data.username, login_data.password)

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Créer le token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user_data["user_id"],
            "username": user_data["username"],
            "role": user_data["role"]
        },
        expires_delta=access_token_expires
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # En secondes
        user={
            "id": user_data["user_id"],
            "username": user_data["username"],
            "role": user_data["role"]
        }
    )


@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Endpoint compatible OAuth2 pour obtenir un token
    Utilise le format standard OAuth2 avec form-data
    """
    user_data = verify_credentials(db, form_data.username, form_data.password)

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user_data["user_id"],
            "username": user_data["username"],
            "role": user_data["role"]
        },
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(
    current_user: TokenData = Depends(get_current_user_required)
):
    """
    Retourne les informations de l'utilisateur actuellement connecté
    Nécessite un token valide dans le header Authorization
    """
    return UserInfo(
        user_id=current_user.user_id,
        username=current_user.username,
        role=current_user.role.value
    )


@router.post("/verify")
async def verify_token(
    current_user: TokenData = Depends(get_current_user_required)
):
    """
    Vérifie si un token est valide
    Retourne les informations du token si valide
    """
    return create_success_response(
        data={
            "valid": True,
            "user_id": current_user.user_id,
            "username": current_user.username,
            "role": current_user.role.value
        },
        message="Token valide"
    )


@router.get("/permissions")
async def get_user_permissions(
    current_user: TokenData = Depends(get_current_user_required)
):
    """
    Retourne les permissions de l'utilisateur actuel basées sur son rôle
    """
    from app.auth.permissions import ROUTE_PERMISSIONS

    user_permissions = {}
    for permission_key, allowed_roles in ROUTE_PERMISSIONS.items():
        user_permissions[permission_key] = current_user.role in allowed_roles

    return create_success_response(
        data={
            "role": current_user.role.value,
            "permissions": user_permissions
        },
        message="Permissions récupérées avec succès"
    )
