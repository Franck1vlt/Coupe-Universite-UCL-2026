"""
Point d'entrée de l'application FastAPI
Coupe de l'Université - Backend API
"""

import os
import shutil
import signal
import asyncio
from pathlib import Path

from fastapi import (
    FastAPI, Request, Query, Depends, status, Body, UploadFile, File, HTTPException
)
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging
from typing import Optional, List

from sqlalchemy.orm import Session
from app.db import get_db, init_db
from app.config import settings
from app.exceptions import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    sqlalchemy_exception_handler,
    general_exception_handler,
    create_success_response,
    NotFoundError,
    ConflictError,
    BadRequestError,
)
from app.middleware import (
    SecurityHeadersMiddleware,
    LoggingMiddleware,
    setup_cors,
)

# Logging configuration
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API REST pour la gestion de la Coupe de l'Université",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# Variables globales pour gérer l'arrêt propre
shutdown_event = None

def signal_handler(signum, frame):
    """Gestionnaire de signaux pour un arrêt propre"""
    logger.info(f"Received signal {signum}")
    if shutdown_event:
        shutdown_event.set()

# Installer les gestionnaires de signaux
if hasattr(signal, 'SIGINT'):
    signal.signal(signal.SIGINT, signal_handler)
if hasattr(signal, 'SIGTERM'):
    signal.signal(signal.SIGTERM, signal_handler)

# CORS setup
setup_cors(app, settings)

# Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

