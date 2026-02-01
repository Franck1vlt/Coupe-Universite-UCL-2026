import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "Backend"))

from app.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text('PRAGMA table_info(Pool)'))
    print("Structure de la table Pool:")
    for row in result:
        print(row)
