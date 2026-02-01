# API Usage - Frontend Admin

Documentation des endpoints API utilises par le frontend admin de la Coupe de l'Universite UCL.

---

## Configuration

**Base URL** : Configure via la variable d'environnement `NEXT_PUBLIC_API_URL`

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL;
// Exemple: http://localhost:8000
```

---

## Authentification

### NextAuth Endpoints

| Methode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/auth/[...nextauth]` | Endpoints NextAuth (signin, signout, session) |

---

## Sports

### Liste des sports

```http
GET /sports?skip=0&limit=100
```

**Response** :
```json
{
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Football",
        "score_type": "goals"
      }
    ],
    "total": 10
  }
}
```

### Creer un sport

```http
POST /sports?name={name}&score_type={type}
```

**Parametres** :
| Parametre | Type | Valeurs possibles |
|-----------|------|-------------------|
| `name` | string | Nom du sport |
| `score_type` | string | `points`, `goals`, `sets` |

### Modifier un sport

```http
PUT /sports/{id}?name={name}&score_type={type}
```

### Supprimer un sport

```http
DELETE /sports/{id}
```

---

## Equipes

### Liste des equipes

```http
GET /teams?skip=0&limit=100
```

**Response** :
```json
{
  "data": {
    "items": [
      {
        "id": 1,
        "name": "UCL Team A",
        "logo_url": "/logos/team-a.png"
      }
    ]
  }
}
```

### Details d'une equipe

```http
GET /teams/{id}
```

### Equipe-Sport (inscription)

```http
GET /team-sports/{id}
```

**Response** :
```json
{
  "data": {
    "id": 1,
    "team_id": 1,
    "sport_id": 1,
    "team_name": "UCL Team A"
  }
}
```

---

## Terrains (Courts)

### Liste des terrains

```http
GET /courts?skip=0&limit=100
```

**Response** :
```json
{
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Terrain A"
      }
    ]
  }
}
```

---

## Tournois

### Liste des tournois

```http
GET /tournaments
```

**Response** :
```json
{
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Tournoi Football 2026",
        "sport_id": 1
      }
    ]
  }
}
```

### Details d'un tournoi

```http
GET /tournaments/{id}
```

### Structure d'un tournoi

```http
GET /tournaments/{id}/structure
```

**Response** :
```json
{
  "data": {
    "qualification_matches": [...],
    "pools": [...],
    "bracket_matches": [...],
    "loser_bracket_matches": [...]
  }
}
```

### Sauvegarder la structure d'un tournoi

```http
POST /tournament_structure/{id}/structure
Content-Type: application/json

{
  "qualification_matches": [...],
  "pools": [...],
  "bracket_matches": [...],
  "loser_bracket_matches": [...]
}
```

**Body - Structure complete** :
```json
{
  "qualification_matches": [
    {
      "id": "match-uuid",
      "label": "Q1",
      "team_a_source": "Team A",
      "team_b_source": "Team B",
      "scheduled_datetime": "2026-03-15T14:00:00",
      "court": "Terrain A",
      "status": "upcoming",
      "duration": 90
    }
  ],
  "pools": [
    {
      "name": "Poule A",
      "qualified_to_finals": 2,
      "qualified_to_loser_bracket": 0,
      "matches": [...]
    }
  ],
  "bracket_matches": [
    {
      "label": "QF1",
      "bracket_type": "quarterfinal",
      "team_a_source": "1er Poule A",
      "team_b_source": "2e Poule B"
    }
  ],
  "loser_bracket_matches": [
    {
      "label": "LR1-1",
      "bracket_type": "loser_round_1"
    }
  ]
}
```

### Propagation des resultats

```http
POST /tournaments/{id}/propagate-results
```

**Response** :
```json
{
  "data": {
    "propagated_matches": 3,
    "message": "Results propagated successfully"
  }
}
```

### Classement d'un tournoi

```http
GET /tournaments/{id}/final-ranking
```

**Response** :
```json
{
  "data": [
    {
      "position": 1,
      "team_id": 1,
      "team_name": "UCL Team A",
      "points": 25,
      "wins": 5,
      "draws": 1,
      "losses": 0,
      "goal_difference": 12
    }
  ]
}
```

---

## Matchs

### Liste des matchs

```http
GET /matches?skip=0&limit=100
GET /matches?status=in_progress
```

**Filtres disponibles** :
| Parametre | Valeurs |
|-----------|---------|
| `status` | `upcoming`, `in_progress`, `completed` |
| `tournament_id` | ID du tournoi |
| `sport_id` | ID du sport |

**Response** :
```json
{
  "data": {
    "items": [
      {
        "id": 1,
        "phase_id": 1,
        "team_sport_a_id": 1,
        "team_sport_b_id": 2,
        "score_a": 2,
        "score_b": 1,
        "status": "completed",
        "scheduled_datetime": "2026-03-15T14:00:00"
      }
    ]
  }
}
```

### Details d'un match

```http
GET /matches/{id}
```

**Response** :
```json
{
  "data": {
    "id": 1,
    "phase_id": 1,
    "team_sport_a_id": 1,
    "team_sport_b_id": 2,
    "score_a": 0,
    "score_b": 0,
    "status": "upcoming",
    "court_id": 1,
    "scheduled_datetime": "2026-03-15T14:00:00",
    "winner_destination_slot": "SF1-A",
    "loser_destination_slot": "LR1-A"
  }
}
```

### Mettre a jour un match

```http
PATCH /matches/{id}
Content-Type: application/json

{
  "score_a": 3,
  "score_b": 1,
  "status": "completed",
  "team_sport_a_id": 1,
  "team_sport_b_id": 2
}
```

