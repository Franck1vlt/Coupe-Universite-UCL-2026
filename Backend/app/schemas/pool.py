"""
Schémas Pydantic pour Pool
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PoolBase(BaseModel):
    """Schéma de base pour Pool"""
    phase_id: int = Field(..., description="ID de la phase")
    name: str = Field(..., max_length=100, description="Nom de la poule (ex: Poule A)")
    display_order: int = Field(..., description="Ordre d'affichage")


class PoolCreate(PoolBase):
    """Schéma pour créer un Pool"""
    pass


class PoolUpdate(BaseModel):
    """Schéma pour mettre à jour un Pool"""
    name: Optional[str] = Field(None, max_length=100)
    display_order: Optional[int] = None


class PoolResponse(PoolBase):
    """Schéma pour la réponse Pool"""
    id: int

    model_config = ConfigDict(from_attributes=True)