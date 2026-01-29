"""
Live Score Service - SSE Manager for real-time score synchronization
Handles in-memory storage and broadcasting of live match scores across devices.
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional, Set

logger = logging.getLogger(__name__)


@dataclass
class LiveScoreData:
    """Represents live score data for a match"""
    match_id: int
    sport: str
    data: Dict[str, Any]
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "match_id": self.match_id,
            "sport": self.sport,
            "data": self.data,
            "updated_at": self.updated_at.isoformat()
        }

    def to_sse_event(self) -> str:
        """Format as SSE event string"""
        payload = json.dumps({
            "event": "score_update",
            "match_id": self.match_id,
            "sport": self.sport,
            "data": self.data,
            "timestamp": self.updated_at.isoformat()
        })
        return f"data: {payload}\n\n"


class LiveScoreManager:
    """
    Singleton manager for live score updates via SSE.

    - Stores live scores in-memory (fast, ephemeral)
    - Manages SSE client subscriptions per match
    - Broadcasts updates to all subscribed clients
    """

    _instance: Optional["LiveScoreManager"] = None

    def __new__(cls) -> "LiveScoreManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # In-memory storage: match_id -> LiveScoreData
        self._scores: Dict[int, LiveScoreData] = {}

        # SSE subscriptions: match_id -> set of asyncio.Queue
        self._subscriptions: Dict[int, Set[asyncio.Queue]] = {}

        # Lock for thread-safe operations
        self._lock = asyncio.Lock()

        self._initialized = True
        logger.info("LiveScoreManager initialized")

    async def update_score(self, match_id: int, sport: str, data: Dict[str, Any]) -> LiveScoreData:
        """
        Update live score for a match and broadcast to all subscribers.

        Args:
            match_id: The match ID
            sport: Sport type (volleyball, badminton, petanque, flechettes)
            data: Sport-specific score data

        Returns:
            The updated LiveScoreData
        """
        async with self._lock:
            score_data = LiveScoreData(
                match_id=match_id,
                sport=sport,
                data=data,
                updated_at=datetime.utcnow()
            )
            self._scores[match_id] = score_data

        # Broadcast to subscribers (outside lock to avoid blocking)
        logger.info(f"[SSE UPDATE] About to broadcast match {match_id}, subscriptions: {list(self._subscriptions.keys())}")
        await self._broadcast(match_id, score_data)

        logger.info(f"[SSE UPDATE] Score updated for match {match_id}: {sport}")
        return score_data

    async def get_score(self, match_id: int) -> Optional[LiveScoreData]:
        """Get current live score for a match"""
        return self._scores.get(match_id)

    async def get_scores(self, match_ids: list[int]) -> Dict[int, LiveScoreData]:
        """Get live scores for multiple matches"""
        return {
            mid: self._scores[mid]
            for mid in match_ids
            if mid in self._scores
        }

    async def subscribe(self, match_ids: list[int]) -> asyncio.Queue:
        """
        Subscribe to live score updates for multiple matches.

        Args:
            match_ids: List of match IDs to subscribe to

        Returns:
            An asyncio.Queue that will receive LiveScoreData updates
        """
        queue: asyncio.Queue = asyncio.Queue()

        async with self._lock:
            for match_id in match_ids:
                if match_id not in self._subscriptions:
                    self._subscriptions[match_id] = set()
                self._subscriptions[match_id].add(queue)
                logger.info(f"[SSE SUBSCRIBE] Added subscription for match {match_id}, total subscribers: {len(self._subscriptions[match_id])}")

        logger.info(f"[SSE SUBSCRIBE] New subscription for matches: {match_ids}, all subscriptions: {list(self._subscriptions.keys())}")
        return queue

    async def unsubscribe(self, queue: asyncio.Queue, match_ids: list[int]) -> None:
        """
        Unsubscribe from live score updates.

        Args:
            queue: The queue to unsubscribe
            match_ids: List of match IDs to unsubscribe from
        """
        async with self._lock:
            for match_id in match_ids:
                if match_id in self._subscriptions:
                    self._subscriptions[match_id].discard(queue)
                    # Cleanup empty subscription sets
                    if not self._subscriptions[match_id]:
                        del self._subscriptions[match_id]

        logger.debug(f"Unsubscribed from matches: {match_ids}")

    async def _broadcast(self, match_id: int, score_data: LiveScoreData) -> None:
        """Broadcast score update to all subscribers of a match"""
        subscribers = self._subscriptions.get(match_id, set())

        # Log broadcast attempt with subscriber count
        logger.info(f"[SSE BROADCAST] Match {match_id}: {len(subscribers)} subscribers, all subscriptions: {list(self._subscriptions.keys())}")

        if not subscribers:
            logger.warning(f"[SSE BROADCAST] No subscribers for match {match_id} - check if split-screen is using the same match ID")
            return

        broadcast_count = 0
        for queue in subscribers.copy():
            try:
                # Non-blocking put with timeout
                await asyncio.wait_for(queue.put(score_data), timeout=1.0)
                broadcast_count += 1
            except asyncio.TimeoutError:
                logger.warning(f"Timeout broadcasting to subscriber for match {match_id}")
            except Exception as e:
                logger.error(f"Error broadcasting to subscriber: {e}")

        logger.info(f"[SSE BROADCAST] Successfully queued update for match {match_id} to {broadcast_count}/{len(subscribers)} subscribers")

    def clear_match(self, match_id: int) -> None:
        """Clear live score data for a match (e.g., when match ends)"""
        self._scores.pop(match_id, None)
        logger.debug(f"Cleared live score for match {match_id}")

    def get_active_matches(self) -> list[int]:
        """Get list of match IDs with active live scores"""
        return list(self._scores.keys())

    def get_subscriber_count(self, match_id: int) -> int:
        """Get number of subscribers for a match"""
        return len(self._subscriptions.get(match_id, set()))


# Global singleton instance
live_score_manager = LiveScoreManager()
