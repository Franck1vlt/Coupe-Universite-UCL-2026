"""
Point d'entrée de l'application FastAPI
Coupe de l'Université - Backend API
"""

import os
import shutil
import signal
import asyncio
from pathlib import Path
from datetime import datetime

from fastapi import (
    FastAPI, Request, Query, Depends, status, Body, UploadFile, File, HTTPException
)
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging
from app.utils.serializers import match_to_dict
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
logger.info(f"CORS_ORIGINS: {settings.CORS_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Autres Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)


# Import du router courts_status
from app.routers import tournament_structure
app.include_router(
    tournament_structure.router, 
    prefix="",
    tags=["Tournaments"]
)
from app.routers import courts_status
app.include_router(courts_status.router, tags=["Courts"])

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
    print("\n📋 Routes disponibles:")
    for route in app.routes:
        if hasattr(route, "methods"):
            print(f"  {route.methods} {route.path}")
    print("\n")
    
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
        data=[TeamSportResponse.model_validate(ts).model_dump(mode="json") for ts in team_sports],
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
        data=[TeamSportResponse.model_validate(ts).model_dump(mode="json") for ts in created_items],
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
        data=TeamSportResponse.model_validate(team_sport).model_dump(mode="json"),
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
            "items": [PlayerResponse.model_validate(p).model_dump(mode="json") for p in players],
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
        data=PlayerResponse.model_validate(player).model_dump(mode="json"),
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
        data=[PlayerResponse.model_validate(p).model_dump(mode="json") for p in players],
        message="Liste des joueurs de l'équipe-sport récupérée avec succès"
    )

@app.get("/team-sports/{team_sport_id}", tags=["TeamSport"])
async def get_team_sport(
    team_sport_id: int,
    db: Session = Depends(get_db),
):
    """Récupère les détails d'une inscription équipe-sport"""
    team_sport = db.query(TeamSport).filter(TeamSport.id == team_sport_id).first()
    if not team_sport:
        raise NotFoundError(f"TeamSport with id {team_sport_id} not found")
    return create_success_response(
        data=TeamSportResponse.model_validate(team_sport).model_dump(mode="json"),
        message="TeamSport récupéré avec succès"
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
                "items": [CourtResponse.model_validate(c).model_dump(mode="json") for c in courts],
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
        data=CourtResponse.model_validate(court).model_dump(mode="json"),
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
            data=CourtResponse.model_validate(court).model_dump(mode="json"),
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
            data=CourtResponse.model_validate(court).model_dump(mode="json"),
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
            data=CourtResponse.model_validate(court).model_dump(mode="json"),
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

# @app.get("/tournaments", tags=["Tournaments"])
# async def get_tournaments(
#     skip: int = 0,
#     limit: int = 100,
#     sport_id: Optional[int] = Query(None, description="Filtrer par sport"),
#     status: Optional[str] = Query(None, description="Filtrer par statut"),
#     db: Session = Depends(get_db),
# ):
#     """Liste tous les tournois avec filtres optionnels"""
#     query = db.query(Tournament)
    
#     if sport_id is not None:
#         query = query.filter(Tournament.sport_id == sport_id)
#     if status is not None:
#         query = query.filter(Tournament.status == status)
    
#     total = query.count()
#     tournaments = query.offset(skip).limit(limit).all()
    
#     return create_success_response(
#         data={"items": [TournamentResponse.model_validate(t).model_dump(mode="json") for t in tournaments], "total": total, "skip": skip, "limit": limit},
#         message="Liste des tournois récupérée avec succès"
#     )

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
        data=TournamentResponse.model_validate(tournament).model_dump(mode="json"),
        message="Tournoi récupéré avec succès"
    )

from app.schemas.tournament import TournamentCreate, TournamentUpdate

