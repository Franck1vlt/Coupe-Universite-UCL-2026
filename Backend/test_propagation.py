"""
Script pour tester la propagation automatique
"""
import requests

BASE_URL = "http://localhost:8000"

def test_propagation():
    """Teste la propagation en complétant le match #24"""
    match_id = 24
    
    print("=== TEST DE LA PROPAGATION AUTOMATIQUE ===\n")
    
    # 1. Compléter le match avec JUNIA gagnant
    print(f"🏁 Completion du match #{match_id} avec JUNIA gagnant (score 8-0)...")
    response = requests.patch(
        f"{BASE_URL}/matches/{match_id}",
        json={
            "score_a": 8,  # JUNIA
            "score_b": 0,  # FLD
            "status": "completed",
            "updated_by_user_id": 1
        },
        headers={"Content-Type": "application/json"}
    )
    
    if not response.ok:
        print(f"❌ Erreur lors de la complétion: {response.text}")
        return
    
    match_data = response.json()["data"]
    print(f"✅ Match complété!")
    print(f"   Score: {match_data['score_a']} - {match_data['score_b']}")
    print(f"   Status: {match_data['status']}")
    print(f"   Winner destination: {match_data.get('winner_destination_match_id')}")
    
    # 2. Vérifier le match de destination
    dest_match_id = match_data.get("winner_destination_match_id")
    if not dest_match_id:
        print("\n⚠️  Pas de winner_destination_match_id configuré")
        return
    
    print(f"\n🔍 Vérification du match de destination #{dest_match_id}...")
    response = requests.get(f"{BASE_URL}/matches/{dest_match_id}")
    
    if not response.ok:
        print(f"❌ Erreur lors de la récupération: {response.text}")
        return
    
    dest_match = response.json()["data"]
    print(f"📋 Match #{dest_match_id}: {dest_match.get('label')}")
    print(f"   Team A ID: {dest_match.get('team_sport_a_id')} (Source: {dest_match.get('team_a_source')})")
    print(f"   Team B ID: {dest_match.get('team_sport_b_id')} (Source: {dest_match.get('team_b_source')})")
    
    # Vérifier si la propagation a fonctionné
    winner_team_sport_id = match_data.get("team_sport_a_id")  # JUNIA a gagné
    
    if dest_match.get("team_sport_a_id") == winner_team_sport_id:
        print(f"\n✅ 🎉 PROPAGATION RÉUSSIE! L'équipe gagnante (ID {winner_team_sport_id}) a été propagée en Team A!")
    elif dest_match.get("team_sport_b_id") == winner_team_sport_id:
        print(f"\n✅ 🎉 PROPAGATION RÉUSSIE! L'équipe gagnante (ID {winner_team_sport_id}) a été propagée en Team B!")
    else:
        print(f"\n❌ La propagation n'a pas fonctionné. Team ID attendu: {winner_team_sport_id}")
        print(f"   Trouvé: A={dest_match.get('team_sport_a_id')}, B={dest_match.get('team_sport_b_id')}")

if __name__ == "__main__":
    test_propagation()
