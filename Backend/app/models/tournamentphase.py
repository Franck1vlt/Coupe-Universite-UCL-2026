"""
Modèle Tournoi Phase
"""
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class TournamentPhase(Base):
    """
    Classe Modèle TournamentPhase 
    Représente une phase d'un tournoi
    """

    __tablename__ = "TournamentPhase"

    id = Column(Integer, primary_key=True, index=True)  # Primary Key
    tournament_id = Column(Integer, ForeignKey("Tournament.id"), nullable=False)  # Foreign Key → Tournament.id
    phase_type = Column(
        String(20), 
        nullable=False,
        default="qualifications",
        server_default="qualifications"
    )  # Type : pools/poules, elimination/élimination, final/finale, qualifications (défaut)
    phase_order = Column(Integer, nullable=False)  # Ordre d'exécution

    # Relations
    # Note: Le backref "phases" est défini dans Tournament.phases
    # Les backrefs "phase" sont définis dans Pool.phase et Match.phase
    # Remove the redundant relationship to avoid the backref conflict with Tournament.phases
    # tournament = relationship("Tournament")
    pools = relationship("Pool", backref="phase", cascade="all, delete-orphan")
    matches = relationship("Match", backref="phase", cascade="all, delete-orphan")

    # Contraintes
    __table_args__ = (
        UniqueConstraint("tournament_id", "phase_order", name="uq_tournament_phase_order"),
        CheckConstraint("phase_type IN ('pools', 'elimination', 'final', 'qualifications')", name="ck_phase_type"),
        CheckConstraint("phase_order > 0", name="ck_phase_order_positive"),
    )

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<TournamentPhase(id={self.id}, tournament_id={self.tournament_id}, "
            f"phase_type='{self.phase_type}', phase_order={self.phase_order})>"
        )