@app.on_event("startup")
async def startup_event():
    """Actions à effectuer au démarrage de l'application"""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Database: {settings.DATABASE_URL}")
    # Initialiser la base de données (créer les tables si elles n'existent pas)
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Actions à effectuer à l'arrêt de l'application"""
    logger.info("Shutting down application gracefully...")
    try:
        # Ajouter ici toute logique de nettoyage nécessaire
        # Par exemple: fermer les connexions, sauvegarder des données, etc.
        await asyncio.sleep(0.1)  # Petit délai pour finir les tâches en cours
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

@app.get("/", tags=["General"])
async def root():
    """Point d'entrée de l'API - Informations de base"""
    return create_success_response(
        data={
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running",
            "docs": "/docs" if settings.DEBUG else "disabled",
        },
        message="Welcome to Coupe de l'Université API"
    )

@app.get("/health", tags=["General"])
async def health_check():
    """Vérification de l'état de l'API"""
    try:
        from app.db import engine
        from sqlalchemy import text
        with engine.begin() as conn:
            result = conn.execute(text("SELECT 1"))
            result.scalar()
        return create_success_response(
            data={
                "status": "healthy",
                "database": "connected",
            },
            message="API is healthy"
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": {
                    "code": "SERVICE_UNAVAILABLE",
                    "message": "Service is unhealthy"
                }
            }
        )

# --- Sports ---
from app.models.sport import Sport
from app.schemas.sport import SportResponse, SportCreate, SportUpdate

@app.get("/sports", tags=["Sports"])
async def get_sports(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    name: Optional[str] = Query(None, description="Filtre sur le nom du sport"),
    score_type: Optional[str] = Query(None, description="Filtre par type de score (ex: points, sets...)"),
):
    """
    Liste tous les sports (avec pagination, filtres)
    """
    try:
        query = db.query(Sport)
        if name:
            query = query.filter(Sport.name.ilike(f"%{name}%"))
        if score_type:
            query = query.filter(Sport.score_type == score_type)
        total = query.count()
        sports = query.offset(skip).limit(limit).all()
        
        # Sérialisation manuelle pour éviter les erreurs de colonnes manquantes
        items = []
        for sport in sports:
            sport_data = {
                "id": sport.id,
                "name": sport.name,
                "score_type": sport.score_type
            }
            # Ajouter created_at seulement si la colonne existe
            if hasattr(sport, 'created_at') and sport.created_at is not None:
                sport_data["created_at"] = sport.created_at
            items.append(sport_data)
            
        return create_success_response(
            data={
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            },
            message="Liste des sports récupérée avec succès"
        )
    except Exception as e:
        logger.error(f"Error getting sports: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "DATABASE_ERROR",
                    "message": str(e) if settings.DEBUG else "Database error occurred"
                }
            }
        )

@app.get("/sports/{sport_id}", tags=["Sports"])
async def get_sport_by_id(
    sport_id: int,
    db: Session = Depends(get_db),
):
    """Récupère un sport par ID"""
    try:
        sport = db.query(Sport).filter(Sport.id == sport_id).first()
        if not sport:
            raise NotFoundError(f"Sport with id {sport_id} not found")
        
        # Sérialisation manuelle
        sport_data = {
            "id": sport.id,
            "name": sport.name,
            "score_type": sport.score_type
        }
        if hasattr(sport, 'created_at') and sport.created_at is not None:
            sport_data["created_at"] = sport.created_at
            
        return create_success_response(
            data=sport_data,
            message="Sport récupéré avec succès"
        )
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting sport {sport_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "DATABASE_ERROR",
                    "message": str(e) if settings.DEBUG else "Database error occurred"
                }
            }
        )

@app.post(
    "/sports",
    tags=["Sports"],
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new sport",
)
async def create_sport(
    name: str = Query(..., description="Le nom du sport", examples=["Football", "Basketball"]),
    score_type: str = Query(..., description="Le type de score du sport (ex: points, sets...)", examples=["points", "sets"]),
    db: Session = Depends(get_db),
):
    """
    Crée un nouveau sport.
    """
    try:
        existing = db.query(Sport).filter(Sport.name == name).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Un sport nommé '{name}' existe déjà.")
        sport = Sport(name=name, score_type=score_type)
        db.add(sport)
        db.commit()
        db.refresh(sport)
        
        # Sérialisation manuelle
        sport_data = {
            "id": sport.id,
            "name": sport.name,
            "score_type": sport.score_type
        }
        if hasattr(sport, 'created_at') and sport.created_at is not None:
            sport_data["created_at"] = sport.created_at
            
        return create_success_response(
            data=sport_data,
            message="Sport créé avec succès"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating sport: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "DATABASE_ERROR",
                    "message": str(e) if settings.DEBUG else "Database error occurred"
                }
            }
        )

@app.put(
    "/sports/{sport_id}",
    tags=["Sports"],
    response_model=dict,
    summary="Edit existing sport"
)
async def update_sport(
    sport_id: int,
    name: str = Query(None, description="Nouveau nom du sport"),
    score_type: str = Query(None, description="Nouveau type de score du sport (ex: points, sets...)"),
    db: Session = Depends(get_db)
):
    """
    Modifie un sport existant.
    """
    try:
        sport = db.query(Sport).filter(Sport.id == sport_id).first()
        if not sport:
            raise NotFoundError(f"Sport with id {sport_id} not found")
        # Si le nom est modifié, vérifier unicité
        if name is not None and name != sport.name:
            existing = db.query(Sport).filter(Sport.name == name).first()
            if existing:
                raise BadRequestError(f"Un sport nommé '{name}' existe déjà.")
            sport.name = name
        if score_type is not None:
            sport.score_type = score_type
        db.commit()
        db.refresh(sport)
        
        # Sérialisation manuelle
        sport_data = {
            "id": sport.id,
            "name": sport.name,
            "score_type": sport.score_type
        }
        if hasattr(sport, 'created_at') and sport.created_at is not None:
            sport_data["created_at"] = sport.created_at
            
        return create_success_response(
            data=sport_data,
            message="Sport modifié avec succès"
        )
    except (NotFoundError, BadRequestError):
        raise
    except Exception as e:
        logger.error(f"Error updating sport {sport_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "DATABASE_ERROR",
                    "message": str(e) if settings.DEBUG else "Database error occurred"
                }
            }
        )

@app.delete(
    "/sports/{sport_id}",
    tags=["Sports"],
    response_model=dict,
    summary="Delete a sport"
)
async def delete_sport(
    sport_id: int,
    db: Session = Depends(get_db)
):
    """
    Supprime un sport existant.
    """
    sport = db.query(Sport).filter(Sport.id == sport_id).first()
    if not sport:
        raise NotFoundError(f"Sport with id {sport_id} not found")
    db.delete(sport)
    db.commit()
    return create_success_response(
        data={"deleted_id": sport_id},
        message="Sport supprimé avec succès"
    )

# --- Equipes ---
from app.models.team import Team
from app.schemas.team import TeamResponse, TeamCreate, TeamUpdate

@app.get("/teams", tags=["Teams"])
async def get_teams(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    name: Optional[str] = Query(None, description="Filtre sur le nom de l'équipe"),
):
    """
    Liste toutes les équipes (avec pagination, filtres)
    """
    query = db.query(Team)
    if name:
        query = query.filter(Team.name.ilike(f"%{name}%"))
    total = query.count()
    teams = query.offset(skip).limit(limit).all()
    try:
        items = [TeamResponse.model_validate(t).model_dump(mode="json") for t in teams]
        return create_success_response(
            data={
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            },
            message="Liste des équipes récupérée avec succès"
        )
    except Exception:
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Object of type datetime is not JSON serializable"
            }
        }

@app.get("/teams/{team_id}", tags=["Teams"])
async def get_team_by_id(
    team_id: int,
    db: Session = Depends(get_db),
):
    """Récupère une équipe par ID"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise NotFoundError(f"Team with id {team_id} not found")
    try:
        return create_success_response(
            data=TeamResponse.model_validate(team).model_dump(mode="json"),
            message="Équipe récupérée avec succès"
        )
    except Exception:
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Object of type datetime is not JSON serializable"
            }
        }