@app.patch("/tournaments/{tournament_id}", tags=["Tournaments"])
async def update_tournament(
    tournament_id: int,
    tournament_update: TournamentUpdate,
    db: Session = Depends(get_db),
):
    """Met à jour un tournoi et optionnellement sa structure"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament with id {tournament_id} not found")
    
    # Extraire les données de structure
    update_data = tournament_update.model_dump(exclude_unset=True)
    structure_data = {}
    for key in ['qualification_matches', 'pools', 'brackets', 'loser_brackets']:
        if key in update_data:
            structure_data[key] = update_data.pop(key)
    
    # Vérifier le sport si fourni
    if "sport_id" in update_data:
        sport = db.query(Sport).filter(Sport.id == update_data["sport_id"]).first()
        if not sport:
            raise NotFoundError(f"Sport with id {update_data['sport_id']} not found")
    
    # Mettre à jour les champs du tournoi
    for field, value in update_data.items():
        setattr(tournament, field, value)
    
    # Si la structure est fournie, la mettre à jour
    if structure_data:
        from app.models.tournamentphase import TournamentPhase
        from app.models.pool import Pool
        from app.models.teampool import TeamPool
        from app.models.match import Match
        from app.models.matchschedule import MatchSchedule
        from app.services.tournament_team_assignment import (
            assign_teams_to_matches,
            assign_teams_to_pool_matches,
            create_match_schedule_if_court
        )
        
        # Récupérer ou créer la phase
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
        
        # Récupérer les matchs existants pour la comparaison
        existing_matches = db.query(Match).filter(Match.phase_id == phase.id).all()
        existing_match_ids = {m.id for m in existing_matches}
        
        # Traiter les matchs de qualification
        if 'qualification_matches' in structure_data:
            processed_qualif_matches = assign_teams_to_matches(
                db,
                structure_data['qualification_matches'],
                tournament.sport_id
            )
            
            existing_qualif_matches = db.query(Match).filter(
                Match.phase_id == phase.id,
                Match.match_type == "qualification"
            ).all()
            existing_map = {m.id: m for m in existing_qualif_matches}
            processed_ids = set()
            
            for match_data in processed_qualif_matches:
                m_id_raw = match_data.get('id')
                match_id = int(m_id_raw) if m_id_raw and str(m_id_raw).isdigit() else None

                # LOG: Vérifier les points reçus
                logger.info(f"📥 Match {match_id} reçu - winner_points: {match_data.get('winner_points')}, loser_points: {match_data.get('loser_points')}")

                if match_id and match_id in existing_map:
                    # Update
                    match = existing_map[match_id]
                    match.bracket_type = match_data.get('bracket_type')
                    match.team_sport_a_id = match_data.get('team_sport_a_id')
                    match.team_sport_b_id = match_data.get('team_sport_b_id')
                    match.team_a_source = match_data.get('team_a_source')
                    match.team_b_source = match_data.get('team_b_source')
                    match.label = match_data.get('label')
                    match.match_order = match_data.get('match_order')
                    match.status = match_data.get('status', 'upcoming')
                    match.score_a = match_data.get('score_a')
                    match.score_b = match_data.get('score_b')
                    match.court = match_data.get('court')
                    match.winner_points = match_data.get('winner_points')
                    match.loser_points = match_data.get('loser_points')
                    # scheduled_datetime -> date, time
                    dt = match_data.get('scheduled_datetime')
                    if dt:
                        match.date = dt.split('T')[0]
                        match.time = dt.split('T')[1][:5] if 'T' in dt else None
                    else:
                        match.date = match_data.get('date')
                        match.time = match_data.get('time')
                    match.updated_at = datetime.utcnow()
                    processed_ids.add(match_id)
                else:
                    # Create
                    dt = match_data.get('scheduled_datetime')
                    date_val, time_val = None, None
                    if dt:
                        date_val = dt.split('T')[0]
                        time_val = dt.split('T')[1][:5] if 'T' in dt else None
                    else:
                        date_val = match_data.get('date')
                        time_val = match_data.get('time')
                    match = Match(
                        phase_id=phase.id,
                        tournament_id=tournament_id,
                        match_type="qualification",
                        bracket_type=match_data.get('bracket_type'),
                        team_sport_a_id=match_data.get('team_sport_a_id'),
                        team_sport_b_id=match_data.get('team_sport_b_id'),
                        team_a_source=match_data.get('team_a_source'),
                        team_b_source=match_data.get('team_b_source'),
                        label=match_data.get('label'),
                        match_order=match_data.get('match_order'),
                        status=match_data.get('status', 'upcoming'),
                        score_a=match_data.get('score_a'),
                        score_b=match_data.get('score_b'),
                        court=match_data.get('court'),
                        winner_points=match_data.get('winner_points'),
                        loser_points=match_data.get('loser_points'),
                        date=date_val,
                        time=time_val,
                        created_by_user_id=1,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(match)
                    db.flush()
                
                # Update/Create Schedule
                db.query(MatchSchedule).filter(MatchSchedule.match_id == match.id).delete()
                create_match_schedule_if_court(
                    db,
                    match.id,
                    match_data.get('court'),
                    tournament.sport_id,
                    match_data.get('scheduled_datetime'),
                    match_data.get('duration', 90)
                )

            # Delete removed matches
            for m_id, m in existing_map.items():
                if m_id not in processed_ids:
                    db.query(MatchSchedule).filter(MatchSchedule.match_id == m_id).delete()
                    db.delete(m)
        
        # Traiter les poules
        if 'pools' in structure_data:
            existing_pools = db.query(Pool).filter(Pool.phase_id == phase.id).all()
            existing_pools_map = {p.id: p for p in existing_pools}
            processed_pool_ids = set()
            
            for pool_data in structure_data['pools']:
                p_id_raw = pool_data.get('id')
                p_id = int(p_id_raw) if p_id_raw and str(p_id_raw).isdigit() else None
                
                if p_id and p_id in existing_pools_map:
                    # Update Pool
                    pool = existing_pools_map[p_id]
                    pool.name = pool_data.get('name')
                    pool.order = pool_data.get('display_order', 1)
                    pool.qualified_to_finals = pool_data.get('qualified_to_finals', 2)
                    pool.qualified_to_loser_bracket = pool_data.get('qualified_to_loser_bracket', 0)
                    processed_pool_ids.add(p_id)
                else:
                    # Create Pool
                    pool = Pool(
                        phase_id=phase.id,
                        name=pool_data.get('name'),
                        order=pool_data.get('display_order', 1),
                        qualified_to_finals=pool_data.get('qualified_to_finals', 2),
                        qualified_to_loser_bracket=pool_data.get('qualified_to_loser_bracket', 0)
                    )
                    db.add(pool)
                    db.flush()

                # Update pool teams
                db.query(TeamPool).filter(TeamPool.pool_id == pool.id).delete()
                for team_sport_id in (pool_data.get('teams') or []):
                    team_pool = TeamPool(
                        pool_id=pool.id,
                        team_sport_id=team_sport_id
                    )
                    db.add(team_pool)
                
                # Assigner automatiquement les équipes
                processed_pool_matches = assign_teams_to_pool_matches(
                    db,
                    pool_data,
                    tournament.sport_id
                )
                
                existing_pool_matches = db.query(Match).filter(Match.pool_id == pool.id).all()
                existing_pool_matches_map = {m.id: m for m in existing_pool_matches}
                processed_match_ids = set()

                for match_data in processed_pool_matches:
                    m_id_raw = match_data.get('id')
                    m_id = int(m_id_raw) if m_id_raw and str(m_id_raw).isdigit() else None
                    
                    if m_id and m_id in existing_pool_matches_map:
                        match = existing_pool_matches_map[m_id]
                        match.team_sport_a_id = match_data.get('team_sport_a_id')
                        match.team_sport_b_id = match_data.get('team_sport_b_id')
                        match.team_a_source = match_data.get('team_a_source')
                        match.team_b_source = match_data.get('team_b_source')
                        match.label = match_data.get('label')
                        match.match_order = match_data.get('match_order')
                        match.status = match_data.get('status', 'upcoming')
                        match.score_a = match_data.get('score_a')
                        match.score_b = match_data.get('score_b')
                        match.winner_points = match_data.get('winner_points')
                        match.loser_points = match_data.get('loser_points')
                        match.updated_at = datetime.utcnow()
                        processed_match_ids.add(m_id)
                    else:
                        match = Match(
                            phase_id=phase.id,
                            tournament_id=tournament_id,
                            pool_id=pool.id,
                            match_type="pool",
                            team_sport_a_id=match_data.get('team_sport_a_id'),
                            team_sport_b_id=match_data.get('team_sport_b_id'),
                            team_a_source=match_data.get('team_a_source'),
                            team_b_source=match_data.get('team_b_source'),
                            label=match_data.get('label'),
                            match_order=match_data.get('match_order'),
                            status=match_data.get('status', 'upcoming'),
                            score_a=match_data.get('score_a'),
                            score_b=match_data.get('score_b'),
                            winner_points=match_data.get('winner_points'),
                            loser_points=match_data.get('loser_points'),
                            created_by_user_id=1,
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow()
                        )
                        db.add(match)
                        db.flush()
                    
                    # Créer le schedule si terrain spécifié
                    db.query(MatchSchedule).filter(MatchSchedule.match_id == match.id).delete()
                    create_match_schedule_if_court(
                        db,
                        match.id,
                        match_data.get('court'),
                        tournament.sport_id,
                        match_data.get('scheduled_datetime'),
                        match_data.get('duration', 90)
                    )
                
                # Delete removed matches inside pool
                for m_id, m in existing_pool_matches_map.items():
                    if m_id not in processed_match_ids:
                        db.query(MatchSchedule).filter(MatchSchedule.match_id == m_id).delete()
                        db.delete(m)

            # Delete removed pools
            for p_id, p in existing_pools_map.items():
                if p_id not in processed_pool_ids:
                    # Delete matches first
                    pool_matches = db.query(Match).filter(Match.pool_id == p_id).all()
                    for m in pool_matches:
                        db.query(MatchSchedule).filter(MatchSchedule.match_id == m.id).delete()
                    db.query(TeamPool).filter(TeamPool.pool_id == p_id).delete()
                    db.delete(p)
        
        # Traiter les brackets
        if 'brackets' in structure_data:
            existing_bracket_matches = db.query(Match).filter(
                Match.phase_id == phase.id,
                Match.match_type == "bracket"
            ).all()
            existing_map = {m.id: m for m in existing_bracket_matches}
            processed_ids = set()
            
            for bracket in structure_data['brackets']:
                processed_bracket_matches = assign_teams_to_matches(
                    db,
                    bracket.get('matches') or [],
                    tournament.sport_id
                )
                
                for match_data in processed_bracket_matches:
                    m_id_raw = match_data.get('id')
                    try:
                        match_id = int(str(m_id_raw)) if m_id_raw and str(m_id_raw).replace('.', '', 1).isdigit() else None
                    except:
                        match_id = None
                        
                    if match_id and match_id in existing_map:
                        match = existing_map[match_id]
                        match.bracket_type = match_data.get('bracket_type')
                        match.team_sport_a_id = match_data.get('team_sport_a_id')
                        match.team_sport_b_id = match_data.get('team_sport_b_id')
                        match.team_a_source = match_data.get('team_a_source')
                        match.team_b_source = match_data.get('team_b_source')
                        match.label = match_data.get('label')
                        match.match_order = match_data.get('match_order')
                        match.status = match_data.get('status', 'upcoming')
                        match.score_a = match_data.get('score_a')
                        match.score_b = match_data.get('score_b')
                        match.winner_points = match_data.get('winner_points')
                        match.loser_points = match_data.get('loser_points')
                        match.updated_at = datetime.utcnow()
                        processed_ids.add(match_id)
                    else:
                        match = Match(
                            phase_id=phase.id,
                            tournament_id=tournament_id,
                            match_type="bracket",
                            bracket_type=match_data.get('bracket_type'),
                            team_sport_a_id=match_data.get('team_sport_a_id'),
                            team_sport_b_id=match_data.get('team_sport_b_id'),
                            team_a_source=match_data.get('team_a_source'),
                            team_b_source=match_data.get('team_b_source'),
                            label=match_data.get('label'),
                            match_order=match_data.get('match_order'),
                            status=match_data.get('status', 'upcoming'),
                            score_a=match_data.get('score_a'),
                            score_b=match_data.get('score_b'),
                            winner_points=match_data.get('winner_points'),
                            loser_points=match_data.get('loser_points'),
                            created_by_user_id=1,
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow()
                        )
                        db.add(match)
                        db.flush()
                    
                    # Schedule
                    db.query(MatchSchedule).filter(MatchSchedule.match_id == match.id).delete()
                    create_match_schedule_if_court(
                        db,
                        match.id,
                        match_data.get('court'),
                        tournament.sport_id,
                        match_data.get('scheduled_datetime'),
                        match_data.get('duration', 90)
                    )

            # Delete removed matches
            for m_id, m in existing_map.items():
                if m_id not in processed_ids:
                    db.query(MatchSchedule).filter(MatchSchedule.match_id == m_id).delete()
                    db.delete(m)

        # Traiter les loser brackets
        if 'loser_brackets' in structure_data:
            existing_loser_matches = db.query(Match).filter(
                Match.phase_id == phase.id,
                Match.match_type == "loser_bracket"
            ).all()
            existing_map = {m.id: m for m in existing_loser_matches}
            processed_ids = set()

            for loser_bracket in structure_data['loser_brackets']:
                processed_loser_matches = assign_teams_to_matches(
                    db,
                    loser_bracket.get('matches') or [],
                    tournament.sport_id
                )
                
                for match_data in processed_loser_matches:
                    m_id_raw = match_data.get('id')
                    try:
                        match_id = int(str(m_id_raw)) if m_id_raw and str(m_id_raw).replace('.', '', 1).isdigit() else None
                    except:
                        match_id = None

                    if match_id and match_id in existing_map:
                        match = existing_map[match_id]
                        match.bracket_type = match_data.get('bracket_type')
                        match.team_sport_a_id = match_data.get('team_sport_a_id')
                        match.team_sport_b_id = match_data.get('team_sport_b_id')
                        match.team_a_source = match_data.get('team_a_source')
                        match.team_b_source = match_data.get('team_b_source')
                        match.label = match_data.get('label')
                        match.match_order = match_data.get('match_order')
                        match.status = match_data.get('status', 'upcoming')
                        match.score_a = match_data.get('score_a')
                        match.score_b = match_data.get('score_b')
                        match.winner_points = match_data.get('winner_points')
                        match.loser_points = match_data.get('loser_points')
                        match.updated_at = datetime.utcnow()
                        processed_ids.add(match_id)
                    else:
                        match = Match(
                            phase_id=phase.id,
                            tournament_id=tournament_id,
                            match_type="loser_bracket",
                            bracket_type=match_data.get('bracket_type'),
                            team_sport_a_id=match_data.get('team_sport_a_id'),
                            team_sport_b_id=match_data.get('team_sport_b_id'),
                            team_a_source=match_data.get('team_a_source'),
                            team_b_source=match_data.get('team_b_source'),
                            label=match_data.get('label'),
                            match_order=match_data.get('match_order'),
                            status=match_data.get('status', 'upcoming'),
                            score_a=match_data.get('score_a'),
                            score_b=match_data.get('score_b'),
                            winner_points=match_data.get('winner_points'),
                            loser_points=match_data.get('loser_points'),
                            created_by_user_id=1,
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow()
                        )
                        db.add(match)
                        db.flush()
                    
                    # Schedule
                    db.query(MatchSchedule).filter(MatchSchedule.match_id == match.id).delete()
                    create_match_schedule_if_court(
                        db,
                        match.id,
                        match_data.get('court'),
                        tournament.sport_id,
                        match_data.get('scheduled_datetime'),
                        match_data.get('duration', 90)
                    )
            
            # Delete removed matches
            for m_id, m in existing_map.items():
                if m_id not in processed_ids:
                    db.query(MatchSchedule).filter(MatchSchedule.match_id == m_id).delete()
                    db.delete(m)
    
    db.commit()
    db.refresh(tournament)
    
    return create_success_response(
        data=TournamentResponse.model_validate(tournament).model_dump(mode="json"),
        message="Tournoi mis à jour avec succès"
    )

@app.delete("/tournaments/{tournament_id}", tags=["Tournaments"])
async def delete_tournament(
    tournament_id: int,
    db: Session = Depends(get_db),
):
    """Supprime un tournoi"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament with id {tournament_id} not found")
    
    db.delete(tournament)
    db.commit()
    
    return create_success_response(
        data={"id": tournament_id},
        message="Tournoi supprimé avec succès"
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
        data=[TournamentPhaseResponse.model_validate(p).model_dump(mode="json") for p in phases],
        message="Phases du tournoi récupérées avec succès"
    )

