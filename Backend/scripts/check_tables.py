"""
Script pour lister toutes les tables de la base et vérifier l'existence de la table Match (et sa casse).
"""
import sqlalchemy as sa
from sqlalchemy import create_engine, inspect

# Remplace par ta vraie URL de connexion
DATABASE_URL = "sqlite:///./app.db"  # Exemple pour SQLite, adapte pour PostgreSQL/MySQL

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

print("Tables présentes dans la base :")
for table_name in inspector.get_table_names():
    print("-", table_name)

if "Match" in inspector.get_table_names():
    print("\nLa table 'Match' existe bien.")
else:
    print("\nLa table 'Match' n'existe PAS (attention à la casse !)")
