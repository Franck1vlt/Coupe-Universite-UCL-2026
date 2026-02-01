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
        
        match = self.create(**match_data.model_dump(exclude={"court_id", "scheduled_datetime"}))

        # Création automatique de la planification si court_id fourni
        if getattr(match_data, "court_id", None):
            from app.services.matchschedule_service import MatchScheduleService
            from app.schemas.matchschedule import MatchScheduleCreate
            schedule_service = MatchScheduleService(self.db)
            schedule_data = MatchScheduleCreate(
                match_id=match.id,
                court_id=match_data.court_id,
                scheduled_datetime=match_data.scheduled_datetime
            )
            try:
                schedule_service.create_schedule(schedule_data)
            except Exception as e:
                # On logue mais on n'empêche pas la création du match
                print(f"[MatchService] Erreur lors de la création de la planification automatique : {e}")

        return match
    
    def update_match(self, match_id: int, match_data: MatchUpdate) -> Match:
        """
        Met à jour un match et synchronise la planification (MatchSchedule) si court_id ou scheduled_datetime changent
        """
        match = self.get_or_404(match_id)

        # Vérifier que les deux équipes sont différentes si elles sont mises à jour
        team_a_id = match_data.team_sport_a_id or match.team_sport_a_id
        team_b_id = match_data.team_sport_b_id or match.team_sport_b_id
        if team_a_id == team_b_id:
            raise ConflictError("A team cannot play against itself")

        update_data = match_data.model_dump(exclude_unset=True)
        updated_match = self.update(match_id, **update_data)

        # Synchronisation MatchSchedule si court_id ou scheduled_datetime sont présents dans la requête
        court_id = update_data.get("court_id")
        scheduled_datetime = update_data.get("scheduled_datetime")
        if court_id is not None or scheduled_datetime is not None:
            from app.services.matchschedule_service import MatchScheduleService
            from app.schemas.matchschedule import MatchScheduleUpdate, MatchScheduleCreate
            schedule_service = MatchScheduleService(self.db)
            try:
                schedule = schedule_service.get_by_match(match_id)
                if schedule:
                    # Mise à jour de la planification existante
                    schedule_update = MatchScheduleUpdate()
                    if court_id is not None:
                        schedule_update.court_id = court_id
                    if scheduled_datetime is not None:
                        schedule_update.scheduled_datetime = scheduled_datetime
                    schedule_service.update_schedule(match_id, schedule_update)
                else:
                    # Création de la planification si elle n'existe pas
                    schedule_create = MatchScheduleCreate(
                        match_id=match_id,
                        court_id=court_id if court_id is not None else None,
                        scheduled_datetime=scheduled_datetime if scheduled_datetime is not None else None
                    )
                    schedule_service.create_schedule(schedule_create)
            except Exception as e:
                print(f"[MatchService] Erreur lors de la synchronisation de la planification : {e}")

        return updated_match
    
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
    
    def update_pool_rankings(self, pool_id: int) -> None:
        """
        Met à jour le classement (rankings) d'une poule en fonction des résultats des matchs
        
        Args:
            pool_id: L'ID de la poule
        """
        from app.models.pool import Pool
        from app.models.teampool import TeamPool
        
        # Récupérer la poule et ses équipes
        pool = self.db.query(Pool).filter(Pool.id == pool_id).first()
        if not pool:
            raise NotFoundError("Pool", str(pool_id))
        
        team_pools = self.db.query(TeamPool).filter(TeamPool.pool_id == pool_id).all()
        
        # Récupérer tous les matchs complétés de la poule
        completed_matches = self.db.query(Match).filter(
            Match.pool_id == pool_id,
            Match.status == "completed",
            Match.score_a.isnot(None),
            Match.score_b.isnot(None)
        ).all()
        
        # Réinitialiser les stats de toutes les équipes de la poule
        for team_pool in team_pools:
            team_pool.points = 0
            team_pool.wins = 0
            team_pool.losses = 0
            team_pool.draws = 0
            team_pool.goals_for = 0
            team_pool.goals_against = 0
            team_pool.goal_difference = 0
        
        # Traiter chaque match complété
        for match in completed_matches:
            if match.team_sport_a_id is None or match.team_sport_b_id is None:
                continue
            
            # Récupérer les TeamPool pour les deux équipes
            from app.models.teamsport import TeamSport
            team_sport_a = self.db.query(TeamSport).filter(
                TeamSport.id == match.team_sport_a_id
            ).first()
            team_sport_b = self.db.query(TeamSport).filter(
                TeamSport.id == match.team_sport_b_id
            ).first()
            
            if not team_sport_a or not team_sport_b:
                continue
            
            team_pool_a = self.db.query(TeamPool).filter(
                TeamPool.pool_id == pool_id,
                TeamPool.team_id == team_sport_a.team_id
            ).first()
            team_pool_b = self.db.query(TeamPool).filter(
                TeamPool.pool_id == pool_id,
                TeamPool.team_id == team_sport_b.team_id
            ).first()
            
            if not team_pool_a or not team_pool_b:
                continue
            
            score_a = match.score_a
            score_b = match.score_b
            
            # Mettre à jour les buts
            team_pool_a.goals_for += score_a
            team_pool_a.goals_against += score_b
            team_pool_b.goals_for += score_b
            team_pool_b.goals_against += score_a
            
            # Déterminer le résultat et mettre à jour les points et stats
            # Utiliser winner_points et loser_points si définis, sinon utiliser le système 3-1-0
            winner_points = match.winner_points if match.winner_points is not None else 3
            loser_points = match.loser_points if match.loser_points is not None else 0
            draw_points = 1  # Points en cas de match nul (toujours 1)

            if score_a > score_b:
                # Équipe A gagne
                team_pool_a.wins += 1
                team_pool_a.points += winner_points
                team_pool_b.losses += 1
                team_pool_b.points += loser_points
            elif score_b > score_a:
                # Équipe B gagne
                team_pool_b.wins += 1
                team_pool_b.points += winner_points
                team_pool_a.losses += 1
                team_pool_a.points += loser_points
            else:
                # Match nul
                team_pool_a.draws += 1
                team_pool_a.points += draw_points
                team_pool_b.draws += 1
                team_pool_b.points += draw_points
        
        # Calculer la différence de buts et le classement
        team_pools_list = []
        for team_pool in team_pools:
            team_pool.goal_difference = team_pool.goals_for - team_pool.goals_against
            team_pools_list.append(team_pool)
        
        # Trier les équipes selon les critères de classement
        # Critères: points (desc), différence de buts (desc), buts marqués (desc), nom d'équipe (asc)
        team_pools_list.sort(
            key=lambda x: (
                -x.points,
                -x.goal_difference,
                -x.goals_for,
                x.team.name.lower() if x.team else ""
            )
        )
        
        # Assigner les positions
        for position, team_pool in enumerate(team_pools_list, start=1):
            team_pool.position = position
        
        self.db.commit()

