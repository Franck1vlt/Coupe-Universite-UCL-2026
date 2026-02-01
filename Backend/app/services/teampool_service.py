"""
Service pour la gestion des équipes dans les poules
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.teampool import TeamPool
from app.schemas.teampool import TeamPoolCreate, TeamPoolUpdate
from app.services.base import BaseService
from app.exceptions import NotFoundError, ConflictError


class TeamPoolService(BaseService[TeamPool]):
    """
    Service pour la gestion des équipes dans les poules
    """
    
    def __init__(self, db: Session):
        super().__init__(TeamPool, db)
    
    def get_by_pool(self, pool_id: int) -> List[TeamPool]:
        """
        Récupère toutes les équipes d'une poule
        
        Args:
            pool_id: L'ID de la poule
            
        Returns:
            Liste des équipes triées par position
        """
        return self.db.query(TeamPool).filter(
            TeamPool.pool_id == pool_id
        ).order_by(TeamPool.position).all()
    
    def get_by_team(self, team_id: int) -> List[TeamPool]:
        """
        Récupère toutes les poules d'une équipe
        
        Args:
            team_id: L'ID de l'équipe
            
        Returns:
            Liste des inscriptions
        """
        return self.db.query(TeamPool).filter(TeamPool.team_id == team_id).all()
    
    def get_by_pool_and_team(
        self,
        pool_id: int,
        team_id: int
    ) -> Optional[TeamPool]:
        """
        Récupère une inscription par poule et équipe
        
        Args:
            pool_id: L'ID de la poule
            team_id: L'ID de l'équipe
            
        Returns:
            L'inscription trouvée ou None
        """
        return self.db.query(TeamPool).filter(
            TeamPool.pool_id == pool_id,
            TeamPool.team_id == team_id
        ).first()
    
    def create_team_pool(self, team_pool_data: TeamPoolCreate) -> TeamPool:
        """
        Crée une nouvelle inscription équipe-poule
        
        Args:
            team_pool_data: Les données de l'inscription à créer
            
        Returns:
            L'inscription créée
            
        Raises:
            NotFoundError: Si la poule ou l'équipe n'existe pas
            ConflictError: Si l'inscription existe déjà
        """
        # Vérifier que la poule existe
        from app.models.pool import Pool
        pool = self.db.query(Pool).filter(Pool.id == team_pool_data.pool_id).first()
        if not pool:
            raise NotFoundError("Pool", str(team_pool_data.pool_id))
        
        # Vérifier que l'équipe existe
        from app.models.team import Team
        team = self.db.query(Team).filter(Team.id == team_pool_data.team_id).first()
        if not team:
            raise NotFoundError("Team", str(team_pool_data.team_id))
        
        # Vérifier si l'inscription existe déjà
        existing = self.get_by_pool_and_team(
            team_pool_data.pool_id,
            team_pool_data.team_id
        )
        if existing:
            raise ConflictError(
                f"TeamPool with pool_id {team_pool_data.pool_id} "
                f"and team_id {team_pool_data.team_id} already exists"
            )
        
        return self.create(**team_pool_data.model_dump())
    
    def update_team_pool(
        self,
        team_pool_id: int,
        team_pool_data: TeamPoolUpdate
    ) -> TeamPool:
        """
        Met à jour une inscription équipe-poule
        
        Args:
            team_pool_id: L'ID de l'inscription à mettre à jour
            team_pool_data: Les données à mettre à jour
            
        Returns:
            L'inscription mise à jour
        """
        update_data = team_pool_data.model_dump(exclude_unset=True)
        return self.update(team_pool_id, **update_data)
    
    def recalculate_pool_standings(self, pool_id: int) -> List[TeamPool]:
        """
        Recalcule le classement d'une poule basé sur les statistiques
        
        Args:
            pool_id: L'ID de la poule
            
        Returns:
            Liste des équipes avec positions mises à jour
        """
        team_pools = self.get_by_pool(pool_id)
        
        # Trier par points (desc), puis différence de buts (desc), puis buts marqués (desc)
        team_pools.sort(
            key=lambda tp: (
                tp.points,
                tp.goal_difference,
                tp.goals_for
            ),
            reverse=True
        )
        
        # Mettre à jour les positions
        for index, team_pool in enumerate(team_pools, start=1):
            team_pool.position = index
        
        self.db.commit()
        
        return team_pools

