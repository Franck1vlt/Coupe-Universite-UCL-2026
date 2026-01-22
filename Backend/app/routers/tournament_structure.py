"""
Routes pour la gestion complète des tournois avec toutes leurs structures
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Body, Path, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime
from app.db import get_db
from app.models.tournament import Tournament
from app.models.tournamentphase import TournamentPhase
from app.models.pool import Pool
from app.models.match import Match
from app.models.teampool import TeamPool
from app.exceptions import create_success_response, NotFoundError
from app.models.team import Team
from app.models.teamsport import TeamSport
from app.utils.serializers import match_to_dict
from app.models.court import Court
from app.models.matchschedule import MatchSchedule
from app.models.matchset import MatchSet


router = APIRouter()

# Schémas pour la structure complète du tournoi

class TournamentMatchCreate(BaseModel):
    """Match à créer dans le tournoi"""
    uuid: Optional[str] = None  # UUID unique du match (généré par le frontend)
    id: Optional[int] = None  # ID SQL existant (si mise à jour)
    match_type: str = "qualification"
    bracket_type: Optional[str] = None
    team_sport_a_id: Optional[int] = None
    team_sport_b_id: Optional[int] = None
    team_a_source: Optional[str] = None
    team_b_source: Optional[str] = None
    # Destinations (IDs numériques - legacy)
    winner_destination_match_id: Optional[int] = None
    loser_destination_match_id: Optional[int] = None
    # Destinations (UUIDs - nouveau format, résolu en IDs après création)
    winner_destination_match_uuid: Optional[str] = None
    loser_destination_match_uuid: Optional[str] = None
    winner_destination_slot: Optional[str] = None  # "A" ou "B"
    loser_destination_slot: Optional[str] = None   # "A" ou "B"
    label: Optional[str] = None
    match_order: Optional[int] = None
    status: str = "upcoming"
    court: Optional[str] = None  # Nom du terrain
    scheduled_datetime: Optional[str] = None  # Date/heure prévue
    duration: Optional[int] = 90  # Durée estimée en minutes
    winner_points: Optional[int] = 0
    loser_points: Optional[int] = 0

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
    winner_points: Optional[int]
    loser_points: Optional[int]
    
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

class TournamentCreate(BaseModel):
    """Schéma pour la création d'un tournoi"""
    name: str
    sport_id: int
    created_by_user_id: int
    tournament_type: str = "qualifications"
    status: str = "scheduled"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[str] = None
    image_url: Optional[str] = None

# --- 1. CRÉATION D'UN TOURNOI ---
@router.post("/tournaments")
def create_tournament(
    tournament_data: TournamentCreate,
    db: Session = Depends(get_db)
):
    """
    Créer un nouveau tournoi.
    
    ⚠️ CRITIQUE : Cette route contient db.commit() pour sauvegarder en BDD
    """
    try:
        print("=== 🏁 DÉBUT CRÉATION TOURNOI ===")
        print(f"Données reçues : {tournament_data.dict()}")
        
        # 1️⃣ Créer l'objet Tournament
        tournament = Tournament(
            name=tournament_data.name,
            sport_id=tournament_data.sport_id,
            created_by_user_id=tournament_data.created_by_user_id,
            tournament_type=tournament_data.tournament_type,
            status=tournament_data.status,
            description=tournament_data.description,
            rules=tournament_data.rules,
            image_url=tournament_data.image_url
        )
        
        # Gérer les dates si présentes
        if tournament_data.start_date:
            try:
                tournament.start_date = datetime.fromisoformat(tournament_data.start_date.replace('Z', '+00:00'))
            except Exception as e:
                print(f"⚠️ Erreur parsing start_date : {e}")
        
        if tournament_data.end_date:
            try:
                tournament.end_date = datetime.fromisoformat(tournament_data.end_date.replace('Z', '+00:00'))
            except Exception as e:
                print(f"⚠️ Erreur parsing end_date : {e}")
        
        print(f"✅ Objet Tournament créé : {tournament}")
        
        # 2️⃣ Ajouter à la session SQLAlchemy
        db.add(tournament)
        print("✅ db.add() effectué")
        
        # 3️⃣ Flush pour générer l'ID
        db.flush()
        print(f"✅ db.flush() effectué - ID généré : {tournament.id}")
        
        # 4️⃣ ⚠️ CRITIQUE : COMMIT POUR SAUVEGARDER EN BDD
        db.commit()
        print(f"✅ ✅ ✅ db.commit() effectué - Tournoi ID {tournament.id} SAUVEGARDÉ EN BDD")
        
        # 5️⃣ Vérification immédiate (optionnel, pour debug)
        verification = db.query(Tournament).filter(Tournament.id == tournament.id).first()
        if verification:
            print(f"✅ VÉRIFICATION : Le tournoi ID {tournament.id} existe bien en BDD")
        else:
            print(f"❌ ERREUR : Le tournoi ID {tournament.id} N'EXISTE PAS en BDD après commit !")
        
        # 6️⃣ Construire la réponse
        response_data = {
            "success": True,
            "message": "Tournoi créé avec succès",
            "data": {
                "id": tournament.id,
                "name": tournament.name,
                "sport_id": tournament.sport_id,
                "created_by_user_id": tournament.created_by_user_id,
                "tournament_type": tournament.tournament_type,
                "status": tournament.status,
                "start_date": tournament.start_date.isoformat() if tournament.start_date else None,
                "end_date": tournament.end_date.isoformat() if tournament.end_date else None,
                "description": tournament.description,
                "rules": tournament.rules,
                "image_url": tournament.image_url
            }
        }
        
        print("=== 🏁 FIN CRÉATION TOURNOI ===")
        print(f"Réponse : {response_data}")
        
        return response_data
        
    except Exception as e:
        # ⚠️ IMPORTANT : Rollback en cas d'erreur
        print(f"❌ ERREUR lors de la création : {str(e)}")
        db.rollback()
        print("🔄 db.rollback() effectué")
        
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la création du tournoi : {str(e)}"
        )


