"""
Script pour ajouter les colonnes 'court', 'date' et 'time' à la table Match manuellement.
À utiliser si Alembic ne fonctionne pas.
"""
import sqlalchemy as sa
from sqlalchemy import create_engine, text

# Remplace par ta vraie URL de connexion
DATABASE_URL = "sqlite:///./app.db"  # Exemple pour SQLite, adapte pour PostgreSQL/MySQL

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Ajout de la colonne 'court'
    try:
        conn.execute(text('ALTER TABLE "Match" ADD COLUMN court VARCHAR(100);'))
        print("Colonne 'court' ajoutée.")
    except Exception as e:
        print("Colonne 'court' déjà existante ou erreur:", e)
    # Ajout de la colonne 'date'
    try:
        conn.execute(text('ALTER TABLE "Match" ADD COLUMN date VARCHAR(20);'))
        print("Colonne 'date' ajoutée.")
    except Exception as e:
        print("Colonne 'date' déjà existante ou erreur:", e)
    # Ajout de la colonne 'time'
    try:
        conn.execute(text('ALTER TABLE "Match" ADD COLUMN time VARCHAR(10);'))
        print("Colonne 'time' ajoutée.")
    except Exception as e:
        print("Colonne 'time' déjà existante ou erreur:", e)
