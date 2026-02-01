# Migration du système de gestion des tournois

## ✅ Changements effectués

### 1. Structure de la base de données

#### Table `Match` - Nouveaux champs
- `pool_id` : Association à une poule (nullable)
- `match_type` : Type de match (`qualification`, `pool`, `bracket`, `loser_bracket`)
- `bracket_type` : Sous-type pour les brackets (`quarterfinal`, `semifinal`, `final`, `third_place`, `loser_round_1`, etc.)
- `team_sport_a_id` : Maintenant **nullable** (permet matchs en attente de qualification)
- `team_sport_b_id` : Maintenant **nullable**
- `team_a_source` : Code source de l'équipe A (ex: "WQ1" = Winner Qualification 1)
- `team_b_source` : Code source de l'équipe B
- `winner_destination_match_id` : Match de destination du vainqueur
- `loser_destination_match_id` : Match de destination du perdant
- `label` : Label d'affichage du match
- `match_order` : Ordre d'affichage

#### Table `Pool` - Nouveaux champs
- `qualified_to_finals` : Nombre d'équipes qualifiées pour les finales (défaut: 2)
- `qualified_to_loser_bracket` : Nombre d'équipes pour le loser bracket (défaut: 0)

### 2. Nouveaux endpoints API

#### POST `/tournaments/{tournament_id}/structure`
Crée ou remplace la structure complète d'un tournoi.

**Body JSON :**
```json
{
  "tournament_id": 1,
  "qualification_matches": [
    {
      "match_type": "qualification",
      "team_sport_a_id": 1,
      "team_sport_b_id": 2,
      "label": "Qualification 1",
      "match_order": 1,
      "status": "upcoming"
    }
  ],
  "pools": [
    {
      "name": "Poule A",
      "display_order": 1,
      "qualified_to_finals": 2,
      "qualified_to_loser_bracket": 0,
      "teams": [1, 2, 3, 4],
      "matches": [
        {
          "match_type": "pool",
          "team_sport_a_id": 1,
          "team_sport_b_id": 2,
          "label": "Poule A - Match 1",
          "status": "upcoming"
        }
      ]
    }
  ],
  "brackets": [
    {
      "name": "Phase Finale",
      "enabled_rounds": ["quarterfinal", "semifinal", "final"],
      "teams": [],
      "matches": [
        {
          "match_type": "bracket",
          "bracket_type": "quarterfinal",
          "team_a_source": "P1-1",
          "team_b_source": "P2-2",
          "label": "Quart de finale 1",
          "status": "upcoming"
        }
      ]
    }
  ],
  "loser_brackets": [
    {
      "name": "Loser Bracket",
      "enabled_rounds": ["loser_round_1", "loser_round_2"],
      "teams": [],
      "matches": []
    }
  ]
}
```

#### GET `/tournaments/{tournament_id}/structure`
Récupère la structure complète d'un tournoi.

**Réponse :**
```json
{
  "success": true,
  "data": {
    "tournament_id": 1,
    "qualification_matches": [...],
    "pools": [...],
    "bracket_matches": [...],
    "loser_bracket_matches": [...]
  }
}
```

#### DELETE `/tournaments/{tournament_id}/structure`
Supprime toute la structure d'un tournoi (matchs, poules, etc.).

### 3. Schémas Pydantic mis à jour

Les schémas `MatchBase`, `MatchCreate`, `MatchUpdate`, `MatchResponse` ont été étendus pour supporter tous les nouveaux champs.

## 🚀 Prochaines étapes

### 1. Modifier la page de configuration (`configuration-coupe/tournaments/[id]/page.tsx`)
Au lieu de sauvegarder dans localStorage, appeler l'API :

```typescript
const handleSaveLayout = async () => {
  const structure = {
    tournament_id: parseInt(params.id),
    qualification_matches: matches.map(m => ({
      match_type: m.type === 'qualifications' ? 'qualification' : m.type,
      bracket_type: m.bracketMatchType,
      team_sport_a_id: m.teamA ? getTeamSportId(m.teamA) : null,
      team_sport_b_id: m.teamB ? getTeamSportId(m.teamB) : null,
      team_a_source: m.teamA,
      team_b_source: m.teamB,
      label: m.winnerCode || m.label,
      match_order: m.position?.x || 0,
      status: m.status === 'planifié' ? 'upcoming' : m.status
    })),
    pools: pools.map((pool, idx) => ({
      name: pool.name,
      display_order: idx + 1,
      qualified_to_finals: pool.qualifiedToFinals || 2,
      qualified_to_loser_bracket: pool.qualifiedToLoserBracket || 0,
      teams: pool.teams.map(getTeamSportId),
      matches: pool.matches.map(m => ({
        match_type: 'pool',
        team_sport_a_id: getTeamSportId(m.teamA),
        team_sport_b_id: getTeamSportId(m.teamB),
        label: m.label,
        status: m.status === 'planifié' ? 'upcoming' : m.status
      }))
    })),
    brackets: brackets.map(bracket => ({
      name: bracket.name,
      enabled_rounds: bracket.enabledRounds,
      teams: [],
      matches: bracket.matches.map(m => ({
        match_type: 'bracket',
        bracket_type: m.bracketMatchType,
        team_a_source: m.teamA,
        team_b_source: m.teamB,
        label: m.label,
        status: m.status === 'planifié' ? 'upcoming' : m.status
      }))
    })),
    loser_brackets: loserBrackets.map(lb => ({
      name: lb.name,
      enabled_rounds: lb.enabledRounds,
      teams: [],
      matches: lb.matches.map(m => ({
        match_type: 'loser_bracket',
        bracket_type: m.loserBracketMatchType,
        team_a_source: m.teamA,
        team_b_source: m.teamB,
        label: m.label,
        status: m.status === 'planifié' ? 'upcoming' : m.status
      }))
    }))
  };

  const response = await fetch(`http://localhost:8000/tournaments/${params.id}/structure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(structure)
  });

  if (response.ok) {
    alert('Tournoi sauvegardé avec succès !');
  }
};
```

### 2. Modifier la page de visualisation (`tournaments/[id]/page.tsx`)
Charger depuis l'API au lieu de localStorage :

```typescript
useEffect(() => {
  const fetchTournamentStructure = async () => {
    const response = await fetch(`http://localhost:8000/tournaments/${params.id}/structure`);
    const data = await response.json();
    
    if (data.success) {
      // Convertir les données API en format local
      setMatches(convertApiMatchesToLocal(data.data));
      setPools(convertApiPoolsToLocal(data.data.pools));
      // etc.
    }
  };

  fetchTournamentStructure();
}, [params.id]);
```

### 3. Modifier la page table-marquage
Au lieu d'utiliser des IDs générés (timestamps), utiliser les vrais IDs de la BDD :

```typescript
const matchId = searchParams.get("matchId");

// Charger depuis l'API
const response = await fetch(`http://localhost:8000/matches/${matchId}`);
const data = await response.json();
setMatch(data.data);
```

## 📋 Schéma de migration complet

Le fichier de migration `migrations/add_tournament_structure_fields.py` a été créé et exécuté avec succès.

Pour rollback : `python migrations/add_tournament_structure_fields.py downgrade`

## 🔗 URLs modifiées

Avant : `http://localhost:3000/choix-sport/tournaments/table-marquage/1?matchId=1767638126682-QF1`

Après : `http://localhost:3000/choix-sport/tournaments/table-marquage/1?matchId=42`

Les IDs sont maintenant de vrais IDs numériques de la BDD, pas des timestamps.
