"""
Routes pour la gestion complète des tournois avec toutes leurs structures
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Path, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db import get_db
from app.models.tournament import Tournament
from app.models.tournamentphase import TournamentPhase
from app.models.pool import Pool
from app.models.match import Match
from app.models.teampool import TeamPool
from app.exceptions import create_success_response, NotFoundError

router = APIRouter()

# Schémas pour la structure complète du tournoi

class TournamentMatchCreate(BaseModel):
    """Match à créer dans le tournoi"""
    match_type: str = "qualification"
    bracket_type: Optional[str] = None
    team_sport_a_id: Optional[int] = None
    team_sport_b_id: Optional[int] = None
    team_a_source: Optional[str] = None
    team_b_source: Optional[str] = None
    winner_destination_match_id: Optional[int] = None
    loser_destination_match_id: Optional[int] = None
    label: Optional[str] = None
    match_order: Optional[int] = None
    status: str = "upcoming"

class TournamentPoolCreate(BaseModel):
    """Poule à créer dans le tournoi"""
    name: str
    display_order: int
    qualified_to_finals: int = 2
    qualified_to_loser_bracket: int = 0
    teams: List[int] = []  # IDs des team_sports
    matches: List[TournamentMatchCreate] = []

class TournamentBracketCreate(BaseModel):
    """Bracket à créer (quarts, demis, finale, etc.)"""
    name: str
    enabled_rounds: List[str] = []  # ["quarterfinal", "semifinal", "final", "third_place"]
    teams: List[int] = []  # IDs des team_sports pour le premier tour
    matches: List[TournamentMatchCreate] = []

class TournamentStructureCreate(BaseModel):
    """Structure complète d'un tournoi (sans tournament_id, il vient du path)"""
    qualification_matches: List[TournamentMatchCreate] = []
    pools: List[TournamentPoolCreate] = []
    brackets: List[TournamentBracketCreate] = []
    loser_brackets: List[TournamentBracketCreate] = []

class TournamentMatchResponse(BaseModel):
    """Réponse pour un match"""
    id: int
    match_type: str
    bracket_type: Optional[str]
    team_sport_a_id: Optional[int]
    team_sport_b_id: Optional[int]
    team_a_source: Optional[str]
    team_b_source: Optional[str]
    label: Optional[str]
    match_order: Optional[int]
    score_a: Optional[int]
    score_b: Optional[int]
    status: str
    
    class Config:
        from_attributes = True

class TournamentPoolResponse(BaseModel):
    """Réponse pour une poule"""
    id: int
    name: str
    display_order: int
    qualified_to_finals: int
    qualified_to_loser_bracket: int
    teams: List[int] = []
    matches: List[TournamentMatchResponse] = []
    
    class Config:
        from_attributes = True

class TournamentStructureResponse(BaseModel):
    """Réponse avec la structure complète"""
    tournament_id: int
    qualification_matches: List[TournamentMatchResponse] = []
    pools: List[TournamentPoolResponse] = []
    bracket_matches: List[TournamentMatchResponse] = []
    loser_bracket_matches: List[TournamentMatchResponse] = []


