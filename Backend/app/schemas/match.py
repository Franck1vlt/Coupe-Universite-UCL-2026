"""
Schémas Pydantic pour Match
"""
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class MatchBase(BaseModel):
    """Schéma de base pour Match"""
    phase_id: int = Field(..., description="ID de la phase")
    team_sport_a_id: int = Field(..., description="ID de l'équipe A")
    team_sport_b_id: int = Field(..., description="ID de l'équipe B")
    score_a: Optional[int] = Field(None, description="Score de l'équipe A")
    score_b: Optional[int] = Field(None, description="Score de l'équipe B")
    status: Literal["upcoming", "in_progress", "completed", "cancelled"] = Field(
        default="upcoming",
        description="Statut du match"
    )
    referee_user_id: Optional[int] = Field(None, description="ID de l'arbitre")
    comment: Optional[str] = Field(None, description="Commentaire")


class MatchCreate(MatchBase):
    """Schéma pour créer un Match"""
    created_by_user_id: int = Field(..., description="ID de l'utilisateur créateur")


class MatchUpdate(BaseModel):
    """Schéma pour mettre à jour un Match"""
    phase_id: Optional[int] = None
    team_sport_a_id: Optional[int] = None
    team_sport_b_id: Optional[int] = None
    score_a: Optional[int] = None
    score_b: Optional[int] = None
    status: Optional[Literal["upcoming", "in_progress", "completed", "cancelled"]] = None
    referee_user_id: Optional[int] = None
    updated_by_user_id: Optional[int] = Field(None, description="ID de l'utilisateur qui met à jour")
    comment: Optional[str] = None


class MatchResponse(MatchBase):
    """Schéma pour la réponse Match"""
    id: int
    created_by_user_id: int
    updated_by_user_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

