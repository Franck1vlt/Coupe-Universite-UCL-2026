"""
Modèle User
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base
import enum


class UserRole(str, enum.Enum):
    """Rôles disponibles pour les utilisateurs"""
    ADMIN = "admin"
    STAFF = "staff"
    TECHNICIEN = "technicien"


class User(Base):
    """
    Classe Modèle User
    Représente un utilisateur du système (administrateur, arbitre, etc.)
    """
    __tablename__ = "User"

    id = Column(Integer, primary_key=True, index=True)  # Primary Key
    email = Column(String(255), nullable=False, unique=True, index=True)  # Email unique
    username = Column(String(100), nullable=True, unique=True, index=True)  # Nom d'utilisateur (optionnel)
    full_name = Column(String(200), nullable=True)  # Nom complet
    hashed_password = Column(String(255), nullable=True)  # Mot de passe hashé
    temp_password = Column(String(100), nullable=True)  # Mot de passe temporaire pour récupération
    role = Column(String(50), nullable=False, default="staff")  # Rôle: admin, staff, technicien
    is_active = Column(Boolean, default=True, nullable=False, server_default="1")  # Utilisateur actif
    is_staff = Column(Boolean, default=False, nullable=False, server_default="0")  # Membre du staff (legacy)
    is_superuser = Column(Boolean, default=False, nullable=False, server_default="0")  # Super utilisateur (legacy)
    is_deletable = Column(Boolean, default=True, nullable=False, server_default="1")  # Peut être supprimé (False pour admin principal)

    # Permissions individuelles (stockées en JSON, ex: ["scores_direct", "tournois_tableaux"])
    # Ces permissions s'ajoutent aux permissions du rôle
    permissions = Column(String(500), nullable=True, default=None)  # JSON array de permissions

    created_at = Column(DateTime, nullable=False, server_default=func.now())  # Date de création
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())  # Date de mise à jour

    # Relations
    # Note: Les backrefs sont définis dans les modèles Tournament et Match
    created_tournaments = relationship("Tournament", foreign_keys="Tournament.created_by_user_id")

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<User(id={self.id}, email='{self.email}', username='{self.username}', "
            f"full_name='{self.full_name}', role='{self.role}', is_active={self.is_active})>"
        )

    def has_role(self, role: str) -> bool:
        """Vérifie si l'utilisateur a le rôle spécifié"""
        return self.role == role

    def is_admin(self) -> bool:
        """Vérifie si l'utilisateur est admin"""
        return self.role == UserRole.ADMIN.value or self.is_superuser

    def can_access(self, required_roles: list) -> bool:
        """Vérifie si l'utilisateur a accès basé sur une liste de rôles"""
        return self.role in [r.value if hasattr(r, 'value') else r for r in required_roles]

    def get_permissions(self) -> list:
        """Retourne la liste des permissions individuelles de l'utilisateur"""
        import json
        if not self.permissions:
            return []
        try:
            return json.loads(self.permissions)
        except (json.JSONDecodeError, TypeError):
            return []

    def set_permissions(self, permissions: list):
        """Définit les permissions individuelles de l'utilisateur"""
        import json
        if not permissions:
            self.permissions = None
        else:
            self.permissions = json.dumps(permissions)

    def has_permission(self, permission: str) -> bool:
        """Vérifie si l'utilisateur a une permission spécifique (via rôle ou permission individuelle)"""
        from app.auth.permissions import ROUTE_PERMISSIONS, Role
        # Vérifier les permissions du rôle
        try:
            role_enum = Role(self.role)
            if permission in ROUTE_PERMISSIONS:
                if role_enum in ROUTE_PERMISSIONS[permission]:
                    return True
        except ValueError:
            pass
        # Vérifier les permissions individuelles
        return permission in self.get_permissions()

