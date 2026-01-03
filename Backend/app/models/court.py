"""
Modèle Court
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base

class Court(Base):
    """
    Classe Modèle Court 
    Représente un terrain
    """

    __tablename__ = "Court"

    id = Column(Integer, primary_key=True, index=True)  # Primary Key
    name = Column(String(100), nullable=False, index=True)  # Nom du terrain
    sport_id = Column(Integer, ForeignKey("Sport.id"), nullable=True)  # Sport principal du terrain (optionnel)
    is_active = Column(Boolean, default=True)

    # Relations
    sport = relationship("Sport", back_populates="courts")
    match_schedules = relationship("MatchSchedule", back_populates="court")

    # Propriété pour calculer si le terrain est vraiment utilisé
    @property
    def has_active_matches(self):
        """Vérifie si le terrain a des matchs programmés/en cours"""
        from datetime import datetime
        return any(
            schedule.match.status in ["scheduled", "ongoing"] 
            for schedule in self.match_schedules 
            if schedule.scheduled_start_time > datetime.now()
        )

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<Court(id={self.id}, name='{self.name}', sport_id={self.sport_id}, is_active={self.is_active})>"
        )