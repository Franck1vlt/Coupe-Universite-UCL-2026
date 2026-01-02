"""
Service pour la gestion des sets de match
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.matchset import MatchSet
from app.schemas.matchset import MatchSetCreate, MatchSetUpdate
from app.services.base import BaseService
from app.exceptions import NotFoundError, ConflictError


class MatchSetService(BaseService[MatchSet]):
    """
    Service pour la gestion des sets de match
    """
    
    def __init__(self, db: Session):
        super().__init__(MatchSet, db)
    
    def get_by_match(self, match_id: int) -> List[MatchSet]:
        """
        Récupère tous les sets d'un match
        
        Args:
            match_id: L'ID du match
            
        Returns:
            Liste des sets triés par numéro
        """
        return self.db.query(MatchSet).filter(
            MatchSet.match_id == match_id
        ).order_by(MatchSet.set_number).all()
    
    def get_by_match_and_number(
        self,
        match_id: int,
        set_number: int
    ) -> Optional[MatchSet]:
        """
        Récupère un set par match et numéro
        
        Args:
            match_id: L'ID du match
            set_number: Le numéro du set
            
        Returns:
            Le set trouvé ou None
        """
        return self.db.query(MatchSet).filter(
            MatchSet.match_id == match_id,
            MatchSet.set_number == set_number
        ).first()
    
    def create_set(self, set_data: MatchSetCreate) -> MatchSet:
        """
        Crée un nouveau set de match
        
        Args:
            set_data: Les données du set à créer
            
        Returns:
            Le set créé
            
        Raises:
            NotFoundError: Si le match n'existe pas
            ConflictError: Si un set avec le même numéro existe déjà
        """
        # Vérifier que le match existe
        from app.models.match import Match
        match = self.db.query(Match).filter(Match.id == set_data.match_id).first()
        if not match:
            raise NotFoundError("Match", str(set_data.match_id))
        
        # Vérifier si un set avec le même numéro existe déjà
        existing = self.get_by_match_and_number(set_data.match_id, set_data.set_number)
        if existing:
            raise ConflictError(
                f"Set with number {set_data.set_number} already exists "
                f"for match {set_data.match_id}"
            )
        
        return self.create(**set_data.model_dump())
    
    def update_set(self, set_id: int, set_data: MatchSetUpdate) -> MatchSet:
        """
        Met à jour un set de match
        
        Args:
            set_id: L'ID du set à mettre à jour
            set_data: Les données à mettre à jour
            
        Returns:
            Le set mis à jour
            
        Raises:
            ConflictError: Si le nouveau numéro est déjà utilisé
        """
        match_set = self.get_or_404(set_id)
        
        # Vérifier si le nouveau numéro est déjà utilisé
        if set_data.set_number:
            existing = self.get_by_match_and_number(
                match_set.match_id,
                set_data.set_number
            )
            if existing and existing.id != set_id:
                raise ConflictError(
                    f"Set with number {set_data.set_number} already exists "
                    f"for match {match_set.match_id}"
                )
        
        update_data = set_data.model_dump(exclude_unset=True)
        return self.update(set_id, **update_data)

