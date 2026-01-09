from typing import Generic, TypeVar, List
from pydantic import BaseModel
from pydantic.generics import GenericModel

T = TypeVar("T")

class ListResponse(GenericModel, Generic[T]):
    success: bool
    data: dict[str, List[T]]
"""
Schémas communs et utilitaires pour les schémas Pydantic
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TimestampMixin(BaseModel):
    """Mixin pour ajouter les timestamps aux schémas"""
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BaseResponse(BaseModel):
    """Schéma de base pour les réponses"""
    id: int

    model_config = ConfigDict(from_attributes=True)

