"""
Migrer la base de données existante pour ajouter la colonne sport_id
"""
import sqlite3
import sys
from pathlib import Path

# Chemin vers votre base de données
db_path = Path(__file__).parent / "data" / "coupe_ucl_2026.db"

if not db_path.exists():
    print(f"❌ Base de données introuvable : {db_path}")
    sys.exit(1)

print(f"🔄 Migration de : {db_path}")

try:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Vérifier si la colonne sport_id existe déjà
    cursor.execute("PRAGMA table_info(Court);")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    if 'sport_id' in column_names:
        print("✅ La colonne sport_id existe déjà dans la table Court")
    else:
        print("➕ Ajout de la colonne sport_id à la table Court...")
        
        # Ajouter la colonne sport_id comme clé étrangère optionnelle
        cursor.execute("ALTER TABLE Court ADD COLUMN sport_id INTEGER REFERENCES Sport(id);")
        
        print("✅ Colonne sport_id ajoutée avec succès")
        
        # Essayer de migrer les données depuis court_sport_association si elle existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='court_sport_association';")
        if cursor.fetchone():
            print("🔄 Migration des associations sport depuis l'ancienne table...")
            
            # Pour chaque court, prendre le premier sport associé
            cursor.execute("""
                UPDATE Court 
                SET sport_id = (
                    SELECT sport_id 
                    FROM court_sport_association 
                    WHERE court_sport_association.court_id = Court.id 
                    LIMIT 1
                )
                WHERE id IN (
                    SELECT DISTINCT court_id 
                    FROM court_sport_association
                )
            """)
            
            rows_updated = cursor.rowcount
            print(f"✅ {rows_updated} terrains mis à jour avec leur sport principal")
    
    # Vérifier le résultat
    cursor.execute("PRAGMA table_info(Court);")
    updated_columns = cursor.fetchall()
    
    print(f"\n📋 Structure mise à jour de la table Court :")
    for col in updated_columns:
        col_id, name, type_, not_null, default_value, primary_key = col
        print(f"   - {name} ({type_})" + 
              (" NOT NULL" if not_null else "") + 
              (" PRIMARY KEY" if primary_key else "") +
              (f" DEFAULT {default_value}" if default_value else ""))
    
    # Afficher le contenu mis à jour
    print(f"\n📊 Contenu de la table Court après migration :")
    cursor.execute("SELECT id, name, is_active, sport_id FROM Court;")
    courts = cursor.fetchall()
    for court in courts:
        print(f"   ID: {court[0]}, Nom: {court[1]}, Actif: {court[2]}, Sport ID: {court[3]}")
    
    conn.commit()
    conn.close()
    
    print("\n✅ Migration terminée avec succès !")
    
except Exception as e:
    print(f"❌ Erreur lors de la migration : {e}")
    if 'conn' in locals():
        conn.rollback()
        conn.close()