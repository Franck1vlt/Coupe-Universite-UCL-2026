"""
Service pour la gestion des classements de tournoi
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.tournamentranking import TournamentRanking
from app.schemas.tournamentranking import (
    TournamentRankingCreate,
    TournamentRankingUpdate
)
from app.services.base import BaseService
from app.exceptions import NotFoundError, ConflictError


class TournamentRankingService(BaseService[TournamentRanking]):
    """
    Service pour la gestion des classements de tournoi
    """
    
    def __init__(self, db: Session):
        super().__init__(TournamentRanking, db)
    
    def get_by_tournament(self, tournament_id: int) -> List[TournamentRanking]:
        """
        Récupère tous les classements d'un tournoi
        
        Args:
            tournament_id: L'ID du tournoi
            
        Returns:
            Liste des classements triés par position
        """
        return self.db.query(TournamentRanking).filter(
            TournamentRanking.tournament_id == tournament_id
        ).order_by(TournamentRanking.final_position).all()
    
    def get_by_team_sport(self, team_sport_id: int) -> List[TournamentRanking]:
        """
        Récupère tous les classements d'une équipe-sport
        
        Args:
            team_sport_id: L'ID de l'équipe-sport
            
        Returns:
            Liste des classements
        """
        return self.db.query(TournamentRanking).filter(
            TournamentRanking.team_sport_id == team_sport_id
        ).all()
    
    def get_by_tournament_and_team_sport(
        self,
        tournament_id: int,
        team_sport_id: int
    ) -> Optional[TournamentRanking]:
        """
        Récupère un classement par tournoi et équipe-sport
        
        Args:
            tournament_id: L'ID du tournoi
            team_sport_id: L'ID de l'équipe-sport
            
        Returns:
            Le classement trouvé ou None
        """
        return self.db.query(TournamentRanking).filter(
            TournamentRanking.tournament_id == tournament_id,
            TournamentRanking.team_sport_id == team_sport_id
        ).first()
    
    def create_ranking(self, ranking_data: TournamentRankingCreate) -> TournamentRanking:
        """
        Crée un nouveau classement de tournoi
        
        Args:
            ranking_data: Les données du classement à créer
            
        Returns:
            Le classement créé
            
        Raises:
            NotFoundError: Si le tournoi ou l'équipe-sport n'existe pas
            ConflictError: Si le classement existe déjà
        """
        # Vérifier que le tournoi existe
        from app.models.tournament import Tournament
        tournament = self.db.query(Tournament).filter(
            Tournament.id == ranking_data.tournament_id
        ).first()
        if not tournament:
            raise NotFoundError("Tournament", str(ranking_data.tournament_id))
        
        # Vérifier que l'équipe-sport existe
        from app.models.teamsport import TeamSport
        team_sport = self.db.query(TeamSport).filter(
            TeamSport.id == ranking_data.team_sport_id
        ).first()
        if not team_sport:
            raise NotFoundError("TeamSport", str(ranking_data.team_sport_id))
        
        # Vérifier si le classement existe déjà
        existing = self.get_by_tournament_and_team_sport(
            ranking_data.tournament_id,
            ranking_data.team_sport_id
        )
        if existing:
            raise ConflictError(
                f"Ranking for tournament {ranking_data.tournament_id} "
                f"and team_sport {ranking_data.team_sport_id} already exists"
            )
        
        return self.create(**ranking_data.model_dump())
    
    def update_ranking(
        self,
        tournament_id: int,
        team_sport_id: int,
        ranking_data: TournamentRankingUpdate
    ) -> TournamentRanking:
        """
        Met à jour un classement de tournoi
        
        Args:
            tournament_id: L'ID du tournoi
            team_sport_id: L'ID de l'équipe-sport
            ranking_data: Les données à mettre à jour
            
        Returns:
            Le classement mis à jour
            
        Raises:
            NotFoundError: Si le classement n'existe pas
        """
        ranking = self.get_by_tournament_and_team_sport(tournament_id, team_sport_id)
        if not ranking:
            raise NotFoundError(
                "TournamentRanking",
                f"tournament_id={tournament_id}, team_sport_id={team_sport_id}"
            )
        
        update_data = ranking_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(ranking, key) and value is not None:
                setattr(ranking, key, value)
        
        self.db.commit()
        self.db.refresh(ranking)
        return ranking

