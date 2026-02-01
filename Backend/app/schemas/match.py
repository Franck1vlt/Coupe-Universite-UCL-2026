"""
Schémas Pydantic pour Match
"""
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class MatchBase(BaseModel):
    """Schéma de base pour Match"""
    phase_id: int = Field(..., description="ID de la phase")
    pool_id: Optional[int] = Field(None, description="ID de la poule (si match de poule)")
    match_type: Literal["qualification", "pool", "bracket", "loser_bracket"] = Field(
        default="qualification",
        description="Type de match"
    )
    bracket_type: Optional[Literal["quarterfinal", "semifinal", "final", "third_place", "loser_round_1", "loser_round_2", "loser_round_3", "loser_final"]] = Field(
        None,
        description="Type de bracket (si applicable)"
    )
    team_sport_a_id: Optional[int] = Field(None, description="ID de l'équipe A")
    team_sport_b_id: Optional[int] = Field(None, description="ID de l'équipe B")
    team_a_source: Optional[str] = Field(None, description="Source de l'équipe A (ex: WQ1)")
    team_b_source: Optional[str] = Field(None, description="Source de l'équipe B")
    winner_destination_match_id: Optional[int] = Field(None, description="Match de destination du vainqueur")
    loser_destination_match_id: Optional[int] = Field(None, description="Match de destination du perdant")
    label: Optional[str] = Field(None, description="Label du match")
    match_order: Optional[int] = Field(None, description="Ordre d'affichage")
    score_a: Optional[int] = Field(None, description="Score de l'équipe A")
    score_b: Optional[int] = Field(None, description="Score de l'équipe B")
    status: Literal["upcoming", "in_progress", "completed", "cancelled"] = Field(
        default="upcoming",
        description="Statut du match"
    )
    referee_user_id: Optional[int] = Field(None, description="ID de l'arbitre")
    comment: Optional[str] = Field(None, description="Commentaire")
    court: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None



class MatchCreate(MatchBase):
    """Schéma pour créer un Match"""
    created_by_user_id: int = Field(..., description="ID de l'utilisateur créateur")
    court_id: Optional[int] = Field(None, description="ID du terrain pour la planification automatique")
    scheduled_datetime: Optional[str] = Field(None, description="Date/heure prévue pour la planification automatique (ISO format)")


class MatchUpdate(BaseModel):
    """Schéma pour mettre à jour un Match"""
    phase_id: Optional[int] = None
    pool_id: Optional[int] = None
    match_type: Optional[Literal["qualification", "pool", "bracket", "loser_bracket"]] = None
    bracket_type: Optional[Literal["quarterfinal", "semifinal", "final", "third_place", "loser_round_1", "loser_round_2", "loser_round_3", "loser_final"]] = None
    team_sport_a_id: Optional[int] = None
    team_sport_b_id: Optional[int] = None
    team_a_source: Optional[str] = None
    team_b_source: Optional[str] = None
    winner_destination_match_id: Optional[int] = None
    loser_destination_match_id: Optional[int] = None
    label: Optional[str] = None
    match_order: Optional[int] = None
    score_a: Optional[int] = None
    score_b: Optional[int] = None
    status: Optional[Literal["upcoming", "in_progress", "completed", "cancelled"]] = None
    referee_user_id: Optional[int] = None
    updated_by_user_id: Optional[int] = Field(None, description="ID de l'utilisateur qui met à jour")
    comment: Optional[str] = None
    court: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None


class MatchResponse(MatchBase):
    """Schéma pour la réponse Match"""
    id: int
    tournament_id: int = Field(..., description="ID du tournoi")
    created_by_user_id: int
    updated_by_user_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