@app.get("/tournaments/{tournament_id}/ranking", tags=["Tournaments"])
async def get_ranking_of_tournament(
    tournament_id: int,
    db: Session = Depends(get_db),
):
    """Classement final du tournoi"""
    rankings = db.query(TournamentRanking).filter(TournamentRanking.tournament_id == tournament_id).order_by(TournamentRanking.final_position.asc()).all()
    return create_success_response(
        data=[TournamentRankingResponse.model_validate(r).model_dump(mode="json") for r in rankings],
        message="Classement du tournoi récupéré avec succès"
    )

@app.get("/tournaments/{tournament_id}/final-ranking", tags=["Tournaments"])
async def get_tournament_final_ranking(
    tournament_id: int,
    db: Session = Depends(get_db),
):
    """
    Calcule le classement final du tournoi basé sur les points des matchs terminés.
    Retourne le classement de toutes les équipes participantes triées par points.
    """
    from app.models.match import Match
    from app.models.teamsport import TeamSport
    from app.models.team import Team
    from collections import defaultdict

    # Récupérer tous les matchs terminés du tournoi
    completed_matches = db.query(Match).filter(
        Match.tournament_id == tournament_id,
        Match.status == "completed"
    ).all()

    # Dictionnaire pour stocker les points de chaque équipe
    team_points = defaultdict(lambda: {
        "team_sport_id": None,
        "team_id": None,
        "team_name": "",
        "total_points": 0,
        "matches_played": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "goals_for": 0,
        "goals_against": 0
    })

    # Calculer les points pour chaque équipe
    for match in completed_matches:
        if match.team_sport_a_id and match.team_sport_b_id:
            # Récupérer les informations des équipes
            team_sport_a = db.query(TeamSport).filter(TeamSport.id == match.team_sport_a_id).first()
            team_sport_b = db.query(TeamSport).filter(TeamSport.id == match.team_sport_b_id).first()

            if not team_sport_a or not team_sport_b:
                continue

            # Initialiser les entrées si nécessaire
            if team_sport_a.team_id not in team_points:
                team_points[team_sport_a.team_id]["team_sport_id"] = match.team_sport_a_id
                team_points[team_sport_a.team_id]["team_id"] = team_sport_a.team_id
                team_points[team_sport_a.team_id]["team_name"] = team_sport_a.team.name if team_sport_a.team else ""

            if team_sport_b.team_id not in team_points:
                team_points[team_sport_b.team_id]["team_sport_id"] = match.team_sport_b_id
                team_points[team_sport_b.team_id]["team_id"] = team_sport_b.team_id
                team_points[team_sport_b.team_id]["team_name"] = team_sport_b.team.name if team_sport_b.team else ""

            # Mettre à jour les statistiques
            team_points[team_sport_a.team_id]["matches_played"] += 1
            team_points[team_sport_b.team_id]["matches_played"] += 1

            team_points[team_sport_a.team_id]["goals_for"] += match.score_a or 0
            team_points[team_sport_a.team_id]["goals_against"] += match.score_b or 0
            team_points[team_sport_b.team_id]["goals_for"] += match.score_b or 0
            team_points[team_sport_b.team_id]["goals_against"] += match.score_a or 0

            # Déterminer le vainqueur et attribuer les points
            winner_points = match.winner_points if match.winner_points is not None else 3
            loser_points = match.loser_points if match.loser_points is not None else 0
            draw_points = 1

            if match.score_a > match.score_b:
                # Équipe A gagne
                team_points[team_sport_a.team_id]["total_points"] += winner_points
                team_points[team_sport_a.team_id]["wins"] += 1
                team_points[team_sport_b.team_id]["total_points"] += loser_points
                team_points[team_sport_b.team_id]["losses"] += 1
            elif match.score_b > match.score_a:
                # Équipe B gagne
                team_points[team_sport_b.team_id]["total_points"] += winner_points
                team_points[team_sport_b.team_id]["wins"] += 1
                team_points[team_sport_a.team_id]["total_points"] += loser_points
                team_points[team_sport_a.team_id]["losses"] += 1
            else:
                # Match nul
                team_points[team_sport_a.team_id]["total_points"] += draw_points
                team_points[team_sport_a.team_id]["draws"] += 1
                team_points[team_sport_b.team_id]["total_points"] += draw_points
                team_points[team_sport_b.team_id]["draws"] += 1

    # Convertir en liste et trier par points (puis par différence de buts)
    ranking_list = []
    for team_id, stats in team_points.items():
        goal_difference = stats["goals_for"] - stats["goals_against"]
        ranking_list.append({
            "team_id": stats["team_id"],
            "team_name": stats["team_name"],
            "total_points": stats["total_points"],
            "matches_played": stats["matches_played"],
            "wins": stats["wins"],
            "draws": stats["draws"],
            "losses": stats["losses"],
            "goals_for": stats["goals_for"],
            "goals_against": stats["goals_against"],
            "goal_difference": goal_difference
        })

    # Trier par points (desc), différence de buts (desc), buts marqués (desc), nom (asc)
    ranking_list.sort(
        key=lambda x: (
            -x["total_points"],
            -x["goal_difference"],
            -x["goals_for"],
            x["team_name"].lower()
        )
    )

    # Ajouter la position
    for index, team in enumerate(ranking_list, start=1):
        team["position"] = index

    return create_success_response(
        data=ranking_list,
        message="Classement final du tournoi calculé avec succès"
    )

