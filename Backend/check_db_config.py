"""
Vérifier la configuration actuelle de la base de données
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au PYTHONPATH
sys.path.append(str(Path(__file__).parent))

from app.config import settings

print(f"DATABASE_URL actuel : {settings.DATABASE_URL}")
print(f"Chemin de base de données attendu : {Path(settings.DATABASE_URL.replace('sqlite:///', '')).absolute()}")
print(f"Fichier existe ? : {Path(settings.DATABASE_URL.replace('sqlite:///', '')).exists()}")

# Vérifier où est votre vraie base de données
data_dir = Path(__file__).parent.parent / "data"
db_file = data_dir / "coupe_ucl_2026.db"
print(f"Votre vraie base de données : {db_file.absolute()}")
print(f"Existe ? : {db_file.exists()}")