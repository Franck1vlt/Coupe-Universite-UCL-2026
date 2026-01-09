"""
Script pour ajouter automatiquement une planification (planning) à tous les matchs qui n'en ont pas, en leur assignant un terrain disponible.
"""
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.services.match_service import MatchService
from app.services.matchschedule_service import MatchScheduleService
from app.services.court_service import CourtService
from app.schemas.matchschedule import MatchScheduleCreate
from datetime import datetime, timedelta


def assign_court_to_match(match, courts, used_courts):
    # Simple round-robin: assigne le prochain terrain disponible
    for court in courts:
        if court.id not in used_courts:
            used_courts.add(court.id)
            return court.id
    # Si tous les terrains sont utilisés, réutilise le premier
    return courts[0].id if courts else None


def add_planning_to_all_matches():
    db: Session = SessionLocal()
    match_service = MatchService(db)
    schedule_service = MatchScheduleService(db)
    court_service = CourtService(db)

    matches = match_service.get_all()
    courts = court_service.get_active_courts()
    if not courts:
        print("Aucun terrain actif trouvé. Abandon.")
        return

    used_courts = set()
    now = datetime.now()
    count = 0
    for match in matches:
        schedule = schedule_service.get_by_match(match.id)
        if schedule:
            continue  # Déjà planifié
        court_id = assign_court_to_match(match, courts, used_courts)
        if not court_id:
            print(f"Aucun terrain disponible pour le match {match.id}")
            continue
        # Planification simple : date/heure = maintenant + incrément
        scheduled_datetime = now + timedelta(minutes=30 * count)
        schedule_data = MatchScheduleCreate(
            match_id=match.id,
            court_id=court_id,
            scheduled_datetime=scheduled_datetime,
            estimated_duration_minutes=30
        )
        try:
            schedule_service.create_schedule(schedule_data)
            print(f"Planification créée pour le match {match.id} sur le terrain {court_id} à {scheduled_datetime}")
            count += 1
        except Exception as e:
            print(f"Erreur pour le match {match.id}: {e}")
    db.close()

if __name__ == "__main__":
    add_planning_to_all_matches()
