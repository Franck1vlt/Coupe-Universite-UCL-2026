from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class CourtBase(BaseModel):
    name: str = Field(..., description="Nom du terrain")
    sport_id: Optional[int] = Field(None, description="ID du sport principal associé (optionnel)")
    is_active: bool = Field(default=True, description="Terrain actif ou non")

class CourtCreate(CourtBase):
    pass

class CourtUpdate(BaseModel):
    name: Optional[str] = None
    sport_id: Optional[int] = None
    is_active: Optional[bool] = None

class CourtResponse(CourtBase):
    id: int
    model_config = ConfigDict(from_attributes=True)