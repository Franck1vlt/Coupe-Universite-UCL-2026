"""
Service pour la gestion du classement final agrégé
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.finalranking import FinalRanking
from app.schemas.finalranking import FinalRankingCreate, FinalRankingUpdate
from app.services.base import BaseService
from app.exceptions import NotFoundError, ConflictError


class FinalRankingService(BaseService[FinalRanking]):
    """
    Service pour la gestion du classement final agrégé
    """
    
    def __init__(self, db: Session):
        super().__init__(FinalRanking, db)
    
    def get_by_team(self, team_id: int) -> Optional[FinalRanking]:
        """
        Récupère le classement final d'une équipe
        
        Args:
            team_id: L'ID de l'équipe
            
        Returns:
            Le classement trouvé ou None
        """
        return self.db.query(FinalRanking).filter(
            FinalRanking.team_id == team_id
        ).first()
    
    def get_all_ranked(self, limit: Optional[int] = None) -> List[FinalRanking]:
        """
        Récupère tous les classements finaux triés par position
        
        Args:
            limit: Nombre maximum de résultats (optionnel)
            
        Returns:
            Liste des classements triés
        """
        query = self.db.query(FinalRanking).filter(
            FinalRanking.total_position.isnot(None)
        ).order_by(FinalRanking.total_position)
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def create_final_ranking(self, ranking_data: FinalRankingCreate) -> FinalRanking:
        """
        Crée un nouveau classement final
        
        Args:
            ranking_data: Les données du classement à créer
            
        Returns:
            Le classement créé
            
        Raises:
            NotFoundError: Si l'équipe n'existe pas
            ConflictError: Si un classement existe déjà pour cette équipe
        """
        # Vérifier que l'équipe existe
        from app.models.team import Team
        team = self.db.query(Team).filter(Team.id == ranking_data.team_id).first()
        if not team:
            raise NotFoundError("Team", str(ranking_data.team_id))
        
        # Vérifier si un classement existe déjà
        existing = self.get_by_team(ranking_data.team_id)
        if existing:
            raise ConflictError(
                f"Final ranking for team {ranking_data.team_id} already exists"
            )
        
        return self.create(**ranking_data.model_dump())
    
    def update_final_ranking(
        self,
        team_id: int,
        ranking_data: FinalRankingUpdate
    ) -> FinalRanking:
        """
        Met à jour le classement final d'une équipe
        
        Args:
            team_id: L'ID de l'équipe
            ranking_data: Les données à mettre à jour
            
        Returns:
            Le classement mis à jour
            
        Raises:
            NotFoundError: Si le classement n'existe pas
        """
        ranking = self.get_by_team(team_id)
        if not ranking:
            raise NotFoundError("FinalRanking", str(team_id))
        
        update_data = ranking_data.model_dump(exclude_unset=True)
        return self.update(ranking.id, **update_data)
    
    def recalculate_rankings(self) -> List[FinalRanking]:
        """
        Recalcule tous les classements finaux à partir des classements de tournois
        
        Returns:
            Liste des classements mis à jour
        """
        from app.models.tournamentranking import TournamentRanking
        from app.models.team import Team
        
        # Récupérer toutes les équipes
        teams = self.db.query(Team).all()
        
        updated_rankings = []
        
        for team in teams:
            # Récupérer tous les classements de tournois pour cette équipe
            # via les TeamSport
            from app.models.teamsport import TeamSport
            
            team_sports = self.db.query(TeamSport).filter(
                TeamSport.team_id == team.id
            ).all()
            
            total_points = 0
            tournaments_participated = 0
            tournaments_won = 0
            tournaments_second = 0
            tournaments_third = 0
            
            for team_sport in team_sports:
                rankings = self.db.query(TournamentRanking).filter(
                    TournamentRanking.team_sport_id == team_sport.id
                ).all()
                
                for ranking in rankings:
                    tournaments_participated += 1
                    if ranking.points_awarded:
                        total_points += ranking.points_awarded
                    
                    if ranking.final_position == 1:
                        tournaments_won += 1
                    elif ranking.final_position == 2:
                        tournaments_second += 1
                    elif ranking.final_position == 3:
                        tournaments_third += 1
            
            # Mettre à jour ou créer le classement final
            final_ranking = self.get_by_team(team.id)
            if final_ranking:
                final_ranking.total_points = total_points
                final_ranking.tournaments_participated = tournaments_participated
                final_ranking.tournaments_won = tournaments_won
                final_ranking.tournaments_second = tournaments_second
                final_ranking.tournaments_third = tournaments_third
            else:
                final_ranking = self.create(
                    team_id=team.id,
                    total_points=total_points,
                    tournaments_participated=tournaments_participated,
                    tournaments_won=tournaments_won,
                    tournaments_second=tournaments_second,
                    tournaments_third=tournaments_third
                )
            
            updated_rankings.append(final_ranking)
        
        # Trier par points et mettre à jour les positions
        updated_rankings.sort(key=lambda x: x.total_points, reverse=True)
        for index, ranking in enumerate(updated_rankings, start=1):
            ranking.total_position = index
        
        self.db.commit()
        
        return updated_rankings

