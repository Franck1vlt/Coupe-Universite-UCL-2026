"""
Service pour la gestion des terrains
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.court import Court
from app.schemas.court import CourtCreate, CourtUpdate
from app.services.base import BaseService
from app.exceptions import ConflictError, NotFoundError


class CourtService(BaseService[Court]):
    """
    Service pour la gestion des terrains
    """
    
    def __init__(self, db: Session):
        super().__init__(Court, db)
    
    def get_by_name(self, name: str) -> Optional[Court]:
        """
        Récupère un terrain par son nom
        
        Args:
            name: Le nom du terrain
            
        Returns:
            Le terrain trouvé ou None
        """
        return self.db.query(Court).filter(Court.name == name).first()
    
    def get_active_courts(self) -> List[Court]:
        """
        Récupère tous les terrains actifs
        
        Returns:
            Liste des terrains actifs
        """
        return self.db.query(Court).filter(Court.is_active == True).all()
    
    def create_court(self, court_data: CourtCreate) -> Court:
        """
        Crée un nouveau terrain
        
        Args:
            court_data: Les données du terrain à créer
            
        Returns:
            Le terrain créé
            
        Raises:
            ConflictError: Si un terrain avec le même nom existe déjà
            NotFoundError: Si un sport dans sport_ids n'existe pas
        """
        # Vérifier si un terrain avec le même nom existe déjà
        existing = self.get_by_name(court_data.name)
        if existing:
            raise ConflictError(f"Court with name '{court_data.name}' already exists")
        
        # Créer le terrain
        court = self.create(
            name=court_data.name,
            is_active=court_data.is_active
        )
        
        # Associer les sports si fournis
        if court_data.sport_ids:
            from app.models.sport import Sport
            from app.models.court import court_sport_association
            
            for sport_id in court_data.sport_ids:
                sport = self.db.query(Sport).filter(Sport.id == sport_id).first()
                if not sport:
                    raise NotFoundError("Sport", str(sport_id))
                court.sports.append(sport)
            
            self.db.commit()
            self.db.refresh(court)
        
        return court
    
    def update_court(self, court_id: int, court_data: CourtUpdate) -> Court:
        """
        Met à jour un terrain
        
        Args:
            court_id: L'ID du terrain à mettre à jour
            court_data: Les données à mettre à jour
            
        Returns:
            Le terrain mis à jour
            
        Raises:
            ConflictError: Si le nouveau nom est déjà utilisé
            NotFoundError: Si un sport dans sport_ids n'existe pas
        """
        court = self.get_or_404(court_id)
        
        # Vérifier si le nouveau nom est déjà utilisé
        if court_data.name:
            existing = self.get_by_name(court_data.name)
            if existing and existing.id != court_id:
                raise ConflictError(f"Court with name '{court_data.name}' already exists")
        
        # Mettre à jour les champs de base
        update_data = {
            k: v for k, v in court_data.model_dump(exclude_unset=True, exclude={'sport_ids'}).items()
        }
        if update_data:
            for key, value in update_data.items():
                if hasattr(court, key) and value is not None:
                    setattr(court, key, value)
        
        # Mettre à jour les sports si fournis
        if court_data.sport_ids is not None:
            from app.models.sport import Sport
            
            # Vérifier que tous les sports existent
            for sport_id in court_data.sport_ids:
                sport = self.db.query(Sport).filter(Sport.id == sport_id).first()
                if not sport:
                    raise NotFoundError("Sport", str(sport_id))
            
            # Remplacer les associations
            court.sports.clear()
            for sport_id in court_data.sport_ids:
                sport = self.db.query(Sport).filter(Sport.id == sport_id).first()
                court.sports.append(sport)
        
        self.db.commit()
        self.db.refresh(court)
        return court

