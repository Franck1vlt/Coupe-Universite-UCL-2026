"""
Modèle Player
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class Player(Base):
    __tablename__ = "Player"

    id = Column(Integer, primary_key=True, index=True)
    team_sport_id = Column(Integer, ForeignKey("TeamSport.id"), nullable=False)
    first_name = Column(String(50), nullable=True)
    last_name = Column(String(50), nullable=True)
    jersey_number = Column(Integer, nullable=True)
    position = Column(String(100), nullable=True)
    is_captain = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint('team_sport_id', 'jersey_number', name='uq_team_sport_jersey_number'),
    )

    # Relations
    # Note: Le backref "players" est défini dans TeamSport.players
    team_sport = relationship("TeamSport")

    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<Player(id={self.id}, team_sport_id={self.team_sport_id}, "
            f"first_name='{self.first_name}', last_name='{self.last_name}', "
            f"jersey_number={self.jersey_number}, position='{self.position}', "
            f"is_captain={self.is_captain}, is_active={self.is_active})>"
        )
