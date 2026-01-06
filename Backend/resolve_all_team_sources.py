"""
Script pour résoudre toutes les sources textuelles d'équipes en team_sport_id
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def get_teams_map():
    """Récupère toutes les équipes"""
    response = requests.get(f"{BASE_URL}/teams")
    if response.ok:
        teams_data = response.json()
        teams = teams_data["data"]["items"] if isinstance(teams_data.get("data"), dict) else teams_data.get("data", [])
        return {team["name"]: team["id"] for team in teams}
    return {}

def get_or_create_team_sport(team_id, sport_id):
    """Trouve ou crée un TeamSport"""
    # Vérifier si existe
    response = requests.get(f"{BASE_URL}/teams/{team_id}/sports")
    if response.ok:
        team_sports = response.json().get("data", [])
        for ts in team_sports:
            if ts.get("sport_id") == sport_id:
                return ts["id"]
    
    # Créer si n'existe pas
    response = requests.post(
        f"{BASE_URL}/teams/{team_id}/sports",
        json=[{"sport_id": sport_id, "team_sport_name": None, "is_active": True}],
        headers={"Content-Type": "application/json"}
    )
    
    if response.ok:
        created = response.json().get("data", [])
        if created:
            return created[0]["id"]
    
    return None

def resolve_all_text_sources():
    """Résout toutes les sources textuelles"""
    print("=== RÉSOLUTION DE TOUTES LES SOURCES TEXTUELLES ===\n")
    
    teams_map = get_teams_map()
    print(f"📊 {len(teams_map)} équipes disponibles: {list(teams_map.keys())}\n")
    
    # Récupérer tous les matchs
    response = requests.get(f"{BASE_URL}/matches")
    if not response.ok:
        print("❌ Erreur lors de la récupération des matchs")
        return
    
    matches_data = response.json()
    if isinstance(matches_data.get("data"), dict) and "items" in matches_data["data"]:
        matches = matches_data["data"]["items"]
    else:
        matches = matches_data.get("data", [])
    
    updates_count = 0
    
    for match in matches:
        match_id = match["id"]
        update_data = {}
        needs_update = False
        
        # Récupérer le sport_id
        phase_id = match.get("phase_id")
        if not phase_id:
            continue
        
        response = requests.get(f"{BASE_URL}/tournament-phases/{phase_id}")
        if not response.ok:
            continue
        
        tournament_id = response.json()["data"].get("tournament_id")
        
        response = requests.get(f"{BASE_URL}/tournaments/{tournament_id}")
        if not response.ok:
            continue
        
        sport_id = response.json()["data"].get("sport_id")
        
        # Résoudre team_a_source
        team_a_source = match.get("team_a_source")
        if team_a_source and not match.get("team_sport_a_id"):
            # Ignorer les placeholders de type WQ1, LQ1, P1-1, etc.
            if team_a_source in teams_map:
                team_id = teams_map[team_a_source]
                team_sport_id = get_or_create_team_sport(team_id, sport_id)
                if team_sport_id:
                    update_data["team_sport_a_id"] = team_sport_id
                    needs_update = True
                    print(f"✅ Match #{match_id}: '{team_a_source}' → team_sport_id {team_sport_id} (Team A)")
        
        # Résoudre team_b_source
        team_b_source = match.get("team_b_source")
        if team_b_source and not match.get("team_sport_b_id"):
            if team_b_source in teams_map:
                team_id = teams_map[team_b_source]
                team_sport_id = get_or_create_team_sport(team_id, sport_id)
                if team_sport_id:
                    update_data["team_sport_b_id"] = team_sport_id
                    needs_update = True
                    print(f"✅ Match #{match_id}: '{team_b_source}' → team_sport_id {team_sport_id} (Team B)")
        
        # Mettre à jour le match
        if needs_update:
            update_data["updated_by_user_id"] = 1
            response = requests.patch(
                f"{BASE_URL}/matches/{match_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            if response.ok:
                updates_count += 1
            else:
                print(f"❌ Erreur lors de la mise à jour du match #{match_id}: {response.text}")
    
    print(f"\n🎯 Total de mises à jour: {updates_count}")

if __name__ == "__main__":
    resolve_all_text_sources()
