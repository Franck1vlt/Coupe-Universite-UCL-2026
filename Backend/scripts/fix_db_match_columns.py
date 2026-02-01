"""
Script pour corriger la base SQLite utilisée par l'API FastAPI (ajout des colonnes court, date, time à la table Match).
Ce script détecte le fichier .db utilisé par SQLALCHEMY_DATABASE_URL dans app/config.py et applique les modifications.
"""
import os
import sqlalchemy as sa
from sqlalchemy import create_engine, text

# Détection automatique du chemin de la base depuis app/config.py

# Chemin de la base utilisé par FastAPI (repris de app/config.py)
db_url = "sqlite:///./data/coupe_ucl_2026.db"
print(f"Connexion à la base : {db_url}")
engine = create_engine(db_url)

with engine.connect() as conn:
    for col, typ in [("court", "VARCHAR(100)"), ("date", "VARCHAR(20)"), ("time", "VARCHAR(10)")]:
        try:
            conn.execute(text(f'ALTER TABLE "Match" ADD COLUMN {col} {typ};'))
            print(f"Colonne '{col}' ajoutée.")
        except Exception as e:
            print(f"Colonne '{col}' déjà existante ou erreur :", e)
