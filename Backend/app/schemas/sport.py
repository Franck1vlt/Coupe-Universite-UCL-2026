"""
Schémas Pydantic pour Sport
"""
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

class SportBase(BaseModel):
    """Schéma de base pour Sport"""
    name: str = Field(..., max_length=100, description="Nom du sport")
    score_type: Literal["points", "goals", "sets"] = Field(
        default="points",
        description="Type de score : points, goals (buts), ou sets"
    )


class SportCreate(SportBase):
    """Schéma pour créer un Sport"""
    pass


class SportUpdate(BaseModel):
    """Schéma pour mettre à jour un Sport"""
    name: Optional[str] = Field(None, max_length=100)
    score_type: Optional[Literal["points", "goals", "sets"]] = None


class SportResponse(SportBase):
    """Schéma pour la réponse Sport"""
    id: int

    model_config = ConfigDict(from_attributes=True)

