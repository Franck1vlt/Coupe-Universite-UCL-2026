"""
Service pour la gestion des phases de tournoi
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.tournamentphase import TournamentPhase
from app.schemas.tournamentphase import TournamentPhaseCreate, TournamentPhaseUpdate
from app.services.base import BaseService
from app.exceptions import NotFoundError, ConflictError


class TournamentPhaseService(BaseService[TournamentPhase]):
    """
    Service pour la gestion des phases de tournoi
    """
    
    def __init__(self, db: Session):
        super().__init__(TournamentPhase, db)
    
    def get_by_tournament(self, tournament_id: int) -> List[TournamentPhase]:
        """
        Récupère toutes les phases d'un tournoi
        
        Args:
            tournament_id: L'ID du tournoi
            
        Returns:
            Liste des phases
        """
        return self.db.query(TournamentPhase).filter(
            TournamentPhase.tournament_id == tournament_id
        ).order_by(TournamentPhase.phase_order).all()
    
    def get_by_tournament_and_order(
        self,
        tournament_id: int,
        phase_order: int
    ) -> Optional[TournamentPhase]:
        """
        Récupère une phase par tournoi et ordre
        
        Args:
            tournament_id: L'ID du tournoi
            phase_order: L'ordre de la phase
            
        Returns:
            La phase trouvée ou None
        """
        return self.db.query(TournamentPhase).filter(
            TournamentPhase.tournament_id == tournament_id,
            TournamentPhase.phase_order == phase_order
        ).first()
    
    def create_phase(self, phase_data: TournamentPhaseCreate) -> TournamentPhase:
        """
        Crée une nouvelle phase de tournoi
        
        Args:
            phase_data: Les données de la phase à créer
            
        Returns:
            La phase créée
            
        Raises:
            NotFoundError: Si le tournoi n'existe pas
            ConflictError: Si une phase avec le même ordre existe déjà
        """
        # Vérifier que le tournoi existe
        from app.models.tournament import Tournament
        tournament = self.db.query(Tournament).filter(
            Tournament.id == phase_data.tournament_id
        ).first()
        if not tournament:
            raise NotFoundError("Tournament", str(phase_data.tournament_id))
        
        # Vérifier si une phase avec le même ordre existe déjà
        existing = self.get_by_tournament_and_order(
            phase_data.tournament_id,
            phase_data.phase_order
        )
        if existing:
            raise ConflictError(
                f"Phase with order {phase_data.phase_order} already exists "
                f"for tournament {phase_data.tournament_id}"
            )
        
        return self.create(**phase_data.model_dump())
    
    def update_phase(
        self,
        phase_id: int,
        phase_data: TournamentPhaseUpdate
    ) -> TournamentPhase:
        """
        Met à jour une phase de tournoi
        
        Args:
            phase_id: L'ID de la phase à mettre à jour
            phase_data: Les données à mettre à jour
            
        Returns:
            La phase mise à jour
            
        Raises:
            ConflictError: Si le nouvel ordre est déjà utilisé par une autre phase
        """
        phase = self.get_or_404(phase_id)
        
        # Vérifier si le nouvel ordre est déjà utilisé
        if phase_data.phase_order:
            existing = self.get_by_tournament_and_order(
                phase.tournament_id,
                phase_data.phase_order
            )
            if existing and existing.id != phase_id:
                raise ConflictError(
                    f"Phase with order {phase_data.phase_order} already exists "
                    f"for tournament {phase.tournament_id}"
                )
        
        update_data = phase_data.model_dump(exclude_unset=True)
        return self.update(phase_id, **update_data)