**Body** :
| Champ | Type | Description |
|-------|------|-------------|
| `score_a` | number | Score equipe A |
| `score_b` | number | Score equipe B |
| `status` | string | `upcoming`, `in_progress`, `completed` |
| `team_sport_a_id` | number | ID team-sport A (optionnel) |
| `team_sport_b_id` | number | ID team-sport B (optionnel) |

### Mettre a jour le statut

```http
PATCH /matches/{id}/status
Content-Type: application/json

{
  "status": "in_progress"
}
```

### Planning d'un match

```http
GET /matches/{id}/schedule
```

---

## Phases de Tournoi

### Details d'une phase

```http
GET /tournament-phases/{id}
```

**Response** :
```json
{
  "data": {
    "id": 1,
    "tournament_id": 1,
    "name": "Phase de Poules",
    "phase_type": "pool"
  }
}
```

---

## Classement Global

### Classement toutes competitions

```http
GET /final-ranking
```

**Response** :
```json
{
  "data": [
    {
      "position": 1,
      "team_id": 1,
      "team_name": "UCL Team A",
      "total_points": 150,
      "tournaments_participated": 5,
      "tournaments_won": 3,
      "tournaments_second": 1,
      "tournaments_third": 1,
      "matches_played": 25,
      "wins": 20,
      "draws": 3,
      "losses": 2,
      "goal_difference": 45
    }
  ]
}
```

---

## Plannings des Terrains

### Liste des plannings

```http
GET /match-schedules?skip=0&limit=200
```

**Response** :
```json
{
  "data": {
    "items": [
      {
        "id": 1,
        "court_id": 1,
        "match_id": 1,
        "start_time": "2026-03-15T14:00:00",
        "end_time": "2026-03-15T15:30:00"
      }
    ]
  }
}
```

**Utilisation** : Permet de verifier la disponibilite des terrains lors de la planification des matchs.

---

## Codes de Statut HTTP

| Code | Description |
|------|-------------|
| `200` | Succes |
| `201` | Cree avec succes |
| `400` | Requete invalide |
| `401` | Non authentifie |
| `403` | Non autorise |
| `404` | Ressource non trouvee |
| `500` | Erreur serveur |

---

## Format des Reponses

Toutes les reponses suivent ce format :

```json
{
  "data": { ... },
  "message": "Success",
  "status": 200
}
```

Pour les listes paginables :

```json
{
  "data": {
    "items": [...],
    "total": 100,
    "skip": 0,
    "limit": 10
  }
}
```

---

## Mapping des Statuts

### Frontend → Backend

| Frontend | Backend |
|----------|---------|
| `planifie` | `upcoming` |
| `en-cours` | `in_progress` |
| `termine` | `completed` |
| `annule` | `cancelled` |

### Backend → Frontend

| Backend | Frontend |
|---------|----------|
| `upcoming` | `planifie` |
| `in_progress` | `en-cours` |
| `completed` | `termine` |
| `cancelled` | `annule` |

---

## Mapping des Types de Bracket

### Frontend → Backend

| Frontend | Backend |
|----------|---------|
| `quarts` | `quarterfinal` |
| `demi` | `semifinal` |
| `finale` | `final` |
| `petite-finale` | `third_place` |

### Loser Bracket

| Frontend | Backend |
|----------|---------|
| `loser-round-1` | `loser_round_1` |
| `loser-round-2` | `loser_round_2` |
| `loser-petite-finale` | `loser_third_place` |
| `loser-finale` | `loser_final` |

---

## Mapping des Types de Score

| Frontend (FR) | Backend |
|---------------|---------|
| `Points` | `points` |
| `Buts` | `goals` |
| `Sets` | `sets` |

---

## Exemples d'Utilisation

### Charger un tournoi complet

```typescript
// 1. Recuperer la structure
const structureRes = await fetch(`${API_URL}/tournaments/${id}/structure`);
const structure = await structureRes.json();

// 2. Mapper les donnees
const matches = structure.data.qualification_matches.map(m => ({
  id: m.id.toString(),
  teamA: m.team_a_source,
  teamB: m.team_b_source,
  status: mapStatus(m.status),
  // ...
}));
```

### Terminer un match avec propagation

```typescript
// 1. Mettre a jour le match
await fetch(`${API_URL}/matches/${matchId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    score_a: 3,
    score_b: 1,
    status: 'completed'
  })
});

// 2. Declencher la propagation
await fetch(`${API_URL}/tournaments/${tournamentId}/propagate-results`, {
  method: 'POST'
});
```

### Verifier la disponibilite d'un terrain

```typescript
// 1. Recuperer les plannings
const res = await fetch(`${API_URL}/match-schedules?skip=0&limit=200`);
const schedules = await res.json();

// 2. Filtrer par terrain et horaire
const isOccupied = schedules.data.items.some(s =>
  s.court_id === courtId &&
  isOverlapping(s.start_time, s.end_time, desiredTime)
);
```

---

## Gestion des Erreurs

```typescript
try {
  const response = await fetch(`${API_URL}/endpoint`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  // Gerer l'erreur
}
```

---

## Notes Importantes

1. **Pagination** : Utiliser `skip` et `limit` pour les grandes listes
2. **IDs** : Les IDs retournes par l'API sont des `number`, les convertir en `string` si necessaire
3. **Dates** : Format ISO 8601 (`2026-03-15T14:00:00`)
4. **CORS** : Le backend doit autoriser les requetes du frontend
5. **Propagation** : Toujours appeler `/propagate-results` apres avoir termine un match
