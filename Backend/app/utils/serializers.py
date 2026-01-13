from app.models import Match


def match_to_dict(m: 'Match'):
    # On expose les infos de planning de MatchSchedule si elles existent
    schedule = getattr(m, 'schedule', None)
    # Correction : si schedule est une liste (InstrumentedList), prendre le premier élément
    if isinstance(schedule, list) and schedule:
        schedule = schedule[0]
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
        # Champs planning
        "court_id": schedule.court_id if schedule else None,
        "scheduled_datetime": schedule.scheduled_datetime.isoformat() if schedule and schedule.scheduled_datetime else None,
        "estimated_duration_minutes": schedule.estimated_duration_minutes if schedule else None,
    }
