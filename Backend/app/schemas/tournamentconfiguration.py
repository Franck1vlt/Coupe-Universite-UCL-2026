"""
Schémas Pydantic pour TournamentConfiguration
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class TournamentConfigurationBase(BaseModel):
    """Schéma de base pour TournamentConfiguration"""
    points_for_win: int = Field(default=3, ge=0, description="Points pour une victoire")
    points_for_draw: int = Field(default=1, ge=0, description="Points pour un match nul")
    points_for_loss: int = Field(default=0, ge=0, description="Points pour une défaite")
    qualified_teams_per_pool: Optional[int] = Field(None, gt=0, description="Nombre d'équipes qualifiées par poule")
    tiebreaker_rules: Optional[Dict[str, Any]] = Field(None, description="Règles de départage au format JSON")


class TournamentConfigurationCreate(TournamentConfigurationBase):
    """Schéma pour créer un TournamentConfiguration"""
    tournament_id: int = Field(..., description="ID du tournoi")


class TournamentConfigurationUpdate(BaseModel):
    """Schéma pour mettre à jour un TournamentConfiguration"""
    points_for_win: Optional[int] = Field(None, ge=0)
    points_for_draw: Optional[int] = Field(None, ge=0)
    points_for_loss: Optional[int] = Field(None, ge=0)
    qualified_teams_per_pool: Optional[int] = Field(None, gt=0)
    tiebreaker_rules: Optional[Dict[str, Any]] = None


class TournamentConfigurationResponse(TournamentConfigurationBase):
    """Schéma pour la réponse TournamentConfiguration"""
    tournament_id: int

    model_config = ConfigDict(from_attributes=True)

