"""
Service pour la gestion des configurations de tournoi
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.tournamentconfiguration import TournamentConfiguration
from app.schemas.tournamentconfiguration import (
    TournamentConfigurationCreate,
    TournamentConfigurationUpdate
)
from app.services.base import BaseService
from app.exceptions import NotFoundError


class TournamentConfigurationService(BaseService[TournamentConfiguration]):
    """
    Service pour la gestion des configurations de tournoi
    """
    
    def __init__(self, db: Session):
        super().__init__(TournamentConfiguration, db)
    
    def get_by_tournament(self, tournament_id: int) -> Optional[TournamentConfiguration]:
        """
        Récupère la configuration d'un tournoi
        
        Args:
            tournament_id: L'ID du tournoi
            
        Returns:
            La configuration trouvée ou None
        """
        return self.db.query(TournamentConfiguration).filter(
            TournamentConfiguration.tournament_id == tournament_id
        ).first()
    
    def create_configuration(
        self,
        config_data: TournamentConfigurationCreate
    ) -> TournamentConfiguration:
        """
        Crée une nouvelle configuration de tournoi
        
        Args:
            config_data: Les données de la configuration à créer
            
        Returns:
            La configuration créée
            
        Raises:
            NotFoundError: Si le tournoi n'existe pas
            ConflictError: Si une configuration existe déjà pour ce tournoi
        """
        from app.exceptions import ConflictError
        
        # Vérifier que le tournoi existe
        from app.models.tournament import Tournament
        tournament = self.db.query(Tournament).filter(
            Tournament.id == config_data.tournament_id
        ).first()
        if not tournament:
            raise NotFoundError("Tournament", str(config_data.tournament_id))
        
        # Vérifier si une configuration existe déjà
        existing = self.get_by_tournament(config_data.tournament_id)
        if existing:
            raise ConflictError(
                f"Configuration for tournament {config_data.tournament_id} already exists"
            )
        
        return self.create(**config_data.model_dump())
    
    def update_configuration(
        self,
        tournament_id: int,
        config_data: TournamentConfigurationUpdate
    ) -> TournamentConfiguration:
        """
        Met à jour la configuration d'un tournoi
        
        Args:
            tournament_id: L'ID du tournoi
            config_data: Les données à mettre à jour
            
        Returns:
            La configuration mise à jour
            
        Raises:
            NotFoundError: Si la configuration n'existe pas
        """
        config = self.get_by_tournament(tournament_id)
        if not config:
            raise NotFoundError("TournamentConfiguration", str(tournament_id))
        
        update_data = config_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(config, key) and value is not None:
                setattr(config, key, value)
        
        self.db.commit()
        self.db.refresh(config)
        return config

