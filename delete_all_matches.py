import requests

API_URL = "http://localhost:8000"

# 1. Récupérer tous les matchs
resp = requests.get(f"{API_URL}/matches")
data = resp.json()

if not data.get("data"):
    print("Aucun match trouvé.")
    exit(0)

match_list = data["data"]
ids = [m["id"] for m in match_list if "id" in m]
print(f"Nombre de matchs à supprimer : {len(ids)}")

# 2. Supprimer chaque match
for match_id in ids:
    del_resp = requests.delete(f"{API_URL}/matches/{match_id}")
    if del_resp.status_code == 200:
        print(f"Match {match_id} supprimé.")
    else:
        print(f"Erreur suppression match {match_id} : {del_resp.status_code}")

print("Suppression terminée.")
