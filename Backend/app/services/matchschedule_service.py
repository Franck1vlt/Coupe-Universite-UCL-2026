"""
Service pour la gestion de la planification des matchs
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.matchschedule import MatchSchedule
from app.schemas.matchschedule import MatchScheduleCreate, MatchScheduleUpdate
from app.services.base import BaseService
from app.exceptions import NotFoundError, ConflictError


class MatchScheduleService(BaseService[MatchSchedule]):
    """
    Service pour la gestion de la planification des matchs
    """
    
    def __init__(self, db: Session):
        super().__init__(MatchSchedule, db)
    
    def get_by_match(self, match_id: int) -> Optional[MatchSchedule]:
        """
        Récupère la planification d'un match
        
        Args:
            match_id: L'ID du match
            
        Returns:
            La planification trouvée ou None
        """
        return self.db.query(MatchSchedule).filter(
            MatchSchedule.match_id == match_id
        ).first()
    
    def get_by_court(self, court_id: int) -> List[MatchSchedule]:
        """
        Récupère toutes les planifications d'un terrain
        
        Args:
            court_id: L'ID du terrain
            
        Returns:
            Liste des planifications
        """
        return self.db.query(MatchSchedule).filter(
            MatchSchedule.court_id == court_id
        ).all()
    
    def get_by_datetime_range(
        self,
        start_datetime: datetime,
        end_datetime: datetime
    ) -> List[MatchSchedule]:
        """
        Récupère toutes les planifications dans une plage de dates
        
        Args:
            start_datetime: Date de début
            end_datetime: Date de fin
            
        Returns:
            Liste des planifications
        """
        return self.db.query(MatchSchedule).filter(
            MatchSchedule.scheduled_datetime >= start_datetime,
            MatchSchedule.scheduled_datetime <= end_datetime
        ).all()
    
    def create_schedule(self, schedule_data: MatchScheduleCreate) -> MatchSchedule:
        """
        Crée une nouvelle planification de match
        
        Args:
            schedule_data: Les données de la planification à créer
            
        Returns:
            La planification créée
            
        Raises:
            NotFoundError: Si le match ou le terrain n'existe pas
            ConflictError: Si une planification existe déjà pour ce match
        """
        # Vérifier que le match existe
        from app.models.match import Match
        match = self.db.query(Match).filter(Match.id == schedule_data.match_id).first()
        if not match:
            raise NotFoundError("Match", str(schedule_data.match_id))
        
        # Vérifier si une planification existe déjà
        existing = self.get_by_match(schedule_data.match_id)
        if existing:
            raise ConflictError(
                f"Schedule for match {schedule_data.match_id} already exists"
            )
        
        # Vérifier que le terrain existe si fourni
        if schedule_data.court_id:
            from app.models.court import Court
            court = self.db.query(Court).filter(
                Court.id == schedule_data.court_id
            ).first()
            if not court:
                raise NotFoundError("Court", str(schedule_data.court_id))
        
        return self.create(**schedule_data.model_dump())
    
    def update_schedule(
        self,
        match_id: int,
        schedule_data: MatchScheduleUpdate
    ) -> MatchSchedule:
        """
        Met à jour la planification d'un match
        
        Args:
            match_id: L'ID du match
            schedule_data: Les données à mettre à jour
            
        Returns:
            La planification mise à jour
            
        Raises:
            NotFoundError: Si la planification n'existe pas
        """
        schedule = self.get_by_match(match_id)
        if not schedule:
            raise NotFoundError("MatchSchedule", str(match_id))
        
        update_data = schedule_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(schedule, key) and value is not None:
                setattr(schedule, key, value)
        
        self.db.commit()
        self.db.refresh(schedule)
        return schedule

