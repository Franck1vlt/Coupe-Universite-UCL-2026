"""
Schémas Pydantic pour User
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    """Schéma de base pour User"""
    email: EmailStr
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_active: bool = True
    is_staff: bool = False
    is_superuser: bool = False


class UserCreate(UserBase):
    """Schéma pour créer un User"""
    pass


class UserUpdate(BaseModel):
    """Schéma pour mettre à jour un User"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_staff: Optional[bool] = None
    is_superuser: Optional[bool] = None


class UserResponse(UserBase):
    """Schéma pour la réponse User"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserPublic(BaseModel):
    """Schéma public pour User (sans informations sensibles)"""
    id: int
    username: Optional[str] = None
    full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

