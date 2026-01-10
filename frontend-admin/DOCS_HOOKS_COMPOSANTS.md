# Documentation des hooks et composants du tournoi

## Hooks

### useSport
- **Description** : Récupère les informations d’un sport à partir de son ID.
- **Entrée** :
  - `sportId?: string` — ID du sport
- **Sortie** :
  - `sport` : objet contenant les infos du sport (`id`, `name`, `score_type`, etc.)
  - `sportCode` : code normalisé du sport (ex : "football", "basketball")
  - `loading` : booléen, indique si la requête est en cours
  - `error` : message d’erreur éventuel

---

### useTeamSportIdToName
- **Description** : Charge le mapping entre les identifiants d’équipe-sport (`team_sport_id`) et les noms d’équipe.
- **Entrée** : aucune
- **Sortie** :
  - `Record<number, string>` — Objet où chaque clé est un `team_sport_id` et chaque valeur est le nom de l’équipe correspondante

---

### useTournamentMatches
- **Description** : Récupère la liste des matchs d’un tournoi pour un sport donné.
- **Entrées** :
  - `sportId?: string` — ID du sport
  - `teamSportIdToName?: Record<number, string>` — mapping des équipes
- **Sortie** :
  - `matches` : tableau d’objets match (id, label, équipes, type, statut, score, etc.)

---

## Composants

### MatchCard
- **Description** : Affiche une carte visuelle pour un match.
- **Props** :
  - `match` : objet match à afficher
  - `sportCode` : code du sport (pour navigation)
  - `onClick` : fonction appelée au clic sur la carte
  - `formatTeamName` : fonction pour afficher le nom d’équipe
  - `getMatchTypeBadge` : fonction pour afficher le badge du type de match
  - `getMatchStatusBadge` : fonction pour afficher le badge du statut du match
- **Sortie** : Élément JSX représentant la carte du match

---

### PoolRankingTable
- **Description** : Affiche le classement d’une poule sous forme de tableau.
- **Props** :
  - `ranking` : tableau d’entrées de classement (position, équipe, points, etc.)
  - `poolName` : nom de la poule
  - `qualifiedToFinals` : nombre d’équipes qualifiées en phase finale
  - `qualifiedToLoserBracket` : nombre d’équipes qualifiées en loser bracket
- **Sortie** : Tableau JSX du classement de la poule

---

### FinalRankingTable
- **Description** : Affiche le classement final du tournoi.
- **Props** :
  - `finalRanking` : tableau d’entrées de classement final (position, équipe, points)
- **Sortie** : Tableau JSX du classement final

---

Chaque hook gère la récupération ou le mapping de données côté client, chaque composant gère l’affichage d’une partie de l’interface. Les entrées/sorties sont typées pour garantir la cohérence des données.
