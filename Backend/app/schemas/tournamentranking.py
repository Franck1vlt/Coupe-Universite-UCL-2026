"""
Schémas Pydantic pour TournamentRanking
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TournamentRankingBase(BaseModel):
    """Schéma de base pour TournamentRanking"""
    tournament_id: int = Field(..., description="ID du tournoi")
    team_sport_id: int = Field(..., description="ID de l'équipe-sport")
    final_position: int = Field(..., gt=0, description="Position finale dans le tournoi")
    points_awarded: Optional[int] = Field(None, ge=0, description="Points attribués")


class TournamentRankingCreate(TournamentRankingBase):
    """Schéma pour créer un TournamentRanking"""
    pass


class TournamentRankingUpdate(BaseModel):
    """Schéma pour mettre à jour un TournamentRanking"""
    final_position: Optional[int] = Field(None, gt=0)
    points_awarded: Optional[int] = Field(None, ge=0)


class TournamentRankingResponse(TournamentRankingBase):
    """Schéma pour la réponse TournamentRanking"""

    model_config = ConfigDict(from_attributes=True)

