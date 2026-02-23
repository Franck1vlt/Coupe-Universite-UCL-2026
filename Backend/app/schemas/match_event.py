"""
Schémas Pydantic pour MatchEvent (événements de match : buts, etc.)
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PlayerInfo(BaseModel):
    """Informations minimales du joueur dans la réponse d'un événement"""
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    jersey_number: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class MatchEventCreate(BaseModel):
    """Schéma pour enregistrer un événement (but)"""
    team: str = Field(..., description="Équipe qui marque : 'A' ou 'B'")
    player_id: Optional[int] = Field(None, description="ID du joueur buteur (nullable si non attribué)")
    match_time_seconds: Optional[int] = Field(None, ge=0, description="Temps du chrono en secondes")


class MatchEventResponse(BaseModel):
    """Réponse complète d'un événement de match"""
    id: int
    match_id: int
    event_type: str
    team: str
    player_id: Optional[int] = None
    match_time_seconds: Optional[int] = None
    created_at: datetime
    player: Optional[PlayerInfo] = None

    model_config = ConfigDict(from_attributes=True)
