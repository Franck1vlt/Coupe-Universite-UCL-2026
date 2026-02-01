"""
Système de permissions basé sur les rôles (RBAC)
Pour la Coupe de l'Université UCL 2026
"""
from enum import Enum
from typing import List, Optional, Callable
from functools import wraps

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import jwt

from app.config import settings

class Role(str, Enum):
    """Rôles disponibles dans l'application"""
    ADMIN = "admin"
    STAFF = "staff"
    TECHNICIEN = "technicien"


# Mapping des permissions par fonctionnalité
# Définit quels rôles ont accès à quelles fonctionnalités
ROUTE_PERMISSIONS = {
    # Configuration de la Coupe : admin uniquement
    "config_coupe": [Role.ADMIN],

    # Tournois et tableaux : admin et staff
    "tournois_tableaux": [Role.ADMIN, Role.STAFF],

    # Tableau des scores finaux : admin, staff et technicien
    "scores_finaux": [Role.ADMIN, Role.STAFF, Role.TECHNICIEN],

    # Scores en direct : admin, staff et technicien
    "scores_direct": [Role.ADMIN, Role.STAFF, Role.TECHNICIEN],

    # Gestion des équipes : admin et staff
    "gestion_equipes": [Role.ADMIN, Role.STAFF],

    # Gestion des sports : admin uniquement
    "gestion_sports": [Role.ADMIN],

    # Gestion des terrains : admin et staff
    "gestion_terrains": [Role.ADMIN, Role.STAFF],

    # Lecture seule (tous les rôles authentifiés)
    "lecture": [Role.ADMIN, Role.STAFF, Role.TECHNICIEN],
}


# OAuth2 avec formulaire de login dans Swagger (username/password uniquement)
# tokenUrl pointe vers l'endpoint /auth/token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


class TokenData:
    """Données extraites du token JWT"""
    def __init__(self, user_id: str, username: str, role: Role):
        self.user_id = user_id
        self.username = username
        self.role = role


def decode_token(token: str) -> Optional[TokenData]:
    """
    Décode et valide un token JWT

    Args:
        token: Le token JWT à décoder

    Returns:
        TokenData si le token est valide, None sinon
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        username = payload.get("username")
        role_str = payload.get("role")

        if not user_id or not role_str:
            return None

        # Convertir la string en Role enum
        try:
            role = Role(role_str)
        except ValueError:
            return None

        return TokenData(user_id=user_id, username=username, role=role)

    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[TokenData]:
    """
    Dépendance FastAPI pour extraire l'utilisateur actuel du token

    Returns:
        TokenData si authentifié, None sinon (pour les routes optionnellement authentifiées)
    """
    if not token:
        return None

    return decode_token(token)


async def get_current_user_required(
    token: Optional[str] = Depends(oauth2_scheme)
) -> TokenData:
    """
    Dépendance FastAPI qui exige une authentification

    Raises:
        HTTPException 401 si non authentifié
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token d'authentification requis",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = decode_token(token)

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token_data


def require_roles(allowed_roles: List[Role]):
    """
    Crée une dépendance FastAPI qui vérifie que l'utilisateur a un des rôles autorisés

    Usage:
        @app.get("/admin-only", dependencies=[Depends(require_roles([Role.ADMIN]))])
        async def admin_endpoint(): ...

        # Ou pour accéder aux données de l'utilisateur:
        @app.get("/protected")
        async def protected_endpoint(user: TokenData = Depends(require_roles([Role.ADMIN, Role.STAFF]))):
            return {"user": user.username, "role": user.role}

    Args:
        allowed_roles: Liste des rôles autorisés à accéder à l'endpoint

    Returns:
        Une fonction de dépendance FastAPI
    """
    async def role_checker(
        current_user: TokenData = Depends(get_current_user_required)
    ) -> TokenData:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissions insuffisantes. Rôles requis: {[r.value for r in allowed_roles]}"
            )
        return current_user

    return role_checker


def require_permission(permission_key: str):
    """
    Crée une dépendance basée sur une clé de permission prédéfinie

    Usage:
        @app.post("/config", dependencies=[Depends(require_permission("config_coupe"))])
        async def update_config(): ...

    Args:
        permission_key: Clé dans ROUTE_PERMISSIONS

    Returns:
        Une fonction de dépendance FastAPI
    """
    if permission_key not in ROUTE_PERMISSIONS:
        raise ValueError(f"Permission inconnue: {permission_key}")

    allowed_roles = ROUTE_PERMISSIONS[permission_key]
    return require_roles(allowed_roles)


# Raccourcis pour les permissions courantes
require_admin = require_roles([Role.ADMIN])
require_admin_or_staff = require_roles([Role.ADMIN, Role.STAFF])
require_admin_or_technicien = require_roles([Role.ADMIN, Role.TECHNICIEN])
require_any_authenticated = require_roles([Role.ADMIN, Role.STAFF, Role.TECHNICIEN])