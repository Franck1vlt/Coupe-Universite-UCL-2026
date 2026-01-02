"""
Modèles SQLAlchemy pour la base de données
Tous les modèles doivent être importés ici pour être enregistrés auprès de Base.metadata
"""
from app.models.user import User
from app.models.sport import Sport
from app.models.team import Team
from app.models.teamsport import TeamSport
from app.models.tournament import Tournament
from app.models.tournamentconfiguration import TournamentConfiguration
from app.models.tournamentphase import TournamentPhase
from app.models.tournamentranking import TournamentRanking
from app.models.finalranking import FinalRanking
from app.models.pool import Pool
from app.models.teampool import TeamPool
from app.models.match import Match
from app.models.matchset import MatchSet
from app.models.matchschedule import MatchSchedule
from app.models.court import Court
from app.models.player import Player

__all__ = [
    "User",
    "Sport",
    "Team",
    "TeamSport",
    "Tournament",
    "TournamentConfiguration",
    "TournamentPhase",
    "TournamentRanking",
    "FinalRanking",
    "Pool",
    "TeamPool",
    "Match",
    "MatchSet",
    "MatchSchedule",
    "Court",
    "Player",
]
