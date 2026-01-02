"""
Service pour la gestion des équipes
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamUpdate
from app.services.base import BaseService
from app.exceptions import ConflictError


class TeamService(BaseService[Team]):
    """
    Service pour la gestion des équipes
    """
    
    def __init__(self, db: Session):
        super().__init__(Team, db)
    
    def get_by_name(self, name: str) -> Optional[Team]:
        """
        Récupère une équipe par son nom
        
        Args:
            name: Le nom de l'équipe
            
        Returns:
            L'équipe trouvée ou None
        """
        return self.db.query(Team).filter(Team.name == name).first()
    
    def create_team(self, team_data: TeamCreate) -> Team:
        """
        Crée une nouvelle équipe
        
        Args:
            team_data: Les données de l'équipe à créer
            
        Returns:
            L'équipe créée
            
        Raises:
            ConflictError: Si une équipe avec le même nom existe déjà
        """
        # Vérifier si une équipe avec le même nom existe déjà
        existing = self.get_by_name(team_data.name)
        if existing:
            raise ConflictError(f"Team with name '{team_data.name}' already exists")
        
        return self.create(**team_data.model_dump())
    
    def update_team(self, team_id: int, team_data: TeamUpdate) -> Team:
        """
        Met à jour une équipe
        
        Args:
            team_id: L'ID de l'équipe à mettre à jour
            team_data: Les données à mettre à jour
            
        Returns:
            L'équipe mise à jour
            
        Raises:
            ConflictError: Si le nouveau nom est déjà utilisé par une autre équipe
        """
        # Vérifier si le nouveau nom est déjà utilisé
        if team_data.name:
            existing = self.get_by_name(team_data.name)
            if existing and existing.id != team_id:
                raise ConflictError(f"Team with name '{team_data.name}' already exists")
        
        update_data = team_data.model_dump(exclude_unset=True)
        return self.update(team_id, **update_data)

