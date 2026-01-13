"""
Modèle MatchSchedule (Planification de match)
"""

from sqlalchemy import Column, Integer, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class MatchSchedule(Base):
    """
    Classe Modèle MatchSchedule
    Gère la planification d'un match (date, terrain, horaires, etc.)
    """

    __tablename__ = "MatchSchedule"

    
    match_id = Column(Integer, ForeignKey("Match.id"), primary_key=True)  # Primary Key, FK → Match.id
    court_id = Column(Integer, ForeignKey("Court.id"), nullable=True)     # FK → Court.id
    tournament_id = Column(Integer, ForeignKey("Tournament.id"), nullable=False, index=True)  # FK → Tournament.id
    scheduled_datetime = Column(DateTime, nullable=True)                  # Date et heure prévues
    actual_start_datetime = Column(DateTime, nullable=True)               # Heure de début réelle
    actual_end_datetime = Column(DateTime, nullable=True)                 # Heure de fin réelle
    estimated_duration_minutes = Column(Integer, nullable=True)           # Durée estimée (minutes)

    # Contraintes
    __table_args__ = (
        CheckConstraint("estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0", name="ck_schedule_duration_positive"),
        CheckConstraint("actual_end_datetime IS NULL OR actual_start_datetime IS NULL OR actual_end_datetime >= actual_start_datetime", name="ck_schedule_datetimes"),
    )

    # Relations (optionnelles, selon besoin)
    match = relationship("Match", backref="schedule", uselist=False)
    court = relationship("Court", backref="schedules")
    tournament = relationship("Tournament", backref="match_schedules")

    def __repr__(self):
        return (
            f"<MatchSchedule(match_id={self.match_id}, court_id={self.court_id}, "
            f"tournament_id={self.tournament_id}, "
            f"scheduled_datetime={self.scheduled_datetime}, "
            f"actual_start_datetime={self.actual_start_datetime}, "
            f"actual_end_datetime={self.actual_end_datetime}, "
            f"estimated_duration_minutes={self.estimated_duration_minutes})>"
        )