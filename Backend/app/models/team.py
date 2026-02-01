"""
Modèle Team
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class Team(Base):
    """
    Modèle Team
    Représente une équipe dans le système (Fac de Droit, Fac d'Économie, etc.)
    """
    __tablename__ = "Team"
    
    id = Column(Integer, primary_key=True, index=True) # Primary Key
    name = Column(String(100), nullable=False, unique=True, index=True) # Nom de l'équipe
    logo_url = Column(String(200), nullable=True) # URL du logo
    primary_color = Column(String(10), nullable=True) # Couleur principale en hex (#RRGGBB)
    created_at = Column(DateTime, nullable=False, server_default=func.now()) # Date de création

    # Relations
    # Note: Les backrefs sont définis dans TeamSport.team, TeamPool.team et FinalRanking.team
    team_sports = relationship("TeamSport", cascade="all, delete-orphan")
    team_pools = relationship("TeamPool", cascade="all, delete-orphan")

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<Team(id={self.id}, name='{self.name}, "
            f"logo_url={self.logo_url}, created_at={self.created_at})>"
        )