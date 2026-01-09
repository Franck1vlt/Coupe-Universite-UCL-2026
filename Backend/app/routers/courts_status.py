from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.services.court_service import CourtService
from app.schemas.court import CourtResponse
from typing import List

router = APIRouter()

@router.get("/courts/status", response_model=List[CourtResponse])
def get_courts_status(db: Session = Depends(get_db)):
    """
    Retourne la liste des terrains avec leur état utilisé/libre (has_active_matches)
    """
    courts = CourtService(db).get_all_courts()
    # Ajoute le champ 'used' dynamiquement
    result = []
    for court in courts:
        court_dict = court.__dict__.copy()
        court_dict["used"] = court.has_active_matches
        result.append(court_dict)
    return result
