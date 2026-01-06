#!/usr/bin/env python
"""Script pour créer un tournoi de test dans la base de données"""

from app.db import SessionLocal
from app.models.sport import Sport
from app.models.user import User
from app.models.tournament import Tournament

db = SessionLocal()

try:
    # Créer un utilisateur de test s'il n'existe pas
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        user = User(id=1, email='admin@test.com', username='admin', full_name='Admin User', is_staff=True)
        db.add(user)
        db.flush()
        print("✅ Utilisateur créé")
    else:
        print("✅ Utilisateur existant trouvé")

    # Créer un sport de test s'il n'existe pas
    sport = db.query(Sport).filter(Sport.id == 1).first()
    if not sport:
        sport = Sport(id=1, name='Volley', score_type='points')
        db.add(sport)
        db.flush()
        print("✅ Sport créé")

    # Créer un tournoi de test
    tournament = Tournament(
        name='Tournoi Test',
        sport_id=1,
        tournament_type='pools',
        status='scheduled',
        created_by_user_id=1,
        description='Tournoi de test pour les API'
    )
    db.add(tournament)
    db.commit()

    print(f"✅ Tournoi créé avec l'ID: {tournament.id}")
    
finally:
    db.close()
