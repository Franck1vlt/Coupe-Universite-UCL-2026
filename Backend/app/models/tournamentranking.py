"""
Modèle TournamentRanking
"""
from sqlalchemy import Column, Integer, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class TournamentRanking(Base):
    """
    Classe Modèle TournamentRanking
    Représente le classement final d'une équipe dans un tournoi
    """

    __tablename__ = "TournamentRanking"

    tournament_id = Column(Integer, ForeignKey("Tournament.id"), primary_key=True, nullable=False)
    team_sport_id = Column(Integer, ForeignKey("TeamSport.id"), primary_key=True, nullable=False)

    final_position = Column(Integer, nullable=False)  # Position finale
    points_awarded = Column(Integer, nullable=True)   # Points attribués (optionnel)

    # Contraintes
    __table_args__ = (
        CheckConstraint("final_position > 0", name="ck_ranking_position_positive"),
        CheckConstraint("points_awarded IS NULL OR points_awarded >= 0", name="ck_ranking_points_non_negative"),
    )

    # Relations
    # Note: Les backrefs sont définis dans Tournament.tournament_rankings et TeamSport.tournament_rankings
    # Removed explicit 'tournament' relationship to avoid DATABASE_ERROR due to conflicting backref.

    def __repr__(self):
        return (
            f"<TournamentRanking(tournament_id={self.tournament_id}, "
            f"team_sport_id={self.team_sport_id}, "
            f"final_position={self.final_position}, "
            f"points_awarded={self.points_awarded})>"
        )
