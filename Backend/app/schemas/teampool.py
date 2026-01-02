"""
Schémas Pydantic pour TeamPool
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TeamPoolBase(BaseModel):
    """Schéma de base pour TeamPool"""
    pool_id: int = Field(..., description="ID de la poule")
    team_id: int = Field(..., description="ID de l'équipe")
    position: Optional[int] = Field(None, description="Classement dans la poule")
    points: int = Field(default=0, ge=0, description="Points")
    wins: int = Field(default=0, ge=0, description="Victoires")
    losses: int = Field(default=0, ge=0, description="Défaites")
    draws: int = Field(default=0, ge=0, description="Matchs nuls")
    goals_for: int = Field(default=0, ge=0, description="Buts marqués")
    goals_against: int = Field(default=0, ge=0, description="Buts encaissés")
    goal_difference: int = Field(default=0, description="Différence de buts")


class TeamPoolCreate(TeamPoolBase):
    """Schéma pour créer un TeamPool"""
    pass


class TeamPoolUpdate(BaseModel):
    """Schéma pour mettre à jour un TeamPool"""
    position: Optional[int] = None
    points: Optional[int] = Field(None, ge=0)
    wins: Optional[int] = Field(None, ge=0)
    losses: Optional[int] = Field(None, ge=0)
    draws: Optional[int] = Field(None, ge=0)
    goals_for: Optional[int] = Field(None, ge=0)
    goals_against: Optional[int] = Field(None, ge=0)
    goal_difference: Optional[int] = None


class TeamPoolResponse(TeamPoolBase):
    """Schéma pour la réponse TeamPool"""
    id: int

    model_config = ConfigDict(from_attributes=True)

