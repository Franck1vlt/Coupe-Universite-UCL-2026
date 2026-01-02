"""
Modèle Court
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base

class Court(Base):
    """
    Classe Modèle Court 
    Représente un terrain
    """

    __tablename__ = "Court"

    id = Column(Integer, primary_key=True, index=True)  # Primary Key
    name = Column(String(100), nullable=False, index=True)  # Nom du terrain
    is_active = Column(Boolean, default=True)

    # Relations
    sports = relationship(
        "Sport",
        secondary="court_sport_association",
        back_populates="courts"
    )


    # Représentation de l'objet
    def __repr__(self):
        return (
            f"<Court(id={self.id}, name='{self.name}', is_active={self.is_active})>"
        )

# Table d'association Many-to-Many : Court <-> Sport
from sqlalchemy import Table

court_sport_association = Table(
    "court_sport_association",
    Base.metadata,
    Column("court_id", Integer, ForeignKey("Court.id"), primary_key=True),
    Column("sport_id", Integer, ForeignKey("Sport.id"), primary_key=True)
)