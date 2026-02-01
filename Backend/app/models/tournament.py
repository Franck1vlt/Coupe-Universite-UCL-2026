"""
Modèle Tournoi
"""
from sqlalchemy import Text, Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class Tournament(Base):
    """
    Classe Modèle Tournament
    Représente un tournoi
    """

    __tablename__ = "Tournament"

    id = Column(Integer, primary_key=True, index=True)  # Primary Key
    name = Column(String(100), nullable=False, unique=True, index=True) # Nom du tournoi
    sport_id = Column(Integer, ForeignKey("Sport.id"), nullable=False)  # Foreign Key → Sport.id

    tournament_type = Column(
        String(20), 
        nullable=False, 
        default="qualifications",
        server_default="qualifications"
    )  # Type : pools/poules, final/finale, mixed/mixte, qualifications (défaut)

    status = Column(
        String(20), 
        nullable=False, 
        default="scheduled", 
        server_default="scheduled"
    )  # Statut : scheduled/prévu, in_progress/en cours, completed/terminé

    created_by_user_id = Column(Integer, ForeignKey("User.id"), nullable=False)  # Foreign Key → User.id

    start_date = Column(DateTime, nullable=True)  # Date de début (nullable)
    end_date = Column(DateTime, nullable=True)    # Date de fin (nullable)

    description = Column(Text, nullable=True)      # Description
    rules = Column(Text, nullable=True)            # Règles du tournoi
    image_url = Column(String(255), nullable=True) # URL de l'image du tournoi

    # Contraintes
    __table_args__ = (
        CheckConstraint("tournament_type IN ('pools', 'final', 'mixed', 'qualifications')", name="ck_tournament_type"),
        CheckConstraint("status IN ('scheduled', 'in_progress', 'completed', 'cancelled')", name="ck_tournament_status"),
        CheckConstraint("end_date IS NULL OR start_date IS NULL OR end_date >= start_date", name="ck_tournament_dates"),
    )

    # Relations
    sport = relationship("Sport")  # Removed backref to avoid DATABASE_ERROR

    # Note: Le backref "created_tournaments" est défini dans User.created_tournaments
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    phases = relationship("TournamentPhase", backref="tournament", cascade="all, delete-orphan", order_by="TournamentPhase.phase_order")
    configuration = relationship("TournamentConfiguration", backref="tournament", uselist=False, cascade="all, delete-orphan")
    tournament_rankings = relationship("TournamentRanking", backref="tournament", cascade="all, delete-orphan")

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<Tournament(id={self.id}, name='{self.name}', sport_id={self.sport_id}, "
            f"tournament_type='{self.tournament_type}', status='{self.status}', "
            f"created_by_user_id={self.created_by_user_id}, start_date={self.start_date}, "
            f"end_date={self.end_date}, description='{self.description}', rules='{self.rules}', "
            f"image_url='{self.image_url}')>"
        )
