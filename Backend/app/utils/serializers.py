from typing import Optional, Dict
from app.models import Match


def match_to_dict(m: 'Match', id_to_uuid_mapping: Optional[Dict[int, str]] = None):
    """
    Convertit un objet Match en dictionnaire.

    Args:
        m: L'objet Match à convertir
        id_to_uuid_mapping: Optionnel - mapping des IDs de match vers leurs UUIDs
                           pour résoudre les destinations en UUID
    """
    # On expose les infos de planning de MatchSchedule si elles existent
    schedule = getattr(m, 'schedule', None)
    # Correction : si schedule est une liste (InstrumentedList), prendre le premier élément
    if isinstance(schedule, list) and schedule:
        schedule = schedule[0]

    # Résoudre les UUIDs de destination si le mapping est fourni
    winner_dest_uuid = None
    loser_dest_uuid = None
    if id_to_uuid_mapping:
        if m.winner_destination_match_id:
            winner_dest_uuid = id_to_uuid_mapping.get(m.winner_destination_match_id)
        if m.loser_destination_match_id:
            loser_dest_uuid = id_to_uuid_mapping.get(m.loser_destination_match_id)

    return {
        "id": m.id,
        "uuid": m.uuid or f"match-{m.id}",
        "match_type": m.match_type,
        "bracket_type": m.bracket_type,
        "team_a_source": m.team_a_source,
        "team_b_source": m.team_b_source,
        "label": m.label,
        "status": m.status,
        "court": m.court,
        "date": str(m.date) if m.date else None,
        "time": str(m.time) if m.time else None,
        "duration": m.duration or 90,
        # Scores
        "score_a": m.score_a,
        "score_b": m.score_b,
        # Points
        "winner_points": m.winner_points if m.winner_points is not None else 0,
        "loser_points": m.loser_points if m.loser_points is not None else 0,
        # Destinations (IDs SQL)
        "winner_destination_match_id": m.winner_destination_match_id,
        "loser_destination_match_id": m.loser_destination_match_id,
        # Destinations (UUIDs pour le frontend)
        "winner_destination_match_uuid": winner_dest_uuid,
        "loser_destination_match_uuid": loser_dest_uuid,
        "winner_destination_slot": m.winner_destination_slot,
        "loser_destination_slot": m.loser_destination_slot,
        # Champs planning
        "court_id": schedule.court_id if schedule else None,
        "scheduled_datetime": schedule.scheduled_datetime.isoformat() if schedule and schedule.scheduled_datetime else None,
        "estimated_duration_minutes": schedule.estimated_duration_minutes if schedule else None,
    }
