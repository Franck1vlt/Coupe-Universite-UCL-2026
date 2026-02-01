"""
Schémas Pydantic pour User
"""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, ConfigDict, Field


class UserBase(BaseModel):
    """Schéma de base pour User"""
    email: EmailStr
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Literal["admin", "staff", "technicien"] = "staff"
    is_active: bool = True


class UserCreate(UserBase):
    """Schéma pour créer un User"""
    password: str = Field(..., min_length=4, description="Mot de passe (min 4 caractères)")


class UserUpdate(BaseModel):
    """Schéma pour mettre à jour un User"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[Literal["admin", "staff", "technicien"]] = None
    is_active: Optional[bool] = None
    permissions: Optional[list[str]] = Field(None, description="Liste des permissions individuelles")


class UserPasswordUpdate(BaseModel):
    """Schéma pour mettre à jour le mot de passe"""
    new_password: str = Field(..., min_length=4, description="Nouveau mot de passe (min 4 caractères)")


class UserResponse(BaseModel):
    """Schéma pour la réponse User"""
    id: int
    email: EmailStr
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    is_active: bool
    is_deletable: bool = True
    has_temp_password: bool = False
    permissions: list[str] = Field(default_factory=list, description="Liste des permissions individuelles")
    created_at: datetime
    updated_at: Optional[datetime] = None
    masked_password: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserPublic(BaseModel):
    """Schéma public pour User (sans informations sensibles)"""
    id: int
    username: Optional[str] = None
    full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TempPasswordResponse(BaseModel):
    """Réponse avec mot de passe temporaire"""
    user_id: int
    username: str
    temp_password: str
    message: str
