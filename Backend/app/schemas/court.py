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

from pydantic import field_validator

class CourtResponse(CourtBase):
    id: int
    sports: List[int]  # Ids des sports associés
    model_config = ConfigDict(from_attributes=True)
    
    @field_validator('sports', mode='before')
    @classmethod
    def extract_sport_ids(cls, v):
        """Convertit les objets Sport en IDs"""
        if not v:
            return []
        # Si c'est déjà une liste d'entiers, la retourner telle quelle
        if isinstance(v, list) and all(isinstance(i, int) for i in v):
            return v
        # Si c'est une liste d'objets Sport, extraire les IDs
        if isinstance(v, list):
            return [sport.id if hasattr(sport, 'id') else sport for sport in v]
        return v

class CourtWithSports(CourtResponse):
    """Schéma pour Court avec les sports associés"""
    sports: List["SportResponse"] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)