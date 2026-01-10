from app.models import Match


def match_to_dict(m: Match):
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
    }
