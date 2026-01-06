"""
Script pour résoudre les sources textuelles en team_sport_id
et créer les liens de propagation
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def get_all_teams():
    """Récupère toutes les équipes"""
    response = requests.get(f"{BASE_URL}/teams")
    if response.ok:
        data = response.json()
        # Format: {"data": {"items": [...]}}
        if isinstance(data, dict) and "data" in data:
            if isinstance(data["data"], dict) and "items" in data["data"]:
                teams = data["data"]["items"]
            elif isinstance(data["data"], list):
                teams = data["data"]
            else:
                return {}
        elif isinstance(data, list):
            teams = data
        else:
            return {}
        
        return {team["name"]: team["id"] for team in teams}
    return {}

def get_all_team_sports():
    """Récupère tous les team_sports"""
    response = requests.get(f"{BASE_URL}/team-sports")
    if response.ok:
        data = response.json()
        # Format: {"data": {"items": [...]}} ou {"data": [...]}
        if isinstance(data, dict) and "data" in data:
            if isinstance(data["data"], dict) and "items" in data["data"]:
                return data["data"]["items"]
            elif isinstance(data["data"], list):
                return data["data"]
        elif isinstance(data, list):
            return data
    return []

def resolve_team_source_to_id(source_name, sport_id, team_name_to_id, team_sports):
    """Résout un nom d'équipe source en team_sport_id"""
    # D'abord, trouver le team_id depuis le nom
    team_id = team_name_to_id.get(source_name)
    if not team_id:
        return None
    
    # Ensuite, trouver le team_sport correspondant
    for ts in team_sports:
        if ts["team_id"] == team_id and ts["sport_id"] == sport_id:
            return ts["id"]
    
    return None

def main():
    print("=== RÉSOLUTION DES SOURCES DE MATCHS ===\n")
    
    # Récupérer les données
    teams_map = get_all_teams()
    team_sports = get_all_team_sports()
    
    print(f"📊 Équipes trouvées: {len(teams_map)}")
    print(f"    Équipes: {list(teams_map.keys())[:5]}...")
    print(f"📊 TeamSports trouvés: {len(team_sports)}")
    if team_sports:
        print(f"    Premier TeamSport: {team_sports[0]}")
    
    response = requests.get(f"{BASE_URL}/matches")
    if not response.ok:
        print("❌ Erreur lors de la récupération des matchs")
        return
    
    all_matches_data = response.json()
    
    # Gérer le format de réponse
    if isinstance(all_matches_data, dict) and "data" in all_matches_data:
        if isinstance(all_matches_data["data"], dict) and "items" in all_matches_data["data"]:
            all_matches = all_matches_data["data"]["items"]
        elif isinstance(all_matches_data["data"], list):
            all_matches = all_matches_data["data"]
        else:
            all_matches = []
    else:
        all_matches = all_matches_data if isinstance(all_matches_data, list) else []
    
    print(f"📊 Matchs à analyser: {len(all_matches)}\n")
    
    # Pour chaque match, tenter de résoudre les sources
    updates_made = 0
    
    for match in all_matches:
        match_id = match["id"]
        update_data = {}
        
        # Récupérer le sport_id depuis la phase
        phase_id = match.get("phase_id")
        if not phase_id:
            continue
        
        # Récupérer la phase pour avoir le sport_id
        phase_response = requests.get(f"{BASE_URL}/tournament-phases/{phase_id}")
        if not phase_response.ok:
            continue
        
        phase_data = phase_response.json()["data"]
        
        # Récupérer le tournoi pour avoir le sport_id
        tournament_id = phase_data.get("tournament_id")
        if not tournament_id:
            continue
            
        tournament_response = requests.get(f"{BASE_URL}/tournaments/{tournament_id}")
        if not tournament_response.ok:
            continue
        
        tournament = tournament_response.json()["data"]
        sport_id = tournament.get("sport_id")
        
        if not sport_id:
            continue
        
        # Résoudre team_a_source
        if match.get("team_a_source") and not match.get("team_sport_a_id"):
            source_name = match["team_a_source"]
            
            # Ignorer les sources de type WQ1, LQ1, etc.
            if not source_name.startswith("W") and not source_name.startswith("L") and not source_name.startswith("P"):
                team_sport_id = resolve_team_source_to_id(source_name, sport_id, teams_map, team_sports)
                if team_sport_id:
                    update_data["team_sport_a_id"] = team_sport_id
                    print(f"✅ Match #{match_id}: '{source_name}' → team_sport_id {team_sport_id} (Team A)")
        
        # Résoudre team_b_source
        if match.get("team_b_source") and not match.get("team_sport_b_id"):
            source_name = match["team_b_source"]
            
            # Ignorer les sources de type WQ1, LQ1, etc.
            if not source_name.startswith("W") and not source_name.startswith("L") and not source_name.startswith("P"):
                team_sport_id = resolve_team_source_to_id(source_name, sport_id, teams_map, team_sports)
                if team_sport_id:
                    update_data["team_sport_b_id"] = team_sport_id
                    print(f"✅ Match #{match_id}: '{source_name}' → team_sport_id {team_sport_id} (Team B)")
        
        # Appliquer les mises à jour
        if update_data:
            update_data["updated_by_user_id"] = 1
            response = requests.patch(
                f"{BASE_URL}/matches/{match_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            if response.ok:
                updates_made += 1
            else:
                print(f"❌ Erreur lors de la mise à jour du match #{match_id}: {response.text}")
    
    print(f"\n🎯 Total de mises à jour: {updates_made}")
    
    # Maintenant, configurer les liens de propagation
    print("\n=== CONFIGURATION DES LIENS DE PROPAGATION ===\n")
    
    # Exemple: Si le match #24 est "WQ1" et doit envoyer son gagnant vers les matchs de poule
    # qui ont "WQ1" comme source
    response = requests.get(f"{BASE_URL}/matches")
    all_matches = response.json()["data"]
    
    for match in all_matches:
        if match["label"] == "WQ1" or (match.get("team_a_source") == "JUNIA" and match.get("team_b_source") == "FLD"):
            # C'est le match de qualification
            qualif_match_id = match["id"]
            
            # Trouver les matchs qui attendent WQ1
            destinations = [m for m in all_matches if 
                          m.get("team_a_source") == "WQ1" or m.get("team_b_source") == "WQ1"]
            
            if destinations:
                # Prendre le premier comme destination (on peut affiner)
                dest_match_id = destinations[0]["id"]
                
                print(f"🔗 Configuration: Match #{qualif_match_id} (WQ1) → Match #{dest_match_id}")
                
                response = requests.patch(
                    f"{BASE_URL}/matches/{qualif_match_id}",
                    json={
                        "winner_destination_match_id": dest_match_id,
                        "updated_by_user_id": 1
                    },
                    headers={"Content-Type": "application/json"}
                )
                
                if response.ok:
                    print(f"✅ Lien configuré avec succès")
                else:
                    print(f"❌ Erreur: {response.text}")

if __name__ == "__main__":
    main()
