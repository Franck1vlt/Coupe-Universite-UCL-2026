"""
Modèle TournamentConfiguration
"""
from sqlalchemy import Column, Integer, ForeignKey, JSON, CheckConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class TournamentConfiguration(Base):
    """
    Classe Modèle TournamentConfiguration
    Représente la configuration d'un tournoi
    """

    __tablename__ = "TournamentConfiguration"

    tournament_id = Column(Integer, ForeignKey("Tournament.id"), primary_key=True, nullable=False)
    points_for_win = Column(Integer, nullable=False, default=3, server_default="3")
    points_for_draw = Column(Integer, nullable=False, default=1, server_default="1")
    points_for_loss = Column(Integer, nullable=False, default=0, server_default="0")
    qualified_teams_per_pool = Column(Integer, nullable=True)
    tiebreaker_rules = Column(JSON, nullable=True)  # Stocke les règles de départage au format JSON

    # Contraintes
    __table_args__ = (
        CheckConstraint("points_for_win >= 0", name="ck_config_points_win_non_negative"),
        CheckConstraint("points_for_draw >= 0", name="ck_config_points_draw_non_negative"),
        CheckConstraint("points_for_loss >= 0", name="ck_config_points_loss_non_negative"),
        CheckConstraint("qualified_teams_per_pool IS NULL OR qualified_teams_per_pool > 0", name="ck_config_qualified_teams_positive"),
    )

    # Relation
    # Note: Le backref "configuration" est défini dans Tournament.configuration
    # Suppression de la relation locale 'tournament' pour éviter le conflit de backref.
    # La relation est déjà correctement définie dans Tournament avec backref='configuration'

    def __repr__(self):
        return (
            f"<TournamentConfiguration(tournament_id={self.tournament_id}, "
            f"points_for_win={self.points_for_win}, points_for_draw={self.points_for_draw}, "
            f"points_for_loss={self.points_for_loss}, qualified_teams_per_pool={self.qualified_teams_per_pool}, "
            f"tiebreaker_rules={self.tiebreaker_rules})>"
        )