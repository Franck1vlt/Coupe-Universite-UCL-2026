"""
Module d'authentification et de gestion des permissions
"""
from app.auth.permissions import Role, ROUTE_PERMISSIONS, require_roles, get_current_user

__all__ = ["Role", "ROUTE_PERMISSIONS", "require_roles", "get_current_user"]
