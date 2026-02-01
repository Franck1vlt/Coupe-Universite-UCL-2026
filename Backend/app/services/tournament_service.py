"""
Service pour la gestion des tournois
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.tournament import Tournament
from app.schemas.tournament import TournamentCreate, TournamentUpdate
from app.services.base import BaseService
from app.exceptions import ConflictError, NotFoundError


class TournamentService(BaseService[Tournament]):
    """
    Service pour la gestion des tournois
    """
    
    def __init__(self, db: Session):
        super().__init__(Tournament, db)
    
    def get_by_name(self, name: str) -> Optional[Tournament]:
        """
        Récupère un tournoi par son nom
        
        Args:
            name: Le nom du tournoi
            
        Returns:
            Le tournoi trouvé ou None
        """
        return self.db.query(Tournament).filter(Tournament.name == name).first()
    
    def get_by_sport(self, sport_id: int) -> List[Tournament]:
        """
        Récupère tous les tournois d'un sport
        
        Args:
            sport_id: L'ID du sport
            
        Returns:
            Liste des tournois
        """
        return self.db.query(Tournament).filter(Tournament.sport_id == sport_id).all()
    
    def get_by_status(self, status: str) -> List[Tournament]:
        """
        Récupère tous les tournois avec un statut donné
        
        Args:
            status: Le statut (scheduled, in_progress, completed, cancelled)
            
        Returns:
            Liste des tournois
        """
        return self.db.query(Tournament).filter(Tournament.status == status).all()
    
    def create_tournament(self, tournament_data: TournamentCreate) -> Tournament:
        """
        Crée un nouveau tournoi et tous les matchs associés (avec planification si court_id/scheduled_datetime)
        """
        # Vérifier si un tournoi avec le même nom existe déjà
        existing = self.get_by_name(tournament_data.name)
        if existing:
            raise ConflictError(f"Tournament with name '{tournament_data.name}' already exists")

        # Vérifier que le sport existe
        from app.models.sport import Sport
        sport = self.db.query(Sport).filter(Sport.id == tournament_data.sport_id).first()
        if not sport:
            raise NotFoundError("Sport", str(tournament_data.sport_id))

        # Vérifier que l'utilisateur existe
        from app.models.user import User
        user = self.db.query(User).filter(User.id == tournament_data.created_by_user_id).first()
        if not user:
            raise NotFoundError("User", str(tournament_data.created_by_user_id))

        # Création du tournoi
        tournament = self.create(**tournament_data.model_dump(exclude={
            "qualification_matches", "pools", "brackets", "loser_brackets"
        }))

        # Création des matchs et planifications associés
        from app.services.match_service import MatchService
        match_service = MatchService(self.db)

        # Helper pour créer les matchs d'une liste
        def create_matches_from_list(matches):
            created_matches = []
            for match in matches or []:
                # On force l'association à la phase/tournoi si besoin
                match_data = match.copy()
                if "phase_id" not in match_data or not match_data["phase_id"]:
                    # On ne peut pas deviner la phase, donc on laisse tel quel
                    pass
                # Ajoute created_by_user_id si absent
                if "created_by_user_id" not in match_data:
                    match_data["created_by_user_id"] = tournament_data.created_by_user_id
                # Ajoute le match
                try:
                    match_obj = match_service.create_match(match_service.MatchCreate.model_validate(match_data))
                    created_matches.append(match_obj)
                except Exception as e:
                    print(f"[TournamentService] Erreur lors de la création d'un match: {e}")
            return created_matches

        # Qualification matches
        create_matches_from_list(getattr(tournament_data, "qualification_matches", []))
        # Pools (liste de pools, chaque pool a une clé 'matches')
        for pool in getattr(tournament_data, "pools", []):
            create_matches_from_list(pool.get("matches", []))
        # Brackets (liste de matches)
        create_matches_from_list(getattr(tournament_data, "brackets", []))
        # Loser brackets (liste de matches)
        create_matches_from_list(getattr(tournament_data, "loser_brackets", []))

        return tournament
    
    def update_tournament(self, tournament_id: int, tournament_data: TournamentUpdate) -> Tournament:
        """
        Met à jour un tournoi
        
        Args:
            tournament_id: L'ID du tournoi à mettre à jour
            tournament_data: Les données à mettre à jour
            
        Returns:
            Le tournoi mis à jour
            
        Raises:
            ConflictError: Si le nouveau nom est déjà utilisé par un autre tournoi
        """
        # Vérifier si le nouveau nom est déjà utilisé
        if tournament_data.name:
            existing = self.get_by_name(tournament_data.name)
            if existing and existing.id != tournament_id:
                raise ConflictError(f"Tournament with name '{tournament_data.name}' already exists")
        
        update_data = tournament_data.model_dump(exclude_unset=True)
        return self.update(tournament_id, **update_data)

