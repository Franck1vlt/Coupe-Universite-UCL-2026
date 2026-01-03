"""
Schémas Pydantic pour la validation des données
Tous les schémas sont exportés ici pour faciliter les imports
"""
from app.schemas.common import TimestampMixin, BaseResponse
from app.schemas.user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserPublic,
)
from app.schemas.sport import (
    SportBase,
    SportCreate,
    SportUpdate,
    SportResponse,
)
from app.schemas.team import (
    TeamBase,
    TeamCreate,
    TeamUpdate,
    TeamResponse,
)
from app.schemas.teamsport import (
    TeamSportBase,
    TeamSportCreate,
    TeamSportUpdate,
    TeamSportResponse,
)
from app.schemas.tournament import (
    TournamentBase,
    TournamentCreate,
    TournamentUpdate,
    TournamentResponse,
)
from app.schemas.tournamentconfiguration import (
    TournamentConfigurationBase,
    TournamentConfigurationCreate,
    TournamentConfigurationUpdate,
    TournamentConfigurationResponse,
)
from app.schemas.tournamentphase import (
    TournamentPhaseBase,
    TournamentPhaseCreate,
    TournamentPhaseUpdate,
    TournamentPhaseResponse,
)
from app.schemas.tournamentranking import (
    TournamentRankingBase,
    TournamentRankingCreate,
    TournamentRankingUpdate,
    TournamentRankingResponse,
)
from app.schemas.finalranking import (
    FinalRankingBase,
    FinalRankingCreate,
    FinalRankingUpdate,
    FinalRankingResponse,
)
from app.schemas.pool import (
    PoolBase,
    PoolCreate,
    PoolUpdate,
    PoolResponse,
)
from app.schemas.teampool import (
    TeamPoolBase,
    TeamPoolCreate,
    TeamPoolUpdate,
    TeamPoolResponse,
)
from app.schemas.match import (
    MatchBase,
    MatchCreate,
    MatchUpdate,
    MatchResponse,
)
from app.schemas.matchset import (
    MatchSetBase,
    MatchSetCreate,
    MatchSetUpdate,
    MatchSetResponse,
)
from app.schemas.matchschedule import (
    MatchScheduleBase,
    MatchScheduleCreate,
    MatchScheduleUpdate,
    MatchScheduleResponse,
)
from app.schemas.court import (
    CourtBase,
    CourtCreate,
    CourtUpdate,
    CourtResponse,
)
from app.schemas.player import (
    PlayerBase,
    PlayerCreate,
    PlayerUpdate,
    PlayerResponse,
)

__all__ = [
    # Common
    "TimestampMixin",
    "BaseResponse",
    # User
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserPublic",
    # Sport
    "SportBase",
    "SportCreate",
    "SportUpdate",
    "SportResponse",
    # Team
    "TeamBase",
    "TeamCreate",
    "TeamUpdate",
    "TeamResponse",
    # TeamSport
    "TeamSportBase",
    "TeamSportCreate",
    "TeamSportUpdate",
    "TeamSportResponse",
    # Tournament
    "TournamentBase",
    "TournamentCreate",
    "TournamentUpdate",
    "TournamentResponse",
    # TournamentConfiguration
    "TournamentConfigurationBase",
    "TournamentConfigurationCreate",
    "TournamentConfigurationUpdate",
    "TournamentConfigurationResponse",
    # TournamentPhase
    "TournamentPhaseBase",
    "TournamentPhaseCreate",
    "TournamentPhaseUpdate",
    "TournamentPhaseResponse",
    # TournamentRanking
    "TournamentRankingBase",
    "TournamentRankingCreate",
    "TournamentRankingUpdate",
    "TournamentRankingResponse",
    # FinalRanking
    "FinalRankingBase",
    "FinalRankingCreate",
    "FinalRankingUpdate",
    "FinalRankingResponse",
    # Pool
    "PoolBase",
    "PoolCreate",
    "PoolUpdate",
    "PoolResponse",
    # TeamPool
    "TeamPoolBase",
    "TeamPoolCreate",
    "TeamPoolUpdate",
    "TeamPoolResponse",
    # Match
    "MatchBase",
    "MatchCreate",
    "MatchUpdate",
    "MatchResponse",
    # MatchSet
    "MatchSetBase",
    "MatchSetCreate",
    "MatchSetUpdate",
    "MatchSetResponse",
    # MatchSchedule
    "MatchScheduleBase",
    "MatchScheduleCreate",
    "MatchScheduleUpdate",
    "MatchScheduleResponse",
    # Court
    "CourtBase",
    "CourtCreate",
    "CourtUpdate",
    "CourtResponse",
    # Player
    "PlayerBase",
    "PlayerCreate",
    "PlayerUpdate",
    "PlayerResponse",
]