@app.get("/final-ranking", tags=["Rankings"])
async def get_global_final_ranking(
    db: Session = Depends(get_db),
):
    """
    Calcule le classement final global de TOUS les tournois.
    Agrège les points de tous les tournois pour chaque équipe.
    """
    from app.models.match import Match
    from app.models.teamsport import TeamSport
    from app.models.team import Team
    from app.models.tournament import Tournament
    from collections import defaultdict

    # Dictionnaire pour stocker les points totaux de chaque équipe
    global_team_points = defaultdict(lambda: {
        "team_id": None,
        "team_name": "",
        "total_points": 0,
        "tournaments_played": 0,
        "matches_played": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "goals_for": 0,
        "goals_against": 0,
        "tournaments_won": 0,
        "tournaments_second": 0,
        "tournaments_third": 0,
    })

    # Récupérer tous les tournois
    all_tournaments = db.query(Tournament).all()

    for tournament in all_tournaments:
        # Récupérer tous les matchs terminés de ce tournoi
        completed_matches = db.query(Match).filter(
            Match.tournament_id == tournament.id,
            Match.status == "completed"
        ).all()

        # Dictionnaire temporaire pour les points de ce tournoi
        tournament_team_points = defaultdict(lambda: {
            "team_id": None,
            "total_points": 0,
            "matches_played": 0,
            "wins": 0,
            "goals_for": 0,
            "goals_against": 0
        })

        # Calculer les points pour chaque équipe dans ce tournoi
        for match in completed_matches:
            if match.team_sport_a_id and match.team_sport_b_id:
                team_sport_a = db.query(TeamSport).filter(TeamSport.id == match.team_sport_a_id).first()
                team_sport_b = db.query(TeamSport).filter(TeamSport.id == match.team_sport_b_id).first()

                if not team_sport_a or not team_sport_b:
                    continue

                # Initialiser les entrées
                if team_sport_a.team_id not in tournament_team_points:
                    tournament_team_points[team_sport_a.team_id]["team_id"] = team_sport_a.team_id
                if team_sport_b.team_id not in tournament_team_points:
                    tournament_team_points[team_sport_b.team_id]["team_id"] = team_sport_b.team_id

                # Mettre à jour les statistiques du tournoi
                tournament_team_points[team_sport_a.team_id]["matches_played"] += 1
                tournament_team_points[team_sport_b.team_id]["matches_played"] += 1

                tournament_team_points[team_sport_a.team_id]["goals_for"] += match.score_a or 0
                tournament_team_points[team_sport_a.team_id]["goals_against"] += match.score_b or 0
                tournament_team_points[team_sport_b.team_id]["goals_for"] += match.score_b or 0
                tournament_team_points[team_sport_b.team_id]["goals_against"] += match.score_a or 0

                # Attribuer les points
                winner_points = match.winner_points if match.winner_points is not None else 3
                loser_points = match.loser_points if match.loser_points is not None else 0
                draw_points = 1

                if match.score_a > match.score_b:
                    tournament_team_points[team_sport_a.team_id]["total_points"] += winner_points
                    tournament_team_points[team_sport_a.team_id]["wins"] += 1
                    tournament_team_points[team_sport_b.team_id]["total_points"] += loser_points
                elif match.score_b > match.score_a:
                    tournament_team_points[team_sport_b.team_id]["total_points"] += winner_points
                    tournament_team_points[team_sport_b.team_id]["wins"] += 1
                    tournament_team_points[team_sport_a.team_id]["total_points"] += loser_points
                else:
                    tournament_team_points[team_sport_a.team_id]["total_points"] += draw_points
                    tournament_team_points[team_sport_b.team_id]["total_points"] += draw_points

        # Trier les équipes de ce tournoi pour déterminer les podiums
        tournament_ranking = sorted(
            tournament_team_points.items(),
            key=lambda x: (
                -x[1]["total_points"],
                -(x[1]["goals_for"] - x[1]["goals_against"]),
                -x[1]["goals_for"]
            )
        )

        # Agréger les statistiques au classement global
        for team_id, stats in tournament_team_points.items():
            team = db.query(Team).filter(Team.id == team_id).first()
            if not team:
                continue

            if global_team_points[team_id]["team_id"] is None:
                global_team_points[team_id]["team_id"] = team_id
                global_team_points[team_id]["team_name"] = team.name

            global_team_points[team_id]["total_points"] += stats["total_points"]
            global_team_points[team_id]["matches_played"] += stats["matches_played"]
            global_team_points[team_id]["wins"] += stats["wins"]
            global_team_points[team_id]["goals_for"] += stats["goals_for"]
            global_team_points[team_id]["goals_against"] += stats["goals_against"]
            global_team_points[team_id]["tournaments_played"] += 1

        # Compter les podiums
        if len(tournament_ranking) > 0:
            winner_id = tournament_ranking[0][0]
            global_team_points[winner_id]["tournaments_won"] += 1

        if len(tournament_ranking) > 1:
            second_id = tournament_ranking[1][0]
            global_team_points[second_id]["tournaments_second"] += 1

        if len(tournament_ranking) > 2:
            third_id = tournament_ranking[2][0]
            global_team_points[third_id]["tournaments_third"] += 1

    # Convertir en liste et trier
    ranking_list = []
    for team_id, stats in global_team_points.items():
        goal_difference = stats["goals_for"] - stats["goals_against"]
        ranking_list.append({
            "team_id": stats["team_id"],
            "team_name": stats["team_name"],
            "total_points": stats["total_points"],
            "tournaments_played": stats["tournaments_played"],
            "tournaments_won": stats["tournaments_won"],
            "tournaments_second": stats["tournaments_second"],
            "tournaments_third": stats["tournaments_third"],
            "matches_played": stats["matches_played"],
            "wins": stats["wins"],
            "draws": stats["draws"],
            "losses": stats["losses"],
            "goals_for": stats["goals_for"],
            "goals_against": stats["goals_against"],
            "goal_difference": goal_difference
        })

    # Trier par points totaux (desc), différence de buts (desc), buts marqués (desc)
    ranking_list.sort(
        key=lambda x: (
            -x["total_points"],
            -x["goal_difference"],
            -x["goals_for"],
            x["team_name"].lower()
        )
    )

    # Ajouter la position
    for index, team in enumerate(ranking_list, start=1):
        team["position"] = index

    return create_success_response(
        data=ranking_list,
        message="Classement final global calculé avec succès"
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
        data=TournamentConfigurationResponse.model_validate(config).model_dump(mode="json"),
        message="Configuration du tournoi récupérée avec succès"
    )

# --- Phases de tournoi ---
from app.schemas.tournamentphase import TournamentPhaseCreate, TournamentPhaseUpdate

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
        data=TournamentPhaseResponse.model_validate(phase).model_dump(mode="json"),
        message="Phase du tournoi récupérée avec succès"
    )

@app.post("/tournament-phases", tags=["TournamentPhases"], status_code=status.HTTP_201_CREATED)
async def create_tournament_phase(
    phase: TournamentPhaseCreate,
    db: Session = Depends(get_db),
):
    """Crée une nouvelle phase de tournoi"""
    # Vérifier que le tournoi existe
    tournament = db.query(Tournament).filter(Tournament.id == phase.tournament_id).first()
    if not tournament:
        raise NotFoundError(f"Tournament with id {phase.tournament_id} not found")
    
    new_phase = TournamentPhase(**phase.model_dump())
    db.add(new_phase)
    db.commit()
    db.refresh(new_phase)
    
    return create_success_response(
        data=TournamentPhaseResponse.model_validate(new_phase).model_dump(mode="json"),
        message="Phase de tournoi créée avec succès"
    )

