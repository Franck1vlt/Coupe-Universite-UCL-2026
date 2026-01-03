"""
Inspecter la structure de la base de données existante
"""
import sqlite3
import sys
from pathlib import Path

# Chemin vers votre base de données (dans Backend/data/)
db_path = Path(__file__).parent / "data" / "coupe_ucl_2026.db"

if not db_path.exists():
    print(f"❌ Base de données introuvable : {db_path}")
    sys.exit(1)

print(f"📁 Inspection de : {db_path}")

try:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Lister toutes les tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print(f"\n📊 Tables trouvées : {len(tables)}")
    for table in tables:
        table_name = table[0]
        print(f"\n🏷️  Table : {table_name}")
        
        # Obtenir la structure de chaque table
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        
        for col in columns:
            col_id, name, type_, not_null, default_value, primary_key = col
            print(f"   - {name} ({type_})" + 
                  (" NOT NULL" if not_null else "") + 
                  (" PRIMARY KEY" if primary_key else "") +
                  (f" DEFAULT {default_value}" if default_value else ""))
    
    # Regarder spécifiquement la table Court
    if any(t[0] == 'Court' for t in tables):
        print(f"\n🎯 Contenu de la table Court :")
        cursor.execute("SELECT * FROM Court LIMIT 5;")
        courts = cursor.fetchall()
        
        # Obtenir les noms de colonnes
        cursor.execute("PRAGMA table_info(Court);")
        court_columns = [col[1] for col in cursor.fetchall()]
        print(f"   Colonnes : {court_columns}")
        
        for court in courts:
            print(f"   {dict(zip(court_columns, court))}")
    
    conn.close()
    print("\n✅ Inspection terminée")
    
except Exception as e:
    print(f"❌ Erreur lors de l'inspection : {e}")