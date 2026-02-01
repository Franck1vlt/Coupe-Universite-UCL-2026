"""
Schémas Pydantic pour Tournament
"""
from datetime import datetime
from typing import Literal, Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field


class TournamentBase(BaseModel):
    """Schéma de base pour Tournament"""
    name: str = Field(..., max_length=100, description="Nom du tournoi")
    sport_id: int = Field(..., description="ID du sport")
    tournament_type: Literal["pools", "final", "mixed", "qualifications"] = Field(
        default="qualifications",
        description="Type de tournoi"
    )
    status: Literal["scheduled", "in_progress", "completed", "cancelled"] = Field(
        default="scheduled",
        description="Statut du tournoi"
    )
    start_date: Optional[datetime] = Field(None, description="Date de début")
    end_date: Optional[datetime] = Field(None, description="Date de fin")
    description: Optional[str] = Field(None, description="Description du tournoi")
    rules: Optional[str] = Field(None, description="Règles du tournoi")
    image_url: Optional[str] = Field(None, max_length=255, description="URL de l'image du tournoi")


class TournamentCreate(TournamentBase):
    """Schéma pour créer un Tournament avec structure complète"""
    created_by_user_id: int = Field(..., description="ID de l'utilisateur créateur")
    # Structure optionnelle
    qualification_matches: Optional[List[Any]] = Field(default=[], description="Matchs de qualification")
    pools: Optional[List[Any]] = Field(default=[], description="Poules")
    brackets: Optional[List[Any]] = Field(default=[], description="Brackets (phase finale)")
    loser_brackets: Optional[List[Any]] = Field(default=[], description="Loser brackets")


class TournamentUpdate(BaseModel):
    """Schéma pour mettre à jour un Tournament"""
    name: Optional[str] = Field(None, max_length=100)
    sport_id: Optional[int] = None
    tournament_type: Optional[Literal["pools", "final", "mixed", "qualifications"]] = None
    status: Optional[Literal["scheduled", "in_progress", "completed", "cancelled"]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = None
    rules: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=255)
    # Structure optionnelle pour les mises à jour
    qualification_matches: Optional[List[Any]] = None
    pools: Optional[List[Any]] = None
    brackets: Optional[List[Any]] = None
    loser_brackets: Optional[List[Any]] = None


class TournamentResponse(TournamentBase):
    """Schéma pour la réponse Tournament"""
    id: int
    created_by_user_id: int

    model_config = ConfigDict(from_attributes=True)

