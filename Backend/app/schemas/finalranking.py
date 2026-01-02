"""
Schémas Pydantic pour FinalRanking
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class FinalRankingBase(BaseModel):
    """Schéma de base pour FinalRanking"""
    team_id: int = Field(..., description="ID de l'équipe")
    total_points: int = Field(default=0, ge=0, description="Total des points de tous les tournois")
    total_position: Optional[int] = Field(None, gt=0, description="Position finale dans le classement général")
    tournaments_participated: int = Field(default=0, ge=0, description="Nombre de tournois auxquels l'équipe a participé")
    tournaments_won: int = Field(default=0, ge=0, description="Nombre de tournois gagnés")
    tournaments_second: int = Field(default=0, ge=0, description="Nombre de fois deuxième")
    tournaments_third: int = Field(default=0, ge=0, description="Nombre de fois troisième")


class FinalRankingCreate(FinalRankingBase):
    """Schéma pour créer un FinalRanking"""
    pass


class FinalRankingUpdate(BaseModel):
    """Schéma pour mettre à jour un FinalRanking"""
    total_points: Optional[int] = Field(None, ge=0)
    total_position: Optional[int] = Field(None, gt=0)
    tournaments_participated: Optional[int] = Field(None, ge=0)
    tournaments_won: Optional[int] = Field(None, ge=0)
    tournaments_second: Optional[int] = Field(None, ge=0)
    tournaments_third: Optional[int] = Field(None, ge=0)


class FinalRankingResponse(FinalRankingBase):
    """Schéma pour la réponse FinalRanking"""
    id: int

    model_config = ConfigDict(from_attributes=True)

