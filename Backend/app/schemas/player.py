"""
Schémas Pydantic pour Player
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PlayerBase(BaseModel):
    """Schéma de base pour Player"""
    team_sport_id: int = Field(..., description="ID de l'équipe-sport")
    first_name: Optional[str] = Field(None, max_length=50, description="Prénom")
    last_name: Optional[str] = Field(None, max_length=50, description="Nom de famille")
    jersey_number: Optional[int] = Field(None, description="Numéro de maillot")
    position: Optional[str] = Field(None, max_length=100, description="Position")
    is_captain: bool = Field(default=False, description="Capitaine")
    is_active: bool = Field(default=True, description="Joueur actif")


class PlayerCreate(PlayerBase):
    """Schéma pour créer un Player"""
    pass


class PlayerUpdate(BaseModel):
    """Schéma pour mettre à jour un Player"""
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    jersey_number: Optional[int] = None
    position: Optional[str] = Field(None, max_length=100)
    is_captain: Optional[bool] = None
    is_active: Optional[bool] = None


class PlayerResponse(PlayerBase):
    """Schéma pour la réponse Player"""
    id: int

    model_config = ConfigDict(from_attributes=True)

