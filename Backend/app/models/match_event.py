"""
Modèle MatchEvent
Représente un événement de match (but, etc.) pour les sports avec score_type = "goals"
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


class MatchEvent(Base):
    """
    Événement d'un match (but marqué par un joueur).
    Lié à un Match et optionnellement à un Player existant.
    """

    __tablename__ = "MatchEvent"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("Match.id"), nullable=False, index=True)
    event_type = Column(String(20), nullable=False, default="goal", server_default="goal")
    team = Column(String(1), nullable=False)          # "A" ou "B"
    player_id = Column(Integer, ForeignKey("Player.id"), nullable=True)
    match_time_seconds = Column(Integer, nullable=True)   # Chrono au moment de l'événement
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "event_type IN ('goal')",
            name="ck_match_event_type"
        ),
        CheckConstraint(
            "team IN ('A', 'B')",
            name="ck_match_event_team"
        ),
    )

    # Relations
    match = relationship("Match", backref="events")
    player = relationship("Player")

    def __repr__(self):
        return (
            f"<MatchEvent(id={self.id}, match_id={self.match_id}, "
            f"event_type='{self.event_type}', team='{self.team}', "
            f"player_id={self.player_id}, "
            f"match_time_seconds={self.match_time_seconds})>"
        )