# --- 2. LISTE DES TOURNOIS AVEC FILTRAGE ---
@router.get("/tournaments")
def list_tournaments(
    skip: int = 0,
    limit: int = 100,
    sport_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Lister les tournois avec filtrage optionnel par sport"""
    query = db.query(Tournament)
    
    if sport_id:
        query = query.filter(Tournament.sport_id == sport_id)
    
    tournaments = query.offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": t.id,
                    "name": t.name,
                    "sport_id": t.sport_id,
                    "tournament_type": t.tournament_type,
                    "status": t.status,
                    "created_by_user_id": t.created_by_user_id,
                    "start_date": t.start_date.isoformat() if t.start_date else None,
                    "end_date": t.end_date.isoformat() if t.end_date else None,
                }
                for t in tournaments
            ],
            "total": query.count(),
            "skip": skip,
            "limit": limit
        }
    }

# --- 3. STRUCTURE D'UN TOURNOI - POST : CRÉATION / MISE À JOUR ---
@router.post("/tournaments/{tournament_id}/structure")
def create_tournament_structure(
    tournament_id: int = Path(...),
    structure: TournamentStructureCreate = Body(...),
    db: Session = Depends(get_db)
):
    print("=== POST /structure reçu ===")
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament {tournament_id} not found")

    def parse_datetime(dt_str):
        if not dt_str or 'T' not in dt_str: return None, None
        parts = dt_str.split('T')
        return parts[0], parts[1][:5]

    def get_or_create_phase(p_type, p_order):
        phase = db.query(TournamentPhase).filter(
            TournamentPhase.tournament_id == tournament_id,
            TournamentPhase.phase_type == p_type
        ).first()
        if not phase:
            phase = TournamentPhase(tournament_id=tournament_id, phase_type=p_type, phase_order=p_order)
            db.add(phase)
            db.flush()
        return phase

    import uuid
    # --- FONCTION UPSERT OPTIMISÉE ET CORRIGÉE ---
    def upsert_match(m_data, phase_id, match_type, pool_id=None):
        # Imports nécessaires pour la résolution (au cas où ils ne sont pas en haut du fichier)
        from app.models.team import Team
        from app.models.teamsport import TeamSport

        def get_val(obj, key, default=None):
            if isinstance(obj, dict): return obj.get(key, default)
            return getattr(obj, key, default)

        # =================================================================
        # 1. RÉSOLUTION AUTOMATIQUE DES ID D'EQUIPES (CORRECTIF)
        # =================================================================
        
        # --- Résolution Équipe A ---
        source_a = get_val(m_data, 'team_a_source')
        id_a = get_val(m_data, 'team_sport_a_id')
        
        # Si on a un nom (ex: "Piktura") mais pas d'ID, on cherche l'ID dans la BDD
        if source_a and not id_a:
            # 1. On cherche d'abord si l'équipe existe dans la table Team
            team = db.query(Team).filter(Team.name == source_a).first()
            
            if team:
                # 2. On cherche si elle est déjà inscrite dans TeamSport pour ce sport
                ts = db.query(TeamSport).filter(
                    TeamSport.team_id == team.id,
                    TeamSport.sport_id == tournament.sport_id
                ).first()
                
                # 3. SI ELLE N'EST PAS INSCRITE, ON L'INSCRIT AUTOMATIQUEMENT !
                if not ts:
                    ts = TeamSport(
                        team_id=team.id,
                        sport_id=tournament.sport_id,
                        is_active=True
                    )
                    db.add(ts)
                    db.flush() # Pour générer l'ID immédiatement
                    
                # 4. On utilise l'ID (existant ou nouveau)
                if isinstance(m_data, dict):
                    m_data['team_sport_a_id'] = ts.id
                else:
                    m_data.team_sport_a_id = ts.id

        # --- Résolution Équipe B ---
        source_b = get_val(m_data, 'team_b_source')
        id_b = get_val(m_data, 'team_sport_b_id')

        if source_b and not id_b:
            # 1. On cherche d'abord si l'équipe existe dans la table Team
            team = db.query(Team).filter(Team.name == source_b).first()
            
            if team:
                # 2. On cherche si elle est déjà inscrite dans TeamSport pour ce sport
                ts = db.query(TeamSport).filter(
                    TeamSport.team_id == team.id,
                    TeamSport.sport_id == tournament.sport_id
                ).first()
                
                # 3. SI ELLE N'EST PAS INSCRITE, ON L'INSCRIT AUTOMATIQUEMENT !
                if not ts:
                    ts = TeamSport(
                        team_id=team.id,
                        sport_id=tournament.sport_id,
                        is_active=True
                    )
                    db.add(ts)
                    db.flush() # Pour générer l'ID immédiatement
                    
                # 4. On utilise l'ID (existant ou nouveau)
                if isinstance(m_data, dict):
                    m_data['team_sport_b_id'] = ts.id
                else:
                    m_data.team_sport_b_id = ts.id

        # =================================================================
        # 2. LOGIQUE STANDARD DE SAUVEGARDE (EXISTANTE)
        # =================================================================

        m_id = get_val(m_data, 'id')       # ID SQL (ex: 42)
        m_uuid = get_val(m_data, 'uuid')   # UUID Frontend (ex: "a1b2...")
        m_label = get_val(m_data, 'label') # Label sémantique (ex: "WQ1", "Finale")

        # LOG POUR DEBUG
        winner_dest = get_val(m_data, 'winner_destination_match_id')
        loser_dest = get_val(m_data, 'loser_destination_match_id')
        print(f"[UPSERT] Match {m_label or m_id} - winner_dest={winner_dest}, loser_dest={loser_dest}")

        match = None

        # A. Priorité absolue : ID SQL (s'il est présent et valide)
        if m_id and isinstance(m_id, int):
            match = db.query(Match).filter(Match.id == m_id).first()

        # B. Si pas trouvé par ID, chercher par UUID (identifiant unique frontend)
        if not match and m_uuid:
            match = (
                db.query(Match)
                .join(TournamentPhase)
                .filter(
                    Match.uuid == m_uuid,
                    TournamentPhase.tournament_id == tournament_id
                )
                .first()
            )

        # C. Dernier recours : Recherche sémantique
        if not match and m_label:
            query = db.query(Match).filter(
                Match.phase_id == phase_id,
                Match.tournament_id == tournament_id,
                Match.match_type == match_type,
                Match.label == m_label
            )  
            
            if pool_id:
                query = query.filter(Match.pool_id == pool_id)
            
            match = query.first() 

        # Gestion date / heure
        sched_dt = get_val(m_data, 'scheduled_datetime')
        if sched_dt:
            d, t = parse_datetime(sched_dt)
        else:
            d = get_val(m_data, 'date')
            t = get_val(m_data, 'time')

        if match:
            # --- UPDATE ---
            if m_uuid and match.uuid != m_uuid:
                match.uuid = m_uuid

            match.tournament_id = tournament_id
            # Ici, get_val récupérera l'ID résolu à l'étape 1 si disponible
            match.team_sport_a_id = get_val(m_data, 'team_sport_a_id', match.team_sport_a_id)
            match.team_sport_b_id = get_val(m_data, 'team_sport_b_id', match.team_sport_b_id)
            match.team_a_source = get_val(m_data, 'team_a_source', match.team_a_source)
            match.team_b_source = get_val(m_data, 'team_b_source', match.team_b_source)
            
            match.label = get_val(m_data, 'label', match.label)
            match.status = get_val(m_data, 'status', match.status)
            match.bracket_type = get_val(m_data, 'bracket_type', match.bracket_type)
            match.date = d or match.date
            match.time = t or match.time
            match.court = get_val(m_data, 'court', match.court)
            match.duration = get_val(m_data, 'duration', match.duration)
            match.updated_at = datetime.utcnow()

            # Mise à jour des destinations et points
            if isinstance(m_data, dict):
                if 'winner_destination_match_id' in m_data:
                    match.winner_destination_match_id = m_data['winner_destination_match_id']
                if 'loser_destination_match_id' in m_data:
                    match.loser_destination_match_id = m_data['loser_destination_match_id']
                if 'winner_destination_slot' in m_data:
                    match.winner_destination_slot = m_data['winner_destination_slot']
                if 'loser_destination_slot' in m_data:
                    match.loser_destination_slot = m_data['loser_destination_slot']
                if 'winner_points' in m_data:
                    match.winner_points = m_data['winner_points']
                if 'loser_points' in m_data:
                    match.loser_points = m_data['loser_points']
            else:
                if hasattr(m_data, 'winner_destination_match_id'):
                    match.winner_destination_match_id = m_data.winner_destination_match_id
                if hasattr(m_data, 'loser_destination_match_id'):
                    match.loser_destination_match_id = m_data.loser_destination_match_id
                if hasattr(m_data, 'winner_destination_slot'):
                    match.winner_destination_slot = m_data.winner_destination_slot
                if hasattr(m_data, 'loser_destination_slot'):
                    match.loser_destination_slot = m_data.loser_destination_slot
                if hasattr(m_data, 'winner_points'):
                    match.winner_points = m_data.winner_points
                if hasattr(m_data, 'loser_points'):
                    match.loser_points = m_data.loser_points
        else:
            # --- CREATE ---
            final_uuid = m_uuid if isinstance(m_uuid, str) and m_uuid.strip() else str(uuid.uuid4())
            match = Match(
                uuid=final_uuid,
                phase_id=phase_id,
                pool_id=pool_id,
                tournament_id=tournament_id,
                match_type=match_type,
                bracket_type=get_val(m_data, 'bracket_type'),
                
                # Utilisation des ID résolus
                team_sport_a_id=get_val(m_data, 'team_sport_a_id'),
                team_sport_b_id=get_val(m_data, 'team_sport_b_id'),
                
                team_a_source=get_val(m_data, 'team_a_source'),
                team_b_source=get_val(m_data, 'team_b_source'),
                winner_destination_match_id=get_val(m_data, 'winner_destination_match_id'),
                loser_destination_match_id=get_val(m_data, 'loser_destination_match_id'),
                winner_destination_slot=get_val(m_data, 'winner_destination_slot'),
                loser_destination_slot=get_val(m_data, 'loser_destination_slot'),
                winner_points=get_val(m_data, 'winner_points', 0),
                loser_points=get_val(m_data, 'loser_points', 0),
                label=get_val(m_data, 'label'),
                status=get_val(m_data, 'status', "upcoming"),
                date=d,
                time=t,
                court=get_val(m_data, 'court'),
                duration=get_val(m_data, 'duration', 90),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by_user_id=1
            )
            db.add(match)
            db.flush()  # Pour avoir match.id

        # --- Création ou update du MatchSchedule associé ---
        court_name = get_val(m_data, 'court')
        court_id = None
        if court_name:
            court_obj = db.query(Court).filter(Court.name == court_name).first()
            if court_obj:
                court_id = court_obj.id

        scheduled_datetime = get_val(m_data, 'scheduled_datetime')
        if scheduled_datetime:
            try:
                from dateutil.parser import parse as parse_dt
                scheduled_dt = parse_dt(scheduled_datetime)
            except Exception:
                scheduled_dt = None
        else:
            scheduled_dt = None

        estimated_duration = get_val(m_data, 'duration', 90)

        ms = db.query(MatchSchedule).filter(MatchSchedule.match_id == match.id).first()
        if ms:
            ms.court_id = court_id
            ms.scheduled_datetime = scheduled_dt
            ms.estimated_duration_minutes = estimated_duration
            ms.tournament_id = tournament_id
        else:
            ms = MatchSchedule(
                match_id=match.id,
                court_id=court_id,
                scheduled_datetime=scheduled_dt,
                estimated_duration_minutes=estimated_duration,
                tournament_id=tournament_id
            )
            db.add(ms)

        return match

    # --- COLLECTE DES DESTINATIONS UUID À RÉSOUDRE ---
    # Format: [(match_uuid, winner_dest_uuid, loser_dest_uuid, winner_slot, loser_slot), ...]
    pending_destinations = []

    # Dictionnaire pour tracker les matchs créés pendant cette transaction (UUID -> Match object)
    created_matches_by_uuid = {}

    def collect_destinations(m_data):
        """Collecte les UUIDs de destination pour résolution ultérieure"""
        def get_val(obj, key, default=None):
            if isinstance(obj, dict): return obj.get(key, default)
            return getattr(obj, key, default)

        m_uuid = get_val(m_data, 'uuid')
        m_id = get_val(m_data, 'id')
        m_label = get_val(m_data, 'label')
        winner_dest_uuid = get_val(m_data, 'winner_destination_match_uuid')
        loser_dest_uuid = get_val(m_data, 'loser_destination_match_uuid')
        winner_slot = get_val(m_data, 'winner_destination_slot')
        loser_slot = get_val(m_data, 'loser_destination_slot')

        # Debug: afficher toutes les valeurs reçues
        print(f"[COLLECT-DEBUG] Match reçu: uuid={m_uuid}, id={m_id}, label={m_label}")
        print(f"[COLLECT-DEBUG]   -> winnerDestUUID={winner_dest_uuid}, loserDestUUID={loser_dest_uuid}")
        print(f"[COLLECT-DEBUG]   -> winnerSlot={winner_slot}, loserSlot={loser_slot}")

        # Utiliser l'UUID ou l'ID comme identifiant
        match_identifier = m_uuid or (str(m_id) if m_id else None) or m_label

        if match_identifier and (winner_dest_uuid or loser_dest_uuid):
            pending_destinations.append((match_identifier, winner_dest_uuid, loser_dest_uuid, winner_slot, loser_slot))
            print(f"[COLLECT] ✅ Match {match_identifier} -> winnerDest={winner_dest_uuid} (slot {winner_slot}), loserDest={loser_dest_uuid} (slot {loser_slot})")
        elif winner_dest_uuid or loser_dest_uuid:
            print(f"[COLLECT] ⚠️ Match sans identifiant mais avec destinations: winnerDest={winner_dest_uuid}, loserDest={loser_dest_uuid}")

    # --- TRAITEMENT DES SECTIONS (PASSE 1 : Création des matchs) ---
    if structure.qualification_matches:
        p = get_or_create_phase("qualifications", 1)
        for m in structure.qualification_matches:
            collect_destinations(m)
            match_obj = upsert_match(m, p.id, "qualification")
            if match_obj and match_obj.uuid:
                created_matches_by_uuid[match_obj.uuid] = match_obj

    if structure.pools:
        p = get_or_create_phase("pools", 2)
        for p_data in structure.pools:
            pool = db.query(Pool).filter(Pool.phase_id == p.id, Pool.name == p_data.name).first()
            if not pool:
                # ✅ FIX: Inclure qualified_to_finals et qualified_to_loser_bracket lors de la création
                pool = Pool(
                    phase_id=p.id, 
                    name=p_data.name, 
                    order=p_data.display_order,
                    qualified_to_finals=p_data.qualified_to_finals,
                    qualified_to_loser_bracket=p_data.qualified_to_loser_bracket
                )
                db.add(pool)
                db.flush()
            else:
                # ✅ FIX: Mettre à jour les valeurs si la poule existe déjà
                pool.qualified_to_finals = p_data.qualified_to_finals
                pool.qualified_to_loser_bracket = p_data.qualified_to_loser_bracket
            if hasattr(p_data, 'matches') and p_data.matches:
                for m in p_data.matches:
                    collect_destinations(m)
                    match_obj = upsert_match(m, p.id, "pool", pool.id)
                    if match_obj and match_obj.uuid:
                        created_matches_by_uuid[match_obj.uuid] = match_obj

    if structure.brackets:
        phase_final = get_or_create_phase("final", 3)
        for bracket_group in structure.brackets:
            for m_data in bracket_group.matches:
                collect_destinations(m_data)
                match_obj = upsert_match(m_data, phase_final.id, "bracket")
                if match_obj and match_obj.uuid:
                    created_matches_by_uuid[match_obj.uuid] = match_obj

    if structure.loser_brackets:
        # Utiliser "elimination" comme phase_type car c'est une valeur autorisée par la contrainte CHECK
        # Les loser brackets sont différenciés par bracket_type="loser" sur les matchs
        phase_loser = get_or_create_phase("elimination", 4)
        for loser_bracket_group in structure.loser_brackets:
            for m_data in loser_bracket_group.matches:
                # Garder le bracket_type envoyé par le frontend (ex: loser_round_1) ou forcer "loser"
                original_bracket_type = m_data.bracket_type if m_data.bracket_type else "loser"
                m_dict = {**m_data.dict(), "bracket_type": original_bracket_type}
                collect_destinations(m_dict)
                # Utiliser match_type "bracket" avec bracket_type contenant "loser" pour identifier les loser brackets
                match_obj = upsert_match(m_dict, phase_loser.id, "bracket")
                if match_obj and match_obj.uuid:
                    created_matches_by_uuid[match_obj.uuid] = match_obj

    # Flush pour s'assurer que tous les matchs ont des IDs
    db.flush()

    # --- PASSE 2 : Résolution des UUIDs de destination en IDs ---
    if pending_destinations:
        print(f"[RESOLVE] Résolution de {len(pending_destinations)} destinations UUID...")
        print(f"[RESOLVE] Matchs créés dans cette transaction: {len(created_matches_by_uuid)}")

        # Récupérer tous les matchs du tournoi pour construire le mapping UUID -> ID
        all_matches = (
            db.query(Match)
            .join(TournamentPhase)
            .filter(TournamentPhase.tournament_id == tournament_id)
            .all()
        )

        # Créer les mappings UUID -> ID et ID (string) -> ID
        uuid_to_id = {}

        # D'abord, ajouter les matchs créés dans cette transaction (ils ont la priorité)
        for uuid_key, match_obj in created_matches_by_uuid.items():
            if match_obj.id:
                uuid_to_id[uuid_key] = match_obj.id
                uuid_to_id[str(match_obj.id)] = match_obj.id
                uuid_to_id[f"match-{match_obj.id}"] = match_obj.id
                print(f"[RESOLVE] Mapping créé: {uuid_key} -> {match_obj.id} (transaction)")

        # Ensuite, ajouter les matchs de la BDD (si pas déjà présents)
        for m in all_matches:
            if m.uuid and m.uuid not in uuid_to_id:
                uuid_to_id[m.uuid] = m.id
            if str(m.id) not in uuid_to_id:
                uuid_to_id[str(m.id)] = m.id
            if f"match-{m.id}" not in uuid_to_id:
                uuid_to_id[f"match-{m.id}"] = m.id

        print(f"[RESOLVE] Mapping total créé avec {len(uuid_to_id)} entrées")

        # Combiner les matchs de la transaction et de la BDD pour la recherche
        all_matches_combined = list(all_matches)
        for match_obj in created_matches_by_uuid.values():
            if match_obj not in all_matches_combined:
                all_matches_combined.append(match_obj)

        # Résoudre chaque destination
        for (match_uuid, winner_dest_uuid, loser_dest_uuid, winner_slot, loser_slot) in pending_destinations:
            # Trouver le match source par UUID d'abord dans les matchs créés, puis dans la BDD
            source_match = created_matches_by_uuid.get(match_uuid)

            if not source_match:
                source_match = next((m for m in all_matches_combined if m.uuid == match_uuid), None)

            # Si pas trouvé par UUID, essayer par ID (format "match-{id}" ou "{id}")
            if not source_match:
                # Extraire l'ID si le format est "match-{id}"
                if match_uuid and match_uuid.startswith("match-"):
                    try:
                        match_id = int(match_uuid.replace("match-", ""))
                        source_match = next((m for m in all_matches_combined if m.id == match_id), None)
                    except ValueError:
                        pass
                # Sinon essayer directement comme ID
                elif match_uuid and match_uuid.isdigit():
                    source_match = next((m for m in all_matches_combined if m.id == int(match_uuid)), None)

            if not source_match:
                print(f"[RESOLVE] ⚠️ Match source non trouvé: {match_uuid}")
                continue

            updated = False

            # Résoudre la destination du vainqueur
            if winner_dest_uuid:
                if winner_dest_uuid in uuid_to_id:
                    source_match.winner_destination_match_id = uuid_to_id[winner_dest_uuid]
                    source_match.winner_destination_slot = winner_slot
                    updated = True
                    print(f"[RESOLVE] ✅ Match {source_match.label or source_match.id}: winner -> ID {uuid_to_id[winner_dest_uuid]} (slot {winner_slot})")
                else:
                    print(f"[RESOLVE] ⚠️ Destination vainqueur non trouvée: {winner_dest_uuid}")
                    print(f"[RESOLVE]    Clés disponibles: {list(uuid_to_id.keys())[:10]}...")

            # Résoudre la destination du perdant
            if loser_dest_uuid:
                if loser_dest_uuid in uuid_to_id:
                    source_match.loser_destination_match_id = uuid_to_id[loser_dest_uuid]
                    source_match.loser_destination_slot = loser_slot
                    updated = True
                    print(f"[RESOLVE] ✅ Match {source_match.label or source_match.id}: loser -> ID {uuid_to_id[loser_dest_uuid]} (slot {loser_slot})")
                else:
                    print(f"[RESOLVE] ⚠️ Destination perdant non trouvée: {loser_dest_uuid}")

            if updated:
                source_match.updated_at = datetime.utcnow()

    db.commit()

    # Récupérer tous les matchs pour renvoyer les correspondances UUID -> ID
    matches = (
        db.query(Match)
        .join(TournamentPhase)
        .filter(TournamentPhase.tournament_id == tournament_id)
        .all()
    )

    return {
        "status": "ok",
        "destinations_resolved": len(pending_destinations),
        "matches": [
            {
                "id": m.id,
                "uuid": m.uuid,
                "label": m.label,
                "match_type": m.match_type,
                "winner_destination_match_id": m.winner_destination_match_id,
                "loser_destination_match_id": m.loser_destination_match_id,
                "winner_destination_slot": m.winner_destination_slot,
                "loser_destination_slot": m.loser_destination_slot
            }
            for m in matches
        ]
    }

# --- 2. GET : RÉCUPÉRATION ---
@router.get("/tournaments/{tournament_id}/structure")
def get_tournament_structure(
    tournament_id: int = Path(..., description="ID du tournoi"),
    db: Session = Depends(get_db)
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament {tournament_id} not found")

    # Force le rafraîchissement pour voir les scores en temps réel
    db.expire_all()

    phases = db.query(TournamentPhase).filter(TournamentPhase.tournament_id == tournament_id).all()

    # Récupérer TOUS les matchs du tournoi pour créer le mapping ID -> UUID
    all_tournament_matches = (
        db.query(Match)
        .join(TournamentPhase)
        .filter(TournamentPhase.tournament_id == tournament_id)
        .all()
    )

    # Créer le mapping ID -> UUID
    id_to_uuid = {m.id: m.uuid for m in all_tournament_matches if m.uuid}

    qualification_matches = []
    pools_data = []
    bracket_matches = []
    loser_bracket_matches = []

    def match_to_dict_internal(m):
        # Résoudre les UUIDs de destination depuis les IDs
        winner_dest_uuid = id_to_uuid.get(m.winner_destination_match_id) if m.winner_destination_match_id else None
        loser_dest_uuid = id_to_uuid.get(m.loser_destination_match_id) if m.loser_destination_match_id else None

        return {
            "id": m.id,
            "uuid": getattr(m, 'uuid', None),
            "match_type": m.match_type,
            "bracket_type": m.bracket_type,
            # ✅ IMPORTANT: Inclure les team_sport_id pour que le frontend puisse résoudre les noms
            "team_sport_a_id": m.team_sport_a_id,
            "team_sport_b_id": m.team_sport_b_id,
            "team_a_source": m.team_a_source,
            "team_b_source": m.team_b_source,

            # --- DESTINATIONS ET SLOTS ---
            "winner_destination_match_id": m.winner_destination_match_id,
            "loser_destination_match_id": m.loser_destination_match_id,
            # UUIDs de destination (pour le frontend)
            "winner_destination_match_uuid": winner_dest_uuid,
            "loser_destination_match_uuid": loser_dest_uuid,
            "winner_destination_slot": getattr(m, 'winner_destination_slot', None),
            "loser_destination_slot": getattr(m, 'loser_destination_slot', None),
            "winner_points": m.winner_points if m.winner_points is not None else 0,
            "loser_points": m.loser_points if m.loser_points is not None else 0,
            # ------------------------------

            "label": m.label,
            "status": m.status,
            "score_a": m.score_a if m.score_a is not None else 0,
            "score_b": m.score_b if m.score_b is not None else 0,
            "court": m.court if m.court else "Terrain",
            "date": str(m.date) if m.date else None,
            "time": str(m.time) if m.time else None,
            "court_id": getattr(m, 'court_id', 1) or 1,
            "duration": getattr(m, 'duration', 90),
            "scheduled_datetime": getattr(m, 'scheduled_datetime', None),
            "estimated_duration_minutes": getattr(m, 'estimated_duration_minutes', 90)
        }

    for phase in phases:
        # Récupération de tous les matchs de la phase
        matches = db.query(Match).filter(Match.phase_id == phase.id).all()
        # Normalisation du type pour éviter les erreurs de frappe (Qualif vs qualification)
        p_type = phase.phase_type.lower() if phase.phase_type else ""
        
        # 1. Gestion des Qualifications
        if "qualif" in p_type:
            qualification_matches.extend([match_to_dict_internal(m) for m in matches])
            
        # 2. Gestion des Poules (supporte "pools" et "poule")
        elif "poule" in p_type or "pool" in p_type:
            pools = db.query(Pool).filter(Pool.phase_id == phase.id).all()
            for pool in pools:
                pool_matches = [m for m in matches if m.pool_id == pool.id]
                pools_data.append({
                    "id": pool.id,
                    "name": pool.name,
                    "qualified_to_finals": pool.qualified_to_finals if hasattr(pool, 'qualified_to_finals') else 2,
                    "qualified_to_loser_bracket": pool.qualified_to_loser_bracket if hasattr(pool, 'qualified_to_loser_bracket') else 0,
                    "matches": [match_to_dict_internal(m) for m in pool_matches]
                })
                
        # 3. Gestion des Brackets (élimination, finale, etc.)
        # Note: Les matchs loser bracket sont identifiés par:
        # - phase_type contenant "loser" ou "elimination" OU
        # - bracket_type contenant "loser"
        elif "loser" in p_type or "elimination" in p_type:
            # Phase loser_bracket ou elimination : tous les matchs vont dans loser_bracket_matches
            loser_bracket_matches.extend([match_to_dict_internal(m) for m in matches])
        else:
            for m in matches:
                # Vérifier si c'est un match loser bracket par son bracket_type (contient "loser")
                if m.bracket_type and "loser" in m.bracket_type.lower():
                    loser_bracket_matches.append(match_to_dict_internal(m))
                else:
                    bracket_matches.append(match_to_dict_internal(m))

    return create_success_response({
        "qualification_matches": qualification_matches,
        "pools": pools_data,
        "bracket_matches": bracket_matches,
        "loser_bracket_matches": loser_bracket_matches
    })




@router.post("/tournaments/{tournament_id}/propagate-results")
def propagate_tournament_results(
    tournament_id: int = Path(..., description="ID du tournoi"),
    db: Session = Depends(get_db)
):
    """
    Propager automatiquement les résultats des matchs terminés vers les matchs suivants.
    
    Utilise DEUX mécanismes:
    1. winner_destination_match_id / loser_destination_match_id (NOUVEAU)
    2. team_a_source / team_b_source avec codes (LEGACY)
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament {tournament_id} not found")
    
    # ✅ FIX: Récupérer TOUTES les phases
    phases = db.query(TournamentPhase).filter(
        TournamentPhase.tournament_id == tournament_id
    ).all()
    
    if not phases:
        return create_success_response({
            "tournament_id": tournament_id,
            "propagated_matches": 0
        }, message="No phases found")
    
    phase_ids = [p.id for p in phases]
    all_matches = db.query(Match).filter(Match.phase_id.in_(phase_ids)).all()
    
    matches_by_id = {m.id: m for m in all_matches}
    propagated_count = 0
    
    print(f"[PROPAGATION] Tournoi {tournament_id}: {len(all_matches)} matchs dans {len(phases)} phases")
    
    # =========================================================================
    # MÉCANISME 1: Propagation via winner/loser_destination_match_id
    # =========================================================================
    for match in all_matches:
        if match.status != "completed":
            continue
        if match.score_a is None or match.score_b is None:
            continue
        
        # Déterminer vainqueur et perdant
        if match.score_a > match.score_b:
            winner_team_id = match.team_sport_a_id
            loser_team_id = match.team_sport_b_id
        elif match.score_b > match.score_a:
            winner_team_id = match.team_sport_b_id
            loser_team_id = match.team_sport_a_id
        else:
            continue  # Égalité
        
        # --- Propager le VAINQUEUR ---
        if match.winner_destination_match_id and winner_team_id:
            dest_match = matches_by_id.get(match.winner_destination_match_id)
            if dest_match:
                slot = match.winner_destination_slot or "A"
                
                # Logique intelligente: si le slot A est déjà pris, utiliser B
                if slot == "A":
                    if dest_match.team_sport_a_id is None or dest_match.team_sport_a_id != winner_team_id:
                        if dest_match.team_sport_a_id is None:
                            dest_match.team_sport_a_id = winner_team_id
                        elif dest_match.team_sport_b_id is None:
                            dest_match.team_sport_b_id = winner_team_id
                        else:
                            print(f"[PROPAGATION] ⚠️ Slots pleins pour match {dest_match.id}")
                            continue
                        dest_match.updated_at = datetime.utcnow()
                        propagated_count += 1
                        print(f"[PROPAGATION] ✅ Winner {winner_team_id} -> Match {dest_match.id}")
                elif slot == "B":
                    if dest_match.team_sport_b_id is None or dest_match.team_sport_b_id != winner_team_id:
                        if dest_match.team_sport_b_id is None:
                            dest_match.team_sport_b_id = winner_team_id
                        elif dest_match.team_sport_a_id is None:
                            dest_match.team_sport_a_id = winner_team_id
                        else:
                            print(f"[PROPAGATION] ⚠️ Slots pleins pour match {dest_match.id}")
                            continue
                        dest_match.updated_at = datetime.utcnow()
                        propagated_count += 1
                        print(f"[PROPAGATION] ✅ Winner {winner_team_id} -> Match {dest_match.id}")
        
        # --- Propager le PERDANT ---
        if match.loser_destination_match_id and loser_team_id:
            dest_match = matches_by_id.get(match.loser_destination_match_id)
            if dest_match:
                slot = match.loser_destination_slot or "A"
                
                if slot == "A":
                    if dest_match.team_sport_a_id is None:
                        dest_match.team_sport_a_id = loser_team_id
                        dest_match.updated_at = datetime.utcnow()
                        propagated_count += 1
                        print(f"[PROPAGATION] ✅ Loser {loser_team_id} -> Match {dest_match.id} slot A")
                    elif dest_match.team_sport_b_id is None:
                        dest_match.team_sport_b_id = loser_team_id
                        dest_match.updated_at = datetime.utcnow()
                        propagated_count += 1
                        print(f"[PROPAGATION] ✅ Loser {loser_team_id} -> Match {dest_match.id} slot B (fallback)")
                elif slot == "B":
                    if dest_match.team_sport_b_id is None:
                        dest_match.team_sport_b_id = loser_team_id
                        dest_match.updated_at = datetime.utcnow()
                        propagated_count += 1
                        print(f"[PROPAGATION] ✅ Loser {loser_team_id} -> Match {dest_match.id} slot B")
                    elif dest_match.team_sport_a_id is None:
                        dest_match.team_sport_a_id = loser_team_id
                        dest_match.updated_at = datetime.utcnow()
                        propagated_count += 1
                        print(f"[PROPAGATION] ✅ Loser {loser_team_id} -> Match {dest_match.id} slot A (fallback)")
    
    # =========================================================================
    # MÉCANISME 2: Propagation des résultats des POULES vers les brackets
    # =========================================================================
    pools = []
    for phase in phases:
        pools.extend(db.query(Pool).filter(Pool.phase_id == phase.id).all())
    pools_by_name = {p.name: p for p in pools}

    # Vérifier si toutes les poules sont terminées
    pools_status = {}
    for pool in pools:
        all_pool_matches = [m for m in all_matches if m.pool_id == pool.id]
        completed_pool_matches = [m for m in all_pool_matches if m.status == "completed"]
        pools_status[pool.name] = {
            "total": len(all_pool_matches),
            "completed": len(completed_pool_matches),
            "is_complete": len(all_pool_matches) > 0 and len(completed_pool_matches) == len(all_pool_matches)
        }
        print(f"[POOL-STATUS] {pool.name}: {completed_pool_matches}/{all_pool_matches} matchs terminés")

    all_pools_complete = all(status["is_complete"] for status in pools_status.values()) if pools_status else False
    print(f"[POOL-STATUS] Toutes les poules terminées: {all_pools_complete}")

    # Calculer les classements de chaque poule
    pool_standings = {}  # pool_name -> [(team_sport_id, points, goal_diff), ...]

    for pool in pools:
        # Récupérer tous les matchs terminés de cette poule
        pool_matches = [m for m in all_matches if m.pool_id == pool.id and m.status == "completed"]

        if not pool_matches:
            print(f"[POOL-STANDINGS] ⚠️ {pool.name}: Aucun match terminé")
            continue

        # Calculer les stats pour chaque équipe de la poule
        team_stats = {}  # team_sport_id -> {points, wins, draws, losses, goal_diff}

        for match in pool_matches:
            if match.score_a is None or match.score_b is None:
                continue

            team_a = match.team_sport_a_id
            team_b = match.team_sport_b_id

            if not team_a or not team_b:
                continue

            # Initialiser les stats si nécessaire
            if team_a not in team_stats:
                team_stats[team_a] = {"points": 0, "wins": 0, "draws": 0, "losses": 0, "goal_diff": 0}
            if team_b not in team_stats:
                team_stats[team_b] = {"points": 0, "wins": 0, "draws": 0, "losses": 0, "goal_diff": 0}

            # Calculer les points (3 victoire, 1 nul, 0 défaite)
            if match.score_a > match.score_b:
                team_stats[team_a]["points"] += 3
                team_stats[team_a]["wins"] += 1
                team_stats[team_b]["losses"] += 1
            elif match.score_b > match.score_a:
                team_stats[team_b]["points"] += 3
                team_stats[team_b]["wins"] += 1
                team_stats[team_a]["losses"] += 1
            else:
                team_stats[team_a]["points"] += 1
                team_stats[team_b]["points"] += 1
                team_stats[team_a]["draws"] += 1
                team_stats[team_b]["draws"] += 1

            # Différence de buts
            team_stats[team_a]["goal_diff"] += match.score_a - match.score_b
            team_stats[team_b]["goal_diff"] += match.score_b - match.score_a

        # Trier par points puis par différence de buts
        sorted_teams = sorted(
            team_stats.items(),
            key=lambda x: (x[1]["points"], x[1]["goal_diff"]),
            reverse=True
        )

        pool_standings[pool.name] = [(team_id, stats["points"], stats["goal_diff"]) for team_id, stats in sorted_teams]
        print(f"[POOL-STANDINGS] {pool.name}: {pool_standings[pool.name]}")

    def resolve_source_code(source_code: str) -> Optional[int]:
        if not source_code:
            return None
        
        # WQ1 = Winner Qualification 1
        if source_code.startswith("WQ"):
            try:
                match_num = int(source_code[2:])
                qual_match = next((m for m in all_matches 
                                  if m.match_type == "qualification" 
                                  and m.match_order == match_num
                                  and m.status == "completed"), None)
                if qual_match and qual_match.score_a is not None:
                    return qual_match.team_sport_a_id if qual_match.score_a > qual_match.score_b else qual_match.team_sport_b_id
            except:
                pass
        
        # LQ1 = Loser Qualification 1
        elif source_code.startswith("LQ") and not source_code.startswith("LQF"):
            try:
                match_num = int(source_code[2:])
                qual_match = next((m for m in all_matches 
                                  if m.match_type == "qualification" 
                                  and m.match_order == match_num
                                  and m.status == "completed"), None)
                if qual_match and qual_match.score_a is not None:
                    return qual_match.team_sport_b_id if qual_match.score_a > qual_match.score_b else qual_match.team_sport_a_id
            except:
                pass
        
        # WSF1 = Winner Semifinal 1
        elif source_code.startswith("WSF"):
            try:
                match_num = int(source_code[3:])
                sf_match = next((m for m in all_matches 
                               if m.bracket_type == "semifinal" 
                               and m.match_order == match_num
                               and m.status == "completed"), None)
                if sf_match and sf_match.score_a is not None:
                    return sf_match.team_sport_a_id if sf_match.score_a > sf_match.score_b else sf_match.team_sport_b_id
            except:
                pass
        
        # LSF1 = Loser Semifinal 1
        elif source_code.startswith("LSF"):
            try:
                match_num = int(source_code[3:])
                sf_match = next((m for m in all_matches
                               if m.bracket_type == "semifinal"
                               and m.match_order == match_num
                               and m.status == "completed"), None)
                if sf_match and sf_match.score_a is not None:
                    return sf_match.team_sport_b_id if sf_match.score_a > sf_match.score_b else sf_match.team_sport_a_id
            except:
                pass

        # =========================================================================
        # CODES DE POULE: "Poule A-1", "Poule 1-2", "Pool A-1", etc.
        # Format: <nom_poule>-<position> où position est 1, 2, 3...
        # =========================================================================
        import re

        # Pattern pour matcher "Poule X-N" ou "Pool X-N" (avec ou sans espace)
        pool_pattern = re.match(r'^(Poule\s*\d+|Poule\s*[A-Z]|Pool\s*\d+|Pool\s*[A-Z])-(\d+)$', source_code, re.IGNORECASE)

        if pool_pattern:
            pool_name_raw = pool_pattern.group(1).strip()
            position = int(pool_pattern.group(2))

            print(f"[RESOLVE-POOL] Tentative de résolution: {source_code} -> pool={pool_name_raw}, position={position}")

            # Chercher la poule par son nom (essayer plusieurs variantes)
            pool_name_variants = [
                pool_name_raw,
                pool_name_raw.replace("Pool", "Poule"),
                pool_name_raw.replace("Poule", "Pool"),
                f"Poule {pool_name_raw.replace('Poule', '').replace('Pool', '').strip()}",
                f"Pool {pool_name_raw.replace('Poule', '').replace('Pool', '').strip()}"
            ]

            for variant in pool_name_variants:
                if variant in pool_standings:
                    standings = pool_standings[variant]
                    if len(standings) >= position:
                        team_id = standings[position - 1][0]  # position 1 = index 0
                        print(f"[RESOLVE-POOL] ✅ {source_code} -> team_sport_id={team_id}")
                        return team_id
                    else:
                        print(f"[RESOLVE-POOL] ⚠️ Position {position} invalide pour {variant} (seulement {len(standings)} équipes)")
                        break

            print(f"[RESOLVE-POOL] ⚠️ Poule '{pool_name_raw}' non trouvée. Poules disponibles: {list(pool_standings.keys())}")

        # Pattern alternatif: "P1-1" pour "Poule 1, position 1"
        alt_pool_pattern = re.match(r'^P(\d+)-(\d+)$', source_code)
        if alt_pool_pattern:
            pool_num = alt_pool_pattern.group(1)
            position = int(alt_pool_pattern.group(2))

            pool_name_variants = [f"Poule {pool_num}", f"Pool {pool_num}", f"Poule{pool_num}", f"Pool{pool_num}"]

            for variant in pool_name_variants:
                if variant in pool_standings:
                    standings = pool_standings[variant]
                    if len(standings) >= position:
                        team_id = standings[position - 1][0]
                        print(f"[RESOLVE-POOL] ✅ {source_code} -> team_sport_id={team_id}")
                        return team_id

        # Meilleur 3ème: "Meilleur-3ème" ou "Best-3rd"
        if source_code.lower() in ["meilleur-3ème", "meilleur-3e", "best-3rd", "meilleur 3ème", "meilleur 3e"]:
            # Collecter tous les 3èmes de toutes les poules
            third_places = []
            for pool_name, standings in pool_standings.items():
                if len(standings) >= 3:
                    team_id, points, goal_diff = standings[2]  # 3ème = index 2
                    third_places.append((team_id, points, goal_diff, pool_name))

            if third_places:
                # Trier par points puis par goal_diff
                third_places.sort(key=lambda x: (x[1], x[2]), reverse=True)
                best_third = third_places[0][0]
                print(f"[RESOLVE-POOL] ✅ Meilleur 3ème: team_sport_id={best_third}")
                return best_third

        return None
    
    # Propager via codes source
    for match in all_matches:
        if match.team_a_source and not match.team_sport_a_id:
            resolved = resolve_source_code(match.team_a_source)
            if resolved:
                match.team_sport_a_id = resolved
                match.updated_at = datetime.utcnow()
                propagated_count += 1
        
        if match.team_b_source and not match.team_sport_b_id:
            resolved = resolve_source_code(match.team_b_source)
            if resolved:
                match.team_sport_b_id = resolved
                match.updated_at = datetime.utcnow()
                propagated_count += 1
    
    db.commit()
    
    return create_success_response({
        "tournament_id": tournament_id,
        "propagated_matches": propagated_count
    }, message=f"Successfully propagated {propagated_count} match results")
    
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
    Supprimer toute la structure d'un tournoi (matchs, poules, phases)
    mais garder le tournoi lui-même.
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament {tournament_id} not found")
    
    deleted_matches = 0
    deleted_pools = 0
    deleted_phases = 0
    
    # Récupérer toutes les phases du tournoi
    phases = db.query(TournamentPhase).filter(
        TournamentPhase.tournament_id == tournament_id
    ).all()
    
    for phase in phases:
        # Récupérer tous les matchs de cette phase
        matches = db.query(Match).filter(Match.phase_id == phase.id).all()

        # Supprimer les dépendances de chaque match
        for match in matches:
            # Supprimer les MatchSchedule
            db.query(MatchSchedule).filter(MatchSchedule.match_id == match.id).delete()
            # Supprimer les MatchSet (pour les sports à sets: volleyball, tennis, etc.)
            db.query(MatchSet).filter(MatchSet.match_id == match.id).delete()

        # Supprimer tous les matchs de cette phase
        match_count = db.query(Match).filter(Match.phase_id == phase.id).delete()
        deleted_matches += match_count

        # Supprimer les team_pools associées aux poules
        pools = db.query(Pool).filter(Pool.phase_id == phase.id).all()
        for pool in pools:
            db.query(TeamPool).filter(TeamPool.pool_id == pool.id).delete()

        # Supprimer toutes les poules de cette phase
        pool_count = db.query(Pool).filter(Pool.phase_id == phase.id).delete()
        deleted_pools += pool_count

        # Supprimer la phase elle-même
        db.delete(phase)
        deleted_phases += 1
    
    db.commit()
    
    return create_success_response(
        {
            "tournament_id": tournament_id,
            "deleted_matches": deleted_matches,
            "deleted_pools": deleted_pools,
            "deleted_phases": deleted_phases
        },
        message=f"Tournament structure reset: {deleted_matches} matches, {deleted_pools} pools, {deleted_phases} phases deleted"
    )


@router.delete("/tournaments/{tournament_id}/matches")
def delete_tournament_matches_only(
    tournament_id: int = Path(..., description="ID du tournoi"),
    db: Session = Depends(get_db)
):
    """
    Supprimer uniquement les matchs du tournoi (garder les poules et phases).
    Utile pour réinitialiser les matchs sans perdre la structure.
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament {tournament_id} not found")
    
    deleted_matches = 0
    
    # Récupérer toutes les phases du tournoi
    phases = db.query(TournamentPhase).filter(
        TournamentPhase.tournament_id == tournament_id
    ).all()
    
    for phase in phases:
        # Supprimer tous les matchs de cette phase
        match_count = db.query(Match).filter(Match.phase_id == phase.id).delete()
        deleted_matches += match_count
    
    db.commit()
    
    return create_success_response(
        {
            "tournament_id": tournament_id,
            "deleted_matches": deleted_matches
        },
        message=f"Tournament matches reset: {deleted_matches} matches deleted"
    )