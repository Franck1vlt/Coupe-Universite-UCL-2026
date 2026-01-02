"""
Service pour la gestion des sports
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.sport import Sport
from app.schemas.sport import SportCreate, SportUpdate
from app.services.base import BaseService
from app.exceptions import ConflictError


class SportService(BaseService[Sport]):
    """
    Service pour la gestion des sports
    """
    
    def __init__(self, db: Session):
        super().__init__(Sport, db)
    
    def get_by_name(self, name: str) -> Optional[Sport]:
        """
        Récupère un sport par son nom
        
        Args:
            name: Le nom du sport
            
        Returns:
            Le sport trouvé ou None
        """
        return self.db.query(Sport).filter(Sport.name == name).first()
    
    def create_sport(self, sport_data: SportCreate) -> Sport:
        """
        Crée un nouveau sport
        
        Args:
            sport_data: Les données du sport à créer
            
        Returns:
            Le sport créé
            
        Raises:
            ConflictError: Si un sport avec le même nom existe déjà
        """
        # Vérifier si un sport avec le même nom existe déjà
        existing = self.get_by_name(sport_data.name)
        if existing:
            raise ConflictError(f"Sport with name '{sport_data.name}' already exists")
        
        return self.create(**sport_data.model_dump())
    
    def update_sport(self, sport_id: int, sport_data: SportUpdate) -> Sport:
        """
        Met à jour un sport
        
        Args:
            sport_id: L'ID du sport à mettre à jour
            sport_data: Les données à mettre à jour
            
        Returns:
            Le sport mis à jour
            
        Raises:
            ConflictError: Si le nouveau nom est déjà utilisé par un autre sport
        """
        # Vérifier si le nouveau nom est déjà utilisé
        if sport_data.name:
            existing = self.get_by_name(sport_data.name)
            if existing and existing.id != sport_id:
                raise ConflictError(f"Sport with name '{sport_data.name}' already exists")
        
        update_data = sport_data.model_dump(exclude_unset=True)
        return self.update(sport_id, **update_data)
    
    def get_sports_by_score_type(self, score_type: str) -> List[Sport]:
        """
        Récupère tous les sports d'un type de score donné
        
        Args:
            score_type: Le type de score (points, goals, sets)
            
        Returns:
            Liste des sports
        """
        return self.db.query(Sport).filter(Sport.score_type == score_type).all()

