# Mise à jour automatique du classement de poule

## Description
Lorsqu'un match de poule est marqué comme terminé (status = "completed" avec des scores), le classement (standings) de la poule est automatiquement mis à jour.

## Implémentation

### 1. Fonction `update_pool_rankings()` dans `MatchService`
Nouvelle fonction dans [app/services/match_service.py](../../app/services/match_service.py):
- Recalcule les statistiques de toutes les équipes basées sur les matchs complétés
- Met à jour les champs suivants pour chaque `TeamPool`:
  - `points`: Points (3 pour une victoire, 1 pour un nul, 0 pour une défaite)
  - `wins`: Nombre de victoires
  - `losses`: Nombre de défaites
  - `draws`: Nombre de matchs nuls
  - `goals_for`: Buts marqués
  - `goals_against`: Buts encaissés
  - `goal_difference`: Différence de buts
  - `position`: Classement (1ère, 2ème, etc.)

**Critères de classement:**
1. Points (décroissant)
2. Différence de buts (décroissant)
3. Buts marqués (décroissant)
4. Nom d'équipe (ordre alphabétique croissant, en cas d'égalité)

### 2. Intégration automatique
L'endpoint `PATCH /matches/{match_id}` déclenche automatiquement la mise à jour du classement:
```python
# Dans le endpoint PATCH /matches/{match_id}
if match.pool_id is not None and match.status == "completed" and match.score_a is not None and match.score_b is not None:
    match_service = MatchService(db)
    match_service.update_pool_rankings(match.pool_id)
```

### 3. Endpoints REST

#### GET `/pools/{pool_id}/standings`
Récupère le classement actuel de la poule (données stockées en base):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "team_id": 101,
      "team_name": "Team A",
      "position": 1,
      "points": 9,
      "wins": 3,
      "losses": 0,
      "draws": 0,
      "goals_for": 10,
      "goals_against": 2,
      "goal_difference": 8
    }
  ],
  "message": "Classement de la poule récupéré avec succès"
}
```

#### POST `/pools/{pool_id}/recalculate-standings`
Recalcule manuellement le classement (utile si des données ont été corrigées):
```json
{
  "success": true,
  "data": [...],
  "message": "Classement de la poule recalculé avec succès"
}
```

## Flux de mise à jour

1. **Création d'un match de poule**
   - Un match est créé avec `pool_id` et `match_type="pool"`
   - Les scores sont vides (`score_a=None`, `score_b=None`)
   - Le statut est "upcoming"

2. **Enregistrement du résultat**
   - `PATCH /matches/{match_id}` avec `score_a`, `score_b`, et `status="completed"`
   - Les scores et le statut sont mis à jour en base de données

3. **Mise à jour automatique du classement**
   - Le système détecte qu'il s'agit d'un match de poule complété
   - `MatchService.update_pool_rankings(pool_id)` est appelé
   - Tous les matchs complétés de la poule sont traités
   - Les statistiques et le classement sont recalculés et stockés dans `TeamPool`

4. **Récupération du classement**
   - `GET /pools/{pool_id}/standings` retourne les données actualisées

## Exemple d'utilisation

### 1. Créer un match de poule
```bash
POST /matches
{
  "phase_id": 1,
  "pool_id": 1,
  "match_type": "pool",
  "team_sport_a_id": 10,
  "team_sport_b_id": 11,
  "created_by_user_id": 1
}
```

### 2. Enregistrer le résultat
```bash
PATCH /matches/1
{
  "score_a": 2,
  "score_b": 1,
  "status": "completed"
}
```
→ Le classement se met à jour automatiquement

### 3. Consulter le classement
```bash
GET /pools/1/standings
```

## Tests
Un script de test est fourni: [test_pool_rankings.py](../../test_pool_rankings.py)

Pour exécuter le test:
```bash
cd Backend
python test_pool_rankings.py
```

## Notes importantes
- Le classement est mis à jour uniquement pour les matchs avec le statut "completed"
- Les matchs doivent avoir les deux scores définis (`score_a` et `score_b` non-null)
- La réinitialisation des statistiques se fait à chaque mise à jour (récalcul complet)
- Le système gère les matchs nuls (aucune propagation de gagnant/perdant)
