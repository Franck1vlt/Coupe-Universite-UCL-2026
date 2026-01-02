"""
Service pour la gestion des matchs
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.match import Match
from app.schemas.match import MatchCreate, MatchUpdate
from app.services.base import BaseService
from app.exceptions import NotFoundError, ConflictError


class MatchService(BaseService[Match]):
    """
    Service pour la gestion des matchs
    """
    
    def __init__(self, db: Session):
        super().__init__(Match, db)
    
    def get_by_phase(self, phase_id: int) -> List[Match]:
        """
        Récupère tous les matchs d'une phase
        
        Args:
            phase_id: L'ID de la phase
            
        Returns:
            Liste des matchs
        """
        return self.db.query(Match).filter(Match.phase_id == phase_id).all()
    
    def get_by_status(self, status: str) -> List[Match]:
        """
        Récupère tous les matchs avec un statut donné
        
        Args:
            status: Le statut (upcoming, in_progress, completed, cancelled)
            
        Returns:
            Liste des matchs
        """
        return self.db.query(Match).filter(Match.status == status).all()
    
    def get_by_team_sport(self, team_sport_id: int) -> List[Match]:
        """
        Récupère tous les matchs d'une équipe-sport
        
        Args:
            team_sport_id: L'ID de l'équipe-sport
            
        Returns:
            Liste des matchs (en tant qu'équipe A ou B)
        """
        return self.db.query(Match).filter(
            (Match.team_sport_a_id == team_sport_id) |
            (Match.team_sport_b_id == team_sport_id)
        ).all()
    
    def create_match(self, match_data: MatchCreate) -> Match:
        """
        Crée un nouveau match
        
        Args:
            match_data: Les données du match à créer
            
        Returns:
            Le match créé
            
        Raises:
            NotFoundError: Si la phase, les équipes ou l'utilisateur n'existent pas
            ConflictError: Si les deux équipes sont identiques
        """
        # Vérifier que la phase existe
        from app.models.tournamentphase import TournamentPhase
        phase = self.db.query(TournamentPhase).filter(
            TournamentPhase.id == match_data.phase_id
        ).first()
        if not phase:
            raise NotFoundError("TournamentPhase", str(match_data.phase_id))
        
        # Vérifier que les équipes existent
        from app.models.teamsport import TeamSport
        team_sport_a = self.db.query(TeamSport).filter(
            TeamSport.id == match_data.team_sport_a_id
        ).first()
        if not team_sport_a:
            raise NotFoundError("TeamSport", str(match_data.team_sport_a_id))
        
        team_sport_b = self.db.query(TeamSport).filter(
            TeamSport.id == match_data.team_sport_b_id
        ).first()
        if not team_sport_b:
            raise NotFoundError("TeamSport", str(match_data.team_sport_b_id))
        
        # Vérifier que les deux équipes sont différentes
        if match_data.team_sport_a_id == match_data.team_sport_b_id:
            raise ConflictError("A team cannot play against itself")
        
        # Vérifier que l'utilisateur existe
        from app.models.user import User
        user = self.db.query(User).filter(
            User.id == match_data.created_by_user_id
        ).first()
        if not user:
            raise NotFoundError("User", str(match_data.created_by_user_id))
        
        return self.create(**match_data.model_dump())
    
    def update_match(self, match_id: int, match_data: MatchUpdate) -> Match:
        """
        Met à jour un match
        
        Args:
            match_id: L'ID du match à mettre à jour
            match_data: Les données à mettre à jour
            
        Returns:
            Le match mis à jour
            
        Raises:
            ConflictError: Si les deux équipes sont identiques
        """
        match = self.get_or_404(match_id)
        
        # Vérifier que les deux équipes sont différentes si elles sont mises à jour
        team_a_id = match_data.team_sport_a_id or match.team_sport_a_id
        team_b_id = match_data.team_sport_b_id or match.team_sport_b_id
        
        if team_a_id == team_b_id:
            raise ConflictError("A team cannot play against itself")
        
        update_data = match_data.model_dump(exclude_unset=True)
        return self.update(match_id, **update_data)
    
    def update_score(
        self,
        match_id: int,
        score_a: int,
        score_b: int,
        updated_by_user_id: int
    ) -> Match:
        """
        Met à jour le score d'un match
        
        Args:
            match_id: L'ID du match
            score_a: Le score de l'équipe A
            score_b: Le score de l'équipe B
            updated_by_user_id: L'ID de l'utilisateur qui met à jour
            
        Returns:
            Le match mis à jour
        """
        match = self.get_or_404(match_id)
        
        match.score_a = score_a
        match.score_b = score_b
        match.updated_by_user_id = updated_by_user_id
        
        # Si le score est défini, marquer le match comme terminé
        if score_a is not None and score_b is not None:
            match.status = "completed"
        
        self.db.commit()
        self.db.refresh(match)
        
        return match

