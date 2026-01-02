"""
Modèle Match
"""
from sqlalchemy import Text, Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class Match(Base):
    """
    Classe Modèle Match
    Représente un match entre deux équipes dans un sport
    """

    __tablename__ = "Match"

    id = Column(Integer, primary_key=True, index=True)  # Primary Key
    phase_id = Column(Integer, ForeignKey("TournamentPhase.id"), nullable=False)
    
    team_sport_a_id = Column(Integer, ForeignKey("TeamSport.id"), nullable=False)  # Foreign Key → TeamSport.id
    team_sport_b_id = Column(Integer, ForeignKey("TeamSport.id"), nullable=False)  # Foreign Key → TeamSport.id

    score_a = Column(Integer, nullable=True)  # Score de l'équipe A
    score_b = Column(Integer, nullable=True)  # Score de l'équipe B

    status = Column(
        String(20),
        nullable=False,
        default="upcoming",
        server_default="upcoming"
    )  # Statut : upcoming/à venir, in_progress/en cours, completed/terminé

    referee_user_id = Column(Integer, ForeignKey("User.id"), nullable=True)  # Foreign Key → User.id
    created_by_user_id = Column(Integer, ForeignKey("User.id"), nullable=False)  # Foreign Key → User.id
    updated_by_user_id = Column(Integer, ForeignKey("User.id"), nullable=True)  # Foreign Key → User.id

    created_at = Column(DateTime, nullable=False, server_default=func.now())  # Date de création
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())  # Date de mise à jour
    comment = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "team_sport_a_id",
            "team_sport_b_id",
            "created_at",
            name="uq_match_teams_datetime"
        ),
        CheckConstraint("team_sport_a_id != team_sport_b_id", name="ck_match_different_teams"),
        CheckConstraint("status IN ('upcoming', 'in_progress', 'completed', 'cancelled')", name="ck_match_status"),
    )

    # Relations
    # Note: Le backref "matches" est défini dans TournamentPhase.matches
    # phase = relationship("TournamentPhase")
    team_sport_a = relationship("TeamSport", foreign_keys=[team_sport_a_id], backref="matches_as_team_a")
    team_sport_b = relationship("TeamSport", foreign_keys=[team_sport_b_id], backref="matches_as_team_b")
    referee_user = relationship("User", foreign_keys=[referee_user_id], backref="refereed_matches")
    created_by_user = relationship("User", foreign_keys=[created_by_user_id], backref="created_matches")
    updated_by_user = relationship("User", foreign_keys=[updated_by_user_id], backref="updated_matches")

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<Match(id={self.id}, team_sport_a_id={self.team_sport_a_id}, "
            f"team_sport_b_id={self.team_sport_b_id}, score_a={self.score_a}, "
            f"score_b={self.score_b}, status='{self.status}', "
            f"referee_user_id={self.referee_user_id}, "
            f"created_by_user_id={self.created_by_user_id}, "
            f"updated_by_user_id={self.updated_by_user_id}, "
            f"created_at={self.created_at}, updated_at={self.updated_at}, "
            f"comment={self.comment})>"
        )