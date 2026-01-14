"""
Service pour la propagation des résultats de matchs
(vainqueur / perdant vers les matchs suivants)
"""
from sqlalchemy.orm import Session
from app.models.match import Match


class MatchResultPropagationService:
    """
    Service responsable de la propagation des résultats
    d'un match vers les matchs de destination
    """

    def __init__(self, db: Session):
        self.db = db

    def propagate(self, match_id: int) -> None:
        """
        Propage le résultat d'un match terminé

        Args:
            match_id: ID du match source
        """
        match = self.db.query(Match).filter(Match.id == match_id).first()
        if not match:
            return

        # Conditions strictes
        if match.status != "completed":
            return

        if match.score_a is None or match.score_b is None:
            return

        if match.score_a == match.score_b:
            return  # Pas de propagation en cas d'égalité

        if not match.team_sport_a_id or not match.team_sport_b_id:
            return

        # Détermination vainqueur / perdant
        if match.score_a > match.score_b:
            winner = match.team_sport_a
            loser = match.team_sport_b
        else:
            winner = match.team_sport_b
            loser = match.team_sport_a

        # Propagation du vainqueur
        if match.winner_destination_match_id and match.winner_destination_slot:
            self._inject_team(
                match.winner_destination_match_id,
                match.winner_destination_slot,
                winner
            )

        # Propagation du perdant
        if match.loser_destination_match_id and match.loser_destination_slot:
            self._inject_team(
                match.loser_destination_match_id,
                match.loser_destination_slot,
                loser
            )

        self.db.commit()

    def _inject_team(self, destination_match_id: int, slot: str, team) -> None:
        """
        Injecte une équipe dans un match destination

        Args:
            destination_match_id: ID du match cible
            slot: 'A' ou 'B'
            team: TeamSport à injecter
        """
        destination_match = self.db.query(Match).filter(
            Match.id == destination_match_id
        ).first()

        if not destination_match:
            return

        if slot == "A":
            destination_match.team_sport_a_id = team.id
            destination_match.team_a_source = None
        elif slot == "B":
            destination_match.team_sport_b_id = team.id
            destination_match.team_b_source = None
