"""
Schémas Pydantic pour MatchSet
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class MatchSetBase(BaseModel):
    """Schéma de base pour MatchSet"""
    match_id: int = Field(..., description="ID du match")
    set_number: int = Field(..., gt=0, description="Numéro du set (1, 2, 3...)")
    score_team_a: Optional[int] = Field(None, ge=0, description="Score de l'équipe A")
    score_team_b: Optional[int] = Field(None, ge=0, description="Score de l'équipe B")


class MatchSetCreate(MatchSetBase):
    """Schéma pour créer un MatchSet"""
    pass


class MatchSetUpdate(BaseModel):
    """Schéma pour mettre à jour un MatchSet"""
    set_number: Optional[int] = Field(None, gt=0)
    score_team_a: Optional[int] = Field(None, ge=0)
    score_team_b: Optional[int] = Field(None, ge=0)


class MatchSetResponse(MatchSetBase):
    """Schéma pour la réponse MatchSet"""
    id: int

    model_config = ConfigDict(from_attributes=True)

