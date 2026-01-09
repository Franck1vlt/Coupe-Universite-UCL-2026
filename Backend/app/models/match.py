"""
Modèle Match
"""
from sqlalchemy import Text, Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from datetime import datetime
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
    pool_id = Column(Integer, ForeignKey("Pool.id"), nullable=True)  # Pour les matchs de poule
    
    # Type de match : qualification, pool, bracket, loser_bracket
    match_type = Column(String(20), nullable=False, default="qualification", server_default="qualification")
    # Sous-type pour les brackets : quarterfinal, semifinal, final, third_place
    bracket_type = Column(String(20), nullable=True)
    
    team_sport_a_id = Column(Integer, ForeignKey("TeamSport.id"), nullable=True)  # Peut être null en attente de qualification
    team_sport_b_id = Column(Integer, ForeignKey("TeamSport.id"), nullable=True)  # Peut être null en attente de qualification
    
    # Codes pour la propagation des résultats (ex: "WQ1" = winner of qualification 1)
    team_a_source = Column(String(50), nullable=True)  # Ex: "WQ1", "P1-1" (Poule 1, position 1)
    team_b_source = Column(String(50), nullable=True)
    
    # Destinations pour les vainqueurs/perdants
    winner_destination_match_id = Column(Integer, ForeignKey("Match.id"), nullable=True)
    loser_destination_match_id = Column(Integer, ForeignKey("Match.id"), nullable=True)
    
    # Label et position pour l'affichage
    label = Column(String(100), nullable=True)  # Ex: "Quart de finale 1"
    match_order = Column(Integer, nullable=True)  # Ordre d'affichage

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

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, onupdate=func.now())
    comment = Column(Text, nullable=True)
    court = Column(String(100), nullable=True)  # Terrain du match
    date = Column(String(20), nullable=True)    # Date du match (format ISO ou JJ/MM/AAAA)
    time = Column(String(10), nullable=True)    # Heure du match (format HH:MM)
    duration = Column(Integer, nullable=True)   # Durée prévue du match en minutes

    __table_args__ = (
        CheckConstraint("team_sport_a_id IS NULL OR team_sport_b_id IS NULL OR team_sport_a_id != team_sport_b_id", name="ck_match_different_teams"),
        CheckConstraint("status IN ('upcoming', 'in_progress', 'completed', 'cancelled')", name="ck_match_status"),
        CheckConstraint("match_type IN ('qualification', 'pool', 'bracket', 'loser_bracket')", name="ck_match_type"),
        CheckConstraint("bracket_type IS NULL OR bracket_type IN ('quarterfinal', 'semifinal', 'final', 'third_place', 'loser_round_1', 'loser_round_2', 'loser_round_3', 'loser_final')", name="ck_bracket_type"),
        UniqueConstraint('phase_id', 'uuid', name='uq_match_phase_uuid'),
    )

    # Relations
    # Note: Le backref "matches" est défini dans TournamentPhase.matches
    # phase = relationship("TournamentPhase")
    pool = relationship("Pool", foreign_keys=[pool_id], backref="matches")
    team_sport_a = relationship("TeamSport", foreign_keys=[team_sport_a_id], backref="matches_as_team_a")
    team_sport_b = relationship("TeamSport", foreign_keys=[team_sport_b_id], backref="matches_as_team_b")
    referee_user = relationship("User", foreign_keys=[referee_user_id], backref="refereed_matches")
    created_by_user = relationship("User", foreign_keys=[created_by_user_id], backref="created_matches")
    updated_by_user = relationship("User", foreign_keys=[updated_by_user_id], backref="updated_matches")
    winner_destination = relationship("Match", foreign_keys=[winner_destination_match_id], remote_side=[id], backref="winner_source_matches")
    loser_destination = relationship("Match", foreign_keys=[loser_destination_match_id], remote_side=[id], backref="loser_source_matches")

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<Match(id={self.id}, phase_id={self.phase_id}, pool_id={self.pool_id}, "
            f"match_type='{self.match_type}', bracket_type='{self.bracket_type}', "
            f"team_sport_a_id={self.team_sport_a_id}, team_sport_b_id={self.team_sport_b_id}, "
            f"team_a_source='{self.team_a_source}', team_b_source='{self.team_b_source}', "
            f"winner_destination_match_id={self.winner_destination_match_id}, "
            f"loser_destination_match_id={self.loser_destination_match_id}, "
            f"label='{self.label}', match_order={self.match_order}, "
            f"score_a={self.score_a}, score_b={self.score_b}, status='{self.status}', "
            f"referee_user_id={self.referee_user_id}, created_by_user_id={self.created_by_user_id}, "
            f"updated_by_user_id={self.updated_by_user_id}, created_at={self.created_at}, "
            f"updated_at={self.updated_at}, comment='{self.comment}', court='{self.court}', "
            f"date='{self.date}', time='{self.time}', duration={self.duration})>"
        )