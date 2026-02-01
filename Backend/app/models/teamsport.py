"""
Modèle TeamSport
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class TeamSport(Base):
    """
    Classe Modèle TeamSport
    """

    __tablename__ = "TeamSport"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("Team.id"), nullable=False)
    sport_id = Column(Integer, ForeignKey("Sport.id"), nullable=False)
    team_sport_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("team_id", "sport_id", name="uq_team_sport"),
    )

    # Relations
    # Note: Les backrefs sont définis dans Team.team_sports et Sport.team_sports
    team = relationship("Team")
    sport = relationship("Sport")
    # Note: Le backref "team_sport" est défini dans Player.team_sport
    players = relationship("Player", cascade="all, delete-orphan")
    tournament_rankings = relationship("TournamentRanking", backref="team_sport", cascade="all, delete-orphan")
    
    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<TeamSport(id={self.id}, team_id={self.team_id}, "
            f"sport_id={self.sport_id}, team_sport_name={self.team_sport_name}, "
            f"is_active={self.is_active})>"
        )