@app.patch("/tournament-phases/{phase_id}", tags=["TournamentPhases"])
async def update_tournament_phase(
    phase_id: int,
    phase_update: TournamentPhaseUpdate,
    db: Session = Depends(get_db),
):
    """Met à jour une phase de tournoi"""
    phase = db.query(TournamentPhase).filter(TournamentPhase.id == phase_id).first()
    if not phase:
        raise NotFoundError(f"Tournament phase with id {phase_id} not found")
    
    update_data = phase_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(phase, field, value)
    
    db.commit()
    db.refresh(phase)
    
    return create_success_response(
        data=TournamentPhaseResponse.model_validate(phase).model_dump(mode="json"),
        message="Phase de tournoi mise à jour avec succès"
    )

@app.delete("/tournament-phases/{phase_id}", tags=["TournamentPhases"])
async def delete_tournament_phase(
    phase_id: int,
    db: Session = Depends(get_db),
):
    """Supprime une phase de tournoi"""
    phase = db.query(TournamentPhase).filter(TournamentPhase.id == phase_id).first()
    if not phase:
        raise NotFoundError(f"Tournament phase with id {phase_id} not found")
    
    db.delete(phase)
    db.commit()
    
    return create_success_response(
        data={"id": phase_id},
        message="Phase de tournoi supprimée avec succès"
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
        data=[MatchResponse.model_validate(m).model_dump(mode="json") for m in matches],
        message="Matchs de la phase récupérés avec succès"
    )

# --- Poules ---
from app.models.pool import Pool
from app.schemas.pool import PoolResponse, PoolCreate, PoolUpdate
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
        data=PoolResponse.model_validate(pool).model_dump(mode="json"),
        message="Poule récupérée avec succès"
    )

@app.post("/pools", tags=["Pools"], status_code=status.HTTP_201_CREATED)
async def create_pool(
    pool: PoolCreate,
    db: Session = Depends(get_db),
):
    """Crée une nouvelle poule"""
    # Vérifier que la phase existe
    phase = db.query(TournamentPhase).filter(TournamentPhase.id == pool.phase_id).first()
    if not phase:
        raise NotFoundError(f"Tournament phase with id {pool.phase_id} not found")
    
    new_pool = Pool(**pool.model_dump())
    db.add(new_pool)
    db.commit()
    db.refresh(new_pool)
    
    return create_success_response(
        data=PoolResponse.model_validate(new_pool).model_dump(mode="json"),
        message="Poule créée avec succès"
    )

@app.patch("/pools/{pool_id}", tags=["Pools"])
async def update_pool(
    pool_id: int,
    pool_update: PoolUpdate,
    db: Session = Depends(get_db),
):
    """Met à jour une poule"""
    pool = db.query(Pool).filter(Pool.id == pool_id).first()
    if not pool:
        raise NotFoundError(f"Pool with id {pool_id} not found")
    
    update_data = pool_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pool, field, value)
    
    db.commit()
    db.refresh(pool)
    
    return create_success_response(
        data=PoolResponse.model_validate(pool).model_dump(mode="json"),
        message="Poule mise à jour avec succès"
    )

@app.delete("/pools/{pool_id}", tags=["Pools"])
async def delete_pool(
    pool_id: int,
    db: Session = Depends(get_db),
):
    """Supprime une poule"""
    pool = db.query(Pool).filter(Pool.id == pool_id).first()
    if not pool:
        raise NotFoundError(f"Pool with id {pool_id} not found")
    
    db.delete(pool)
    db.commit()
    
    return create_success_response(
        data={"id": pool_id},
        message="Poule supprimée avec succès"
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
        data=[TeamResponse.model_validate(team).model_dump(mode="json") for team in teams],
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
        data=[MatchResponse.model_validate(m).model_dump(mode="json") for m in matches],
        message="Matchs de la poule récupérés avec succès"
    )

@app.get("/pools/{pool_id}/standings", response_model=dict, tags=["Pools"])
async def get_pool_standings(pool_id: int, db: Session = Depends(get_db)):
    """Classement d'une poule (récupère les données mises à jour automatiquement)"""
    pool = db.query(Pool).filter(Pool.id == pool_id).first()
    if not pool:
        raise NotFoundError(f"Pool with id {pool_id} not found")
    
    # Récupérer les équipes de la poule triées par position
    team_pools = db.query(TeamPool).filter(
        TeamPool.pool_id == pool_id
    ).order_by(TeamPool.position).all()
    
    standings = []
    for team_pool in team_pools:
        standings.append({
            "id": team_pool.id,
            "team_id": team_pool.team_id,
            "team_name": team_pool.team.name if team_pool.team else "",
            "position": team_pool.position,
            "points": team_pool.points,
            "wins": team_pool.wins,
            "losses": team_pool.losses,
            "draws": team_pool.draws,
            "goals_for": team_pool.goals_for,
            "goals_against": team_pool.goals_against,
            "goal_difference": team_pool.goal_difference,
        })
    
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
        data=TeamPoolResponse.model_validate(team_pool).model_dump(mode="json"),
        message="Équipe-poule récupérée avec succès"
    )

@app.post("/pools/{pool_id}/recalculate-standings", response_model=dict, tags=["Pools"])
async def recalculate_pool_standings(pool_id: int, db: Session = Depends(get_db)):
    """Recalcule manuellement le classement d'une poule (utile si des données ont été corrigées)"""
    pool = db.query(Pool).filter(Pool.id == pool_id).first()
    if not pool:
        raise NotFoundError(f"Pool with id {pool_id} not found")
    
    try:
        from app.services.match_service import MatchService
        match_service = MatchService(db)
        match_service.update_pool_rankings(pool_id)
        
        # Récupérer les standings mis à jour
        team_pools = db.query(TeamPool).filter(
            TeamPool.pool_id == pool_id
        ).order_by(TeamPool.position).all()
        
        standings = []
        for team_pool in team_pools:
            standings.append({
                "id": team_pool.id,
                "team_id": team_pool.team_id,
                "team_name": team_pool.team.name if team_pool.team else "",
                "position": team_pool.position,
                "points": team_pool.points,
                "wins": team_pool.wins,
                "losses": team_pool.losses,
                "draws": team_pool.draws,
                "goals_for": team_pool.goals_for,
                "goals_against": team_pool.goals_against,
                "goal_difference": team_pool.goal_difference,
            })
        
        return create_success_response(
            data=standings,
            message="Classement de la poule recalculé avec succès"
        )
    except Exception as e:
        raise BadRequestError(f"Erreur lors du recalcul du classement: {str(e)}")

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
        data=[MatchResponse.model_validate(m).model_dump(mode="json") for m in matches],
        message="Matchs récupérés avec succès"
    )

@app.get("/matches/{match_id}", response_model=dict, tags=["Matches"])
async def get_match(match_id: int, db: Session = Depends(get_db)):
    """Récupère un match par ID"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise NotFoundError(f"Match with id {match_id} not found")
    return create_success_response(
        data=MatchResponse.model_validate(match).model_dump(mode="json"),
        message="Match récupéré avec succès"
    )

from app.schemas.match import MatchCreate, MatchUpdate

@app.post("/matches", tags=["Matches"], status_code=status.HTTP_201_CREATED)
async def create_match(
    match: MatchCreate,
    db: Session = Depends(get_db),
):
    """Crée un nouveau match"""
    # Vérifier que la phase existe
    phase = db.query(TournamentPhase).filter(TournamentPhase.id == match.phase_id).first()
    if not phase:
        raise NotFoundError(f"Tournament phase with id {match.phase_id} not found")
    
    # Vérifier que les équipes existent
    from app.models.teamsport import TeamSport
    team_a = db.query(TeamSport).filter(TeamSport.id == match.team_sport_a_id).first()
    if not team_a:
        raise NotFoundError(f"TeamSport with id {match.team_sport_a_id} not found")
    
    team_b = db.query(TeamSport).filter(TeamSport.id == match.team_sport_b_id).first()
    if not team_b:
        raise NotFoundError(f"TeamSport with id {match.team_sport_b_id} not found")
    
    new_match = Match(**match.model_dump())
    db.add(new_match)
    db.commit()
    db.refresh(new_match)
    
    return create_success_response(
        data=MatchResponse.model_validate(new_match).model_dump(mode="json"),
        message="Match créé avec succès"
    )

@app.delete("/matches/{match_id}", tags=["Matches"])
async def delete_match(
    match_id: int,
    db: Session = Depends(get_db),
):
    """Supprime un match"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise NotFoundError(f"Match with id {match_id} not found")
    
    db.delete(match)
    db.commit()
    
    return create_success_response(
        data={"id": match_id},
        message="Match supprimé avec succès"
    )