@app.post(
    "/teams",
    tags=["Teams"],
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new team",
)
async def create_team(
    name: str = Query(..., description="Le nom de l'équipe", examples=["JUNIA", "FGES"]),
    logo_url: Optional[str] = Query(None, description="Logo de l'équipe"),
    primary_color: str = Query(..., description="Couleur de l'équipe", examples=["bleu", "rouge"]),
    db: Session = Depends(get_db),
):
    """
    Crée une nouvelle équipe.
    """
    existing = db.query(Team).filter(Team.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Une équipe nommée '{name}' existe déjà.")
    team = Team(name=name, logo_url=logo_url, primary_color=primary_color)
    db.add(team)
    db.commit()
    db.refresh(team)
    return create_success_response(
        data=TeamResponse.model_validate(team).model_dump(mode="json"),
        message="Team créée avec succès"
    )

@app.put(
    "/teams/{team_id}",
    tags=["Teams"],
    response_model=dict,
    summary="Edit existing team",
)
async def update_team(
    team_id: int,
    name: Optional[str] = Query(None, description="Nouveau nom de l'équipe"),
    logo_url: Optional[str] = Query(None, description="URL du nouveau logo"),
    primary_color: Optional[str] = Query(None, description="Nouvelle couleur principale de l'équipe"),
    db: Session = Depends(get_db),
):
    """
    Modifie une équipe existante.
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise NotFoundError(f"Team with id {team_id} not found")
    if name is not None and name != team.name:
        existing = db.query(Team).filter(Team.name == name).first()
        if existing:
            raise BadRequestError(f"Une équipe nommée '{name}' existe déjà.")
        team.name = name
    if logo_url is not None:
        team.logo_url = logo_url
    if primary_color is not None:
        team.primary_color = primary_color
    db.commit()
    db.refresh(team)
    return create_success_response(
        data=TeamResponse.model_validate(team).model_dump(mode="json"),
        message="Équipe modifiée avec succès"
    )

@app.delete(
    "/teams/{team_id}",
    tags=["Teams"],
    response_model=dict,
    summary="Delete a team"
)
async def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
):
    """
    Supprime une équipe existante.
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise NotFoundError(f"Team with id {team_id} not found")
    db.delete(team)
    db.commit()
    return create_success_response(
        data={"deleted_id": team_id},
        message="Équipe supprimée avec succès"
    )

# --- Inscriptions d'équipe à un ou plusieurs sports ---
from app.models.teamsport import TeamSport
from app.schemas.teamsport import TeamSportResponse, TeamSportCreate, TeamSportUpdate

@app.get(
    "/teams/{team_id}/sports",
    tags=["TeamSport"],
    response_model=dict,
    summary="Get team's sports",
    description="Récupère tous les sports auxquels une équipe est inscrite avec leur statut (actif/inactif)"
)
async def get_team_sports(
    team_id: int,
    db: Session = Depends(get_db),
):
    """Liste tous les sports d'une équipe avec leur statut d'inscription."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise NotFoundError(f"Équipe avec l'id {team_id} introuvable")
    team_sports = (
        db.query(TeamSport)
        .filter(TeamSport.team_id == team_id)
        .all()
    )
    return create_success_response(
        data=[TeamSportResponse.model_validate(ts).model_dump() for ts in team_sports],
        message=f"{len(team_sports)} sport(s) trouvé(s) pour cette équipe"
    )

@app.post(
    "/teams/{team_id}/sports",
    tags=["TeamSport"],
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
    summary="Register team to sports",
    description="Crée une ou plusieurs inscriptions pour une équipe dans différents sports"
)
async def create_team_sports(
    team_id: int,
    payload: List[TeamSportCreate] = Body(..., min_length=1, embed=False),
    db: Session = Depends(get_db),
):
    """Inscrit une équipe à un ou plusieurs sports."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise NotFoundError(f"Équipe avec l'id {team_id} introuvable")

    # On interdit team_id dans le payload
    payload_has_team_id = [
        (idx, getattr(item, "team_id", None)) for idx, item in enumerate(payload) if getattr(item, "team_id", None) is not None
    ]
    if payload_has_team_id:
        err = {
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Validation error",
                "details": [
                    {
                        "field": f"body.{idx}.team_id",
                        "message": "Field not allowed",
                        "type": "forbidden"
                    }
                    for idx, _ in payload_has_team_id
                ],
            }
        }
        raise HTTPException(status_code=422, detail=err["error"])

    sport_ids = [item.sport_id for item in payload]
    existing_sports = db.query(Sport.id).filter(Sport.id.in_(sport_ids)).all()
    existing_sport_ids = {s.id for s in existing_sports}
    missing_sports = set(sport_ids) - existing_sport_ids
    if missing_sports:
        raise NotFoundError(f"Sport(s) introuvable(s) : {', '.join(map(str, missing_sports))}")

    existing_registrations = (
        db.query(TeamSport.sport_id)
        .filter(
            TeamSport.team_id == team_id,
            TeamSport.sport_id.in_(sport_ids)
        )
        .all()
    )
    existing_reg_ids = {reg.sport_id for reg in existing_registrations}
    if existing_reg_ids:
        raise ConflictError(
            f"L'équipe est déjà inscrite dans le(s) sport(s) : {', '.join(map(str, existing_reg_ids))}"
        )

    created_items = []
    for item in payload:
        team_sport = TeamSport(
            team_id=team_id,
            sport_id=item.sport_id,
            team_sport_name=item.team_sport_name,
            is_active=item.is_active if item.is_active is not None else True
        )
        db.add(team_sport)
        created_items.append(team_sport)
    db.commit()
    for ts in created_items:
        db.refresh(ts)
    return create_success_response(
        data=[TeamSportResponse.model_validate(ts).model_dump() for ts in created_items],
        message=f"{len(created_items)} inscription(s) créée(s) avec succès"
    )

