"""
Modèle FinalRanking
"""
from sqlalchemy import Column, Integer, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class FinalRanking(Base):
    """
    Classe Modèle FinalRanking
    Représente le classement final agrégé de toutes les équipes
    (somme de tous les classements de tournois)
    """

    __tablename__ = "FinalRanking"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("Team.id"), nullable=False, unique=True, index=True)
    
    total_points = Column(Integer, nullable=False, default=0, server_default="0")  # Total des points de tous les tournois
    total_position = Column(Integer, nullable=True)  # Position finale dans le classement général
    tournaments_participated = Column(Integer, nullable=False, default=0, server_default="0")  # Nombre de tournois auxquels l'équipe a participé
    tournaments_won = Column(Integer, nullable=False, default=0, server_default="0")  # Nombre de tournois gagnés
    tournaments_second = Column(Integer, nullable=False, default=0, server_default="0")  # Nombre de fois deuxième
    tournaments_third = Column(Integer, nullable=False, default=0, server_default="0")  # Nombre de fois troisième

    # Contraintes
    __table_args__ = (
        CheckConstraint("total_points >= 0", name="ck_final_ranking_points_non_negative"),
        CheckConstraint("total_position IS NULL OR total_position > 0", name="ck_final_ranking_position_positive"),
        CheckConstraint("tournaments_participated >= 0", name="ck_final_ranking_participated_non_negative"),
        CheckConstraint("tournaments_won >= 0", name="ck_final_ranking_won_non_negative"),
        CheckConstraint("tournaments_second >= 0", name="ck_final_ranking_second_non_negative"),
        CheckConstraint("tournaments_third >= 0", name="ck_final_ranking_third_non_negative"),
    )

    # Relations
    team = relationship("Team", backref="final_ranking", uselist=False)

    def __repr__(self):
        return (
            f"<FinalRanking(id={self.id}, team_id={self.team_id}, "
            f"total_points={self.total_points}, total_position={self.total_position}, "
            f"tournaments_participated={self.tournaments_participated}, "
            f"tournaments_won={self.tournaments_won}, tournaments_second={self.tournaments_second}, "
            f"tournaments_third={self.tournaments_third})>"
        )

