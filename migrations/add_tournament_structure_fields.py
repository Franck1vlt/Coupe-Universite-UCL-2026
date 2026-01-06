"""
Migration pour ajouter les champs nécessaires à la gestion complète des tournois
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent.parent / "Backend"))

from sqlalchemy import text
from app.db import engine, SessionLocal

def upgrade():
    """Ajouter les nouveaux champs aux tables Match et Pool"""
    db = SessionLocal()
    try:
        print("🔄 Début de la migration...")
        
        # Pour SQLite, on doit recréer la table Match car ALTER COLUMN n'est pas supporté
        print("📝 Recréation de la table Match avec les nouveaux champs...")
        
        # 0. Supprimer les tables temporaires si elles existent
        try:
            db.execute(text('DROP TABLE IF EXISTS "Match_new"'))
            db.execute(text('DROP TABLE IF EXISTS "Pool_new"'))
        except:
            pass
        
        # 1. Créer une table temporaire avec la nouvelle structure
        db.execute(text("""
            CREATE TABLE "Match_new" (
                id INTEGER PRIMARY KEY,
                phase_id INTEGER NOT NULL,
                pool_id INTEGER,
                match_type VARCHAR(20) NOT NULL DEFAULT 'qualification',
                bracket_type VARCHAR(20),
                team_sport_a_id INTEGER,
                team_sport_b_id INTEGER,
                team_a_source VARCHAR(50),
                team_b_source VARCHAR(50),
                winner_destination_match_id INTEGER,
                loser_destination_match_id INTEGER,
                label VARCHAR(100),
                match_order INTEGER,
                score_a INTEGER,
                score_b INTEGER,
                status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
                referee_user_id INTEGER,
                created_by_user_id INTEGER NOT NULL,
                updated_by_user_id INTEGER,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                comment TEXT,
                FOREIGN KEY (phase_id) REFERENCES "TournamentPhase"(id),
                FOREIGN KEY (pool_id) REFERENCES "Pool"(id),
                FOREIGN KEY (team_sport_a_id) REFERENCES "TeamSport"(id),
                FOREIGN KEY (team_sport_b_id) REFERENCES "TeamSport"(id),
                FOREIGN KEY (winner_destination_match_id) REFERENCES "Match_new"(id),
                FOREIGN KEY (loser_destination_match_id) REFERENCES "Match_new"(id),
                FOREIGN KEY (referee_user_id) REFERENCES "User"(id),
                FOREIGN KEY (created_by_user_id) REFERENCES "User"(id),
                FOREIGN KEY (updated_by_user_id) REFERENCES "User"(id),
                CHECK (team_sport_a_id IS NULL OR team_sport_b_id IS NULL OR team_sport_a_id != team_sport_b_id),
                CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),
                CHECK (match_type IN ('qualification', 'pool', 'bracket', 'loser_bracket')),
                CHECK (bracket_type IS NULL OR bracket_type IN ('quarterfinal', 'semifinal', 'final', 'third_place', 'loser_round_1', 'loser_round_2', 'loser_round_3', 'loser_final'))
            )
        """))
        
        # 2. Copier les données existantes
        db.execute(text("""
            INSERT INTO "Match_new" (
                id, phase_id, team_sport_a_id, team_sport_b_id, score_a, score_b,
                status, referee_user_id, created_by_user_id, updated_by_user_id,
                created_at, updated_at, comment
            )
            SELECT 
                id, phase_id, team_sport_a_id, team_sport_b_id, score_a, score_b,
                status, referee_user_id, created_by_user_id, updated_by_user_id,
                created_at, updated_at, comment
            FROM "Match"
        """))
        
        # 3. Supprimer l'ancienne table
        db.execute(text('DROP TABLE "Match"'))
        
        # 4. Renommer la nouvelle table
        db.execute(text('ALTER TABLE "Match_new" RENAME TO "Match"'))
        
        # Modifications sur la table Pool
        print("📝 Ajout des champs à la table Pool...")
        
        # Créer une nouvelle table Pool
        db.execute(text("""
            CREATE TABLE "Pool_new" (
                id INTEGER PRIMARY KEY,
                phase_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                "order" INTEGER NOT NULL,
                qualified_to_finals INTEGER NOT NULL DEFAULT 2,
                qualified_to_loser_bracket INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (phase_id) REFERENCES "TournamentPhase"(id)
            )
        """))
        
        # Copier les données (renommer display_order en order)
        db.execute(text("""
            INSERT INTO "Pool_new" (id, phase_id, name, "order")
            SELECT id, phase_id, name, "order"
            FROM "Pool"
        """))
        
        # Supprimer et renommer
        db.execute(text('DROP TABLE "Pool"'))
        db.execute(text('ALTER TABLE "Pool_new" RENAME TO "Pool"'))
        
        db.commit()
        print("✅ Migration terminée avec succès!")
        
    except Exception as e:
        print(f"❌ Erreur lors de la migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def downgrade():
    """Supprimer les champs ajoutés"""
    db = SessionLocal()
    try:
        print("🔄 Début du rollback...")
        
        # Supprimer les champs de Match
        db.execute(text('ALTER TABLE "Match" DROP COLUMN IF EXISTS pool_id'))
        db.execute(text('ALTER TABLE "Match" DROP COLUMN IF EXISTS match_type'))
        db.execute(text('ALTER TABLE "Match" DROP COLUMN IF EXISTS bracket_type'))
        db.execute(text('ALTER TABLE "Match" DROP COLUMN IF EXISTS team_a_source'))
        db.execute(text('ALTER TABLE "Match" DROP COLUMN IF EXISTS team_b_source'))
        db.execute(text('ALTER TABLE "Match" DROP COLUMN IF EXISTS winner_destination_match_id'))
        db.execute(text('ALTER TABLE "Match" DROP COLUMN IF EXISTS loser_destination_match_id'))
        db.execute(text('ALTER TABLE "Match" DROP COLUMN IF EXISTS label'))
        db.execute(text('ALTER TABLE "Match" DROP COLUMN IF EXISTS match_order'))
        
        # Supprimer les champs de Pool
        db.execute(text('ALTER TABLE "Pool" DROP COLUMN IF EXISTS qualified_to_finals'))
        db.execute(text('ALTER TABLE "Pool" DROP COLUMN IF EXISTS qualified_to_loser_bracket'))
        
        # Remettre les colonnes NOT NULL
        db.execute(text('ALTER TABLE "Match" ALTER COLUMN team_sport_a_id SET NOT NULL'))
        db.execute(text('ALTER TABLE "Match" ALTER COLUMN team_sport_b_id SET NOT NULL'))
        
        db.commit()
        print("✅ Rollback terminé avec succès!")
        
    except Exception as e:
        print(f"❌ Erreur lors du rollback: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        downgrade()
    else:
        upgrade()
