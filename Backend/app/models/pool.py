"""
Modèle Pool
"""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base

class Pool(Base):
    """
    Classe Modèle Pool
    Représente une poule d'un tournoi
    """

    __tablename__ = "Pool"

    id = Column(Integer, primary_key=True, index=True)  # Primary Key
    phase_id = Column(Integer, ForeignKey("TournamentPhase.id"), nullable=False)  # Foreign Key → TournamentPhase.id
    name = Column(String(100), nullable=False, index=True)  # Nom de la poule (ex: Poule A)
    display_order = Column(Integer, nullable=False)  # Ordre d'affichage

    # Relations
    # Note: Le backref "phase" est défini dans Pool.phase via TournamentPhase.pools, donc il ne faut pas redéfinir la relation ici pour éviter les conflits de backref.
    team_pools = relationship("TeamPool", cascade="all, delete-orphan")

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<Pool(id={self.id}, phase_id={self.phase_id}, name='{self.name}', display_order={self.display_order})>"
        )
