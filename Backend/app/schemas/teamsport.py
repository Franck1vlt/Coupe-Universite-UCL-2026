"""
Schémas Pydantic pour TeamSport
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TeamSportBase(BaseModel):
    """Champs communs à TeamSport"""
    sport_id: int = Field(..., description="ID du sport")
    team_sport_name: Optional[str] = Field(
        None,
        max_length=100,
        description="Nom spécifique de l'équipe pour ce sport"
    )
    is_active: bool = Field(
        default=True,
        description="Équipe active pour ce sport"
    )


class TeamSportCreate(TeamSportBase):
    """Schéma pour créer une inscription équipe-sport"""
    pass


class TeamSportUpdate(BaseModel):
    """Schéma pour mettre à jour une inscription équipe-sport"""
    team_sport_name: Optional[str] = Field(
        None,
        max_length=100,
        description="Nom spécifique de l'équipe pour ce sport"
    )
    is_active: Optional[bool] = Field(
        None,
        description="Statut actif/inactif"
    )


class TeamSportResponse(BaseModel):
    """Schéma de réponse TeamSport"""
    id: int
    team_id: int
    sport_id: int
    team_sport_name: Optional[str]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
