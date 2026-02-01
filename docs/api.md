# Documentation API - Coupe de l'Université

## Endpoints de Tournois

### Tournois (Tournaments)

#### GET /tournaments
Liste tous les tournois avec filtres optionnels
- **Paramètres de query** :
  - `sport_id` (optional) : Filtrer par sport
  - `status` (optional) : Filtrer par statut
  - `skip` : Pagination (défaut: 0)
  - `limit` : Limite de résultats (défaut: 100)
- **Réponse** : Liste paginée de tournois

#### GET /tournaments/{tournament_id}
Récupère un tournoi par son ID
- **Paramètre** : `tournament_id`
- **Réponse** : Détails du tournoi

#### POST /tournaments
Crée un nouveau tournoi
- **Body** : TournamentCreate
  - `name` : Nom du tournoi (requis)
  - `sport_id` : ID du sport (requis)
  - `tournament_type` : Type ("pools", "final", "mixed", "qualifications")
  - `status` : Statut ("scheduled", "in_progress", "completed", "cancelled")
  - `start_date`, `end_date` : Dates
  - `description`, `rules`, `image_url` : Optionnels
  - `created_by_user_id` : ID créateur (requis)
- **Réponse** : Tournoi créé (201)

#### PATCH /tournaments/{tournament_id}
Met à jour un tournoi
- **Body** : TournamentUpdate (tous les champs optionnels)
- **Réponse** : Tournoi mis à jour

#### DELETE /tournaments/{tournament_id}
Supprime un tournoi
- **Réponse** : Confirmation de suppression

#### GET /tournaments/{tournament_id}/phases
Liste les phases d'un tournoi
- **Réponse** : Liste des phases du tournoi

#### GET /tournaments/{tournament_id}/ranking
Classement final du tournoi
- **Réponse** : Classement ordonné par rang

#### GET /tournaments/{tournament_id}/configuration
Configuration du tournoi
- **Réponse** : Configuration associée

---

### Phases de Tournoi (TournamentPhases)

#### GET /tournament-phases/{phase_id}
Récupère une phase de tournoi
- **Réponse** : Détails de la phase

#### POST /tournament-phases
Crée une nouvelle phase de tournoi
- **Body** : TournamentPhaseCreate
  - `tournament_id` : ID du tournoi (requis)
  - `phase_type` : Type ("pools", "elimination", "final", "qualifications")
  - `phase_order` : Ordre d'exécution (requis, > 0)
- **Réponse** : Phase créée (201)

#### PATCH /tournament-phases/{phase_id}
Met à jour une phase de tournoi
- **Body** : TournamentPhaseUpdate
- **Réponse** : Phase mise à jour

#### DELETE /tournament-phases/{phase_id}
Supprime une phase de tournoi
- **Réponse** : Confirmation de suppression

#### GET /tournament-phases/{phase_id}/matches
Liste les matchs d'une phase
- **Réponse** : Liste des matchs de la phase

---

### Poules (Pools)

#### GET /pools/{pool_id}
Récupère une poule
- **Réponse** : Détails de la poule

#### POST /pools
Crée une nouvelle poule
- **Body** : PoolCreate
  - `phase_id` : ID de la phase (requis)
  - `name` : Nom de la poule (requis, ex: "Poule A")
  - `display_order` : Ordre d'affichage (requis)
- **Réponse** : Poule créée (201)

#### PATCH /pools/{pool_id}
Met à jour une poule
- **Body** : PoolUpdate
- **Réponse** : Poule mise à jour

#### DELETE /pools/{pool_id}
Supprime une poule
- **Réponse** : Confirmation de suppression

#### GET /pools/{pool_id}/teams
Liste les équipes d'une poule
- **Réponse** : Liste des équipes

#### GET /pools/{pool_id}/matches
Liste les matchs d'une poule
- **Réponse** : Liste des matchs

#### GET /pools/{pool_id}/standings
Classement d'une poule (calcul automatique)
- **Réponse** : Classement calculé

---

### Matchs (Matches)

#### GET /matches
Liste tous les matchs avec filtres
- **Paramètres de query** :
  - `sport_id`, `phase_id`, `status`, `date` : Filtres optionnels
  - `skip`, `limit` : Pagination
- **Réponse** : Liste de matchs

#### GET /matches/{match_id}
Récupère un match
- **Réponse** : Détails du match

#### POST /matches
Crée un nouveau match
- **Body** : MatchCreate
  - `phase_id` : ID de la phase (requis)
  - `team_sport_a_id`, `team_sport_b_id` : IDs des équipes (requis)
  - `score_a`, `score_b` : Scores (optionnels)
  - `status` : "upcoming", "in_progress", "completed", "cancelled"
  - `referee_user_id`, `comment` : Optionnels
  - `created_by_user_id` : ID créateur (requis)
- **Réponse** : Match créé (201)

#### PATCH /matches/{match_id}
Met à jour un match (statut, scores, etc.)
- **Body** : MatchUpdate
  - Tous les champs optionnels
  - `status` : Pour changer l'état du match
  - `score_a`, `score_b` : Pour mettre à jour les scores
- **Réponse** : Match mis à jour

#### DELETE /matches/{match_id}
Supprime un match
- **Réponse** : Confirmation de suppression

#### GET /matches/{match_id}/sets
Liste les sets d'un match
- **Réponse** : Liste des sets

---

## Notes importantes

### Statuts des matchs
- `upcoming` : À venir / Planifié
- `in_progress` : En cours
- `completed` : Terminé
- `cancelled` : Annulé

### Types de tournois
- `pools` : Tournoi par poules
- `final` : Phase finale uniquement
- `mixed` : Mixte (poules + finale)
- `qualifications` : Qualifications

### Types de phases
- `pools` : Phase de poules
- `elimination` : Phase à élimination directe
- `final` : Phase finale
- `qualifications` : Phase de qualifications
