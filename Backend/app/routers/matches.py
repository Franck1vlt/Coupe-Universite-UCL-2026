"""
Router Matches
- Fiche de match : gestion des joueurs (CRUD via modèle Player existant)
- Événements de match : enregistrement des buts avec buteur et chrono
"""
from typing import List
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db import get_db
from app.auth.permissions import require_admin_or_staff
from app.exceptions import (
    create_success_response,
    NotFoundError,
    BadRequestError,
    ConflictError,
)
from app.models.match import Match
from app.models.player import Player
from app.models.match_event import MatchEvent
from app.schemas.match_player import MatchPlayerCreate, MatchPlayerUpdate, MatchPlayerResponse
from app.schemas.match_event import MatchEventCreate, MatchEventResponse

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_match_or_404(match_id: int, db: Session) -> Match:
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise NotFoundError(f"Match {match_id} introuvable")
    return match


def _team_slot(match: Match, player: Player) -> str:
    """Retourne 'A' ou 'B' selon l'équipe du joueur dans ce match"""
    if player.team_sport_id == match.team_sport_a_id:
        return "A"
    if player.team_sport_id == match.team_sport_b_id:
        return "B"
    return "?"


def _player_to_response(player: Player, team: str) -> dict:
    return MatchPlayerResponse(
        id=player.id,
        team_sport_id=player.team_sport_id,
        team=team,
        first_name=player.first_name,
        last_name=player.last_name,
        jersey_number=player.jersey_number,
        position=player.position,
        is_captain=player.is_captain,
        is_active=player.is_active,
    ).model_dump()


# ─────────────────────────────────────────────────────────────────────────────
# Fiche de match : joueurs
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/matches/{match_id}/players", tags=["Match Players"])
def get_match_players(match_id: int, db: Session = Depends(get_db)):
    """Retourne les joueurs actifs des deux équipes du match"""
    match = _get_match_or_404(match_id, db)

    team_sport_ids = [
        ts_id for ts_id in [match.team_sport_a_id, match.team_sport_b_id]
        if ts_id is not None
    ]

    players = (
        db.query(Player)
        .filter(Player.team_sport_id.in_(team_sport_ids), Player.is_active == True)
        .order_by(Player.team_sport_id, Player.jersey_number)
        .all()
    )

    return create_success_response(
        data=[_player_to_response(p, _team_slot(match, p)) for p in players],
        message="Joueurs du match récupérés",
    )


@router.post(
    "/matches/{match_id}/players",
    tags=["Match Players"],
    dependencies=[Depends(require_admin_or_staff)],
)
async def add_match_player(
    match_id: int,
    payload: MatchPlayerCreate = Body(...),
    db: Session = Depends(get_db),
):
    """Ajoute un joueur à l'équipe A ou B du match"""
    match = _get_match_or_404(match_id, db)

    team_sport_id = (
        match.team_sport_a_id if payload.team == "A" else match.team_sport_b_id
    )
    if not team_sport_id:
        raise BadRequestError(
            f"L'équipe {payload.team} n'est pas encore assignée à ce match"
        )

    player = Player(
        team_sport_id=team_sport_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        jersey_number=payload.jersey_number,
        position=payload.position,
        is_captain=payload.is_captain,
        is_active=True,
    )
    db.add(player)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(
            f"Un joueur avec le numéro {payload.jersey_number} existe déjà dans cette équipe"
        )
    db.refresh(player)

    return create_success_response(
        data=_player_to_response(player, payload.team),
        message="Joueur ajouté avec succès",
    )


