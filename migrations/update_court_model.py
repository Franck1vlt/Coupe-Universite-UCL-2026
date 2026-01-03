"""
Migration pour adapter le modèle Court au nouveau design
- Supprime la table de liaison court_sport_association
- Ajoute sport_id comme clé étrangère directe dans Court
"""

from sqlalchemy import text
from app.db import engine
import logging

logger = logging.getLogger(__name__)

def migrate_courts():
    """
    Migre le modèle Court vers le nouveau design simplifié
    """
    try:
        with engine.connect() as connection:
            # Commencer une transaction
            trans = connection.begin()
            
            try:
                # 1. Créer une table temporaire pour sauvegarder les données actuelles
                logger.info("Création de la table temporaire...")
                connection.execute(text("""
                    CREATE TABLE IF NOT EXISTS Court_backup AS 
                    SELECT * FROM Court
                """))
                
                # 2. Sauvegarder les associations sport existantes (prendre le premier sport si plusieurs)
                logger.info("Sauvegarde des associations sport...")
                connection.execute(text("""
                    CREATE TEMPORARY TABLE court_first_sport AS
                    SELECT 
                        c.id as court_id,
                        MIN(csa.sport_id) as sport_id
                    FROM Court c
                    LEFT JOIN court_sport_association csa ON c.id = csa.court_id
                    GROUP BY c.id
                """))
                
                # 3. Supprimer la table d'association
                logger.info("Suppression de la table d'association...")
                connection.execute(text("DROP TABLE IF EXISTS court_sport_association"))
                
                # 4. Supprimer l'ancienne table Court
                logger.info("Suppression de l'ancienne table Court...")
                connection.execute(text("DROP TABLE Court"))
                
                # 5. Créer la nouvelle table Court avec sport_id
                logger.info("Création de la nouvelle table Court...")
                connection.execute(text("""
                    CREATE TABLE Court (
                        id INTEGER PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        sport_id INTEGER,
                        is_active BOOLEAN DEFAULT 1,
                        FOREIGN KEY (sport_id) REFERENCES Sport(id)
                    )
                """))
                
                # 6. Restaurer les données avec les associations sport
                logger.info("Restauration des données...")
                connection.execute(text("""
                    INSERT INTO Court (id, name, sport_id, is_active)
                    SELECT 
                        cb.id,
                        cb.name,
                        cfs.sport_id,
                        cb.is_active
                    FROM Court_backup cb
                    LEFT JOIN court_first_sport cfs ON cb.id = cfs.court_id
                """))
                
                # 7. Nettoyer les tables temporaires
                logger.info("Nettoyage des tables temporaires...")
                connection.execute(text("DROP TABLE Court_backup"))
                
                # Valider la transaction
                trans.commit()
                logger.info("Migration des terrains terminée avec succès!")
                
            except Exception as e:
                # Annuler la transaction en cas d'erreur
                trans.rollback()
                logger.error(f"Erreur pendant la migration : {str(e)}")
                raise
                
    except Exception as e:
        logger.error(f"Erreur de connexion à la base de données : {str(e)}")
        raise

def rollback_courts():
    """
    Fonction de rollback pour revenir à l'ancien modèle si nécessaire
    """
    logger.warning("Rollback non implémenté - sauvegarde manuelle recommandée")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    migrate_courts()