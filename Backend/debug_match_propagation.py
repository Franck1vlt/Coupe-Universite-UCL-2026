"""
Script de diagnostic pour la propagation des matchs
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def get_match_details(match_id):
    """Récupère les détails d'un match"""
    response = requests.get(f"{BASE_URL}/matches/{match_id}")
    if response.ok:
        return response.json()["data"]
    return None

def analyze_match_propagation():
    """Analyse la propagation des matchs"""
    print("=== DIAGNOSTIC DE PROPAGATION DES MATCHS ===\n")
    
    # Récupérer tous les matchs
    response = requests.get(f"{BASE_URL}/matches")
    if not response.ok:
        print("❌ Erreur lors de la récupération des matchs")
        return
    
    all_matches = response.json()["data"]
    
    # Trouver les matchs de qualification complétés
    completed_qualifs = [m for m in all_matches if m["match_type"] == "qualification" and m["status"] == "completed"]
    
    print(f"📊 Matchs de qualification complétés: {len(completed_qualifs)}\n")
    
    for match in completed_qualifs:
        print(f"Match #{match['id']}: {match.get('label', 'Sans label')}")
        print(f"  Status: {match['status']}")
        print(f"  Team A: {match.get('team_sport_a_id')} - Score: {match.get('score_a')}")
        print(f"  Team B: {match.get('team_sport_b_id')} - Score: {match.get('score_b')}")
        print(f"  Winner destination: {match.get('winner_destination_match_id')}")
        print(f"  Loser destination: {match.get('loser_destination_match_id')}")
        
        # Analyser la destination du gagnant
        if match.get('winner_destination_match_id'):
            dest_match = get_match_details(match['winner_destination_match_id'])
            if dest_match:
                print(f"\n  🎯 Match de destination (Winner) #{dest_match['id']}:")
                print(f"     Label: {dest_match.get('label')}")
                print(f"     Team A ID: {dest_match.get('team_sport_a_id')} | Source: {dest_match.get('team_a_source')}")
                print(f"     Team B ID: {dest_match.get('team_sport_b_id')} | Source: {dest_match.get('team_b_source')}")
                
                # Vérifier si le gagnant a été propagé
                if match['score_a'] is not None and match['score_b'] is not None:
                    winner_id = match['team_sport_a_id'] if match['score_a'] > match['score_b'] else match['team_sport_b_id']
                    is_propagated = (dest_match['team_sport_a_id'] == winner_id or 
                                   dest_match['team_sport_b_id'] == winner_id)
                    
                    if is_propagated:
                        print(f"     ✅ Gagnant propagé (team_sport_id: {winner_id})")
                    else:
                        print(f"     ❌ Gagnant NON propagé (devrait être: {winner_id})")
        print("\n" + "="*60 + "\n")
    
    # Chercher les matchs avec des sources non résolues
    print("\n📋 MATCHS AVEC SOURCES NON RÉSOLUES:")
    unresolved = [m for m in all_matches 
                  if (m.get('team_a_source') and not m.get('team_sport_a_id')) or 
                     (m.get('team_b_source') and not m.get('team_sport_b_id'))]
    
    for match in unresolved:
        print(f"\nMatch #{match['id']}: {match.get('label')}")
        if match.get('team_a_source') and not match.get('team_sport_a_id'):
            print(f"  ⚠️  Team A: Source '{match['team_a_source']}' non résolue")
        if match.get('team_b_source') and not match.get('team_sport_b_id'):
            print(f"  ⚠️  Team B: Source '{match['team_b_source']}' non résolue")

if __name__ == "__main__":
    analyze_match_propagation()
