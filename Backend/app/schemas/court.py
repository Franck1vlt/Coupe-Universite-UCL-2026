from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class CourtBase(BaseModel):
    name: str = Field(..., description="Nom du terrain")
    is_active: bool = Field(default=True, description="Terrain actif ou non")
    sports: Optional[List[int]] = Field(default=None, description="Liste des sport_ids associés")

class CourtCreate(CourtBase):
    pass

class CourtUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    sports: Optional[List[int]] = None  # Si fourni, remplace les associations existantes

class CourtResponse(CourtBase):
    id: int
    sports: List[int]  # Ids des sports associés
    model_config = ConfigDict(from_attributes=True)

class CourtWithSports(CourtResponse):
    """Schéma pour Court avec les sports associés"""
    sports: List["SportResponse"] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)