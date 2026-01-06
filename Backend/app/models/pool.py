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
    order = Column("order", Integer, nullable=False)  # Ordre d'affichage (colonne order dans la BDD)
    
    # Configuration de la poule
    qualified_to_finals = Column(Integer, nullable=False, default=2, server_default="2")  # Nombre d'équipes qualifiées pour les finales
    qualified_to_loser_bracket = Column(Integer, nullable=False, default=0, server_default="0")  # Nombre d'équipes pour le loser bracket

    # Relations
    # Note: Le backref "phase" est défini dans Pool.phase via TournamentPhase.pools, donc il ne faut pas redéfinir la relation ici pour éviter les conflits de backref.
    team_pools = relationship("TeamPool", cascade="all, delete-orphan")

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<Pool(id={self.id}, phase_id={self.phase_id}, name='{self.name}', display_order={self.display_order})>"
        )
