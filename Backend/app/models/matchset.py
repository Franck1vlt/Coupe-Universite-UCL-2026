"""
Modèle MatchSet
"""
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class MatchSet(Base):
    """
    Classe Modèle MatchSet
    Représente un set d'un match (pour sports à sets : volley, tennis, etc.)
    """

    __tablename__ = "MatchSet"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("Match.id"), nullable=False, index=True)
    set_number = Column(Integer, nullable=False)  # Numéro du set (1, 2, 3...)
    score_team_a = Column(Integer, nullable=True)
    score_team_b = Column(Integer, nullable=True)
    set_order = Column(Integer, nullable=True)

    # Contraintes
    __table_args__ = (
        UniqueConstraint(
            "match_id",
            "set_number",
            name="uq_match_set_number"
        ),
        CheckConstraint("set_number > 0", name="ck_matchset_set_number_positive"),
        CheckConstraint("score_team_a IS NULL OR score_team_a >= 0", name="ck_matchset_score_a_non_negative"),
        CheckConstraint("score_team_b IS NULL OR score_team_b >= 0", name="ck_matchset_score_b_non_negative"),
    )

    # Relations
    match = relationship("Match", backref="sets")

    def __repr__(self):
        return (
            f"<MatchSet(id={self.id}, match_id={self.match_id}, set_number={self.set_number}, "
            f"score_team_a={self.score_team_a}, score_team_b={self.score_team_b}, set_order={self.set_order})>"
        )