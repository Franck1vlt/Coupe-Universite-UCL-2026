"""
Service pour la gestion des inscriptions équipe-sport
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.teamsport import TeamSport
from app.schemas.teamsport import TeamSportCreate, TeamSportUpdate
from app.services.base import BaseService
from app.exceptions import ConflictError, NotFoundError


class TeamSportService(BaseService[TeamSport]):
    """
    Service pour la gestion des inscriptions équipe-sport
    """
    
    def __init__(self, db: Session):
        super().__init__(TeamSport, db)
    
    def get_by_team_and_sport(self, team_id: int, sport_id: int) -> Optional[TeamSport]:
        """
        Récupère une inscription équipe-sport par équipe et sport
        
        Args:
            team_id: L'ID de l'équipe
            sport_id: L'ID du sport
            
        Returns:
            L'inscription trouvée ou None
        """
        return self.db.query(TeamSport).filter(
            TeamSport.team_id == team_id,
            TeamSport.sport_id == sport_id
        ).first()
    
    def get_by_team(self, team_id: int) -> List[TeamSport]:
        """
        Récupère toutes les inscriptions d'une équipe
        
        Args:
            team_id: L'ID de l'équipe
            
        Returns:
            Liste des inscriptions
        """
        return self.db.query(TeamSport).filter(TeamSport.team_id == team_id).all()
    
    def get_by_sport(self, sport_id: int) -> List[TeamSport]:
        """
        Récupère toutes les inscriptions d'un sport
        
        Args:
            sport_id: L'ID du sport
            
        Returns:
            Liste des inscriptions
        """
        return self.db.query(TeamSport).filter(TeamSport.sport_id == sport_id).all()
    
    def create_team_sport(self, team_sport_data: TeamSportCreate) -> TeamSport:
        """
        Crée une nouvelle inscription équipe-sport
        
        Args:
            team_sport_data: Les données de l'inscription à créer
            
        Returns:
            L'inscription créée
            
        Raises:
            ConflictError: Si l'inscription existe déjà
            NotFoundError: Si l'équipe ou le sport n'existe pas
        """
        # Vérifier si l'inscription existe déjà
        existing = self.get_by_team_and_sport(
            team_sport_data.team_id,
            team_sport_data.sport_id
        )
        if existing:
            raise ConflictError(
                f"TeamSport with team_id {team_sport_data.team_id} "
                f"and sport_id {team_sport_data.sport_id} already exists"
            )
        
        # Vérifier que l'équipe existe
        from app.models.team import Team
        team = self.db.query(Team).filter(Team.id == team_sport_data.team_id).first()
        if not team:
            raise NotFoundError(f"Team with id {team_sport_data.team_id} not found")
        
        # Vérifier que le sport existe
        from app.models.sport import Sport
        sport = self.db.query(Sport).filter(Sport.id == team_sport_data.sport_id).first()
        if not sport:
            raise NotFoundError(f"Sport with id {team_sport_data.sport_id} not found")
        
        return self.create(**team_sport_data.model_dump())
    
    def update_team_sport(self, team_sport_id: int, team_sport_data: TeamSportUpdate) -> TeamSport:
        """
        Met à jour une inscription équipe-sport
        
        Args:
            team_sport_id: L'ID de l'inscription à mettre à jour
            team_sport_data: Les données à mettre à jour
            
        Returns:
            L'inscription mise à jour
        """
        update_data = team_sport_data.model_dump(exclude_unset=True)
        return self.update(team_sport_id, **update_data)