@app.delete(
    "/teams/{team_id}/sports/{sport_id}",
    tags=["TeamSport"],
    status_code=status.HTTP_200_OK,
    response_model=dict,
    summary="Delete team sport registration",
    description="Désincrit complètement une équipe d'un sport"
)
async def delete_team_sport(
    team_id: int,
    sport_id: int,
    db: Session = Depends(get_db),
):
    """Supprime l'inscription d'une équipe à un sport spécifique."""
    team_sport = (
        db.query(TeamSport)
        .filter(
            TeamSport.team_id == team_id,
            TeamSport.sport_id == sport_id
        )
        .first()
    )
    if not team_sport:
        raise NotFoundError(
            f"Inscription introuvable (équipe #{team_id}, sport #{sport_id})"
        )
    db.delete(team_sport)
    db.commit()
    return create_success_response(
        data={
            "team_id": team_id,
            "sport_id": sport_id,
            "deleted": True
        },
        message="Inscription supprimée avec succès"
    )

@app.patch(
    "/teams/{team_id}/sports/{sport_id}",
    tags=["TeamSport"],
    response_model=dict,
    summary="Update team sport registration",
    description="Met à jour le statut (actif/inactif) ou le nom spécifique d'une inscription"
)
async def update_team_sport(
    team_id: int,
    sport_id: int,
    payload: TeamSportUpdate,
    db: Session = Depends(get_db),
):
    """Modifie le statut ou le nom d'une inscription équipe-sport."""
    team_sport = (
        db.query(TeamSport)
        .filter(
            TeamSport.team_id == team_id,
            TeamSport.sport_id == sport_id
        )
        .first()
    )
    if not team_sport:
        raise NotFoundError(
            f"Inscription introuvable (équipe #{team_id}, sport #{sport_id})"
        )
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team_sport, field, value)
    db.commit()
    db.refresh(team_sport)
    return create_success_response(
        data=TeamSportResponse.model_validate(team_sport).model_dump(),
        message="Inscription modifiée avec succès"
    )

# --- Joueurs ---
from app.models.player import Player
from app.schemas.player import PlayerResponse

