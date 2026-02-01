"""
Service pour la propagation des résultats de matchs
(vainqueur / perdant vers les matchs suivants)
"""
from sqlalchemy.orm import Session
from app.models.match import Match
from app.models.teamsport import TeamSport
from app.models.team import Team


class MatchResultPropagationService:
    """
    Service responsable de la propagation des résultats
    d'un match vers les matchs de destination.

    Utilise les champs winner_destination_slot et loser_destination_slot
    pour déterminer où placer les équipes dans les matchs suivants.
    """

    def __init__(self, db: Session):
        self.db = db

    def propagate(self, match_id: int) -> dict:
        """
        Propage le résultat d'un match terminé

        Args:
            match_id: ID du match source

        Returns:
            dict avec les informations de propagation
        """
        result = {
            "match_id": match_id,
            "winner_propagated": False,
            "loser_propagated": False,
            "winner_destination_match_id": None,
            "loser_destination_match_id": None,
            "errors": []
        }

        match = self.db.query(Match).filter(Match.id == match_id).first()
        if not match:
            result["errors"].append(f"Match {match_id} not found")
            return result

        # Conditions strictes
        if match.status != "completed":
            result["errors"].append(f"Match {match_id} is not completed (status={match.status})")
            return result

        if match.score_a is None or match.score_b is None:
            result["errors"].append(f"Match {match_id} has no scores")
            return result

        if match.score_a == match.score_b:
            result["errors"].append(f"Match {match_id} is a draw - no propagation")
            return result

        if not match.team_sport_a_id or not match.team_sport_b_id:
            result["errors"].append(f"Match {match_id} has no team_sport_ids")
            return result

        # Détermination vainqueur / perdant
        if match.score_a > match.score_b:
            winner = match.team_sport_a
            loser = match.team_sport_b
        else:
            winner = match.team_sport_b
            loser = match.team_sport_a

        # Propagation du vainqueur
        if match.winner_destination_match_id:
            slot = match.winner_destination_slot
            if slot:
                success = self._inject_team(
                    match.winner_destination_match_id,
                    slot,
                    winner
                )
                if success:
                    result["winner_propagated"] = True
                    result["winner_destination_match_id"] = match.winner_destination_match_id
                    print(f"✅ Vainqueur propagé du match {match_id} vers match {match.winner_destination_match_id} (slot {slot})")
            else:
                # Fallback: trouver un slot libre
                success = self._inject_team_fallback(
                    match.winner_destination_match_id,
                    winner
                )
                if success:
                    result["winner_propagated"] = True
                    result["winner_destination_match_id"] = match.winner_destination_match_id
                    print(f"✅ Vainqueur propagé (fallback) du match {match_id} vers match {match.winner_destination_match_id}")

        # Propagation du perdant
        if match.loser_destination_match_id:
            slot = match.loser_destination_slot
            if slot:
                success = self._inject_team(
                    match.loser_destination_match_id,
                    slot,
                    loser
                )
                if success:
                    result["loser_propagated"] = True
                    result["loser_destination_match_id"] = match.loser_destination_match_id
                    print(f"✅ Perdant propagé du match {match_id} vers match {match.loser_destination_match_id} (slot {slot})")
            else:
                # Fallback: trouver un slot libre
                success = self._inject_team_fallback(
                    match.loser_destination_match_id,
                    loser
                )
                if success:
                    result["loser_propagated"] = True
                    result["loser_destination_match_id"] = match.loser_destination_match_id
                    print(f"✅ Perdant propagé (fallback) du match {match_id} vers match {match.loser_destination_match_id}")

        self.db.commit()
        return result

    def _get_team_name(self, team_sport) -> str | None:
        """Récupère le nom de l'équipe depuis TeamSport"""
        if not team_sport:
            return None
        team = self.db.query(Team).filter(Team.id == team_sport.team_id).first()
        return team.name if team else None

    def _inject_team(self, destination_match_id: int, slot: str, team_sport) -> bool:
        """
        Injecte une équipe dans un match destination au slot spécifié

        Args:
            destination_match_id: ID du match cible
            slot: 'A' ou 'B'
            team_sport: TeamSport à injecter

        Returns:
            True si l'injection a réussi
        """
        destination_match = self.db.query(Match).filter(
            Match.id == destination_match_id
        ).first()

        if not destination_match:
            print(f"❌ Match destination {destination_match_id} introuvable")
            return False

        team_name = self._get_team_name(team_sport)

        if slot == "A":
            destination_match.team_sport_a_id = team_sport.id
            if team_name:
                destination_match.team_a_source = team_name
            return True
        elif slot == "B":
            destination_match.team_sport_b_id = team_sport.id
            if team_name:
                destination_match.team_b_source = team_name
            return True

        return False

    def _inject_team_fallback(self, destination_match_id: int, team_sport) -> bool:
        """
        Injecte une équipe dans le premier slot libre d'un match destination
        (utilisé quand le slot n'est pas configuré)

        Args:
            destination_match_id: ID du match cible
            team_sport: TeamSport à injecter

        Returns:
            True si l'injection a réussi
        """
        destination_match = self.db.query(Match).filter(
            Match.id == destination_match_id
        ).first()

        if not destination_match:
            print(f"❌ Match destination {destination_match_id} introuvable")
            return False

        team_name = self._get_team_name(team_sport)

        if destination_match.team_sport_a_id is None:
            destination_match.team_sport_a_id = team_sport.id
            if team_name:
                destination_match.team_a_source = team_name
            return True
        elif destination_match.team_sport_b_id is None:
            destination_match.team_sport_b_id = team_sport.id
            if team_name:
                destination_match.team_b_source = team_name
            return True

        print(f"❌ Aucun slot libre dans le match {destination_match_id}")
        return False
