"""
Modèle User
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

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
    is_active = Column(Boolean, default=True, nullable=False, server_default="1")  # Utilisateur actif
    is_staff = Column(Boolean, default=False, nullable=False, server_default="0")  # Membre du staff
    is_superuser = Column(Boolean, default=False, nullable=False, server_default="0")  # Super utilisateur
    
    created_at = Column(DateTime, nullable=False, server_default=func.now())  # Date de création
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())  # Date de mise à jour

    # Relations
    # Note: Les backrefs sont définis dans les modèles Tournament et Match
    created_tournaments = relationship("Tournament", foreign_keys="Tournament.created_by_user_id")

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<User(id={self.id}, email='{self.email}', username='{self.username}', "
            f"full_name='{self.full_name}', is_active={self.is_active}, "
            f"is_staff={self.is_staff}, is_superuser={self.is_superuser})>"
        )

