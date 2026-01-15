"""
Modèle Match
"""
from sqlalchemy import (
    Text, Column, Integer, String, DateTime,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base
import uuid


class Match(Base):
    __tablename__ = "Match"

    id = Column(Integer, primary_key=True, index=True)

    uuid = Column(
        String,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
        server_default=""
    )

    phase_id = Column(Integer, ForeignKey("TournamentPhase.id"), nullable=False)
    tournament_id = Column(Integer, ForeignKey("Tournament.id"), nullable=False, index=True)
    pool_id = Column(Integer, ForeignKey("Pool.id"), nullable=True)

    # Types
    match_type = Column(String(20), nullable=False, default="qualification", server_default="qualification")
    bracket_type = Column(String(20), nullable=True)

    # Équipes
    team_sport_a_id = Column(Integer, ForeignKey("TeamSport.id"), nullable=True)
    team_sport_b_id = Column(Integer, ForeignKey("TeamSport.id"), nullable=True)

    # Sources textuelles (avant résolution)
    team_a_source = Column(String(50), nullable=True)
    team_b_source = Column(String(50), nullable=True)

    # Destinations (après match)
    winner_destination_match_id = Column(Integer, ForeignKey("Match.id"), nullable=True)
    winner_destination_slot = Column(String(1), nullable=True)

    loser_destination_match_id = Column(Integer, ForeignKey("Match.id"), nullable=True)
    loser_destination_slot = Column(String(1), nullable=True)

    # Affichage
    label = Column(String(100), nullable=True)
    match_order = Column(Integer, nullable=True)

    # Scores
    score_a = Column(Integer, nullable=True)
    score_b = Column(Integer, nullable=True)

    # Points personnalisés pour le vainqueur et le perdant
    winner_points = Column(Integer, nullable=True, default=0, server_default="0")
    loser_points = Column(Integer, nullable=True, default=0, server_default="0")

    status = Column(
        String(20),
        nullable=False,
        default="upcoming",
        server_default="upcoming"
    )

    referee_user_id = Column(Integer, ForeignKey("User.id"), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("User.id"), nullable=False)
    updated_by_user_id = Column(Integer, ForeignKey("User.id"), nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, onupdate=func.now())

    comment = Column(Text, nullable=True)
    court = Column(String(100), nullable=True)
    date = Column(String(20), nullable=True)
    time = Column(String(10), nullable=True)
    duration = Column(Integer, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "team_sport_a_id IS NULL OR team_sport_b_id IS NULL OR team_sport_a_id != team_sport_b_id",
            name="ck_match_different_teams"
        ),
        CheckConstraint(
            "status IN ('upcoming', 'in_progress', 'completed', 'cancelled')",
            name="ck_match_status"
        ),
        CheckConstraint(
            "match_type IN ('qualification', 'pool', 'bracket', 'loser_bracket')",
            name="ck_match_type"
        ),
        CheckConstraint(
            "bracket_type IS NULL OR bracket_type IN ("
            "'quarterfinal','semifinal','final','third_place',"
            "'loser_round_1','loser_round_2','loser_round_3','loser_final'"
            ")",
            name="ck_bracket_type"
        ),
        CheckConstraint(
            "winner_destination_slot IS NULL OR winner_destination_slot IN ('A','B')",
            name="ck_winner_destination_slot"
        ),
        CheckConstraint(
            "loser_destination_slot IS NULL OR loser_destination_slot IN ('A','B')",
            name="ck_loser_destination_slot"
        ),
        UniqueConstraint('phase_id', 'uuid', name='uq_match_phase_uuid'),
    )

    # Relations
    tournament = relationship("Tournament", foreign_keys=[tournament_id], backref="matches")
    pool = relationship("Pool", foreign_keys=[pool_id], backref="matches")

    team_sport_a = relationship("TeamSport", foreign_keys=[team_sport_a_id])
    team_sport_b = relationship("TeamSport", foreign_keys=[team_sport_b_id])

    referee_user = relationship("User", foreign_keys=[referee_user_id])
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    updated_by_user = relationship("User", foreign_keys=[updated_by_user_id])

    winner_destination = relationship(
        "Match",
        foreign_keys=[winner_destination_match_id],
        remote_side=[id],
        backref="winner_source_matches"
    )

    loser_destination = relationship(
        "Match",
        foreign_keys=[loser_destination_match_id],
        remote_side=[id],
        backref="loser_source_matches"
    )

    def __repr__(self):
        return (
            f"<Match("
            f"id={self.id}, "
            f"uuid={self.uuid}, "
            f"phase_id={self.phase_id}, "
            f"tournament_id={self.tournament_id}, "
            f"pool_id={self.pool_id}, "
            f"match_type={self.match_type}, "
            f"bracket_type={self.bracket_type}, "
            f"team_sport_a_id={self.team_sport_a_id}, "
            f"team_sport_b_id={self.team_sport_b_id}, "
            f"team_a_source={self.team_a_source}, "
            f"team_b_source={self.team_b_source}, "
            f"winner_destination_match_id={self.winner_destination_match_id}, "
            f"winner_destination_slot={self.winner_destination_slot}, "
            f"loser_destination_match_id={self.loser_destination_match_id}, "
            f"loser_destination_slot={self.loser_destination_slot}, "
            f"label={self.label}, "
            f"match_order={self.match_order}, "
            f"score_a={self.score_a}, "
            f"score_b={self.score_b}, "
            f"winner_points={self.winner_points}, "
            f"loser_points={self.loser_points}, "
            f"status={self.status}, "
            f"referee_user_id={self.referee_user_id}, "
            f"created_by_user_id={self.created_by_user_id}, "
            f"updated_by_user_id={self.updated_by_user_id}, "
            f"created_at={self.created_at}, "
            f"updated_at={self.updated_at}, "
            f"comment={self.comment}, "
            f"court={self.court}, "
            f"date={self.date}, "
            f"time={self.time}, "
            f"duration={self.duration}"
            f")>"
        )