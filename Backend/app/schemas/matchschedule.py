"""
Schémas Pydantic pour MatchSchedule
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class MatchScheduleBase(BaseModel):
    """Schéma de base pour MatchSchedule"""
    match_id: int = Field(..., description="ID du match")
    court_id: Optional[int] = Field(None, description="ID du terrain")
    scheduled_datetime: Optional[datetime] = Field(None, description="Date et heure prévues")
    actual_start_datetime: Optional[datetime] = Field(None, description="Heure de début réelle")
    actual_end_datetime: Optional[datetime] = Field(None, description="Heure de fin réelle")
    estimated_duration_minutes: Optional[int] = Field(None, gt=0, description="Durée estimée (minutes)")


class MatchScheduleCreate(MatchScheduleBase):
    """Schéma pour créer un MatchSchedule"""
    pass


class MatchScheduleUpdate(BaseModel):
    """Schéma pour mettre à jour un MatchSchedule"""
    court_id: Optional[int] = None
    scheduled_datetime: Optional[datetime] = None
    actual_start_datetime: Optional[datetime] = None
    actual_end_datetime: Optional[datetime] = None
    estimated_duration_minutes: Optional[int] = Field(None, gt=0)


class MatchScheduleResponse(MatchScheduleBase):
    """Schéma pour la réponse MatchSchedule"""

    model_config = ConfigDict(from_attributes=True)

