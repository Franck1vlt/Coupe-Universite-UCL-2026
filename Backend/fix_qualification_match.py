"""
Script pour corriger le match de qualification et activer la propagation automatique
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def get_or_create_team_sport(team_name, sport_id):
    """Trouve ou crée un TeamSport pour une équipe et un sport donnés"""
    
    # 1. Trouver le team_id depuis le nom
    response = requests.get(f"{BASE_URL}/teams")
    if not response.ok:
        print(f"❌ Erreur lors de la récupération des équipes")
        return None
    
    teams_data = response.json()
    teams = teams_data["data"]["items"] if isinstance(teams_data.get("data"), dict) else teams_data.get("data", [])
    
    team_id = None
    for team in teams:
        if team["name"] == team_name:
            team_id = team["id"]
            break
    
    if not team_id:
        print(f"❌ Équipe '{team_name}' introuvable")
        return None
    
    print(f"✅ Équipe '{team_name}' trouvée (ID: {team_id})")
    
    # 2. Vérifier si TeamSport existe déjà
    response = requests.get(f"{BASE_URL}/teams/{team_id}/sports")
    if response.ok:
        team_sports_data = response.json()
        team_sports = team_sports_data.get("data", [])
        
        # Chercher celui qui correspond au sport
        for ts in team_sports:
            if ts.get("sport_id") == sport_id:
                print(f"✅ TeamSport déjà existant pour {team_name} (ID: {ts['id']})")
                return ts["id"]
    
    # 3. Créer le TeamSport s'il n'existe pas
    print(f"🔧 Création du TeamSport pour {team_name}...")
    response = requests.post(
        f"{BASE_URL}/teams/{team_id}/sports",
        json=[{
            "sport_id": sport_id,
            "team_sport_name": None,
            "is_active": True
        }],
        headers={"Content-Type": "application/json"}
    )
    
    if response.ok:
        team_sport_data = response.json()
        created_team_sports = team_sport_data.get("data", [])
        if created_team_sports:
            team_sport_id = created_team_sports[0]["id"]
            print(f"✅ TeamSport créé pour {team_name} (ID: {team_sport_id})")
            return team_sport_id
    
    print(f"❌ Erreur lors de la création du TeamSport: {response.text}")
    return None

def fix_qualification_match():
    """Corrige le match de qualification #24"""
    print("=== CORRECTION DU MATCH DE QUALIFICATION ===\n")
    
    match_id = 24
    
    # 1. Récupérer le match
    response = requests.get(f"{BASE_URL}/matches/{match_id}")
    if not response.ok:
        print(f"❌ Match #{match_id} introuvable")
        return
    
    match_data = response.json()["data"]
    print(f"📋 Match #{match_id}: {match_data.get('label')}")
    print(f"   Sources: {match_data.get('team_a_source')} vs {match_data.get('team_b_source')}")
    
    # 2. Récupérer le sport via phase → tournament
    phase_id = match_data.get("phase_id")
    if not phase_id:
        print("❌ Pas de phase_id")
        return
    
    response = requests.get(f"{BASE_URL}/tournament-phases/{phase_id}")
    if not response.ok:
        print(f"❌ Phase #{phase_id} introuvable")
        return
    
    phase_data = response.json()["data"]
    tournament_id = phase_data.get("tournament_id")
    
    response = requests.get(f"{BASE_URL}/tournaments/{tournament_id}")
    if not response.ok:
        print(f"❌ Tournoi #{tournament_id} introuvable")
        return
    
    tournament_data = response.json()["data"]
    sport_id = tournament_data.get("sport_id")
    
    print(f"✅ Sport ID: {sport_id}")
    
    # 3. Créer/trouver les TeamSports
    team_a_source = match_data.get("team_a_source")
    team_b_source = match_data.get("team_b_source")
    
    if not team_a_source or not team_b_source:
        print("❌ Sources d'équipes manquantes")
        return
    
    team_sport_a_id = get_or_create_team_sport(team_a_source, sport_id)
    team_sport_b_id = get_or_create_team_sport(team_b_source, sport_id)
    
    if not team_sport_a_id or not team_sport_b_id:
        print("❌ Impossible de créer les TeamSports")
        return
    
    # 4. Mettre à jour le match
    print(f"\n🔧 Mise à jour du match #{match_id}...")
    response = requests.patch(
        f"{BASE_URL}/matches/{match_id}",
        json={
            "team_sport_a_id": team_sport_a_id,
            "team_sport_b_id": team_sport_b_id,
            "updated_by_user_id": 1
        },
        headers={"Content-Type": "application/json"}
    )
    
    if response.ok:
        print(f"✅ Match #{match_id} mis à jour avec succès!")
        updated_match = response.json()["data"]
        print(f"   Team A ID: {updated_match.get('team_sport_a_id')}")
        print(f"   Team B ID: {updated_match.get('team_sport_b_id')}")
        print(f"   Winner destination: {updated_match.get('winner_destination_match_id')}")
        
        print("\n🎯 Le match est maintenant prêt pour la propagation automatique!")
        print("   Complète le match avec un score pour déclencher la propagation.")
    else:
        print(f"❌ Erreur lors de la mise à jour: {response.text}")

if __name__ == "__main__":
    fix_qualification_match()
