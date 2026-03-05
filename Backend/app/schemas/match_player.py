"""
Schémas Pydantic pour la gestion des joueurs dans le contexte d'un match (fiche de match).
Les joueurs sont stockés dans le modèle Player existant, lié à TeamSport.
"""
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class MatchPlayerCreate(BaseModel):
    """Schéma pour ajouter un joueur à l'équipe A ou B d'un match"""
    team: Literal["A", "B"] = Field(..., description="Équipe dans le match : 'A' ou 'B'")
    first_name: Optional[str] = Field(None, max_length=50, description="Prénom")
    last_name: Optional[str] = Field(None, max_length=50, description="Nom")
    jersey_number: Optional[int] = Field(None, ge=0, le=99, description="Numéro de maillot")
    position: Optional[str] = Field(None, max_length=100, description="Poste")
    is_captain: bool = Field(default=False, description="Capitaine de l'équipe")


class MatchPlayerUpdate(BaseModel):
    """Schéma pour mettre à jour un joueur de la fiche de match"""
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    jersey_number: Optional[int] = Field(None, ge=0, le=99)
    position: Optional[str] = Field(None, max_length=100)
    is_captain: Optional[bool] = None
    is_active: Optional[bool] = None


class MatchPlayerResponse(BaseModel):
    """Réponse d'un joueur enrichi du slot 'A' ou 'B' dans le match"""
    id: int
    team_sport_id: int
    team: str                          # "A" ou "B", calculé depuis le match
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    jersey_number: Optional[int] = None
    position: Optional[str] = None
    is_captain: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
