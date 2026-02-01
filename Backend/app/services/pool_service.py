"""
Service pour la gestion des poules
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.pool import Pool
from app.schemas.pool import PoolCreate, PoolUpdate
from app.services.base import BaseService
from app.exceptions import NotFoundError, ConflictError


class PoolService(BaseService[Pool]):
    """
    Service pour la gestion des poules
    """
    
    def __init__(self, db: Session):
        super().__init__(Pool, db)
    
    def get_by_phase(self, phase_id: int) -> List[Pool]:
        """
        Récupère toutes les poules d'une phase
        
        Args:
            phase_id: L'ID de la phase
            
        Returns:
            Liste des poules triées par ordre d'affichage
        """
        return self.db.query(Pool).filter(
            Pool.phase_id == phase_id
        ).order_by(Pool.display_order).all()
    
    def get_by_phase_and_name(
        self,
        phase_id: int,
        name: str
    ) -> Optional[Pool]:
        """
        Récupère une poule par phase et nom
        
        Args:
            phase_id: L'ID de la phase
            name: Le nom de la poule
            
        Returns:
            La poule trouvée ou None
        """
        return self.db.query(Pool).filter(
            Pool.phase_id == phase_id,
            Pool.name == name
        ).first()
    
    def create_pool(self, pool_data: PoolCreate) -> Pool:
        """
        Crée une nouvelle poule
        
        Args:
            pool_data: Les données de la poule à créer
            
        Returns:
            La poule créée
            
        Raises:
            NotFoundError: Si la phase n'existe pas
            ConflictError: Si une poule avec le même nom existe déjà dans la phase
        """
        # Vérifier que la phase existe
        from app.models.tournamentphase import TournamentPhase
        phase = self.db.query(TournamentPhase).filter(
            TournamentPhase.id == pool_data.phase_id
        ).first()
        if not phase:
            raise NotFoundError("TournamentPhase", str(pool_data.phase_id))
        
        # Vérifier si une poule avec le même nom existe déjà dans la phase
        existing = self.get_by_phase_and_name(pool_data.phase_id, pool_data.name)
        if existing:
            raise ConflictError(
                f"Pool with name '{pool_data.name}' already exists "
                f"in phase {pool_data.phase_id}"
            )
        
        return self.create(**pool_data.model_dump())
    
    def update_pool(self, pool_id: int, pool_data: PoolUpdate) -> Pool:
        """
        Met à jour une poule
        
        Args:
            pool_id: L'ID de la poule à mettre à jour
            pool_data: Les données à mettre à jour
            
        Returns:
            La poule mise à jour
            
        Raises:
            ConflictError: Si le nouveau nom est déjà utilisé par une autre poule
        """
        pool = self.get_or_404(pool_id)
        
        # Vérifier si le nouveau nom est déjà utilisé
        if pool_data.name:
            existing = self.get_by_phase_and_name(pool.phase_id, pool_data.name)
            if existing and existing.id != pool_id:
                raise ConflictError(
                    f"Pool with name '{pool_data.name}' already exists "
                    f"in phase {pool.phase_id}"
                )
        
        update_data = pool_data.model_dump(exclude_unset=True)
        return self.update(pool_id, **update_data)

def calculate_pool_standings(pool_id: int, db):
    """
    Calcule le classement des équipes d'une poule donnée, selon les résultats des matchs.

    Args:
        pool_id (int): L'identifiant de la poule
        db: Session SQLAlchemy

    Returns:
        List[dict]: Liste des équipes avec leurs statistiques, triée par classement
    """
    from app.models.teampool import TeamPool
    from app.models.team import Team
    from app.models.match import Match

    # Récupération des équipes de la poule
    team_pools = db.query(TeamPool).filter(TeamPool.pool_id == pool_id).all()
    if not team_pools:
        return []

    # Récupération des matchs de la poule
    matches = db.query(Match).filter(Match.pool_id == pool_id).all()

    # Initialisation des stats pour chaque équipe
    stats = {}
    for tp in team_pools:
        tid = tp.team_id
        stats[tid] = {
            "team_id": tid,
            "team_name": tp.team.name if tp.team else "",
            "points": 0,
            "played": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "goals_for": 0,
            "goals_against": 0,
            "goal_difference": 0,
        }

    # Traitement de chaque match terminé
    for match in matches:
        if match.status not in ("FINISHED", "RESULT"):  # à ajuster selon modèles
            continue
        t1_id = match.team1_id
        t2_id = match.team2_id
        t1_score = match.team1_score
        t2_score = match.team2_score
        if t1_id not in stats or t2_id not in stats:
            continue

        # Update played
        stats[t1_id]["played"] += 1
        stats[t2_id]["played"] += 1
        stats[t1_id]["goals_for"] += t1_score
        stats[t2_id]["goals_for"] += t2_score
        stats[t1_id]["goals_against"] += t2_score
        stats[t2_id]["goals_against"] += t1_score

        # Résultat
        if t1_score > t2_score:
            stats[t1_id]["wins"] += 1
            stats[t2_id]["losses"] += 1
            stats[t1_id]["points"] += 3
        elif t1_score < t2_score:
            stats[t2_id]["wins"] += 1
            stats[t1_id]["losses"] += 1
            stats[t2_id]["points"] += 3
        else:
            stats[t1_id]["draws"] += 1
            stats[t2_id]["draws"] += 1
            stats[t1_id]["points"] += 1
            stats[t2_id]["points"] += 1

    # Calcul différence de buts
    for team_stat in stats.values():
        team_stat["goal_difference"] = team_stat["goals_for"] - team_stat["goals_against"]

    # Retourne la liste triée (points, diff, buts marqués)
    results = list(stats.values())
    results.sort(key=lambda x: (
        -x["points"],
        -x["goal_difference"],
        -x["goals_for"],
        x["team_name"].lower()
    ))
    # Ajout d'un classement
    for idx, item in enumerate(results, 1):
        item["rank"] = idx

    return results

