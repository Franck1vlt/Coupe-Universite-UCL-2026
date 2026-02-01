"""
Service pour la gestion des joueurs
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.player import Player
from app.schemas.player import PlayerCreate, PlayerUpdate
from app.services.base import BaseService
from app.exceptions import NotFoundError, ConflictError


class PlayerService(BaseService[Player]):
    """
    Service pour la gestion des joueurs
    """
    
    def __init__(self, db: Session):
        super().__init__(Player, db)
    
    def get_by_team_sport(self, team_sport_id: int) -> List[Player]:
        """
        Récupère tous les joueurs d'une équipe-sport
        
        Args:
            team_sport_id: L'ID de l'équipe-sport
            
        Returns:
            Liste des joueurs
        """
        return self.db.query(Player).filter(
            Player.team_sport_id == team_sport_id
        ).all()
    
    def get_by_jersey_number(
        self,
        team_sport_id: int,
        jersey_number: int
    ) -> Optional[Player]:
        """
        Récupère un joueur par numéro de maillot
        
        Args:
            team_sport_id: L'ID de l'équipe-sport
            jersey_number: Le numéro de maillot
            
        Returns:
            Le joueur trouvé ou None
        """
        return self.db.query(Player).filter(
            Player.team_sport_id == team_sport_id,
            Player.jersey_number == jersey_number
        ).first()
    
    def get_active_players(self, team_sport_id: int) -> List[Player]:
        """
        Récupère tous les joueurs actifs d'une équipe-sport
        
        Args:
            team_sport_id: L'ID de l'équipe-sport
            
        Returns:
            Liste des joueurs actifs
        """
        return self.db.query(Player).filter(
            Player.team_sport_id == team_sport_id,
            Player.is_active == True
        ).all()
    
    def create_player(self, player_data: PlayerCreate) -> Player:
        """
        Crée un nouveau joueur
        
        Args:
            player_data: Les données du joueur à créer
            
        Returns:
            Le joueur créé
            
        Raises:
            NotFoundError: Si l'équipe-sport n'existe pas
            ConflictError: Si un joueur avec le même numéro de maillot existe déjà
        """
        # Vérifier que l'équipe-sport existe
        from app.models.teamsport import TeamSport
        team_sport = self.db.query(TeamSport).filter(
            TeamSport.id == player_data.team_sport_id
        ).first()
        if not team_sport:
            raise NotFoundError("TeamSport", str(player_data.team_sport_id))
        
        # Vérifier si un joueur avec le même numéro de maillot existe déjà
        if player_data.jersey_number:
            existing = self.get_by_jersey_number(
                player_data.team_sport_id,
                player_data.jersey_number
            )
            if existing:
                raise ConflictError(
                    f"Player with jersey_number {player_data.jersey_number} "
                    f"already exists in team_sport {player_data.team_sport_id}"
                )
        
        return self.create(**player_data.model_dump())
    
    def update_player(self, player_id: int, player_data: PlayerUpdate) -> Player:
        """
        Met à jour un joueur
        
        Args:
            player_id: L'ID du joueur à mettre à jour
            player_data: Les données à mettre à jour
            
        Returns:
            Le joueur mis à jour
            
        Raises:
            ConflictError: Si le nouveau numéro de maillot est déjà utilisé
        """
        player = self.get_or_404(player_id)
        
        # Vérifier si le nouveau numéro de maillot est déjà utilisé
        if player_data.jersey_number:
            existing = self.get_by_jersey_number(
                player.team_sport_id,
                player_data.jersey_number
            )
            if existing and existing.id != player_id:
                raise ConflictError(
                    f"Player with jersey_number {player_data.jersey_number} "
                    f"already exists in team_sport {player.team_sport_id}"
                )
        
        update_data = player_data.model_dump(exclude_unset=True)
        return self.update(player_id, **update_data)

