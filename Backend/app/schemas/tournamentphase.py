"""
Schémas Pydantic pour TournamentPhase
"""
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class TournamentPhaseBase(BaseModel):
    """Schéma de base pour TournamentPhase"""
    tournament_id: int = Field(..., description="ID du tournoi")
    phase_type: Literal["pools", "elimination", "final", "qualifications"] = Field(
        default="qualifications",
        description="Type de phase"
    )
    phase_order: int = Field(..., gt=0, description="Ordre d'exécution de la phase")


class TournamentPhaseCreate(TournamentPhaseBase):
    """Schéma pour créer un TournamentPhase"""
    pass


class TournamentPhaseUpdate(BaseModel):
    """Schéma pour mettre à jour un TournamentPhase"""
    phase_type: Optional[Literal["pools", "elimination", "final", "qualifications"]] = None
    phase_order: Optional[int] = Field(None, gt=0)


class TournamentPhaseResponse(TournamentPhaseBase):
    """Schéma pour la réponse TournamentPhase"""
    id: int

    model_config = ConfigDict(from_attributes=True)