@app.get("/matches/{match_id}/sets", response_model=dict, tags=["Matches"])
async def get_match_sets(match_id: int, db: Session = Depends(get_db)):
    """Liste les sets d'un match"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise NotFoundError(f"Match with id {match_id} not found")
    match_sets = db.query(MatchSet).filter(MatchSet.match_id == match_id).all()
    return create_success_response(
        data=[MatchSetResponse.model_validate(s).model_dump(mode="json") for s in match_sets],
        message="Sets du match récupérés avec succès"
    )

@app.patch("/matches/{match_id}", response_model=dict, tags=["Matches"])
async def update_match(
    match_id: int,
    match_update: MatchUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour un match (statut, scores, vainqueur, etc.)"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise NotFoundError(f"Match with id {match_id} not found")
    
    # Mettre à jour les champs fournis
    update_data = match_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(match, field, value)
    
    db.commit()
    db.refresh(match)
    
    # === MISE À JOUR DU CLASSEMENT DE POULE ===
    # Si le match est un match de poule et qu'il est complété, mettre à jour le classement
    if match.pool_id is not None and match.status == "completed" and match.score_a is not None and match.score_b is not None:
        from app.services.match_service import MatchService
        match_service = MatchService(db)
        match_service.update_pool_rankings(match.pool_id)
    
    # === PROPAGATION AUTOMATIQUE DES ÉQUIPES ===
    # Si le match vient d'être complété avec des scores, propager les équipes
    if match.status == "completed" and match.score_a is not None and match.score_b is not None:
        # ✅ FIX: Si les team_sport_id sont NULL, essayer de les résoudre depuis team_a_source/team_b_source
        from app.models.teamsport import TeamSport

        # Récupérer la phase et le tournoi UNE SEULE FOIS
        phase = db.query(TournamentPhase).filter(TournamentPhase.id == match.phase_id).first()
        if phase:
            tournament = db.query(Tournament).filter(Tournament.id == phase.tournament_id).first()
            sport_id = tournament.sport_id if tournament else None

            if sport_id:
                # Résoudre team_a_source
                if match.team_sport_a_id is None and match.team_a_source:
                    team_sport_a = (
                        db.query(TeamSport)
                        .join(Team)
                        .filter(
                            Team.name == match.team_a_source,
                            TeamSport.sport_id == sport_id
                        )
                        .first()
                    )
                    if team_sport_a:
                        match.team_sport_a_id = team_sport_a.id
                        print(f"✅ [Match {match.id}] team_a_source '{match.team_a_source}' → team_sport_id {team_sport_a.id}")

                # Résoudre team_b_source
                if match.team_sport_b_id is None and match.team_b_source:
                    team_sport_b = (
                        db.query(TeamSport)
                        .join(Team)
                        .filter(
                            Team.name == match.team_b_source,
                            TeamSport.sport_id == sport_id
                        )
                        .first()
                    )
                    if team_sport_b:
                        match.team_sport_b_id = team_sport_b.id
                        print(f"✅ [Match {match.id}] team_b_source '{match.team_b_source}' → team_sport_id {team_sport_b.id}")

        # Déterminer le gagnant et le perdant
        if match.team_sport_a_id is not None and match.team_sport_b_id is not None:
            if match.score_a > match.score_b:
                winner_team_sport_id = match.team_sport_a_id
                loser_team_sport_id = match.team_sport_b_id
            elif match.score_b > match.score_a:
                winner_team_sport_id = match.team_sport_b_id
                loser_team_sport_id = match.team_sport_a_id
            else:
                # Match nul - pas de propagation automatique pour l'instant
                winner_team_sport_id = None
                loser_team_sport_id = None
            
            # Propager le gagnant vers le match de destination
            if winner_team_sport_id and match.winner_destination_match_id:
                print(f"🔄 Propagation du gagnant (team_sport_id={winner_team_sport_id}) du match {match.id} vers match {match.winner_destination_match_id}")
                print(f"   Slot configuré: {match.winner_destination_slot}")

                winner_dest_match = db.query(Match).filter(
                    Match.id == match.winner_destination_match_id
                ).first()

                if winner_dest_match:
                    # Récupérer le nom de l'équipe gagnante
                    winner_team_sport = db.query(TeamSport).filter(TeamSport.id == winner_team_sport_id).first()
                    winner_team_name = None
                    if winner_team_sport:
                        winner_team = db.query(Team).filter(Team.id == winner_team_sport.team_id).first()
                        winner_team_name = winner_team.name if winner_team else None

                    print(f"   Match destination trouvé: {winner_dest_match.id} (label={winner_dest_match.label})")
                    print(f"   Nom de l'équipe gagnante: {winner_team_name}")

                    # UTILISER LE SLOT CONFIGURÉ (winner_destination_slot)
                    if match.winner_destination_slot == "A":
                        winner_dest_match.team_sport_a_id = winner_team_sport_id
                        if winner_team_name:
                            winner_dest_match.team_a_source = winner_team_name
                        print(f"   ✅ Gagnant assigné à slot A (team_sport_a_id={winner_team_sport_id}, team_a_source={winner_team_name})")
                    elif match.winner_destination_slot == "B":
                        winner_dest_match.team_sport_b_id = winner_team_sport_id
                        if winner_team_name:
                            winner_dest_match.team_b_source = winner_team_name
                        print(f"   ✅ Gagnant assigné à slot B (team_sport_b_id={winner_team_sport_id}, team_b_source={winner_team_name})")
                    else:
                        # Fallback: chercher un slot libre si winner_destination_slot n'est pas configuré
                        print(f"   ⚠️ winner_destination_slot non configuré, recherche d'un slot libre...")
                        if winner_dest_match.team_sport_a_id is None:
                            winner_dest_match.team_sport_a_id = winner_team_sport_id
                            if winner_team_name:
                                winner_dest_match.team_a_source = winner_team_name
                            print(f"   ✅ Gagnant assigné à slot A libre (fallback)")
                        elif winner_dest_match.team_sport_b_id is None:
                            winner_dest_match.team_sport_b_id = winner_team_sport_id
                            if winner_team_name:
                                winner_dest_match.team_b_source = winner_team_name
                            print(f"   ✅ Gagnant assigné à slot B libre (fallback)")
                        else:
                            print(f"   ❌ Aucun slot libre disponible!")
                else:
                    print(f"   ❌ Match destination {match.winner_destination_match_id} introuvable")

            # Propager le perdant vers le match de destination (bracket perdants)
            if loser_team_sport_id and match.loser_destination_match_id:
                print(f"🔄 Propagation du perdant (team_sport_id={loser_team_sport_id}) du match {match.id} vers match {match.loser_destination_match_id}")
                print(f"   Slot configuré: {match.loser_destination_slot}")

                loser_dest_match = db.query(Match).filter(
                    Match.id == match.loser_destination_match_id
                ).first()

                if loser_dest_match:
                    # Récupérer le nom de l'équipe perdante
                    loser_team_sport = db.query(TeamSport).filter(TeamSport.id == loser_team_sport_id).first()
                    loser_team_name = None
                    if loser_team_sport:
                        loser_team = db.query(Team).filter(Team.id == loser_team_sport.team_id).first()
                        loser_team_name = loser_team.name if loser_team else None

                    print(f"   Match destination trouvé: {loser_dest_match.id} (label={loser_dest_match.label})")
                    print(f"   Nom de l'équipe perdante: {loser_team_name}")

                    # UTILISER LE SLOT CONFIGURÉ (loser_destination_slot)
                    if match.loser_destination_slot == "A":
                        loser_dest_match.team_sport_a_id = loser_team_sport_id
                        if loser_team_name:
                            loser_dest_match.team_a_source = loser_team_name
                        print(f"   ✅ Perdant assigné à slot A (team_sport_a_id={loser_team_sport_id}, team_a_source={loser_team_name})")
                    elif match.loser_destination_slot == "B":
                        loser_dest_match.team_sport_b_id = loser_team_sport_id
                        if loser_team_name:
                            loser_dest_match.team_b_source = loser_team_name
                        print(f"   ✅ Perdant assigné à slot B (team_sport_b_id={loser_team_sport_id}, team_b_source={loser_team_name})")
                    else:
                        # Fallback: chercher un slot libre si loser_destination_slot n'est pas configuré
                        print(f"   ⚠️ loser_destination_slot non configuré, recherche d'un slot libre...")
                        if loser_dest_match.team_sport_a_id is None:
                            loser_dest_match.team_sport_a_id = loser_team_sport_id
                            if loser_team_name:
                                loser_dest_match.team_a_source = loser_team_name
                            print(f"   ✅ Perdant assigné à slot A libre (fallback)")
                        elif loser_dest_match.team_sport_b_id is None:
                            loser_dest_match.team_sport_b_id = loser_team_sport_id
                            if loser_team_name:
                                loser_dest_match.team_b_source = loser_team_name
                            print(f"   ✅ Perdant assigné à slot B libre (fallback)")
                        else:
                            print(f"   ❌ Aucun slot libre disponible!")
            
            db.commit()
    
    db.refresh(match)
    return create_success_response(
        data=MatchResponse.model_validate(match).model_dump(mode="json"),
        message="Match mis à jour avec succès"
    )

@app.post("/matches/{match_id}/status", response_model=dict, tags=["Matches"])
async def update_match_status(
    match_id: int,
    status: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):  
    """Met à jour uniquement le statut d'un match"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise NotFoundError(f"Match with id {match_id} not found")
    
    match.status = status
    db.commit()
    db.refresh(match)
    
    return create_success_response(
        data=MatchResponse.model_validate(match).model_dump(mode="json"),
        message="Statut du match mis à jour avec succès"
    )

