"""
Routes pour la gestion des utilisateurs (admin seulement)
"""
import secrets
import string
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt

from app.db import get_db
from app.models.user import User, UserRole
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserPasswordUpdate,
    UserResponse,
    TempPasswordResponse,
)
from app.auth.permissions import TokenData, get_current_user_required, Role
from app.exceptions import create_success_response, NotFoundError, ConflictError


router = APIRouter(prefix="/users", tags=["Users Management"])


# === Fonctions utilitaires ===

def hash_password(password: str) -> str:
    """Hash un mot de passe avec bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe contre son hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def generate_temp_password(length: int = 8) -> str:
    """Génère un mot de passe temporaire aléatoire"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def require_admin(current_user: TokenData = Depends(get_current_user_required)) -> TokenData:
    """Vérifie que l'utilisateur est admin"""
    if current_user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs"
        )
    return current_user


def user_to_response(user: User) -> dict:
    """Convertit un User en dict pour la réponse"""
    # Masquer le hash du mot de passe, n'afficher que les 4 derniers caractères (ou des étoiles)
    masked_password = None
    if user.hashed_password:
        masked_password = "********" + user.hashed_password[-4:]
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_deletable": user.is_deletable,
        "has_temp_password": user.temp_password is not None,
        "permissions": user.get_permissions(),
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "masked_password": masked_password,
    }


# === Endpoints ===

@router.get("", response_model=List[UserResponse])
async def get_all_users(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_admin)
):
    """
    Récupère la liste de tous les utilisateurs (admin seulement)
    """
    users = db.query(User).order_by(User.id).all()
    return [user_to_response(user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_admin)
):
    """
    Récupère un utilisateur par son ID (admin seulement)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur avec l'ID {user_id} non trouvé"
        )
    return user_to_response(user)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_admin)
):
    """
    Crée un nouvel utilisateur (admin seulement)
    """
    # Vérifier si l'email existe déjà
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un utilisateur avec l'email '{user_data.email}' existe déjà"
        )

    # Vérifier si le username existe déjà
    if user_data.username:
        existing_username = db.query(User).filter(User.username == user_data.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Un utilisateur avec le nom d'utilisateur '{user_data.username}' existe déjà"
            )

    # Créer l'utilisateur
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=user_data.is_active,
        hashed_password=hash_password(user_data.password),
        is_deletable=True,  # Les nouveaux utilisateurs sont supprimables
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return user_to_response(new_user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_admin)
):
    """
    Met à jour partiellement un utilisateur (admin seulement)
    PATCH permet de modifier uniquement les champs fournis
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur avec l'ID {user_id} non trouvé"
        )

    # Vérifier unicité email si changé
    if user_data.email and user_data.email != user.email:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Un utilisateur avec l'email '{user_data.email}' existe déjà"
            )

    # Vérifier unicité username si changé
    if user_data.username and user_data.username != user.username:
        existing = db.query(User).filter(User.username == user_data.username).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Un utilisateur avec le nom d'utilisateur '{user_data.username}' existe déjà"
            )

    # Mettre à jour les champs
    update_data = user_data.model_dump(exclude_unset=True)

    # Gérer les permissions séparément (stockées en JSON)
    if "permissions" in update_data:
        permissions = update_data.pop("permissions")
        user.set_permissions(permissions)

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    return user_to_response(user)


@router.patch("/{user_id}/password")
async def update_user_password(
    user_id: int,
    password_data: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_admin)
):
    """
    Met à jour le mot de passe d'un utilisateur (admin seulement)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur avec l'ID {user_id} non trouvé"
        )

    # Mettre à jour le mot de passe et supprimer le mot de passe temporaire
    user.hashed_password = hash_password(password_data.new_password)
    user.temp_password = None

    db.commit()

    return create_success_response(
        data={"user_id": user_id},
        message=f"Mot de passe mis à jour pour {user.username or user.email}"
    )


@router.post("/{user_id}/reset-password", response_model=TempPasswordResponse)
async def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_admin)
):
    """
    Génère un mot de passe temporaire pour un utilisateur (admin seulement)
    Utile si l'admin a perdu le mot de passe d'un utilisateur
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur avec l'ID {user_id} non trouvé"
        )

    # Générer un mot de passe temporaire
    temp_password = generate_temp_password()

    # SÉCURITÉ: On stocke uniquement le hash, jamais le mot de passe en clair
    # Le champ temp_password est utilisé comme FLAG (valeur "1") pour indiquer
    # qu'un mot de passe temporaire a été émis et doit être changé
    user.hashed_password = hash_password(temp_password)
    user.temp_password = "1"  # Flag: mot de passe temporaire actif

    db.commit()

    return TempPasswordResponse(
        user_id=user.id,
        username=user.username or user.email,
        temp_password=temp_password,
        message="Mot de passe temporaire généré. L'utilisateur devra le changer à sa prochaine connexion."
    )


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_admin)
):
    """
    Supprime un utilisateur (admin seulement)
    Note: L'admin principal (is_deletable=False) ne peut pas être supprimé
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur avec l'ID {user_id} non trouvé"
        )

    # Vérifier si l'utilisateur peut être supprimé
    if not user.is_deletable:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cet utilisateur ne peut pas être supprimé (administrateur principal)"
        )

    # Supprimer l'utilisateur
    db.delete(user)
    db.commit()

    return create_success_response(
        data={"user_id": user_id},
        message=f"Utilisateur {user.username or user.email} supprimé avec succès"
    )


@router.get("/permissions/available")
async def get_available_permissions(
    current_user: TokenData = Depends(require_admin)
):
    """
    Retourne la liste des permissions disponibles pour l'assignation (admin seulement)
    """
    from app.auth.permissions import ROUTE_PERMISSIONS

    permissions = [
        {"key": "config_coupe", "label": "Configuration de la Coupe", "description": "Accès à la configuration générale de l'événement"},
        {"key": "tournois_tableaux", "label": "Tournois & Tableaux", "description": "Gestion des tournois et des tableaux de compétition"},
        {"key": "scores_finaux", "label": "Scores Finaux", "description": "Accès au tableau des scores finaux"},
        {"key": "scores_direct", "label": "Scores en Direct", "description": "Mise à jour des scores en temps réel"},
        {"key": "gestion_equipes", "label": "Gestion des Équipes", "description": "Création et gestion des équipes"},
        {"key": "gestion_sports", "label": "Gestion des Sports", "description": "Configuration des sports et disciplines"},
        {"key": "gestion_terrains", "label": "Gestion des Terrains", "description": "Gestion des terrains et lieux"},
    ]

    return {"permissions": permissions}
