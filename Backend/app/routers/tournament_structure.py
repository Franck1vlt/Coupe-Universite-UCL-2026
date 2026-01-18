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

    def collect_destinations(m_data):
        """Collecte les UUIDs de destination pour résolution ultérieure"""
        def get_val(obj, key, default=None):
            if isinstance(obj, dict): return obj.get(key, default)
            return getattr(obj, key, default)

        m_uuid = get_val(m_data, 'uuid')
        winner_dest_uuid = get_val(m_data, 'winner_destination_match_uuid')
        loser_dest_uuid = get_val(m_data, 'loser_destination_match_uuid')
        winner_slot = get_val(m_data, 'winner_destination_slot')
        loser_slot = get_val(m_data, 'loser_destination_slot')

        if m_uuid and (winner_dest_uuid or loser_dest_uuid):
            pending_destinations.append((m_uuid, winner_dest_uuid, loser_dest_uuid, winner_slot, loser_slot))
            print(f"[COLLECT] Match {m_uuid} -> winnerDest={winner_dest_uuid} (slot {winner_slot}), loserDest={loser_dest_uuid} (slot {loser_slot})")

    # --- TRAITEMENT DES SECTIONS (PASSE 1 : Création des matchs) ---
    if structure.qualification_matches:
        p = get_or_create_phase("qualifications", 1)
        for m in structure.qualification_matches:
            collect_destinations(m)
            upsert_match(m, p.id, "qualification")

    if structure.pools:
        p = get_or_create_phase("pools", 2)
        for p_data in structure.pools:
            pool = db.query(Pool).filter(Pool.phase_id == p.id, Pool.name == p_data.name).first()
            if not pool:
                pool = Pool(phase_id=p.id, name=p_data.name, order=p_data.display_order)
                db.add(pool)
                db.flush()
            if hasattr(p_data, 'matches') and p_data.matches:
                for m in p_data.matches:
                    collect_destinations(m)
                    upsert_match(m, p.id, "pool", pool.id)

    if structure.brackets:
        phase_final = get_or_create_phase("final", 3)
        for bracket_group in structure.brackets:
            for m_data in bracket_group.matches:
                collect_destinations(m_data)
                upsert_match(m_data, phase_final.id, "bracket")

    if structure.loser_brackets:
        phase_loser = get_or_create_phase("loser_bracket", 4)
        for loser_bracket_group in structure.loser_brackets:
            for m_data in loser_bracket_group.matches:
                m_dict = {**m_data.dict(), "bracket_type": "loser"}
                collect_destinations(m_dict)
                upsert_match(m_dict, phase_loser.id, "bracket")

    # Flush pour s'assurer que tous les matchs ont des IDs
    db.flush()

    # --- PASSE 2 : Résolution des UUIDs de destination en IDs ---
    if pending_destinations:
        print(f"[RESOLVE] Résolution de {len(pending_destinations)} destinations UUID...")

        # Récupérer tous les matchs du tournoi pour construire le mapping UUID -> ID
        all_matches = (
            db.query(Match)
            .join(TournamentPhase)
            .filter(TournamentPhase.tournament_id == tournament_id)
            .all()
        )

        # Créer les mappings UUID -> ID et ID (string) -> ID
        uuid_to_id = {}
        for m in all_matches:
            if m.uuid:
                uuid_to_id[m.uuid] = m.id
            # Aussi mapper l'ID string vers l'ID (pour les cas où l'ID frontend est déjà un ID SQL)
            uuid_to_id[str(m.id)] = m.id

        print(f"[RESOLVE] Mapping créé avec {len(uuid_to_id)} entrées")

        # Résoudre chaque destination
        for (match_uuid, winner_dest_uuid, loser_dest_uuid, winner_slot, loser_slot) in pending_destinations:
            # Trouver le match source
            source_match = next((m for m in all_matches if m.uuid == match_uuid), None)
            if not source_match:
                print(f"[RESOLVE] ⚠️ Match source non trouvé: {match_uuid}")
                continue

            updated = False

            # Résoudre la destination du vainqueur
            if winner_dest_uuid and winner_dest_uuid in uuid_to_id:
                source_match.winner_destination_match_id = uuid_to_id[winner_dest_uuid]
                source_match.winner_destination_slot = winner_slot
                updated = True
                print(f"[RESOLVE] ✅ Match {source_match.label or source_match.id}: winner -> ID {uuid_to_id[winner_dest_uuid]} (slot {winner_slot})")

            # Résoudre la destination du perdant
            if loser_dest_uuid and loser_dest_uuid in uuid_to_id:
                source_match.loser_destination_match_id = uuid_to_id[loser_dest_uuid]
                source_match.loser_destination_slot = loser_slot
                updated = True
                print(f"[RESOLVE] ✅ Match {source_match.label or source_match.id}: loser -> ID {uuid_to_id[loser_dest_uuid]} (slot {loser_slot})")

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
    
    qualification_matches = []
    pools_data = []
    bracket_matches = []
    loser_bracket_matches = []

    def match_to_dict_internal(m):
        return {
            "id": m.id,
            "uuid": getattr(m, 'uuid', None),
            "match_type": m.match_type,
            "bracket_type": m.bracket_type,
            "team_a_source": m.team_a_source,
            "team_b_source": m.team_b_source,

            # --- DESTINATIONS ET SLOTS ---
            "winner_destination_match_id": m.winner_destination_match_id,
            "loser_destination_match_id": m.loser_destination_match_id,
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
            
        # 2. Gestion des Poules
        elif "poule" in p_type:
            pools = db.query(Pool).filter(Pool.phase_id == phase.id).all()
            for pool in pools:
                pool_matches = [m for m in matches if m.pool_id == pool.id]
                pools_data.append({
                    "id": pool.id,
                    "name": pool.name,
                    "matches": [match_to_dict_internal(m) for m in pool_matches]
                })
                
        # 3. Gestion des Brackets (élimination, finale, etc.)
        else:
            for m in matches:
                if m.match_type == "loser_bracket":
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