"""
Script pour modifier un terrain via son id.
"""
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.services.court_service import CourtService
from app.schemas.court import CourtUpdate

def update_court_by_id(court_id: int, name: str = None, is_active: bool = None):
    db: Session = SessionLocal()
    court_service = CourtService(db)
    try:
        court = court_service.get_or_404(court_id)
    except Exception as e:
        print(f"Aucun terrain trouvé avec l'id {court_id} : {e}")
        db.close()
        return
    update_data = CourtUpdate()
    if name is not None:
        update_data.name = name
    if is_active is not None:
        update_data.is_active = is_active
    updated_court = court_service.update_court(court_id, update_data)
    print(f"Terrain modifié : {updated_court.name} (id={updated_court.id})")
    db.close()

if __name__ == "__main__":
    # Exemple d'utilisation : modifier le nom et l'état actif du terrain d'id 1
    update_court_by_id(1, name="Terrain A", is_active=True)
