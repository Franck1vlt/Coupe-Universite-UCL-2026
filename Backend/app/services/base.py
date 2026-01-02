"""
Service de base avec des fonctions communes pour tous les services
"""
from typing import TypeVar, Generic, Type, Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.exceptions import NotFoundError, ConflictError

ModelType = TypeVar("ModelType")


class BaseService(Generic[ModelType]):
    """
    Classe de base pour tous les services
    Fournit les opérations CRUD de base
    """
    
    def __init__(self, model: Type[ModelType], db: Session):
        """
        Initialise le service avec le modèle et la session de base de données
        
        Args:
            model: Le modèle SQLAlchemy
            db: La session de base de données
        """
        self.model = model
        self.db = db
    
    def get(self, id: int) -> Optional[ModelType]:
        """
        Récupère un objet par son ID
        
        Args:
            id: L'ID de l'objet
            
        Returns:
            L'objet trouvé ou None
        """
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def get_or_404(self, id: int) -> ModelType:
        """
        Récupère un objet par son ID ou lève une exception 404
        
        Args:
            id: L'ID de l'objet
            
        Returns:
            L'objet trouvé
            
        Raises:
            NotFoundError: Si l'objet n'existe pas
        """
        obj = self.get(id)
        if not obj:
            model_name = self.model.__name__
            raise NotFoundError(model_name, str(id))
        return obj
    
    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None
    ) -> List[ModelType]:
        """
        Récupère tous les objets avec pagination et filtres
        
        Args:
            skip: Nombre d'éléments à sauter
            limit: Nombre maximum d'éléments à retourner
            filters: Dictionnaire de filtres à appliquer
            order_by: Nom de la colonne pour le tri
            
        Returns:
            Liste des objets
        """
        query = self.db.query(self.model)
        
        # Appliquer les filtres
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key) and value is not None:
                    if isinstance(value, str):
                        # Recherche partielle pour les chaînes
                        query = query.filter(getattr(self.model, key).ilike(f"%{value}%"))
                    else:
                        query = query.filter(getattr(self.model, key) == value)
        
        # Appliquer le tri
        if order_by and hasattr(self.model, order_by):
            query = query.order_by(getattr(self.model, order_by))
        
        return query.offset(skip).limit(limit).all()
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Compte le nombre d'objets avec filtres optionnels
        
        Args:
            filters: Dictionnaire de filtres à appliquer
            
        Returns:
            Le nombre d'objets
        """
        query = self.db.query(self.model)
        
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key) and value is not None:
                    if isinstance(value, str):
                        query = query.filter(getattr(self.model, key).ilike(f"%{value}%"))
                    else:
                        query = query.filter(getattr(self.model, key) == value)
        
        return query.count()
    
    def create(self, **kwargs) -> ModelType:
        """
        Crée un nouvel objet
        
        Args:
            **kwargs: Les attributs de l'objet à créer
            
        Returns:
            L'objet créé
        """
        obj = self.model(**kwargs)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj
    
    def update(self, id: int, **kwargs) -> ModelType:
        """
        Met à jour un objet existant
        
        Args:
            id: L'ID de l'objet à mettre à jour
            **kwargs: Les attributs à mettre à jour
            
        Returns:
            L'objet mis à jour
            
        Raises:
            NotFoundError: Si l'objet n'existe pas
        """
        obj = self.get_or_404(id)
        
        for key, value in kwargs.items():
            if hasattr(obj, key) and value is not None:
                setattr(obj, key, value)
        
        self.db.commit()
        self.db.refresh(obj)
        return obj
    
    def delete(self, id: int) -> bool:
        """
        Supprime un objet
        
        Args:
            id: L'ID de l'objet à supprimer
            
        Returns:
            True si supprimé avec succès
            
        Raises:
            NotFoundError: Si l'objet n'existe pas
        """
        obj = self.get_or_404(id)
        self.db.delete(obj)
        self.db.commit()
        return True
    
    def exists(self, id: int) -> bool:
        """
        Vérifie si un objet existe
        
        Args:
            id: L'ID de l'objet
            
        Returns:
            True si l'objet existe, False sinon
        """
        return self.db.query(self.model).filter(self.model.id == id).first() is not None