@router.put(
    "/matches/{match_id}/players/{player_id}",
    tags=["Match Players"],
    dependencies=[Depends(require_admin_or_staff)],
)
async def update_match_player(
    match_id: int,
    player_id: int,
    payload: MatchPlayerUpdate = Body(...),
    db: Session = Depends(get_db),
):
    """Met à jour un joueur de la fiche de match"""
    match = _get_match_or_404(match_id, db)

    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise NotFoundError(f"Joueur {player_id} introuvable")
    if player.team_sport_id not in [match.team_sport_a_id, match.team_sport_b_id]:
        raise BadRequestError("Ce joueur n'appartient pas à ce match")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(player, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(
            f"Un joueur avec le numéro {payload.jersey_number} existe déjà dans cette équipe"
        )
    db.refresh(player)

    return create_success_response(
        data=_player_to_response(player, _team_slot(match, player)),
        message="Joueur mis à jour",
    )


@router.delete(
    "/matches/{match_id}/players/{player_id}",
    tags=["Match Players"],
    dependencies=[Depends(require_admin_or_staff)],
)
async def delete_match_player(
    match_id: int,
    player_id: int,
    db: Session = Depends(get_db),
):
    """Supprime un joueur de la fiche de match"""
    match = _get_match_or_404(match_id, db)

    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise NotFoundError(f"Joueur {player_id} introuvable")
    if player.team_sport_id not in [match.team_sport_a_id, match.team_sport_b_id]:
        raise BadRequestError("Ce joueur n'appartient pas à ce match")

    db.delete(player)
    db.commit()

    return create_success_response(data=None, message="Joueur supprimé")


# ─────────────────────────────────────────────────────────────────────────────
# Événements de match (buts)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/matches/{match_id}/events", tags=["Match Events"])
def get_match_events(match_id: int, db: Session = Depends(get_db)):
    """Retourne tous les événements d'un match, triés par chrono"""
    _get_match_or_404(match_id, db)

    events = (
        db.query(MatchEvent)
        .filter(MatchEvent.match_id == match_id)
        .order_by(MatchEvent.match_time_seconds, MatchEvent.created_at)
        .all()
    )

    return create_success_response(
        data=[
            MatchEventResponse.model_validate(e).model_dump(mode="json")
            for e in events
        ],
        message="Événements du match récupérés",
    )


@router.post(
    "/matches/{match_id}/events",
    tags=["Match Events"],
    dependencies=[Depends(require_admin_or_staff)],
)
async def create_match_event(
    match_id: int,
    payload: MatchEventCreate = Body(...),
    db: Session = Depends(get_db),
):
    """
    Enregistre un but et incrémente automatiquement le score en base.
    Le chrono et le buteur sont optionnels.
    """
    if payload.team not in ("A", "B"):
        raise BadRequestError("L'équipe doit être 'A' ou 'B'")

    match = _get_match_or_404(match_id, db)

    # Vérifier que le joueur appartient bien à l'équipe indiquée
    if payload.player_id is not None:
        player = db.query(Player).filter(Player.id == payload.player_id).first()
        if not player:
            raise NotFoundError(f"Joueur {payload.player_id} introuvable")
        expected_ts_id = (
            match.team_sport_a_id if payload.team == "A" else match.team_sport_b_id
        )
        if player.team_sport_id != expected_ts_id:
            raise BadRequestError("Ce joueur n'appartient pas à l'équipe indiquée")

    # Créer l'événement
    event = MatchEvent(
        match_id=match_id,
        event_type="goal",
        team=payload.team,
        player_id=payload.player_id,
        match_time_seconds=payload.match_time_seconds,
    )
    db.add(event)

    # Incrémenter le score dans Match
    if payload.team == "A":
        match.score_a = (match.score_a or 0) + 1
    else:
        match.score_b = (match.score_b or 0) + 1

    db.commit()
    db.refresh(event)

    return create_success_response(
        data=MatchEventResponse.model_validate(event).model_dump(mode="json"),
        message="But enregistré",
    )


@router.delete(
    "/matches/{match_id}/events/{event_id}",
    tags=["Match Events"],
    dependencies=[Depends(require_admin_or_staff)],
)
async def delete_match_event(
    match_id: int,
    event_id: int,
    db: Session = Depends(get_db),
):
    """Supprime un événement (annule un but) et décrémente le score correspondant"""
    match = _get_match_or_404(match_id, db)

    event = (
        db.query(MatchEvent)
        .filter(MatchEvent.id == event_id, MatchEvent.match_id == match_id)
        .first()
    )
    if not event:
        raise NotFoundError(f"Événement {event_id} introuvable dans le match {match_id}")

    # Décrémenter le score (jamais en dessous de 0)
    if event.team == "A":
        match.score_a = max(0, (match.score_a or 0) - 1)
    else:
        match.score_b = max(0, (match.score_b or 0) - 1)

    db.delete(event)
    db.commit()

    return create_success_response(data=None, message="Événement supprimé")


@router.post(
    "/matches/{match_id}/events/batch",
    tags=["Match Events"],
    dependencies=[Depends(require_admin_or_staff)],
)
async def create_match_events_batch(
    match_id: int,
    payload: List[MatchEventCreate] = Body(...),
    db: Session = Depends(get_db),
):
    """
    Enregistre plusieurs événements en lot à la fin d'un match (via END).
    Ne modifie PAS les scores : ceux-ci sont soumis séparément par submitMatchResult.
    Si la liste est vide, retourne un succès sans rien créer.
    """
    _get_match_or_404(match_id, db)

    created = []
    for event_data in payload:
        if event_data.team not in ("A", "B"):
            continue
        event = MatchEvent(
            match_id=match_id,
            event_type="goal",
            team=event_data.team,
            player_id=event_data.player_id,
            match_time_seconds=event_data.match_time_seconds,
        )
        db.add(event)
        created.append(event)

    if created:
        db.commit()
        for event in created:
            db.refresh(event)

    return create_success_response(
        data=[MatchEventResponse.model_validate(e).model_dump(mode="json") for e in created],
        message=f"{len(created)} événement(s) enregistré(s)",
    )
