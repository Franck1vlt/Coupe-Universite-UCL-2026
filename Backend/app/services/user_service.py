"""
Service pour la gestion des utilisateurs
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.base import BaseService
from app.exceptions import ConflictError


class UserService(BaseService[User]):
    """
    Service pour la gestion des utilisateurs
    """
    
    def __init__(self, db: Session):
        super().__init__(User, db)
    
    def get_by_email(self, email: str) -> Optional[User]:
        """
        Récupère un utilisateur par son email
        
        Args:
            email: L'email de l'utilisateur
            
        Returns:
            L'utilisateur trouvé ou None
        """
        return self.db.query(User).filter(User.email == email).first()
    
    def get_by_username(self, username: str) -> Optional[User]:
        """
        Récupère un utilisateur par son nom d'utilisateur
        
        Args:
            username: Le nom d'utilisateur
            
        Returns:
            L'utilisateur trouvé ou None
        """
        return self.db.query(User).filter(User.username == username).first()
    
    def get_active_users(self) -> List[User]:
        """
        Récupère tous les utilisateurs actifs
        
        Returns:
            Liste des utilisateurs actifs
        """
        return self.db.query(User).filter(User.is_active == True).all()
    
    def get_staff_users(self) -> List[User]:
        """
        Récupère tous les utilisateurs staff
        
        Returns:
            Liste des utilisateurs staff
        """
        return self.db.query(User).filter(User.is_staff == True).all()
    
    def create_user(self, user_data: UserCreate) -> User:
        """
        Crée un nouvel utilisateur
        
        Args:
            user_data: Les données de l'utilisateur à créer
            
        Returns:
            L'utilisateur créé
            
        Raises:
            ConflictError: Si un utilisateur avec le même email ou username existe déjà
        """
        # Vérifier si un utilisateur avec le même email existe déjà
        existing_email = self.get_by_email(user_data.email)
        if existing_email:
            raise ConflictError(f"User with email '{user_data.email}' already exists")
        
        # Vérifier si un utilisateur avec le même username existe déjà
        if user_data.username:
            existing_username = self.get_by_username(user_data.username)
            if existing_username:
                raise ConflictError(
                    f"User with username '{user_data.username}' already exists"
                )
        
        return self.create(**user_data.model_dump())
    
    def update_user(self, user_id: int, user_data: UserUpdate) -> User:
        """
        Met à jour un utilisateur
        
        Args:
            user_id: L'ID de l'utilisateur à mettre à jour
            user_data: Les données à mettre à jour
            
        Returns:
            L'utilisateur mis à jour
            
        Raises:
            ConflictError: Si le nouvel email ou username est déjà utilisé
        """
        user = self.get_or_404(user_id)
        
        # Vérifier si le nouvel email est déjà utilisé
        if user_data.email:
            existing = self.get_by_email(user_data.email)
            if existing and existing.id != user_id:
                raise ConflictError(f"User with email '{user_data.email}' already exists")
        
        # Vérifier si le nouveau username est déjà utilisé
        if user_data.username:
            existing = self.get_by_username(user_data.username)
            if existing and existing.id != user_id:
                raise ConflictError(
                    f"User with username '{user_data.username}' already exists"
                )
        
        update_data = user_data.model_dump(exclude_unset=True)
        return self.update(user_id, **update_data)