@router.post("/tournaments/{tournament_id}/structure", status_code=status.HTTP_201_CREATED)
def create_tournament_structure(
    tournament_id: int = Path(...),
    structure: TournamentStructureCreate = Body(...),
    db: Session = Depends(get_db)
):
    """
    Créer ou remplacer complètement la structure d'un tournoi
    (qualifications, poules, brackets, loser brackets)
    """
    # Vérifier que le tournoi existe
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament {tournament_id} not found")
    
    # Créer ou récupérer la phase principale
    phase = db.query(TournamentPhase).filter(
        TournamentPhase.tournament_id == tournament_id,
        TournamentPhase.phase_type == "qualifications"
    ).first()
    
    if not phase:
        phase = TournamentPhase(
            tournament_id=tournament_id,
            phase_type="qualifications",
            phase_order=1
        )
        db.add(phase)
        db.flush()
    
    created_matches = []
    created_pools = []
    
    # Créer les matchs de qualification
    for match_data in structure.qualification_matches:
        match = Match(
            phase_id=phase.id,
            match_type=match_data.match_type,
            bracket_type=match_data.bracket_type,
            team_sport_a_id=match_data.team_sport_a_id,
            team_sport_b_id=match_data.team_sport_b_id,
            team_a_source=match_data.team_a_source,
            team_b_source=match_data.team_b_source,
            label=match_data.label,
            match_order=match_data.match_order,
            status=match_data.status,
            created_by_user_id=1,  # TODO: utiliser l'utilisateur authentifié
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(match)
        db.flush()
        created_matches.append(match)
    
    # Créer les poules
    for pool_data in structure.pools:
        pool = Pool(
            phase_id=phase.id,
            name=pool_data.name,
            order=pool_data.display_order,
            qualified_to_finals=pool_data.qualified_to_finals,
            qualified_to_loser_bracket=pool_data.qualified_to_loser_bracket
        )
        db.add(pool)
        db.flush()
        
        # Ajouter les équipes à la poule
        for team_sport_id in pool_data.teams:
            team_pool = TeamPool(
                pool_id=pool.id,
                team_sport_id=team_sport_id
            )
            db.add(team_pool)
        
        # Créer les matchs de la poule
        for match_data in pool_data.matches:
            match = Match(
                phase_id=phase.id,
                pool_id=pool.id,
                match_type="pool",
                team_sport_a_id=match_data.team_sport_a_id,
                team_sport_b_id=match_data.team_sport_b_id,
                label=match_data.label,
                match_order=match_data.match_order,
                status=match_data.status,
                created_by_user_id=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(match)
            db.flush()
        
        created_pools.append(pool)
    
    # Créer les matchs de bracket (phase finale)
    for bracket in structure.brackets:
        for match_data in bracket.matches:
            match = Match(
                phase_id=phase.id,
                match_type="bracket",
                bracket_type=match_data.bracket_type,
                team_sport_a_id=match_data.team_sport_a_id,
                team_sport_b_id=match_data.team_sport_b_id,
                team_a_source=match_data.team_a_source,
                team_b_source=match_data.team_b_source,
                label=match_data.label,
                match_order=match_data.match_order,
                status=match_data.status,
                created_by_user_id=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(match)
            db.flush()
            created_matches.append(match)
    
    # Créer les matchs de loser bracket
    for loser_bracket in structure.loser_brackets:
        for match_data in loser_bracket.matches:
            match = Match(
                phase_id=phase.id,
                match_type="loser_bracket",
                bracket_type=match_data.bracket_type,
                team_sport_a_id=match_data.team_sport_a_id,
                team_sport_b_id=match_data.team_sport_b_id,
                team_a_source=match_data.team_a_source,
                team_b_source=match_data.team_b_source,
                label=match_data.label,
                match_order=match_data.match_order,
                status=match_data.status,
                created_by_user_id=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(match)
            db.flush()
            created_matches.append(match)
    
    db.commit()
    
    return create_success_response(
        {
            "tournament_id": tournament_id,
            "matches_created": len(created_matches),
            "pools_created": len(created_pools)
        },
        message="Tournament structure created successfully"
    )


@router.get("/tournaments/{tournament_id}/structure")
def get_tournament_structure(
    tournament_id: int = Path(..., description="ID du tournoi"),
    db: Session = Depends(get_db)
):
    """
    Récupérer la structure complète d'un tournoi
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament {tournament_id} not found")
    
    # Récupérer la phase principale
    phase = db.query(TournamentPhase).filter(
        TournamentPhase.tournament_id == tournament_id
    ).first()
    
    if not phase:
        return create_success_response({
            "tournament_id": tournament_id,
            "qualification_matches": [],
            "pools": [],
            "bracket_matches": [],
            "loser_bracket_matches": []
        })
    
    # Récupérer tous les matchs
    all_matches = db.query(Match).filter(Match.phase_id == phase.id).all()
    
    qualification_matches = [m for m in all_matches if m.match_type == "qualification"]
    bracket_matches = [m for m in all_matches if m.match_type == "bracket"]
    loser_bracket_matches = [m for m in all_matches if m.match_type == "loser_bracket"]
    
    # Récupérer les poules avec leurs matchs
    pools = db.query(Pool).filter(Pool.phase_id == phase.id).all()
    pools_data = []
    
    for pool in pools:
        pool_matches = [m for m in all_matches if m.pool_id == pool.id]
        team_pools = db.query(TeamPool).filter(TeamPool.pool_id == pool.id).all()
        team_ids = [tp.team_sport_id for tp in team_pools]
        
        pools_data.append({
            "id": pool.id,
            "name": pool.name,
            "display_order": pool.order,
            "qualified_to_finals": pool.qualified_to_finals,
            "qualified_to_loser_bracket": pool.qualified_to_loser_bracket,
            "teams": team_ids,
            "matches": [
                {
                    "id": m.id,
                    "match_type": m.match_type,
                    "bracket_type": m.bracket_type,
                    "team_sport_a_id": m.team_sport_a_id,
                    "team_sport_b_id": m.team_sport_b_id,
                    "team_a_source": m.team_a_source,
                    "team_b_source": m.team_b_source,
                    "label": m.label,
                    "match_order": m.match_order,
                    "score_a": m.score_a,
                    "score_b": m.score_b,
                    "status": m.status
                }
                for m in pool_matches
            ]
        })
    
    def match_to_dict(m):
        return {
            "id": m.id,
            "match_type": m.match_type,
            "bracket_type": m.bracket_type,
            "team_sport_a_id": m.team_sport_a_id,
            "team_sport_b_id": m.team_sport_b_id,
            "team_a_source": m.team_a_source,
            "team_b_source": m.team_b_source,
            "label": m.label,
            "match_order": m.match_order,
            "score_a": m.score_a,
            "score_b": m.score_b,
            "status": m.status
        }
    
    return create_success_response({
        "tournament_id": tournament_id,
        "qualification_matches": [match_to_dict(m) for m in qualification_matches],
        "pools": pools_data,
        "bracket_matches": [match_to_dict(m) for m in bracket_matches],
        "loser_bracket_matches": [match_to_dict(m) for m in loser_bracket_matches]
    })


@router.post("/tournaments/{tournament_id}/reset-matches")
def reset_tournament_matches(
    tournament_id: int = Path(..., description="ID du tournoi"),
    db: Session = Depends(get_db)
):
    """
    Réinitialiser tous les statuts et scores des matchs d'un tournoi
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament {tournament_id} not found")
    
    reset_count = 0
    
    # Récupérer la phase
    phase = db.query(TournamentPhase).filter(
        TournamentPhase.tournament_id == tournament_id
    ).first()
    
    if phase:
        # Réinitialiser tous les matchs
        matches = db.query(Match).filter(Match.phase_id == phase.id).all()
        for match in matches:
            match.status = "upcoming"
            match.score_a = None
            match.score_b = None
        
        reset_count = len(matches)
        db.commit()
    
    return create_success_response(
        {
            "tournament_id": tournament_id,
            "reset_matches": reset_count
        },
        message="Tournament matches reset successfully"
    )


@router.post("/tournaments/{tournament_id}/propagate-results")
def propagate_tournament_results(
    tournament_id: int = Path(..., description="ID du tournoi"),
    db: Session = Depends(get_db)
):
    """
    Propager automatiquement les résultats des matchs terminés vers les matchs suivants.
    Remplace les codes sources (WQ1, P1-1, etc.) par les vrais team_sport_id des gagnants.
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament {tournament_id} not found")
    
    # Récupérer la phase
    phase = db.query(TournamentPhase).filter(
        TournamentPhase.tournament_id == tournament_id
    ).first()
    
    if not phase:
        return create_success_response({
            "tournament_id": tournament_id,
            "propagated_matches": 0
        }, message="No phase found")
    
    # Récupérer tous les matchs
    all_matches = db.query(Match).filter(Match.phase_id == phase.id).all()
    
    # Créer un mapping des matchs par ID et par label
    matches_by_id = {m.id: m for m in all_matches}
    matches_by_label = {m.label: m for m in all_matches if m.label}
    
    # Créer un mapping des poules
    pools = db.query(Pool).filter(Pool.phase_id == phase.id).all()
    pools_by_name = {p.name: p for p in pools}
    
    propagated_count = 0
    
    # Fonction pour résoudre un code source en team_sport_id
    def resolve_source_code(source_code: str) -> Optional[int]:
        if not source_code:
            return None
        
        # Codes de type "WQ1" = Winner of Qualification 1
        if source_code.startswith("WQ"):
            # Extraire le numéro du match
            try:
                match_num = int(source_code[2:])
                # Chercher le match de qualification correspondant
                qual_match = next((m for m in all_matches 
                                  if m.match_type == "qualification" 
                                  and m.match_order == match_num
                                  and m.status == "completed"), None)
                if qual_match and qual_match.score_a is not None and qual_match.score_b is not None:
                    return qual_match.team_sport_a_id if qual_match.score_a > qual_match.score_b else qual_match.team_sport_b_id
            except (ValueError, IndexError):
                pass
        
        # Codes de type "LQ1" = Loser of Qualification 1
        elif source_code.startswith("LQ"):
            try:
                match_num = int(source_code[2:])
                qual_match = next((m for m in all_matches 
                                  if m.match_type == "qualification" 
                                  and m.match_order == match_num
                                  and m.status == "completed"), None)
                if qual_match and qual_match.score_a is not None and qual_match.score_b is not None:
                    return qual_match.team_sport_b_id if qual_match.score_a > qual_match.score_b else qual_match.team_sport_a_id
            except (ValueError, IndexError):
                pass
        
        # Codes de type "WQF1" = Winner of Quarterfinal 1
        elif source_code.startswith("WQF"):
            try:
                match_num = int(source_code[3:])
                qf_match = next((m for m in all_matches 
                               if m.bracket_type == "quarterfinal" 
                               and m.match_order == match_num
                               and m.status == "completed"), None)
                if qf_match and qf_match.score_a is not None and qf_match.score_b is not None:
                    return qf_match.team_sport_a_id if qf_match.score_a > qf_match.score_b else qf_match.team_sport_b_id
            except (ValueError, IndexError):
                pass
        
        # Codes de type "WSF1" = Winner of Semifinal 1
        elif source_code.startswith("WSF"):
            try:
                match_num = int(source_code[3:])
                sf_match = next((m for m in all_matches 
                               if m.bracket_type == "semifinal" 
                               and m.match_order == match_num
                               and m.status == "completed"), None)
                if sf_match and sf_match.score_a is not None and sf_match.score_b is not None:
                    return sf_match.team_sport_a_id if sf_match.score_a > sf_match.score_b else sf_match.team_sport_b_id
            except (ValueError, IndexError):
                pass
        
        # Codes de type "LSF1" = Loser of Semifinal 1
        elif source_code.startswith("LSF"):
            try:
                match_num = int(source_code[3:])
                sf_match = next((m for m in all_matches 
                               if m.bracket_type == "semifinal" 
                               and m.match_order == match_num
                               and m.status == "completed"), None)
                if sf_match and sf_match.score_a is not None and sf_match.score_b is not None:
                    return sf_match.team_sport_b_id if sf_match.score_a > sf_match.score_b else sf_match.team_sport_a_id
            except (ValueError, IndexError):
                pass
        
        # Codes de type "P1-1" = Poule 1, position 1
        elif source_code.startswith("P") and "-" in source_code:
            try:
                parts = source_code[1:].split("-")
                pool_num = int(parts[0])
                position = int(parts[1])
                
                # Chercher la poule correspondante
                pool_name = f"Poule {pool_num}"
                pool = pools_by_name.get(pool_name)
                
                if pool:
                    # Calculer le classement de la poule
                    pool_matches = [m for m in all_matches if m.pool_id == pool.id and m.status == "completed"]
                    team_pools = db.query(TeamPool).filter(TeamPool.pool_id == pool.id).all()
                    
                    # Calculer les points de chaque équipe
                    team_points = {}
                    for tp in team_pools:
                        team_id = tp.team_sport_id
                        points = 0
                        goal_diff = 0
                        
                        for match in pool_matches:
                            if match.team_sport_a_id == team_id:
                                if match.score_a > match.score_b:
                                    points += 3
                                elif match.score_a == match.score_b:
                                    points += 1
                                goal_diff += (match.score_a - match.score_b)
                            elif match.team_sport_b_id == team_id:
                                if match.score_b > match.score_a:
                                    points += 3
                                elif match.score_a == match.score_b:
                                    points += 1
                                goal_diff += (match.score_b - match.score_a)
                        
                        team_points[team_id] = (points, goal_diff)
                    
                    # Trier par points puis par différence de buts
                    sorted_teams = sorted(team_points.items(), key=lambda x: (x[1][0], x[1][1]), reverse=True)
                    
                    if position <= len(sorted_teams):
                        return sorted_teams[position - 1][0]
            except (ValueError, IndexError):
                pass
        
        return None
    
    # Parcourir tous les matchs et propager les résultats
    for match in all_matches:
        updated = False
        
        # Résoudre team_a_source
        if match.team_a_source and not match.team_sport_a_id:
            resolved_team_a = resolve_source_code(match.team_a_source)
            if resolved_team_a:
                match.team_sport_a_id = resolved_team_a
                updated = True
        
        # Résoudre team_b_source
        if match.team_b_source and not match.team_sport_b_id:
            resolved_team_b = resolve_source_code(match.team_b_source)
            if resolved_team_b:
                match.team_sport_b_id = resolved_team_b
                updated = True
        
        if updated:
            match.updated_at = datetime.utcnow()
            propagated_count += 1
    
    db.commit()
    
    return create_success_response({
        "tournament_id": tournament_id,
        "propagated_matches": propagated_count
    }, message=f"Successfully propagated {propagated_count} match results")


@router.delete("/tournaments/{tournament_id}/structure")
def delete_tournament_structure(
    tournament_id: int = Path(..., description="ID du tournoi"),
    db: Session = Depends(get_db)
):
    """
    Supprimer toute la structure d'un tournoi (matchs, poules, etc.)
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament {tournament_id} not found")
    
    # Récupérer la phase
    phase = db.query(TournamentPhase).filter(
        TournamentPhase.tournament_id == tournament_id
    ).first()
    
    if phase:
        # Supprimer tous les matchs
        db.query(Match).filter(Match.phase_id == phase.id).delete()
        
        # Supprimer toutes les poules (et leurs team_pools via cascade)
        db.query(Pool).filter(Pool.phase_id == phase.id).delete()
        
        # Supprimer la phase
        db.delete(phase)
        
        db.commit()
    
    return create_success_response(
        {"tournament_id": tournament_id},
        message="Tournament structure deleted successfully"
    )