@app.get("/players", tags=["Players"])
async def get_players(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    team_id: Optional[int] = Query(None, description="Filtre sur l'ID de l'équipe"),
    sport_id: Optional[int] = Query(None, description="Filtre sur l'ID du sport"),
):
    """
    Liste tous les joueurs (avec pagination, filtres)
    """
    query = db.query(Player)
    if team_id is not None:
        query = query.filter(Player.team_id == team_id)
    if sport_id is not None:
        query = query.filter(Player.sport_id == sport_id)
    total = query.count()
    players = query.offset(skip).limit(limit).all()
    return create_success_response(
        data={
            "items": [PlayerResponse.model_validate(p) for p in players],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
        message="Liste des joueurs récupérée avec succès"
    )

@app.get("/players/{player_id}", tags=["Players"])
async def get_player_by_id(
    player_id: int,
    db: Session = Depends(get_db),
):
    """Récupère un joueur par ID"""
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise NotFoundError(f"Player with id {player_id} not found")
    return create_success_response(
        data=PlayerResponse.model_validate(player),
        message="Joueur récupéré avec succès"
    )

@app.get("/team-sports/{team_sport_id}/players", tags=["Players"])
async def get_players_of_team_sport(
    team_sport_id: int,
    db: Session = Depends(get_db),
):
    """Liste les joueurs d'une inscription équipe-sport"""
    players = db.query(Player).filter(Player.team_sport_id == team_sport_id).all()
    return create_success_response(
        data=[PlayerResponse.model_validate(p) for p in players],
        message="Liste des joueurs de l'équipe-sport récupérée avec succès"
    )

# --- Terrains ---
from app.models.court import Court
from app.schemas.court import CourtResponse, CourtCreate, CourtUpdate
from app.models.sport import Sport

@app.get("/courts", status_code=status.HTTP_200_OK, tags=["Courts"])
async def get_courts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Liste tous les terrains avec pagination"""
    try:
        courts = db.query(Court).offset(skip).limit(limit).all()
        total = db.query(Court).count()
        
        return create_success_response(
            data={
                "items": [CourtResponse.model_validate(c).model_dump() for c in courts],
                "total": total, 
                "skip": skip, 
                "limit": limit
            },
            message="Liste des terrains récupérée avec succès"
        )
    except Exception as e:
        logger.error(f"Error fetching courts: {str(e)}")
        raise

@app.get("/courts/sports", status_code=status.HTTP_200_OK, tags=["Courts"])
async def get_available_sports_for_courts(db: Session = Depends(get_db)):
    """Liste tous les sports disponibles pour les terrains"""
    try:
        sports = db.query(Sport).all()
        return create_success_response(
            data=[{"id": s.id, "name": s.name, "score_type": s.score_type} for s in sports],
            message="Liste des sports disponibles récupérée avec succès"
        )
    except Exception as e:
        logger.error(f"Error fetching sports: {str(e)}")
        raise

@app.get("/courts/{court_id}", status_code=status.HTTP_200_OK, tags=["Courts"])
async def get_court_by_id(court_id: int, db: Session = Depends(get_db)):
    """Récupère un terrain par ID"""
    court = db.query(Court).filter(Court.id == court_id).first()
    if not court:
        raise NotFoundError(f"Court {court_id} introuvable")
    return create_success_response(
        data=CourtResponse.model_validate(court).model_dump(),
        message="Terrain récupéré avec succès"
    )

@app.post("/courts", status_code=status.HTTP_201_CREATED, tags=["Courts"])
async def create_court(
    name: str = Query(..., description="Nom du terrain"),
    sport_id: Optional[int] = Query(None, description="ID du sport principal associé (optionnel)"),
    is_active: bool = Query(True, description="Le terrain est-il actif ?"),
    db: Session = Depends(get_db),
):
    """Crée un nouveau terrain"""
    try:
        # Vérifier que le sport existe si fourni
        if sport_id:
            sport = db.query(Sport).filter(Sport.id == sport_id).first()
            if not sport:
                raise NotFoundError(f"Sport avec l'ID {sport_id} introuvable")
        
        # Vérifier l'unicité du nom
        existing = db.query(Court).filter(Court.name == name).first()
        if existing:
            raise ConflictError(f"Un terrain avec le nom '{name}' existe déjà")
        
        court = Court(name=name, sport_id=sport_id, is_active=is_active)
        db.add(court)
        db.commit()
        db.refresh(court)
        
        return create_success_response(
            data=CourtResponse.model_validate(court).model_dump(),
            message="Terrain créé avec succès"
        )
    except Exception as e:
        logger.error(f"Error creating court: {str(e)}")
        raise

@app.put("/courts/{court_id}", status_code=status.HTTP_200_OK, tags=["Courts"])
async def update_court(
    court_id: int,
    name: Optional[str] = Query(None, description="Nom du terrain"),
    sport_id: Optional[int] = Query(None, description="ID du sport principal associé (optionnel, -1 pour supprimer)"),
    is_active: Optional[bool] = Query(None, description="Le terrain est-il actif ?"),
    db: Session = Depends(get_db),
):
    """Met à jour un terrain existant"""
    try:
        court = db.query(Court).filter(Court.id == court_id).first()
        if not court:
            raise NotFoundError(f"Terrain avec l'ID {court_id} introuvable")
        
        if name is not None:
            # Vérifier l'unicité du nom (sauf pour le terrain actuel)
            existing = db.query(Court).filter(
                Court.name == name, Court.id != court_id
            ).first()
            if existing:
                raise ConflictError(f"Un autre terrain avec le nom '{name}' existe déjà")
            court.name = name
            
        if sport_id is not None:
            if sport_id == -1:
                # -1 signifie supprimer l'association
                court.sport_id = None
            else:
                # Vérifier que le sport existe
                sport = db.query(Sport).filter(Sport.id == sport_id).first()
                if not sport:
                    raise NotFoundError(f"Sport avec l'ID {sport_id} introuvable")
                court.sport_id = sport_id
                
        if is_active is not None:
            court.is_active = is_active
        
        db.commit()
        db.refresh(court)
        
        return create_success_response(
            data=CourtResponse.model_validate(court).model_dump(),
            message="Terrain modifié avec succès"
        )
    except Exception as e:
        logger.error(f"Error updating court: {str(e)}")
        raise

@app.patch("/courts/{court_id}", status_code=status.HTTP_200_OK, tags=["Courts"])
async def partial_update_court(court_id: int, payload: CourtUpdate, db: Session = Depends(get_db)):
    """
    Modifie partiellement un terrain
    """
    try:
        court = db.query(Court).filter(Court.id == court_id).first()
        if not court:
            raise NotFoundError(f"Terrain avec l'ID {court_id} introuvable")
        
        if payload.name is not None:
            # Vérifier l'unicité du nom
            existing = db.query(Court).filter(
                Court.name == payload.name, Court.id != court_id
            ).first()
            if existing:
                raise ConflictError(f"Un autre terrain avec le nom '{payload.name}' existe déjà")
            court.name = payload.name
            
        if payload.sport_id is not None:
            # Vérifier que le sport existe
            sport = db.query(Sport).filter(Sport.id == payload.sport_id).first()
            if not sport:
                raise NotFoundError(f"Sport avec l'ID {payload.sport_id} introuvable")
            court.sport_id = payload.sport_id
            
        if payload.is_active is not None:
            court.is_active = payload.is_active
        
        db.commit()
        db.refresh(court)
        
        return create_success_response(
            data=CourtResponse.model_validate(court).model_dump(),
            message="Terrain partiellement modifié avec succès"
        )
    except Exception as e:
        logger.error(f"Error updating court: {str(e)}")
        raise

@app.delete("/courts/{court_id}", status_code=status.HTTP_200_OK, tags=["Courts"])
async def delete_court(court_id: int, db: Session = Depends(get_db)):
    """
    Supprime un terrain
    """
    try:
        court = db.query(Court).filter(Court.id == court_id).first()
        if not court:
            raise NotFoundError(f"Terrain avec l'ID {court_id} introuvable")
        
        # Vérifier s'il y a des matchs programmés sur ce terrain
        if hasattr(court, 'match_schedules') and court.match_schedules:
            from datetime import datetime
            future_matches = [
                schedule for schedule in court.match_schedules 
                if schedule.scheduled_start_time > datetime.now()
            ]
            if future_matches:
                raise ConflictError(
                    f"Impossible de supprimer le terrain : {len(future_matches)} match(s) programmé(s)"
                )
        
        db.delete(court)
        db.commit()
        
        return create_success_response(
            data={"deleted_id": court_id},
            message="Terrain supprimé avec succès"
        )
    except Exception as e:
        logger.error(f"Error deleting court: {str(e)}")
        raise

# --- Tournois ---
from app.models.tournament import Tournament
from app.schemas.tournament import TournamentResponse

@app.get("/tournaments", tags=["Tournaments"])
async def get_tournaments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Liste tous les tournois"""
    tournaments = db.query(Tournament).offset(skip).limit(limit).all()
    total = db.query(Tournament).count()
    return create_success_response(
        data={"items": [TournamentResponse.model_validate(t) for t in tournaments], "total": total, "skip": skip, "limit": limit},
        message="Liste des tournois récupérée avec succès"
    )

@app.get("/tournaments/{tournament_id}", tags=["Tournaments"])
async def get_tournament_by_id(
    tournament_id: int,
    db: Session = Depends(get_db),
):
    """Récupère un tournoi par ID"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament with id {tournament_id} not found")
    return create_success_response(
        data=TournamentResponse.model_validate(tournament),
        message="Tournoi récupéré avec succès"
    )

from app.models.tournamentphase import TournamentPhase
from app.schemas.tournamentphase import TournamentPhaseResponse
from app.models.tournamentranking import TournamentRanking
from app.schemas.tournamentranking import TournamentRankingResponse

@app.get("/tournaments/{tournament_id}/phases", tags=["Tournaments"])
async def get_phases_of_tournament(
    tournament_id: int,
    db: Session = Depends(get_db),
):
    """Liste les phases d'un tournoi"""
    phases = db.query(TournamentPhase).filter(TournamentPhase.tournament_id == tournament_id).all()
    return create_success_response(
        data=[TournamentPhaseResponse.model_validate(p) for p in phases],
        message="Phases du tournoi récupérées avec succès"
    )

@app.get("/tournaments/{tournament_id}/ranking", tags=["Tournaments"])
async def get_ranking_of_tournament(
    tournament_id: int,
    db: Session = Depends(get_db),
):
    """Classement final du tournoi"""
    rankings = db.query(TournamentRanking).filter(TournamentRanking.tournament_id == tournament_id).order_by(TournamentRanking.rank.asc()).all()
    return create_success_response(
        data=[TournamentRankingResponse.model_validate(r) for r in rankings],
        message="Classement du tournoi récupéré avec succès"
    )

# --- Configuration de tournoi ---
from app.models.tournamentconfiguration import TournamentConfiguration
from app.schemas.tournamentconfiguration import TournamentConfigurationResponse

@app.get("/tournaments/{tournament_id}/configuration", tags=["TournamentConfiguration"])
async def get_tournament_configuration(
    tournament_id: int,
    db: Session = Depends(get_db),
):
    """Récupère la configuration d'un tournoi par ID"""
    config = db.query(TournamentConfiguration).filter(TournamentConfiguration.tournament_id == tournament_id).first()
    if not config:
        raise NotFoundError(f"Tournament configuration for id {tournament_id} not found")
    return create_success_response(
        data=TournamentConfigurationResponse.model_validate(config),
        message="Configuration du tournoi récupérée avec succès"
    )

# --- Phases de tournoi ---
@app.get("/tournament-phases/{phase_id}", tags=["TournamentPhases"])
async def get_tournament_phase_by_id(
    phase_id: int,
    db: Session = Depends(get_db),
):
    """Récupère une phase de tournoi par ID"""
    phase = db.query(TournamentPhase).filter(TournamentPhase.id == phase_id).first()
    if not phase:
        raise NotFoundError(f"Tournament phase with id {phase_id} not found")
    return create_success_response(
        data=TournamentPhaseResponse.model_validate(phase),
        message="Phase du tournoi récupérée avec succès"
    )

@app.get("/tournament-phases/{phase_id}/matches", tags=["TournamentPhases"])
async def get_matches_of_tournament_phase(
    phase_id: int,
    db: Session = Depends(get_db),
):
    """Liste les matchs d'une phase de tournoi"""
    phase = db.query(TournamentPhase).filter(TournamentPhase.id == phase_id).first()
    if not phase:
        raise NotFoundError(f"Tournament phase with id {phase_id} not found")
    matches = db.query(Match).filter(Match.phase_id == phase_id).all()
    return create_success_response(
        data=[MatchResponse.model_validate(m) for m in matches],
        message="Matchs de la phase récupérés avec succès"
    )

# --- Poules ---
from app.models.pool import Pool
from app.schemas.pool import PoolResponse
from app.schemas.team import TeamResponse
from app.schemas.match import MatchResponse
from app.models.teampool import TeamPool
from app.schemas.teampool import TeamPoolResponse
from app.services.pool_service import calculate_pool_standings

@app.get("/pools/{pool_id}", response_model=dict, tags=["Pools"])
async def get_pool(pool_id: int, db: Session = Depends(get_db)):
    """Récupère une poule par ID"""
    pool = db.query(Pool).filter(Pool.id == pool_id).first()
    if not pool:
        raise NotFoundError(f"Pool with id {pool_id} not found")
    return create_success_response(
        data=PoolResponse.model_validate(pool),
        message="Poule récupérée avec succès"
    )

@app.get("/pools/{pool_id}/teams", response_model=dict, tags=["Pools"])
async def get_teams_in_pool(pool_id: int, db: Session = Depends(get_db)):
    """Liste les équipes d'une poule"""
    pool = db.query(Pool).filter(Pool.id == pool_id).first()
    if not pool:
        raise NotFoundError(f"Pool with id {pool_id} not found")
    team_pools = db.query(TeamPool).filter(TeamPool.pool_id == pool_id).all()
    teams = [tp.team for tp in team_pools]
    return create_success_response(
        data=[TeamResponse.model_validate(team) for team in teams],
        message="Équipes de la poule récupérées avec succès"
    )

@app.get("/pools/{pool_id}/matches", response_model=dict, tags=["Pools"])
async def get_matches_in_pool(pool_id: int, db: Session = Depends(get_db)):
    """Liste les matchs d'une poule"""
    pool = db.query(Pool).filter(Pool.id == pool_id).first()
    if not pool:
        raise NotFoundError(f"Pool with id {pool_id} not found")
    matches = db.query(Match).filter(Match.pool_id == pool_id).all()
    return create_success_response(
        data=[MatchResponse.model_validate(m) for m in matches],
        message="Matchs de la poule récupérés avec succès"
    )

@app.get("/pools/{pool_id}/standings", response_model=dict, tags=["Pools"])
async def get_pool_standings(pool_id: int, db: Session = Depends(get_db)):
    """Classement d'une poule (calcul automatique)"""
    pool = db.query(Pool).filter(Pool.id == pool_id).first()
    if not pool:
        raise NotFoundError(f"Pool with id {pool_id} not found")
    standings = calculate_pool_standings(pool_id=pool_id, db=db)
    return create_success_response(
        data=standings,
        message="Classement de la poule récupéré avec succès"
    )

# --- Equipes dans les poules ---
from app.schemas.teampool import TeamPoolResponse

@app.get("/team-pools/{team_pool_id}", response_model=dict, tags=["TeamPool"])
async def get_team_pool(team_pool_id: int, db: Session = Depends(get_db)):
    """Récupère une équipe-poule par ID"""
    team_pool = db.query(TeamPool).filter(TeamPool.id == team_pool_id).first()
    if not team_pool:
        raise NotFoundError(f"TeamPool with id {team_pool_id} not found")
    return create_success_response(
        data=TeamPoolResponse.model_validate(team_pool),
        message="Équipe-poule récupérée avec succès"
    )

# --- Matches & Sets ---
from app.models.match import Match
from app.schemas.match import MatchResponse
from app.models.matchset import MatchSet
from app.schemas.matchset import MatchSetResponse

@app.get("/matches", response_model=dict, tags=["Matches"])
async def get_matches(
    sport_id: Optional[int] = Query(None),
    phase_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Liste tous les matchs (avec filtres : sport, phase, statut, date)"""
    query = db.query(Match)
    if sport_id is not None:
        query = query.filter(Match.sport_id == sport_id)
    if phase_id is not None:
        query = query.filter(Match.phase_id == phase_id)
    if status is not None:
        query = query.filter(Match.status == status)
    if date is not None:
        query = query.filter(Match.date == date)
    matches = query.offset(skip).limit(limit).all()
    return create_success_response(
        data=[MatchResponse.model_validate(m) for m in matches],
        message="Matchs récupérés avec succès"
    )

@app.get("/matches/{match_id}", response_model=dict, tags=["Matches"])
async def get_match(match_id: int, db: Session = Depends(get_db)):
    """Récupère un match par ID"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise NotFoundError(f"Match with id {match_id} not found")
    return create_success_response(
        data=MatchResponse.model_validate(match),
        message="Match récupéré avec succès"
    )

@app.get("/matches/{match_id}/sets", response_model=dict, tags=["Matches"])
async def get_match_sets(match_id: int, db: Session = Depends(get_db)):
    """Liste les sets d'un match"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise NotFoundError(f"Match with id {match_id} not found")
    match_sets = db.query(MatchSet).filter(MatchSet.match_id == match_id).all()
    return create_success_response(
        data=[MatchSetResponse.model_validate(s) for s in match_sets],
        message="Sets du match récupérés avec succès"
    )

# --- Planification de matchs ---
from app.models.matchschedule import MatchSchedule
from app.schemas.matchschedule import MatchScheduleResponse

@app.get("/matches/{match_id}/schedule", response_model=dict, tags=["MatchSchedule"])
async def get_match_schedule(match_id: int, db: Session = Depends(get_db)):
    """Planification d'un match"""
    schedule = db.query(MatchSchedule).filter(MatchSchedule.match_id == match_id).first()
    if not schedule:
        raise NotFoundError(f"Schedule for match {match_id} not found")
    return create_success_response(
        data=MatchScheduleResponse.model_validate(schedule),
        message="Planification du match récupérée avec succès"
    )

@app.get("/courts/{court_id}/schedule", response_model=dict, tags=["MatchSchedule"])
async def get_court_schedule(court_id: int, db: Session = Depends(get_db)):
    """Planning d'un terrain (tous les matchs prévus sur ce terrain)"""
    schedules = db.query(MatchSchedule).filter(MatchSchedule.court_id == court_id).all()
    return create_success_response(
        data=[MatchScheduleResponse.model_validate(s) for s in schedules],
        message="Planification du terrain récupérée avec succès"
    )

# --- Sets de match ---
@app.get("/match-sets/{set_id}", response_model=dict, tags=["MatchSet"])
async def get_match_set(set_id: int, db: Session = Depends(get_db)):
    """Récupère un set par ID"""
    match_set = db.query(MatchSet).filter(MatchSet.id == set_id).first()
    if not match_set:
        raise NotFoundError(f"Set with id {set_id} not found")
    return create_success_response(
        data=MatchSetResponse.model_validate(match_set),
        message="Set du match récupéré avec succès"
    )

# NB: Routers à activer plus tard si besoin
# app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Authentication"])
# app.include_router(tournaments.router, prefix=f"{settings.API_V1_PREFIX}/tournaments", tags=["Tournaments"])
# app.include_router(matches.router, prefix=f"{settings.API_V1_PREFIX}/matches", tags=["Matches"])

if __name__ == "__main__":
    import uvicorn
    import sys
    from pathlib import Path
    
    # Ajouter le répertoire parent (Backend) au PYTHONPATH
    backend_dir = Path(__file__).parent.parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    
    try:
        uvicorn.run(
            "app.main:app",
            host="127.0.0.1",
            port=8000,
            reload=settings.DEBUG,
            log_level="info",
        )
    except KeyboardInterrupt:
        logger.info("Application interrupted by user")
    except Exception as e:
        logger.error(f"Application failed to start: {e}")
        raise
