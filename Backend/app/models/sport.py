"""
Modèle Sport
"""
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db import Base


class Sport(Base):
    """
    Classe Modèle Sport
    Représente un sport dans le système (Football, Basketball, Badminton, etc.)
    """
    __tablename__ = "Sport"
    
    id = Column(Integer, primary_key=True, index=True) # Primary Key
    name = Column(String(100), nullable=False, unique=True, index=True) # Nom du sport
    score_type = Column(String(20), nullable=False, default="points")     # Type de score : "points", "goals" (ou "buts"), "sets"
    
    # Relations
    # Note: Les backrefs sont définis dans Tournament.sport et TeamSport.sport
    tournaments = relationship("Tournament", cascade="all, delete-orphan")
    team_sports = relationship("TeamSport", cascade="all, delete-orphan")
    courts = relationship("Court", back_populates="sport")

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<Sport(id={self.id}, name={self.name}, score_type={self.score_type})>"
        )