"""
Service pour l'assignation automatique des équipes et terrains aux matchs lors de la configuration d'un tournoi
"""
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from app.models.team import Team
from app.models.teamsport import TeamSport
from app.models.court import Court


def find_team_sport_id_by_name(db: Session, team_name: str, sport_id: int) -> Optional[int]:
    """
    Trouve le team_sport_id correspondant à un nom d'équipe pour un sport donné
    
    Args:
        db: Session de base de données
        team_name: Nom de l'équipe à rechercher
        sport_id: ID du sport du tournoi
        
    Returns:
        team_sport_id si trouvé, None sinon
    """
    # Chercher d'abord l'équipe par son nom
    team = db.query(Team).filter(Team.name == team_name).first()
    if not team:
        return None
    
    # Trouver le TeamSport correspondant (l'association de cette équipe avec ce sport)
    team_sport = db.query(TeamSport).filter(
        TeamSport.team_id == team.id,
        TeamSport.sport_id == sport_id
    ).first()
    
    if team_sport:
        return team_sport.id
    
    return None


def find_court_id_by_name(db: Session, court_name: str, sport_id: int) -> Optional[int]:
    """
    Trouve le court_id correspondant à un nom de terrain pour un sport donné
    
    Args:
        db: Session de base de données
        court_name: Nom du terrain à rechercher
        sport_id: ID du sport du tournoi
        
    Returns:
        court_id si trouvé, None sinon
    """
    court = db.query(Court).filter(
        Court.name == court_name,
        Court.sport_id == sport_id
    ).first()
    
    if court:
        return court.id
    
    return None


def assign_teams_to_pool_matches(
    db: Session,
    pool_data: Dict,
    sport_id: int
) -> List[Dict]:
    """
    Assigne automatiquement les team_sport_id aux matchs d'une poule
    basé sur les noms d'équipes fournis dans team_a_source et team_b_source
    
    Args:
        db: Session de base de données
        pool_data: Données de la poule contenant les matchs
        sport_id: ID du sport du tournoi
        
    Returns:
        Liste des matchs avec les team_sport_id assignés
    """
    updated_matches = []
    
    for match_data in pool_data.get('matches', []):
        team_a_source = match_data.get('team_a_source')
        team_b_source = match_data.get('team_b_source')
        
        # Initialiser avec les IDs existants (s'ils sont déjà définis)
        team_sport_a_id = match_data.get('team_sport_a_id')
        team_sport_b_id = match_data.get('team_sport_b_id')
        
        # Si team_a_source est un nom d'équipe (pas un code comme "WQ1")
        if team_a_source and not team_sport_a_id:
            # Vérifier si c'est un code de source (commence par W, L, ou P)
            if not team_a_source.startswith(('W', 'L', 'P')):
                # C'est un nom d'équipe, chercher le team_sport_id
                found_id = find_team_sport_id_by_name(db, team_a_source, sport_id)
                if found_id:
                    team_sport_a_id = found_id
        
        # Même chose pour l'équipe B
        if team_b_source and not team_sport_b_id:
            if not team_b_source.startswith(('W', 'L', 'P')):
                found_id = find_team_sport_id_by_name(db, team_b_source, sport_id)
                if found_id:
                    team_sport_b_id = found_id
        
        # Créer le match mis à jour
        updated_match = {
            **match_data,
            'team_sport_a_id': team_sport_a_id,
            'team_sport_b_id': team_sport_b_id,
        }
        updated_matches.append(updated_match)
    
    return updated_matches


def assign_teams_to_matches(
    db: Session,
    matches: List[Dict],
    sport_id: int
) -> List[Dict]:
    """
    Assigne automatiquement les team_sport_id aux matchs
    basé sur les noms d'équipes fournis dans team_a_source et team_b_source
    
    Args:
        db: Session de base de données
        matches: Liste des matchs à traiter
        sport_id: ID du sport du tournoi
        
    Returns:
        Liste des matchs avec les team_sport_id assignés
    """
    updated_matches = []
    
    for match_data in matches:
        team_a_source = match_data.get('team_a_source')
        team_b_source = match_data.get('team_b_source')
        
        team_sport_a_id = match_data.get('team_sport_a_id')
        team_sport_b_id = match_data.get('team_sport_b_id')
        
        # Si team_a_source est un nom d'équipe (pas un code)
        if team_a_source and not team_sport_a_id:
            if not team_a_source.startswith(('W', 'L', 'P')):
                found_id = find_team_sport_id_by_name(db, team_a_source, sport_id)
                if found_id:
                    team_sport_a_id = found_id
        
        # Même chose pour l'équipe B
        if team_b_source and not team_sport_b_id:
            if not team_b_source.startswith(('W', 'L', 'P')):
                found_id = find_team_sport_id_by_name(db, team_b_source, sport_id)
                if found_id:
                    team_sport_b_id = found_id
        
        updated_match = {
            **match_data,
            'team_sport_a_id': team_sport_a_id,
            'team_sport_b_id': team_sport_b_id,
        }
        updated_matches.append(updated_match)
    
    return updated_matches


def create_match_schedule_if_court(
    db: Session,
    match_id: int,
    court_name: Optional[str],
    sport_id: int,
    scheduled_datetime = None,
    duration_minutes: int = 90
) -> None:
    """
    Crée un MatchSchedule pour un match si un terrain est spécifié
    
    Args:
        db: Session de base de données
        match_id: ID du match créé
        court_name: Nom du terrain (optionnel)
        sport_id: ID du sport du tournoi
        scheduled_datetime: Date/heure planifiée (optionnel)
        duration_minutes: Durée estimée en minutes (défaut: 90)
    """
    if not court_name:
        return
    
    from app.models.matchschedule import MatchSchedule
    
    # Trouver le court_id
    court_id = find_court_id_by_name(db, court_name, sport_id)
    if not court_id:
        return
    
    # Créer le MatchSchedule
    schedule = MatchSchedule(
        match_id=match_id,
        court_id=court_id,
        scheduled_datetime=scheduled_datetime,
        estimated_duration_minutes=duration_minutes
    )
    db.add(schedule)
    db.flush()