@app.patch("/matches/{match_id}/status", response_model=dict, tags=["Matches"])
async def patch_match_status(
    match_id: int,
    status: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):  
    """Met à jour partiellement le statut d'un match"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise NotFoundError(f"Match with id {match_id} not found")
    
    match.status = status
    db.commit()
    db.refresh(match)
    
    return create_success_response(
        data=MatchResponse.model_validate(match).model_dump(mode="json"),
        message="Statut du match mis à jour avec succès"
    )

@app.get("/matches/{match_id}/status", response_model=dict, tags=["Matches"])
async def get_match_status(
    match_id: int,
    db: Session = Depends(get_db)
):  
    """Récupère uniquement le statut d'un match"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise NotFoundError(f"Match with id {match_id} not found")
    
    return create_success_response(
        data={"match_id": match.id, "status": match.status},
        message="Statut du match récupéré avec succès"
    )

# --- Planification de matchs ---

from app.models.matchschedule import MatchSchedule
from app.schemas.matchschedule import MatchScheduleResponse, MatchScheduleCreate, MatchScheduleUpdate

@app.get("/match-schedules", response_model=dict, tags=["MatchSchedule"])
async def get_matches(
    match_id: Optional[int] = Query(None),
    court_id: Optional[int] = Query(None),
    scheduled_datetime: Optional[str] = Query(None),
    actual_start_datetime: Optional[str] = Query(None),
    actual_end_datetime: Optional[str] = Query(None),
    estimated_duration_minutes: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Planification d'un match"""
    query = db.query(MatchSchedule)
    if match_id is not None:
        query = query.filter(MatchSchedule.match_id == match_id)
    if court_id is not None:
        query = query.filter(MatchSchedule.court_id == court_id)
    if scheduled_datetime is not None:
        query = query.filter(MatchSchedule.scheduled_datetime == scheduled_datetime)
    if actual_start_datetime is not None:
        query = query.filter(MatchSchedule.actual_start_datetime == actual_start_datetime)
    if actual_end_datetime is not None:
        query = query.filter(MatchSchedule.actual_end_datetime == actual_end_datetime)
    if estimated_duration_minutes is not None:
        query = query.filter(MatchSchedule.estimated_duration_minutes == estimated_duration_minutes)
    schedules = query.offset(skip).limit(limit).all()
    return create_success_response(
        data=[MatchScheduleResponse.model_validate(schedule).model_dump(mode="json") for schedule in schedules],
        message="Planification des matchs récupérées avec succès"
    )

# === NOUVEAU ENDPOINT POUR CREER/MODIFIER LA PLANIFICATION D'UN MATCH ===
from app.services.matchschedule_service import MatchScheduleService

@app.post("/matches/{match_id}/schedule", response_model=dict, tags=["MatchSchedule"], status_code=201)
async def create_match_schedule(
    match_id: int,
    payload: MatchScheduleCreate,
    db: Session = Depends(get_db)
):
    """Créer la planification d'un match (court, horaire, durée)"""
    service = MatchScheduleService(db)
    # S'assurer que le match_id du path et du body sont cohérents
    if payload.match_id != match_id:
        raise BadRequestError("Le match_id du body ne correspond pas à l'URL")
    schedule = service.create_schedule(payload)
    return create_success_response(
        data=MatchScheduleResponse.model_validate(schedule).model_dump(mode="json"),
        message="Planification créée avec succès"
    )

@app.get("/matches/{match_id}/schedule", response_model=dict, tags=["MatchSchedule"])
async def get_match_schedule(match_id: int, db: Session = Depends(get_db)):
    """
    Récupère la planification d'un match avec le nom du terrain.
    Retourne court_id, court_name, scheduled_datetime, etc.
    """
    from app.models.court import Court
    
    schedule = db.query(MatchSchedule).filter(MatchSchedule.match_id == match_id).first()
    
    if not schedule:
        raise NotFoundError(f"MatchSchedule for match_id {match_id} not found")
    
    # Récupérer le nom du terrain si court_id existe
    court_name = None
    if schedule.court_id:
        court = db.query(Court).filter(Court.id == schedule.court_id).first()
        if court:
            court_name = court.name
    
    return create_success_response(
        data={
            "match_id": schedule.match_id,
            "court_id": schedule.court_id,
            "court_name": court_name,  # ← C'est ce qui manquait !
            "tournament_id": schedule.tournament_id,
            "scheduled_datetime": schedule.scheduled_datetime.isoformat() if schedule.scheduled_datetime else None,
            "actual_start_datetime": schedule.actual_start_datetime.isoformat() if schedule.actual_start_datetime else None,
            "actual_end_datetime": schedule.actual_end_datetime.isoformat() if schedule.actual_end_datetime else None,
            "estimated_duration_minutes": schedule.estimated_duration_minutes
        },
        message="Planification du match récupérée avec succès"
    )

@app.put("/matches/{match_id}/schedule", response_model=dict, tags=["MatchSchedule"])
async def update_match_schedule(
    match_id: int,
    payload: MatchScheduleUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour la planification d'un match (court, horaire, durée)"""
    service = MatchScheduleService(db)
    schedule = service.update_schedule(match_id, payload)
    return create_success_response(
        data=MatchScheduleResponse.model_validate(schedule).model_dump(mode="json"),
        message="Planification mise à jour avec succès"
    )

@app.get("/courts/{court_id}/schedule", response_model=dict, tags=["MatchSchedule"])
async def get_court_schedule(court_id: int, db: Session = Depends(get_db)):
    """Planning d'un terrain (tous les matchs prévus sur ce terrain)"""
    schedules = db.query(MatchSchedule).filter(MatchSchedule.court_id == court_id).all()
    return create_success_response(
        data=[MatchScheduleResponse.model_validate(s).model_dump(mode="json") for s in schedules],
        message="Planification du terrain récupérée avec succès"
    )

@app.delete("/matches/{match_id}/schedule", response_model=dict, tags=["MatchSchedule"])
async def delete_match_schedule(match_id: int, db: Session = Depends(get_db)):
    """Supprime la planification d'un match"""
    schedule = db.query(MatchSchedule).filter(MatchSchedule.match_id == match_id).first()
    if not schedule:
        raise NotFoundError(f"MatchSchedule for match_id {match_id} not found")
    db.delete(schedule)
    db.commit()
    return create_success_response(
        data={"match_id": match_id},
        message="Planification du match supprimée avec succès"
    )

# --- Sets de match ---
@app.get("/match-sets/{set_id}", response_model=dict, tags=["MatchSet"])
async def get_match_set(set_id: int, db: Session = Depends(get_db)):
    """Récupère un set par ID"""
    match_set = db.query(MatchSet).filter(MatchSet.id == set_id).first()
    if not match_set:
        raise NotFoundError(f"Set with id {set_id} not found")
    return create_success_response(
        data=MatchSetResponse.model_validate(match_set).model_dump(mode="json"),
        message="Set du match récupéré avec succès"
    )


# ============================================================================
# ROUTES POUR LA STRUCTURE DES TOURNOIS ET LA PROPAGATION DES RÉSULTATS
# ============================================================================

@app.get("/tournaments/{tournament_id}/structure", tags=["Tournaments"])
async def get_tournament_structure(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupérer la structure complète d'un tournoi
    """
    from app.models.tournament import Tournament
    from app.models.tournamentphase import TournamentPhase
    from app.models.pool import Pool
    from app.models.match import Match
    from app.models.teampool import TeamPool
    from app.models.matchschedule import MatchSchedule
    from app.models.court import Court
    from app.models.teamsport import TeamSport
    from app.models.team import Team
    
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
    
    # Forcer le refresh des données depuis la BDD (évite les problèmes de cache de session)
    db.expire_all()
    
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
                    "status": m.status,
                    "court": m.court, 
                    "date": m.date,      
                    "time": m.time,       
                    "scheduled_datetime": m.scheduled_datetime if hasattr(m, "scheduled_datetime") else None,
                    "duration": get_match_duration(db, m.id)
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
            "status": m.status,
            "court": m.court, 
            "date": m.date,      
            "time": m.time,     
            "scheduled_datetime": m.scheduled_datetime if hasattr(m, "scheduled_datetime") else None,
            "duration": get_match_duration(db, m.id)
        }
    
    return create_success_response({
        "tournament_id": tournament_id,
        "qualification_matches": [match_to_dict(m) for m in qualification_matches],
        "pools": pools_data,
        "bracket_matches": [match_to_dict(m) for m in bracket_matches],
        "loser_bracket_matches": [match_to_dict(m) for m in loser_bracket_matches]
    })


def get_match_court_name(db: Session, match_id: int) -> str:
    """Récupère le nom du terrain pour un match"""
    from app.models.matchschedule import MatchSchedule
    from app.models.court import Court
    
    schedule = db.query(MatchSchedule).filter(MatchSchedule.match_id == match_id).first()
    if schedule and schedule.court_id:
        court = db.query(Court).filter(Court.id == schedule.court_id).first()
        if court:
            return court.name
    return ""


def get_match_duration(db: Session, match_id: int) -> int:
    """Récupère la durée estimée pour un match"""
    from app.models.matchschedule import MatchSchedule
    
    schedule = db.query(MatchSchedule).filter(MatchSchedule.match_id == match_id).first()
    if schedule and schedule.estimated_duration_minutes:
        return schedule.estimated_duration_minutes
    return 90  # Valeur par défaut


@app.post("/tournaments/{tournament_id}/reset-matches", tags=["Tournaments"])
async def reset_tournament_matches(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """
    Réinitialiser tous les statuts et scores des matchs d'un tournoi
    """
    from app.models.tournament import Tournament
    from app.models.tournamentphase import TournamentPhase
    from app.models.match import Match
    
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


@app.post("/tournaments/{tournament_id}/propagate-results", tags=["Tournaments"])
async def propagate_tournament_results(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """
    Propager automatiquement les résultats des matchs terminés vers les matchs suivants.
    Remplace les codes sources (WQ1, P1-1, etc.) par les vrais team_sport_id des gagnants.
    """
    from app.models.tournament import Tournament
    from app.models.tournamentphase import TournamentPhase
    from app.models.pool import Pool
    from app.models.match import Match
    from app.models.teampool import TeamPool
    
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
    
    # Créer un mapping des poules
    pools = db.query(Pool).filter(Pool.phase_id == phase.id).all()
    
    propagated_count = 0
    
    # Fonction pour résoudre un code source en team_sport_id
    def resolve_source_code(source_code: str) -> Optional[int]:
        if not source_code:
            return None
        
        # Codes de type "WQ1" = Winner of Qualification 1
        if source_code.startswith("WQ") and not source_code.startswith("WQF"):
            try:
                # Chercher par label (ex: "WQ1") OU par match_order
                match_label = source_code  # "WQ1"
                match_num = int(source_code[2:]) if source_code[2:].isdigit() else None
                qual_match = next((m for m in all_matches 
                                  if m.match_type == "qualification" 
                                  and (m.label == match_label or m.match_order == match_num)
                                  and m.status == "completed"), None)
                if qual_match and qual_match.score_a is not None and qual_match.score_b is not None:
                    return qual_match.team_sport_a_id if qual_match.score_a > qual_match.score_b else qual_match.team_sport_b_id
            except (ValueError, IndexError):
                pass
        
        # Codes de type "LQ1" = Loser of Qualification 1
        elif source_code.startswith("LQ") and not source_code.startswith("LQF"):
            try:
                # Construire le label du match source (WQ1 pour LQ1)
                match_label = "WQ" + source_code[2:]
                match_num = int(source_code[2:]) if source_code[2:].isdigit() else None
                qual_match = next((m for m in all_matches 
                                  if m.match_type == "qualification" 
                                  and (m.label == match_label or m.match_order == match_num)
                                  and m.status == "completed"), None)
                if qual_match and qual_match.score_a is not None and qual_match.score_b is not None:
                    return qual_match.team_sport_b_id if qual_match.score_a > qual_match.score_b else qual_match.team_sport_a_id
            except (ValueError, IndexError):
                pass
        
        # Codes de type "WQF1" = Winner of Quarterfinal 1
        elif source_code.startswith("WQF"):
            try:
                match_num = int(source_code[3:]) if source_code[3:].isdigit() else None
                qf_match = next((m for m in all_matches 
                               if m.bracket_type == "quarterfinal" 
                               and (m.match_order == match_num or (match_num and m.label and str(match_num) in m.label))
                               and m.status == "completed"), None)
                if qf_match and qf_match.score_a is not None and qf_match.score_b is not None:
                    return qf_match.team_sport_a_id if qf_match.score_a > qf_match.score_b else qf_match.team_sport_b_id
            except (ValueError, IndexError):
                pass
        
        # Codes de type "WSF1" = Winner of Semifinal 1
        elif source_code.startswith("WSF"):
            try:
                match_num = int(source_code[3:]) if source_code[3:].isdigit() else None
                # Chercher par label "WSF1" ou par match_order
                sf_match = next((m for m in all_matches 
                               if m.bracket_type == "semifinal" 
                               and (m.label == source_code or m.match_order == match_num)
                               and m.status == "completed"), None)
                if sf_match and sf_match.score_a is not None and sf_match.score_b is not None:
                    return sf_match.team_sport_a_id if sf_match.score_a > sf_match.score_b else sf_match.team_sport_b_id
            except (ValueError, IndexError):
                pass
        
        # Codes de type "LSF1" = Loser of Semifinal 1
        elif source_code.startswith("LSF"):
            try:
                match_num = int(source_code[3:]) if source_code[3:].isdigit() else None
                # Chercher la demi-finale correspondante (WSF1 pour LSF1)
                sf_label = "WSF" + source_code[3:]
                sf_match = next((m for m in all_matches 
                               if m.bracket_type == "semifinal" 
                               and (m.label == sf_label or m.match_order == match_num)
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
                pool = next((p for p in pools if p.name == pool_name), None)
                
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


@app.delete("/tournaments/{tournament_id}/reset", tags=["Tournaments"])
async def reset_tournament_structure(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """
    Supprimer toute la structure d'un tournoi (matchs, poules, phases)
    mais garder le tournoi lui-même.
    """
    from app.models.tournament import Tournament
    from app.models.tournamentphase import TournamentPhase
    from app.models.pool import Pool
    from app.models.match import Match
    from app.models.teampool import TeamPool
    
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

@app.get("/tournaments/{tournament_id}/matches")
def get_matches_by_tournament(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupère tous les matchs d'un tournoi donné
    """
    matches = db.query(Match).filter(Match.tournament_id == tournament_id).all()

    return {
        "success": True,
        "data": [match_to_dict(m) for m in matches]
    }