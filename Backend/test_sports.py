#!/usr/bin/env python3
"""
Script de test pour vérifier les opérations sur les sports
"""
from app.db import get_db, init_db
from app.models.sport import Sport
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

# Configuration de la base de données
DATABASE_URL = "sqlite:///./data/coupe_ucl_2026.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_sports():
    # Initialiser la base de données
    print("Initialisation de la base de données...")
    init_db()
    print("✅ Base de données initialisée")
    
    # Créer une session
    db = SessionLocal()
    try:
        print("\nTest de lecture des sports...")
        sports = db.query(Sport).all()
        print(f"✅ {len(sports)} sport(s) trouvé(s)")
        
        for sport in sports:
            print(f"  - {sport.id}: {sport.name} ({sport.score_type})")
        
        print("\nTest de création d'un sport...")
        # Vérifier si "Football" existe déjà
        existing_football = db.query(Sport).filter(Sport.name == "Football").first()
        if existing_football:
            print(f"  - Football existe déjà: {existing_football}")
        else:
            # Créer un nouveau sport
            new_sport = Sport(name="Football", score_type="points")
            db.add(new_sport)
            db.commit()
            db.refresh(new_sport)
            print(f"✅ Nouveau sport créé: {new_sport}")
        
        print("\nRe-lecture des sports après création...")
        sports = db.query(Sport).all()
        print(f"✅ {len(sports)} sport(s) trouvé(s)")
        
        for sport in sports:
            print(f"  - {sport.id}: {sport.name} ({sport.score_type})")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        print("\n✅ Session fermée")

if __name__ == "__main__":
    test_sports()