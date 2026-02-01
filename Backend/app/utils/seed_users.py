"""
Script pour initialiser les utilisateurs par défaut dans la base de données
"""
import os
import bcrypt
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
import logging

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hash un mot de passe avec bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def seed_default_users(db: Session) -> None:
    """
    Crée les utilisateurs par défaut s'ils n'existent pas encore.
    Les mots de passe sont récupérés depuis les variables d'environnement.

    Si aucun admin n'existe, crée un admin avec les credentials des variables d'env
    ou avec un mot de passe par défaut 'admin'.
    """
    # Vérifier si l'admin principal existe
    admin = db.query(User).filter(User.role == UserRole.ADMIN.value, User.is_deletable == False).first()

    if not admin:
        # Récupérer les credentials depuis les variables d'environnement
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin")
        admin_email = os.getenv("ADMIN_EMAIL", "admin@coupe-ucl.be")

        # Créer l'admin principal (non supprimable)
        admin = User(
            email=admin_email,
            username=admin_username,
            full_name="Administrateur Principal",
            role=UserRole.ADMIN.value,
            hashed_password=hash_password(admin_password),
            is_active=True,
            is_deletable=False,  # L'admin principal ne peut pas être supprimé
        )
        db.add(admin)
        db.commit()
        logger.info(f"Admin principal créé: {admin_username}")

    # Créer un utilisateur staff si configuré et n'existe pas
    staff_username = os.getenv("STAFF_USERNAME")
    staff_password = os.getenv("STAFF_PASSWORD")

    if staff_username and staff_password:
        existing_staff = db.query(User).filter(User.username == staff_username).first()
        if not existing_staff:
            staff_email = os.getenv("STAFF_EMAIL", f"{staff_username}@coupe-ucl.be")
            staff = User(
                email=staff_email,
                username=staff_username,
                full_name="Staff",
                role=UserRole.STAFF.value,
                hashed_password=hash_password(staff_password),
                is_active=True,
                is_deletable=True,
            )
            db.add(staff)
            db.commit()
            logger.info(f"Utilisateur staff créé: {staff_username}")

    # Créer un utilisateur technicien si configuré et n'existe pas
    tech_username = os.getenv("TECHNICIAN_USERNAME")
    tech_password = os.getenv("TECHNICIAN_PASSWORD")

    if tech_username and tech_password:
        existing_tech = db.query(User).filter(User.username == tech_username).first()
        if not existing_tech:
            tech_email = os.getenv("TECHNICIAN_EMAIL", f"{tech_username}@coupe-ucl.be")
            tech = User(
                email=tech_email,
                username=tech_username,
                full_name="Technicien",
                role=UserRole.TECHNICIEN.value,
                hashed_password=hash_password(tech_password),
                is_active=True,
                is_deletable=True,
            )
            db.add(tech)
            db.commit()
            logger.info(f"Utilisateur technicien créé: {tech_username}")


def ensure_admin_exists(db: Session) -> bool:
    """
    Vérifie qu'au moins un admin existe dans la base de données.
    Si aucun admin n'existe, en crée un par défaut.

    Returns:
        True si un admin existait déjà ou a été créé, False en cas d'erreur
    """
    try:
        admin_count = db.query(User).filter(User.role == UserRole.ADMIN.value).count()

        if admin_count == 0:
            logger.warning("Aucun admin trouvé dans la base de données. Création d'un admin par défaut...")
            seed_default_users(db)
            return True

        return True
    except Exception as e:
        logger.error(f"Erreur lors de la vérification des admins: {e}")
        return False
