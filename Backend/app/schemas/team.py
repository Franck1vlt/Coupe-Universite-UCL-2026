"""
Schémas Pydantic pour Team
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class TeamBase(BaseModel):
    """Schéma de base pour Team"""
    name: str = Field(..., max_length=100, description="Nom de l'équipe")
    logo_url: Optional[str] = Field(None, max_length=200, description="URL du logo")
    primary_color: Optional[str] = Field(None, max_length=10, description="Couleur principale en hex (#RRGGBB)")


class TeamCreate(TeamBase):
    """Schéma pour créer un Team"""
    pass


class TeamUpdate(BaseModel):
    """Schéma pour mettre à jour un Team"""
    name: Optional[str] = Field(None, max_length=100)
    logo_url: Optional[str] = Field(None, max_length=200)
    primary_color: Optional[str] = Field(None, max_length=10)


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    logo_url: str | None
    primary_color: str
    created_at: datetime  # Sera automatiquement converti en string avec mode='json'

