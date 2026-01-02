"""
Modèle TeamPool
"""
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class TeamPool(Base):
    """
    Classe Modèle TeamPool 
    Représente une équipe dans une poule, avec statistiques cumulées de la phase/poule
    """

    __tablename__ = "TeamPool"

    id = Column(Integer, primary_key=True, index=True)  # Primary Key
    pool_id = Column(Integer, ForeignKey("Pool.id"), nullable=False)  # Foreign Key → Pool.id
    team_id = Column(Integer, ForeignKey("Team.id"), nullable=False)  # Foreign Key → Team.id
    position = Column(Integer, nullable=True)  # classement dans la poule (peut être recalculé, donc nullable)
    points = Column(Integer, nullable=False, default=0, server_default="0")  # points
    wins = Column(Integer, nullable=False, default=0, server_default="0")
    losses = Column(Integer, nullable=False, default=0, server_default="0")
    draws = Column(Integer, nullable=False, default=0, server_default="0")
    goals_for = Column(Integer, nullable=False, default=0, server_default="0")
    goals_against = Column(Integer, nullable=False, default=0, server_default="0")
    goal_difference = Column(Integer, nullable=False, default=0, server_default="0")

    # Relations
    # Note: Les backrefs sont définis dans Pool.team_pools et Team.team_pools
    pool = relationship("Pool")
    team = relationship("Team")

    # Contraintes
    __table_args__ = (
        UniqueConstraint("pool_id", "team_id", name="uq_pool_team"),
        CheckConstraint("points >= 0", name="ck_teampool_points_non_negative"),
        CheckConstraint("wins >= 0", name="ck_teampool_wins_non_negative"),
        CheckConstraint("losses >= 0", name="ck_teampool_losses_non_negative"),
        CheckConstraint("draws >= 0", name="ck_teampool_draws_non_negative"),
        CheckConstraint("goals_for >= 0", name="ck_teampool_goals_for_non_negative"),
        CheckConstraint("goals_against >= 0", name="ck_teampool_goals_against_non_negative"),
    )

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<TeamPool(id={self.id}, pool_id={self.pool_id}, team_id={self.team_id}, "
            f"position={self.position}, points={self.points}, wins={self.wins}, "
            f"losses={self.losses}, draws={self.draws}, goals_for={self.goals_for}, "
            f"goals_against={self.goals_against}, goal_difference={self.goal_difference})>"
        )
