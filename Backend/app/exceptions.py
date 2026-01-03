"""
Gestion centralisée des exceptions et réponses standardisées
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Exception de base pour l'application"""
    def __init__(self, message: str, code: str = "APP_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)


class NotFoundError(AppException):
    """Ressource non trouvée"""
    def __init__(self, resource: str, resource_id: str = None):
        message = f"{resource} not found"
        if resource_id:
            message = f"{resource} with id {resource_id} not found"
        super().__init__(message, "NOT_FOUND", status.HTTP_404_NOT_FOUND)


class AppValidationError(AppException):
    """Erreur de validation de l'application"""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, "VALIDATION_ERROR", status.HTTP_400_BAD_REQUEST)
        self.details = details or {}


class UnauthorizedError(AppException):
    """Non autorisé"""
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, "UNAUTHORIZED", status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(AppException):
    """Accès interdit"""
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, "FORBIDDEN", status.HTTP_403_FORBIDDEN)


class ConflictError(AppException):
    """Conflit (ex: doublon)"""
    def __init__(self, message: str = "Conflict"):
        super().__init__(message, "CONFLICT", status.HTTP_409_CONFLICT)


class BadRequestError(AppException):
    """Mauvaise requête"""
    def __init__(self, message: str = "Bad Request"):
        super().__init__(message, "BAD_REQUEST", status.HTTP_400_BAD_REQUEST)


def create_success_response(data=None, message: str = "Operation successful", status_code: int = 200):
    """
    Crée une réponse de succès standardisée
    """
    response = {
        "success": True,
        "message": message,
    }
    if data is not None:
        response["data"] = data
    return JSONResponse(content=response, status_code=status_code)


def create_error_response(error: AppException, details: dict = None):
    """
    Crée une réponse d'erreur standardisée
    """
    response = {
        "success": False,
        "error": {
            "code": error.code,
            "message": error.message,
        }
    }
    if details:
        response["error"]["details"] = details
    return JSONResponse(content=response, status_code=error.status_code)


async def app_exception_handler(request: Request, exc: AppException):
    """Gestionnaire pour les exceptions de l'application"""
    logger.error(f"AppException: {exc.code} - {exc.message}", exc_info=True)
    return create_error_response(exc)


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Gestionnaire pour les erreurs de validation Pydantic"""
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(f"Validation error: {errors}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Validation error",
                "details": errors
            }
        }
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Gestionnaire pour les erreurs SQLAlchemy"""
    logger.error(f"Database error: {str(exc)}", exc_info=True)
    
    # Ne pas exposer les détails de l'erreur DB en production
    message = "Database error occurred"
    if settings.DEBUG:
        message = str(exc)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "DATABASE_ERROR",
                "message": message
            }
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Gestionnaire pour les exceptions non gérées"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    message = "An unexpected error occurred"
    if settings.DEBUG:
        message = str(exc)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": message
            }
        }
    )

