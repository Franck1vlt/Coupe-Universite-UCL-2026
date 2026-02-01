# Coupe Universitaire UCL 2026

## Application de gestion sportive – Architecture & Guide technique

---

## 1. Présentation du projet

Ce dépôt contient l’application web de gestion de la **Coupe de l'Université UCL 2026**, un événement sportif multi‑disciplines regroupant plusieurs établissements.

L’objectif est de fournir un **outil centralisé, fiable et simple d’utilisation** permettant :

* la gestion des tournois et des matchs,
* la saisie des scores par le staff et les arbitres,
* l’affichage en temps réel des résultats pour le public,
* le calcul automatique des classements par sport et du classement général.

L’application est conçue pour un **événement ponctuel**, avec une architecture volontairement simple mais conforme aux **bonnes pratiques professionnelles** (séparation des responsabilités, conteneurisation, documentation).

---

## 2. Architecture générale

L’application repose sur une architecture **client–serveur** classique.

```
Frontend Public (Web)
        |
Frontend Admin / Staff (Web)
        |
        v
API Backend (FastAPI – REST)
        |
        v
Base de données (SQLite)
```


### Principes clés

* Séparation claire entre **backend**, **frontend staff** et **frontend public**
* API unique exposant la logique métier
* Accès centralisé via un **reverse proxy Nginx**
* Déploiement sur une **machine virtuelle unique** via Docker

---

## 3. Stack technique

### 3.1 Backend

* **Langage** : Python
* **Framework** : FastAPI
* **ORM** : SQLAlchemy
* **Validation** : Pydantic
* **Authentification** : OAuth / JWT avec gestion des rôles via Google OAuth (attention il ne faut pas que tout le monde puisse accéder au site web STAFF)

**Pourquoi FastAPI ?**

* Rapidité de développement
* Performances élevées
* Documentation automatique (Swagger / OpenAPI)
* Code clair et maintenable

---

### 3.2 Frontend

Deux interfaces web distinctes sont prévues.

#### Frontend Admin / Staff

* Saisie des scores
* Gestion des matchs
* Accès protégé (authentification requise)

#### Frontend Public

* Affichage des scores en direct
* Consultation des classements
* Lecture seule

**Technologies** :

* React.js
* TypeScript
* Tailwind CSS
* HTML / CSS
* UI simple et lisible (usage terrain)

---

### 3.3 Base de données

* **SQLite**

  * Suffisant pour un événement ponctuel
  * Faible charge concurrente
  * Simplicité de déploiement

Une migration vers **PostgreSQL** est envisagée pour une évolution future.

---

## 4. Modèle de données (vue simplifiée)

### Entités principales

#### Sport
- `id` : **int** (Primary Key)
- `name` : **str** (nom du sport)
- `score_type` : **str/enum** (type de score : points, goals/buts, sets)

#### Team (Équipe)
- `id` : **int** (Primary Key)
- `name` : **str** (nom de l'équipe/organisation : "Fac de Droit", "Fac d'Économie", etc.)
- `logo_url` : **str** (nullable - URL du logo)
- `primary_color` : **str** (nullable - couleur principale en hex)
- `created_at` : **datetime** (date de création)

#### TeamSport (Équipe inscrite dans un sport)
- `id` : **int** (Primary Key)
- `team_id` : **int** (Foreign Key → Team.id)
- `sport_id` : **int** (Foreign Key → Sport.id)
- `team_sport_name` : **str** (nullable - nom optionnel spécifique : "Droit Basket", "Éco Handball")
- `is_active` : **bool** (équipe active dans ce sport)

#### Player (Joueur)
- `id` : **int** (Primary Key)
- `team_sport_id` : **int** (Foreign Key → TeamSport.id - un joueur est lié à une équipe ET un sport)
- `first_name` : **str** (prénom)
- `last_name` : **str** (nom)
- `jersey_number` : **int** (nullable - numéro de maillot habituel pour ce sport)
- `position` : **str** (nullable - poste)
- `is_captain` : **bool** (est capitaine de l'équipe dans ce sport)
- `is_active` : **bool** (joueur actif ou non)

#### Tournament (Tournoi)
- `id` : **int** (Primary Key)
- `name` : **str** (nom du tournoi)
- `sport_id` : **int** (Foreign Key → Sport.id)
- `tournament_type` : **str/enum** (type : pools/poules, elimination/élimination, mixed/mixte)
- `status` : **str/enum** (statut : scheduled/prévu, in_progress/en cours, completed/terminé)
- `created_by_user_id` : **int** (Foreign Key → User.id - créé par quel utilisateur)
- `start_date` : **date** (nullable - date de début)
- `end_date` : **date** (nullable - date de fin)
- `description` : **text** (nullable - description)
- `rules` : **text** (nullable - règles)
- `image_url` : **str** (nullable - URL de l'image du tournoi)

#### TournamentPhase (Phase de tournoi)
- `id` : **int** (Primary Key)
- `tournament_id` : **int** (Foreign Key → Tournament.id)
- `phase_type` : **str/enum** (type de phase : pools/poules, elimination/élimination, final/finale)
- `order` : **int** (ordre d'exécution)

#### Pool (Poule)
- `id` : **int** (Primary Key)
- `phase_id` : **int** (Foreign Key → TournamentPhase.id)
- `name` : **str** (nom : Poule A, Poule B, etc.)
- `order` : **int** (ordre d'affichage)

#### TeamPool (Équipe dans une poule)
- `id` : **int** (Primary Key)
- `pool_id` : **int** (Foreign Key → Pool.id)
- `team_sport_id` : **int** (Foreign Key → TeamSport.id - l'équipe dans un sport spécifique)
- `position` : **int** (nullable - classement dans la poule)
- `points` : **int** (default 0 - points accumulés)
- `wins` : **int** (default 0 - victoires)
- `losses` : **int** (default 0 - défaites)
- `draws` : **int** (default 0 - matchs nuls)
- `goals_for` : **int** (default 0 - buts/points marqués)
- `goals_against` : **int** (default 0 - buts/points encaissés)
- `goal_difference` : **int** (default 0 - différence de buts/points)

#### Match (Match)
- `id` : **int** (Primary Key)
- `phase_id` : **int** (Foreign Key → TournamentPhase.id)
- `team_sport_a_id` : **int** (Foreign Key → TeamSport.id - équipe A dans ce sport spécifique)
- `team_sport_b_id` : **int** (Foreign Key → TeamSport.id - équipe B dans ce sport spécifique)
- `score_a` : **int** (nullable - score de l'équipe A)
- `score_b` : **int** (nullable - score de l'équipe B)
- `status` : **str/enum** (statut : upcoming/à venir, in_progress/en cours, completed/terminé)
- `referee_user_id` : **int** (nullable - Foreign Key → User.id - arbitre/utilisateur en charge)
- `created_by_user_id` : **int** (Foreign Key → User.id - créé par)
- `updated_by_user_id` : **int** (Foreign Key → User.id - dernière modification par)
- `created_at` : **datetime** (date de création)
- `updated_at` : **datetime** (dernière mise à jour)
- `comment` : **text** (nullable - commentaire)

#### MatchPool (Relation Match-Poule)
- `match_id` : **int** (Primary Key, Foreign Key → Match.id)
- `pool_id` : **int** (Foreign Key → Pool.id)

#### MatchSheet (Feuille de match - composition d'équipe)
- `id` : **int** (Primary Key)
- `match_id` : **int** (Foreign Key → Match.id)
- `team_sport_id` : **int** (Foreign Key → TeamSport.id)

#### PlayerMatchSheet (Joueur sur la feuille de match)
- `id` : **int** (Primary Key)
- `match_sheet_id` : **int** (Foreign Key → MatchSheet.id)
- `player_id` : **int** (Foreign Key → Player.id)
- `jersey_number_match` : **int** (nullable - numéro de maillot pour ce match spécifique)
- `is_starter` : **bool** (joueur titulaire ou remplaçant)
- `is_captain_match` : **bool** (capitaine pour ce match)
- `lineup_order` : **int** (ordre dans la composition pour l'affichage)

#### MatchEvent (Événement de match)
- `id` : **int** (Primary Key)
- `match_id` : **int** (Foreign Key → Match.id)
- `player_id` : **int** (nullable - Foreign Key → Player.id - joueur concerné)
- `event_type` : **str/enum** (type : goal/but, yellow_card/carton jaune, red_card/carton rouge, substitution_in/remplacement entrant, substitution_out/remplacement sortant, timeout, etc.)
- `minute` : **int** (nullable - minute de l'événement)
- `team_sport_id` : **int** (Foreign Key → TeamSport.id)
- `description` : **text** (nullable - description de l'événement)
- `created_at` : **datetime** (moment de l'enregistrement)
- `created_by_user_id` : **int** (Foreign Key → User.id - enregistré par quel utilisateur)

#### MatchSet (Set de match - pour sports en sets)
- `id` : **int** (Primary Key)
- `match_id` : **int** (Foreign Key → Match.id)
- `set_number` : **int** (numéro du set)
- `score_team_a` : **int** (nullable - score équipe A dans ce set)
- `score_team_b` : **int** (nullable - score équipe B dans ce set)
- `order` : **int** (ordre du set)

#### Court (Terrain)
- `id` : **int** (Primary Key)
- `name` : **str** (nom du terrain)
- `sport_id` : **int** (nullable - Foreign Key → Sport.id - Terrain dédié à un sport spécifique ou polyvalent si null)
- `is_active` : **bool** (terrain utilisable ou hors service)

#### MatchSchedule (Planification de match)
- `match_id` : **int** (Primary Key, Foreign Key → Match.id)
- `court_id` : **int** (nullable - Foreign Key → Court.id)
- `scheduled_datetime` : **datetime** (nullable - date et heure prévues)
- `actual_start_datetime` : **datetime** (nullable - heure de début réelle)
- `actual_end_datetime` : **datetime** (nullable - heure de fin réelle)
- `estimated_duration_minutes` : **int** (nullable - durée estimée en minutes)

#### TournamentRanking (Classement final du tournoi)
- `tournament_id` : **int** (Primary Key, Foreign Key → Tournament.id)
- `team_sport_id` : **int** (Primary Key, Foreign Key → TeamSport.id)
- `final_position` : **int** (position finale)
- `points_awarded` : **int** (nullable - points attribués)

#### TournamentConfiguration (Configuration du tournoi)
- `tournament_id` : **int** (Primary Key, Foreign Key → Tournament.id)
- `points_for_win` : **int** (default 3 - points pour une victoire)
- `points_for_draw` : **int** (default 1 - points pour un match nul)
- `points_for_loss` : **int** (default 0 - points pour une défaite)
- `qualified_teams_per_pool` : **int** (nullable - nombre d'équipes qualifiées par poule)
- `tiebreaker_rules` : **json** (nullable - règles de départage en JSON)

---

### Entités d'authentification et gestion

#### User (Utilisateur)
- `id` : **int** (Primary Key)
- `email` : **str** (unique, not null - email de l'utilisateur)
- `google_id` : **str** (unique, nullable - ID fourni par Google OAuth)
- `role` : **str/enum** (not null - rôle : admin, staff)
- `display_name` : **str** (nullable - nom d'affichage)
- `profile_picture_url` : **str** (nullable - URL de la photo de profil Google)
- `is_active` : **bool** (default true - compte actif ou désactivé)
- `created_at` : **datetime** (date de création du compte)
- `updated_at` : **datetime** (dernière mise à jour)
- `last_login_at` : **datetime** (nullable - dernière connexion)

#### RefreshToken (Token de rafraîchissement)
- `id` : **int** (Primary Key)
- `user_id` : **int** (Foreign Key → User.id)
- `token_hash` : **str** (unique, not null - hash du token pour sécurité)
- `expires_at` : **datetime** (date d'expiration)
- `is_revoked` : **bool** (default false - token révoqué ou non)
- `created_at` : **datetime** (date de création)
- `revoked_at` : **datetime** (nullable - date de révocation)

#### AuditLog (Journal d'audit - traçabilité)
- `id` : **int** (Primary Key)
- `user_id` : **int** (nullable - Foreign Key → User.id - utilisateur ayant effectué l'action)
- `action_type` : **str/enum** (not null - type d'action : create/création, update/modification, delete/suppression, login/connexion, logout/déconnexion)
- `entity_type` : **str** (not null - type d'entité modifiée : match, tournament, team, user, etc.)
- `entity_id` : **int** (nullable - ID de l'entité modifiée)
- `old_values` : **json** (nullable - anciennes valeurs en JSON)
- `new_values` : **json** (nullable - nouvelles valeurs en JSON)
- `ip_address` : **str** (nullable - adresse IP de l'utilisateur)
- `user_agent` : **str** (nullable - navigateur/agent utilisateur)
- `created_at` : **datetime** (date et heure de l'action)

---

### Gestion multi-sports des équipes

#### Exemple de structure :

**Team** (Équipes de base)
- ID: 1, Name: "Fac de Droit"
- ID: 2, Name: "Fac d'Économie"
- ID: 3, Name: "Fac de Sciences"

**Sport**
- ID: 1, Name: "Football"
- ID: 2, Name: "Basketball"
- ID: 3, Name: "Badminton"
- ID: 4, Name: "Handball"

**TeamSport** (Inscriptions des équipes par sport)
- ID: 1, team_id: 1, sport_id: 1, team_sport_name: null → "Fac de Droit" en Football
- ID: 2, team_id: 1, sport_id: 2, team_sport_name: null → "Fac de Droit" en Basketball
- ID: 3, team_id: 1, sport_id: 3, team_sport_name: null → "Fac de Droit" en Badminton
- ID: 4, team_id: 2, sport_id: 1, team_sport_name: null → "Fac d'Économie" en Football
- ID: 5, team_id: 2, sport_id: 4, team_sport_name: null → "Fac d'Économie" en Handball
- ID: 6, team_id: 2, sport_id: 2, team_sport_name: null → "Fac d'Économie" en Basketball

**Player** (Joueurs par équipe-sport)
- ID: 1, team_sport_id: 1, first_name: "Jean", last_name: "Dupont" → Joueur de l'équipe de Droit en Football
- ID: 2, team_sport_id: 2, first_name: "Marie", last_name: "Martin" → Joueuse de l'équipe de Droit en Basketball
- ID: 3, team_sport_id: 4, first_name: "Pierre", last_name: "Durand" → Joueur de l'équipe d'Éco en Football

#### Avantages de cette structure :

1. **Une équipe peut participer à plusieurs sports** : La Fac de Droit peut avoir des équipes en Football, Basketball et Badminton avec des joueurs différents pour chaque sport.

2. **Gestion indépendante des compositions** : Les joueurs de Football de la Fac de Droit sont complètement distincts des joueurs de Basketball de la même fac.

3. **Flexibilité des noms** : Le champ `team_sport_name` permet de personnaliser le nom affiché (ex: "Droit Warriors" pour le basket, "Droit FC" pour le foot) ou de laisser null pour utiliser automatiquement le nom de base de l'équipe.

4. **Statistiques par sport** : Chaque TeamSport a ses propres statistiques, classements et historiques indépendants.

5. **Réutilisation du logo et des couleurs** : L'équipe de base (Team) conserve son identité visuelle (logo, couleurs) qui peut être utilisée pour tous ses sports.

---

### Note sur la feuille de match (MatchSheet)

Le système permet de gérer une composition d'équipe complète pour chaque match :

- **MatchSheet** : Une feuille par équipe-sport et par match (contient la composition officielle)
- **PlayerMatchSheet** : Liste des joueurs convoqués avec :
  - Leur statut (starter/titulaire ou substitute/remplaçant)
  - Leur numéro de maillot spécifique pour ce match
  - Leur rôle (captain/capitaine ou non)
  - L'ordre d'affichage dans la composition
- **MatchEvent** : Tous les événements liés aux joueurs pendant le match (buts, cartons, remplacements, etc.)

#### Workflow pour le staff :
1. Sélectionner les joueurs présents pour le match (issus du bon TeamSport)
2. Définir qui est titulaire (starter) et qui est sur le banc (substitute)
3. Attribuer les numéros de maillot (peuvent différer du numéro habituel)
4. Désigner le capitaine pour ce match
5. Enregistrer tous les événements du match en temps réel

---

### Conventions de types :

- **int** : Nombre entier
- **str** : Chaîne de caractères (varchar)
- **text** : Texte long
- **bool** : Booléen (true/false)
- **datetime** : Date et heure
- **date** : Date uniquement
- **json** : Données JSON
- **enum** : Énumération (valeurs prédéfinies)
- **nullable** : Peut être null/vide
- **default X** : Valeur par défaut
- **unique** : Valeur unique dans la table
- **not null** : Ne peut pas être null

---

## 5. API REST – Documentation complète

L'API est **RESTful**, documentée automatiquement par FastAPI. L'API est accessible via le préfixe `/api/v1` (optionnel selon configuration).

**Base URL** : `http://localhost:8000` (développement) ou selon configuration de production

**Documentation interactive** :
* Swagger UI : `/docs`
* ReDoc : `/redoc`

### Légende des permissions

| Symbole | Signification           |
|---------|-------------------------|
| 🌐      | Public (aucune auth)    |
| 👤      | Authentifié (staff+)    |
| 👨‍💼     | Staff uniquement         |
| 🔐      | Admin uniquement        |

---

### 5.1 Endpoints généraux

#### Health & Info

| Méthode | Endpoint | Permission | Description                           |
|---------|----------|------------|---------------------------------------|
| `GET`   | `/`      | 🌐         | Informations de base sur l'API        |
| `GET`   | `/health`| 🌐         | Vérification de l'état de l'API       |

---

### 5.2 Authentification

#### OAuth Google

| Méthode | Endpoint           | Permission | Description                                      |
|---------|-------------------|------------|--------------------------------------------------|
| `GET`   | `/auth/login`     | 🌐         | Redirige vers la page de connexion Google        |
| `GET`   | `/auth/callback`  | 🌐         | Callback après authentification Google           |
| `POST`  | `/auth/refresh`   | 👤         | Rafraîchit l'access token avec le refresh token  |
| `POST`  | `/auth/logout`    | 👤         | Déconnexion (révoque le refresh token)           |
| `GET`   | `/auth/me`        | 👤         | Récupère les informations de l'utilisateur actuel|

---

### 5.3 Gestion des utilisateurs

| Méthode  | Endpoint                    | Permission | Description                                |
|----------|-----------------------------|------------|--------------------------------------------|
| `GET`    | `/users`                    | 🔐         | Liste tous les utilisateurs autorisés      |
| `GET`    | `/users/{user_id}`          | 🔐         | Récupère un utilisateur par ID             |
| `POST`   | `/users`                    | 🔐         | Ajoute un utilisateur à la whitelist       |
| `PUT`    | `/users/{user_id}`          | 🔐         | Modifie un utilisateur (rôle, statut)      |
| `DELETE` | `/users/{user_id}`          | 🔐         | Supprime un utilisateur de la whitelist    |
| `PATCH`  | `/users/{user_id}/activate` | 🔐         | Active un utilisateur                      |
| `PATCH`  | `/users/{user_id}/deactivate`| 🔐        | Désactive un utilisateur                   |

---

### 5.4 Sports

| Méthode  | Endpoint            | Permission | Description                     |
|----------|---------------------|------------|---------------------------------|
| `GET`    | `/sports`           | 🌐         | Liste tous les sports           |
| `GET`    | `/sports/{sport_id}`| 🌐         | Récupère un sport par ID        |
| `POST`   | `/sports`           | 🔐         | Crée un nouveau sport           |
| `PUT`    | `/sports/{sport_id}`| 🔐         | Modifie un sport                |
| `DELETE` | `/sports/{sport_id}`| 🔐         | Supprime un sport               |

---

### 5.5 Équipes (Teams)

| Méthode  | Endpoint            | Permission | Description                     |
|----------|---------------------|------------|---------------------------------|
| `GET`    | `/teams`            | 🌐         | Liste toutes les équipes        |
| `GET`    | `/teams/{team_id}`  | 🌐         | Récupère une équipe par ID      |
| `POST`   | `/teams`            | 🔐         | Crée une nouvelle équipe        |
| `PUT`    | `/teams/{team_id}`  | 🔐         | Modifie une équipe              |
| `DELETE` | `/teams/{team_id}`  | 🔐         | Supprime une équipe             |

---

### 5.6 TeamSport (Inscriptions équipe-sport)

| Méthode  | Endpoint                              | Permission | Description                                    |
|----------|---------------------------------------|------------|------------------------------------------------|
| `GET`  | `/teams/{team_id}/sports`| 🌐      | Liste les sports d'une équipe (avec statut actif/inactif)             |
| `POST`  | `/teams/{team_id}/sports`| 🔐      | Inscrit une équipe à un ou plusieurs sports             |
| `DELETE`  | `/teams/{team_id}/sports/{sport_id}`| 🔐      | Supprime l'inscription d'une équipe à un sport             |
| `PATCH`  | `/teams/{team_id}/sports/{sport_id}`| 🔐      | Modifie le statut ou le nom spécifique             |
---

### 5.7 Joueurs (Players)

| Méthode  | Endpoint                              | Permission | Description                                    |
|----------|---------------------------------------|------------|------------------------------------------------|
| `GET`    | `/players`                            | 🌐         | Liste tous les joueurs                         |
| `GET`    | `/players/{player_id}`                | 🌐         | Récupère un joueur par ID                      |
| `GET`    | `/team-sports/{team_sport_id}/players`| 🌐         | Liste les joueurs d'une équipe-sport           |
| `POST`   | `/players`                            | 👨‍💼         | Crée un nouveau joueur                         |
| `PUT`    | `/players/{player_id}`                | 👨‍💼         | Modifie un joueur                              |
| `DELETE` | `/players/{player_id}`                | 👨‍💼         | Supprime un joueur                             |
| `PATCH`  | `/players/{player_id}/activate`       | 👨‍💼         | Active un joueur                               |
| `PATCH`  | `/players/{player_id}/deactivate`     | 👨‍💼         | Désactive un joueur                            |

---

### 5.8 Terrains (Courts)

| Méthode  | Endpoint             | Permission | Description                                   |
| -------- | -------------------- | ---------- | --------------------------------------------- |
| `GET`    | `/courts`            | 🌐         | Liste tous les terrains                       |
| `GET`    | `/courts/{court_id}` | 🌐         | Récupère un terrain par ID                    |
| `POST`   | `/courts`            | 🔐         | Crée un nouveau terrain                       |
| `PUT`    | `/courts/{court_id}` | 🔐         | Modifie entièrement un terrain                |
| `PATCH`  | `/courts/{court_id}` | 🔐         | Modifie partiellement un terrain (ex : actif) |
| `DELETE` | `/courts/{court_id}` | 🔐         | Supprime un terrain                           |


---

### 5.9 Tournois (Tournaments)

| Méthode  | Endpoint                              | Permission | Description                                    |
|----------|---------------------------------------|------------|------------------------------------------------|
| `GET`    | `/tournaments`                        | 🌐         | Liste tous les tournois                        |
| `GET`    | `/tournaments/{tournament_id}`        | 🌐         | Récupère un tournoi par ID                     |
| `POST`   | `/tournaments`                        | 🔐         | Crée un nouveau tournoi                        |
| `PUT`    | `/tournaments/{tournament_id}`        | 🔐         | Modifie un tournoi                             |
| `DELETE` | `/tournaments/{tournament_id}`        | 🔐         | Supprime un tournoi                            |
| `PATCH`  | `/tournaments/{tournament_id}/status` | 👨‍💼         | Change le statut du tournoi                    |
| `GET`    | `/tournaments/{tournament_id}/phases` | 🌐         | Liste les phases d'un tournoi                  |
| `GET`    | `/tournaments/{tournament_id}/ranking`| 🌐         | Classement final du tournoi                    |

---

### 5.10 Configuration de tournoi

| Méthode  | Endpoint                                        | Permission | Description                            |
|----------|-------------------------------------------------|------------|----------------------------------------|
| `GET`    | `/tournaments/{tournament_id}/configuration`    | 🌐         | Récupère la configuration d'un tournoi |
| `POST`   | `/tournaments/{tournament_id}/configuration`    | 🔐         | Crée la configuration d'un tournoi     |
| `PUT`    | `/tournaments/{tournament_id}/configuration`    | 🔐         | Modifie la configuration               |

---

### 5.11 Phases de tournoi

| Méthode  | Endpoint                                   | Permission | Description                          |
|----------|--------------------------------------------|------------|--------------------------------------|
| `GET`    | `/tournament-phases/{phase_id}`            | 🌐         | Récupère une phase par ID            |
| `POST`   | `/tournaments/{tournament_id}/phases`      | 🔐         | Crée une nouvelle phase              |
| `PUT`    | `/tournament-phases/{phase_id}`            | 🔐         | Modifie une phase                    |
| `DELETE` | `/tournament-phases/{phase_id}`            | 🔐         | Supprime une phase                   |
| `GET`    | `/tournament-phases/{phase_id}/matches`    | 🌐         | Liste les matchs d'une phase         |

---

### 5.12 Poules (Pools)

| Méthode  | Endpoint                              | Permission | Description                          |
|----------|---------------------------------------|------------|--------------------------------------|
| `GET`    | `/pools/{pool_id}`                    | 🌐         | Récupère une poule par ID            |
| `GET`    | `/pools/{pool_id}/teams`              | 🌐         | Liste les équipes d'une poule        |
| `GET`    | `/pools/{pool_id}/matches`            | 🌐         | Liste les matchs d'une poule         |
| `GET`    | `/pools/{pool_id}/standings`          | 🌐         | Classement d'une poule               |
| `POST`   | `/tournament-phases/{phase_id}/pools` | 🔐         | Crée une nouvelle poule              |
| `PUT`    | `/pools/{pool_id}`                    | 🔐         | Modifie une poule                    |
| `DELETE` | `/pools/{pool_id}`                    | 🔐         | Supprime une poule                   |

---

### 5.13 TeamPool (Équipes dans les poules)

| Méthode  | Endpoint                              | Permission | Description                                |
|----------|---------------------------------------|------------|--------------------------------------------|
| `GET`    | `/team-pools/{team_pool_id}`          | 🌐         | Récupère une équipe-poule par ID           |
| `POST`   | `/pools/{pool_id}/teams`              | 🔐         | Ajoute une équipe à une poule              |
| `DELETE` | `/team-pools/{team_pool_id}`          | 🔐         | Retire une équipe d'une poule              |
| `PATCH`  | `/team-pools/{team_pool_id}/stats`    | 👨‍💼         | Met à jour les stats d'une équipe en poule |

---

### 5.14 Matchs (Matches)

| Méthode  | Endpoint                              | Permission | Description                                    |
|----------|---------------------------------------|------------|------------------------------------------------|
| `GET`    | `/matches`                            | 🌐         | Liste tous les matchs                          |
| `GET`    | `/matches/{match_id}`                 | 🌐         | Récupère un match par ID                       |
| `POST`   | `/matches`                            | 🔐         | Crée un nouveau match                          |
| `PUT`    | `/matches/{match_id}`                 | 👨‍💼         | Modifie un match                               |
| `DELETE` | `/matches/{match_id}`                 | 🔐         | Supprime un match                              |
| `PATCH`  | `/matches/{match_id}/status`          | 👨‍💼         | Change le statut du match                      |
| `PATCH`  | `/matches/{match_id}/score`           | 👨‍💼         | Met à jour le score du match                   |
| `GET`    | `/matches/{match_id}/sets`            | 🌐         | Liste les sets d'un match                      |

---

### 5.15 Planification de matchs

| Méthode  | Endpoint                                      | Permission | Description                                |
|----------|-----------------------------------------------|------------|--------------------------------------------|
| `GET`    | `/matches/{match_id}/schedule`                | 🌐         | Récupère la planification d'un match       |
| `POST`   | `/matches/{match_id}/schedule`                | 👨‍💼         | Planifie un match                          |
| `PUT`    | `/matches/{match_id}/schedule`                | 👨‍💼         | Modifie la planification                   |
| `DELETE` | `/matches/{match_id}/schedule`                | 👨‍💼         | Supprime la planification                  |
| `PATCH`  | `/matches/{match_id}/schedule/start`          | 👨‍💼         | Enregistre l'heure de début réelle         |
| `PATCH`  | `/matches/{match_id}/schedule/end`            | 👨‍💼         | Enregistre l'heure de fin réelle           |
| `GET`    | `/courts/{court_id}/schedule`                 | 🌐         | Planning d'un terrain                      |

---

### 5.16 Sets de match (Match Sets)

| Méthode  | Endpoint                              | Permission | Description                          |
|----------|---------------------------------------|------------|--------------------------------------|
| `GET`    | `/match-sets/{set_id}`                | 🌐         | Récupère un set par ID               |
| `POST`   | `/matches/{match_id}/sets`            | 👨‍💼         | Crée un nouveau set                  |
| `PUT`    | `/match-sets/{set_id}`                | 👨‍💼         | Met à jour le score d'un set         |
| `DELETE` | `/match-sets/{set_id}`                | 👨‍💼         | Supprime un set                      |

---

## Notes importantes sur les endpoints

### Filtres et pagination

La plupart des endpoints `GET` qui retournent des listes supportent :
- **Pagination** : `?page=1&limit=20`
- **Tri** : `?sort_by=name&order=asc`
- **Filtres de base** : `?status=in_progress`, `?sport_id=1`, `?date=2025-03-01`

### Format des réponses

**Succès (200/201)** :
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Liste paginée** :
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Erreur (4xx/5xx)** :
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {...}
  }
}
```

### Headers requis

**Authentification** :
```
Authorization: Bearer <jwt_token>
```

**Content-Type** :
```
Content-Type: application/json
```

### Codes de statut HTTP

- `200 OK` : Succès (GET, PUT, PATCH)
- `201 Created` : Ressource créée (POST)
- `204 No Content` : Succès sans contenu (DELETE)
- `400 Bad Request` : Données invalides
- `401 Unauthorized` : Non authentifié
- `403 Forbidden` : Accès refusé (mauvais rôle)
- `404 Not Found` : Ressource introuvable
- `409 Conflict` : Conflit (ex: doublon)
- `500 Internal Server Error` : Erreur serveur

### Exemples de requêtes

#### Créer un tournoi
```http
POST /tournaments
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "name": "Tournoi Inter-Facs 2025",
  "sport_id": 1,
  "tournament_type": "mixed",
  "start_date": "2025-03-01",
  "end_date": "2025-03-15",
  "description": "Tournoi annuel de football"
}
```

#### Mettre à jour un score
```http
PATCH /matches/42/score
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "score_a": 2,
  "score_b": 1
}
```

#### Ajouter une équipe à une poule
```http
POST /pools/5/teams
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "team_sport_id": 12
}
```

#### Planifier un match
```http
POST /matches/42/schedule
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "court_id": 3,
  "scheduled_datetime": "2025-03-05T14:30:00",
  "estimated_duration_minutes": 90
}
```

---

## 6. Gestion des rôles et permissions

| Rôle   | Droits                                                          |
| ------ | --------------------------------------------------------------- |
| **Public** | Lecture seule (endpoints `GET` uniquement)                    |
| **Staff**  | Lecture + saisie des scores, gestion des matchs et événements |
| **Admin**  | Tous les droits (gestion complète : sports, équipes, tournois, utilisateurs) |

**Règles fondamentales** :
* Seuls les **admins** peuvent créer, modifier ou supprimer un tournoi, un sport, une équipe
* Le **staff** peut mettre à jour les scores et gérer les matchs en cours
* Le **public** a un accès en lecture seule à toutes les données publiques
* L'authentification utilise **Google OAuth** avec restriction d'accès pour le staff (whitelist d'emails/domaines)

---

## 7. Temps réel (optionnel)

* WebSocket via FastAPI
* Mise à jour instantanée des scores côté public

Cette fonctionnalité est optionnelle mais recommandée pour améliorer l’expérience spectateur.

---

## 8. Organisation du projet

```
coupe_universitaire-ucl-2026/
│
├── Backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── README.md
│   └── app/
│       ├── __init__.py
│       ├── main.py              # Point d'entrée FastAPI
│       ├── config.py            # Configuration de l'application
│       ├── db.py                # Configuration SQLAlchemy
│       ├── models/              # Modèles SQLAlchemy (base de données)
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── sport.py
│       │   ├── team.py
│       │   └── ...
│       ├── schemas/             # Schémas Pydantic (validation)
│       │   ├── __init__.py
│       │   └── ...
│       ├── routers/             # Routes API
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   ├── tournaments.py
│       │   ├── matches.py
│       │   └── ...
│       └── services/            # Logique métier
│           ├── __init__.py
│           └── ...
│
├── frontend-public/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/
│
├── frontend-admin/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/
│
├── nginx/
│   ├── nginx.conf
│   └── certs/
│
├── data/
│   └── coupe_ucl_2026.db       # Base de données SQLite
│
├── docs/
│   ├── architecture.md
│   └── api.md
│
├── docker-compose.yml
└── README.md
```

---

## 9. Déploiement

Le projet est déployé sur une **machine virtuelle Linux unique**, via **Docker et Docker Compose**.

### Architecture de déploiement

* **Reverse proxy** : Nginx (exposition publique)
* **Backend** : FastAPI (exposé uniquement en interne via Docker network)
* **Frontends** : Servis en statique via Nginx
* **Base de données** : SQLite (volume Docker persistant)
* **HTTPS** : Certificats SSL (Let's Encrypt) gérés par Nginx

### Commandes de déploiement

**Lancement en développement** :
```bash
# Backend uniquement
cd Backend
uvicorn app.main:app --reload

# Frontend (depuis chaque dossier)
npm run dev
```

**Lancement en production** :
```bash
# Construction et démarrage de tous les services
docker compose up -d

# Voir les logs
docker compose logs -f

# Arrêter les services
docker compose down
```

### Variables d'environnement

Les variables d'environnement sont configurées via un fichier `.env` (non versionné) ou directement dans `docker-compose.yml` :

* `DATABASE_URL` : URL de connexion à la base de données
* `SECRET_KEY` : Clé secrète pour JWT
* `GOOGLE_CLIENT_ID` : ID client Google OAuth
* `GOOGLE_CLIENT_SECRET` : Secret client Google OAuth
* `CORS_ORIGINS` : Origines autorisées pour CORS

---

## 10. Règles métier clés

### Règles de tournoi

* Un tournoi possède un **type unique** (poules, élimination, mixte)
* Un tournoi est composé de **phases ordonnées**
* Les phases sont traitées dans l'ordre défini par le champ `ordre`
* Les points sont attribués selon le **classement final du tournoi**

### Règles de match

* Les matchs appartiennent toujours à une **phase de tournoi**
* Un match peut être lié à une poule (si phase de type "poules")
* Les scores peuvent être mis à jour uniquement via `PUT /matches/{id}/score`
* Le statut d'un match suit le cycle : `à venir` → `en cours` → `terminé`
* Les matchs terminés déclenchent le recalcul automatique des classements

### Règles de classement

* Les classements globaux agrègent les classements de tournois
* Les classements de poules sont calculés automatiquement après chaque match
* Les critères de départage sont configurables via `ConfigurationTournoi`
* Les points sont attribués selon la position finale dans le tournoi

### Règles de composition

* Une feuille de match doit être créée pour chaque équipe participant à un match
* Les joueurs doivent être ajoutés à la feuille de match avant le début
* Les événements de match (buts, cartons, etc.) sont liés à un joueur et une équipe

### Sécurité et validation

* Toute modification de score passe par l'API avec authentification
* Le frontend public est strictement en **lecture seule**
* Les actions sensibles sont enregistrées dans les logs d'audit

---

## 11. Tâches à effectuer

### Livrable 1 (19/01/2026) : Backend, base de données, API REST, gestion des tournois et tableaux, interface staff/admin, déploiement

#### Backend - Configuration et infrastructure
- [x] Finaliser la configuration de l'environnement backend (FastAPI, SQLAlchemy, Pydantic)
- [x] Configurer la base de données SQLite
- [x] Mettre en place la structure de dossiers (models, schemas, routers, services)
- [x] Configurer CORS et middleware de sécurité
- [x] Implémenter la gestion des erreurs globale et les réponses standardisées

#### Backend - Modèles de données
- [ ] Créer tous les modèles SQLAlchemy selon le schéma :
  - [x] `Sport` (avec str `score_type`)
  - [x] `Team` (complet avec logo_url, primary_color)
  - [x] `TeamSport` (relation équipe-sport)
  - [x] `Player` (lié à TeamSport)
  - [x] `Tournament` (avec str `tournament_type`, `status`)
  - [x] `TournamentPhase` (avec str `phase_type`)
  - [x] `Pool`
  - [ ] `TeamPool` (avec stats : points, wins, losses, draws, goals_for, goals_against, goal_difference)
  - [x] `Match` (avec str `status`)
  - [x] `MatchPool` (relation match-poule)
  - [x] `MatchSet`
  - [x] `Court`
  - [x] `MatchSchedule`
  - [x] `TournamentRanking`
  - [x] `TournamentConfiguration`
  - [ ] `Ranking`
- [x] Créer les relations SQLAlchemy entre tous les modèles
- [x] Ajouter les contraintes et index nécessaires

#### Backend - Schémas Pydantic
- [x] Créer les schémas de validation pour tous les modèles (Create, Update, Response)
- [x] Implémenter les validations métier (ex: scores positifs, dates cohérentes)
- [x] Créer les schémas pour les requêtes complexes (filtres, pagination)

#### Backend - Services (Logique métier)
- [ ] Service de calcul de classements de poules (pool standings)
- [ ] Service de calcul de classements de tournois (tournament rankings)
- [ ] Service de calcul de classement général (agrégation par sport)
- [ ] Service de validation des règles métier (ex: pas de match entre mêmes équipes dans une poule)
- [ ] Service de gestion des phases de tournoi
- [ ] Service d'audit (logs d'audit pour actions sensibles)

#### Backend - API REST - Endpoints publics et généraux
- [x] `GET /` - Informations de base sur l'API
- [x] `GET /health` - Vérification de l'état de l'API
- [x] `GET /sports` - Liste tous les sports (avec pagination, filtres)
- [x] `GET /sports/{sport_id}` - Récupère un sport par ID
- [x] `GET /teams` - Liste toutes les équipes
- [x] `GET /teams/{team_id}` - Récupère une équipe par ID
- [x] `GET /team-sports` - Liste toutes les inscriptions équipe-sport
- [x] `GET /team-sports/{team_sport_id}` - Récupère une inscription
- [x] `GET /teams/{team_id}/sports` - Liste les sports d'une équipe
- [x] `GET /sports/{sport_id}/teams` - Liste les équipes d'un sport
- [x] `GET /players` - Liste tous les joueurs
- [x] `GET /players/{player_id}` - Récupère un joueur par ID
- [x] `GET /team-sports/{team_sport_id}/players` - Liste les joueurs d'une équipe-sport
- [x] `GET /courts` - Liste tous les terrains
- [x] `GET /courts/{court_id}` - Récupère un terrain par ID
- [x] `GET /tournaments` - Liste tous les tournois
- [x] `GET /tournaments/{tournament_id}` - Récupère un tournoi par ID
- [x] `GET /tournaments/{tournament_id}/phases` - Liste les phases d'un tournoi
- [x] `GET /tournaments/{tournament_id}/ranking` - Classement final du tournoi
- [x] `GET /tournaments/{tournament_id}/configuration` - Configuration d'un tournoi
- [x] `GET /tournament-phases/{phase_id}` - Récupère une phase
- [x] `GET /tournament-phases/{phase_id}/matches` - Liste les matchs d'une phase
- [x] `GET /pools/{pool_id}` - Récupère une poule
- [x] `GET /pools/{pool_id}/teams` - Liste les équipes d'une poule
- [x] `GET /pools/{pool_id}/matches` - Liste les matchs d'une poule
- [x] `GET /pools/{pool_id}/standings` - Classement d'une poule (calcul automatique)
- [x] `GET /team-pools/{team_pool_id}` - Récupère une équipe-poule
- [x] `GET /matches` - Liste tous les matchs (avec filtres : sport, phase, statut, date)
- [x] `GET /matches/{match_id}` - Récupère un match par ID
- [x] `GET /matches/{match_id}/sets` - Liste les sets d'un match
- [x] `GET /matches/{match_id}/schedule` - Planification d'un match
- [x] `GET /courts/{court_id}/schedule` - Planning d'un terrain
- [x] `GET /match-sets/{set_id}` - Récupère un set par ID

#### Backend - API REST - Endpoints Admin (🔐)
- [x] `POST /sports` - Crée un nouveau sport
- [x] `PUT /sports/{sport_id}` - Modifie un sport
- [x] `DELETE /sports/{sport_id}` - Supprime un sport
- [x] `POST /teams` - Crée une nouvelle équipe
- [x] `PUT /teams/{team_id}` - Modifie une équipe
- [x] `DELETE /teams/{team_id}` - Supprime une équipe
- [x] `GET /teams/{team_id}/sports` - Liste les sports d'une équipe (avec statut actif/inactif)
- [x] `POST /teams/{team_id}/sports` - Inscrit une équipe à un ou plusieurs sportsInscrit une équipe à un ou plusieurs sports
- [x] `DELETE /teams/{team_id}/sports/{sport_id}` - Supprime l'inscription d'une équipe à un sport
- [x] `PATCH /teams/{team_id}/sports/{sport_id}` - Modifie le statut ou le nom spécifique
- [ ] `POST /courts` - Crée un nouveau terrain
- [ ] `PUT /courts/{court_id}` - Modifie un terrain
- [ ] `DELETE /courts/{court_id}` - Supprime un terrain
- [ ] `PATCH /courts/{court_id}/activate` - Active un terrain
- [ ] `PATCH /courts/{court_id}/deactivate` - Désactive un terrain
- [ ] `POST /tournaments` - Crée un nouveau tournoi
- [ ] `PUT /tournaments/{tournament_id}` - Modifie un tournoi
- [ ] `DELETE /tournaments/{tournament_id}` - Supprime un tournoi
- [ ] `POST /tournaments/{tournament_id}/configuration` - Crée la configuration
- [ ] `PUT /tournaments/{tournament_id}/configuration` - Modifie la configuration
- [ ] `POST /tournaments/{tournament_id}/phases` - Crée une nouvelle phase
- [ ] `PUT /tournament-phases/{phase_id}` - Modifie une phase
- [ ] `DELETE /tournament-phases/{phase_id}` - Supprime une phase
- [ ] `POST /tournament-phases/{phase_id}/pools` - Crée une nouvelle poule
- [ ] `PUT /pools/{pool_id}` - Modifie une poule
- [ ] `DELETE /pools/{pool_id}` - Supprime une poule
- [ ] `POST /pools/{pool_id}/teams` - Ajoute une équipe à une poule
- [ ] `DELETE /team-pools/{team_pool_id}` - Retire une équipe d'une poule
- [ ] `POST /matches` - Crée un nouveau match
- [ ] `DELETE /matches/{match_id}` - Supprime un match

#### Backend - API REST - Endpoints Staff (👨‍💼)
- [ ] `POST /players` - Crée un nouveau joueur
- [ ] `PUT /players/{player_id}` - Modifie un joueur
- [ ] `DELETE /players/{player_id}` - Supprime un joueur
- [ ] `PATCH /players/{player_id}/activate` - Active un joueur
- [ ] `PATCH /players/{player_id}/deactivate` - Désactive un joueur
- [ ] `PATCH /tournaments/{tournament_id}/status` - Change le statut du tournoi
- [ ] `PATCH /team-pools/{team_pool_id}/stats` - Met à jour les stats d'une équipe en poule
- [ ] `PUT /matches/{match_id}` - Modifie un match
- [ ] `PATCH /matches/{match_id}/status` - Change le statut du match
- [ ] `PATCH /matches/{match_id}/score` - Met à jour le score du match (avec recalcul automatique des classements)
- [ ] `POST /matches/{match_id}/schedule` - Planifie un match
- [ ] `PUT /matches/{match_id}/schedule` - Modifie la planification
- [ ] `DELETE /matches/{match_id}/schedule` - Supprime la planification
- [ ] `PATCH /matches/{match_id}/schedule/start` - Enregistre l'heure de début réelle
- [ ] `PATCH /matches/{match_id}/schedule/end` - Enregistre l'heure de fin réelle
- [ ] `POST /matches/{match_id}/sets` - Crée un nouveau set
- [ ] `PUT /match-sets/{set_id}` - Met à jour le score d'un set
- [ ] `DELETE /match-sets/{set_id}` - Supprime un set

#### Backend - Système de permissions
- [ ] Implémenter les décorateurs de permissions (public, authenticated, staff, admin)
- [ ] Créer les dépendances FastAPI pour vérifier les rôles
- [ ] Tester les restrictions d'accès sur tous les endpoints

#### Frontend Admin/Staff - Configuration
- [ ] Initialiser le projet React + TypeScript
- [ ] Configurer le routage (React Router)
- [ ] Configurer les appels API (axios/fetch avec intercepteurs)
- [ ] Mettre en place la gestion d'état (Context API ou Zustand/Redux)
- [ ] Configurer les styles (CSS modules, Tailwind ou styled-components)

#### Frontend Admin/Staff - Interface de gestion
- [ ] Page de connexion (avant auth, placeholder)
- [ ] Layout principal avec navigation
- [ ] Page gestion des sports (CRUD)
- [ ] Page gestion des équipes (CRUD)
- [ ] Page gestion des inscriptions équipe-sport
- [ ] Page gestion des joueurs (par équipe-sport)
- [ ] Page gestion des terrains (CRUD)
- [ ] Page gestion des tournois (CRUD)
- [ ] Page création/édition de tournoi (phases, poules, équipes)
- [ ] Page gestion des matchs (liste, création, édition)
- [ ] Page saisie des scores (basique, sans temps restant pour l'instant)
- [ ] Page classements (par tournoi, par sport, général)
- [ ] Page planification des matchs (calendrier/planning)

#### Déploiement
- [ ] Créer le Dockerfile pour le backend
- [ ] Créer le Dockerfile pour le frontend admin
- [ ] Configurer docker-compose.yml (backend, frontend admin, nginx)
- [ ] Configurer Nginx comme reverse proxy
- [ ] Tester le déploiement local avec Docker
- [ ] Documenter les variables d'environnement

---

### Livrable 2 (26/01/2026) : Authentification et affichage du temps restant alloué pour le match

#### Backend - Authentification OAuth Google
- [ ] Implémenter le modèle `RefreshToken` (si pas déjà fait)
- [ ] Intégrer Google OAuth (bibliothèque `authlib` ou `google-auth`)
- [ ] Créer les endpoints d'authentification :
  - [ ] `GET /auth/login` - Redirige vers Google OAuth
  - [ ] `GET /auth/callback` - Callback Google OAuth (création/récupération utilisateur)
  - [ ] `POST /auth/refresh` - Rafraîchit l'access token
  - [ ] `POST /auth/logout` - Révoque le refresh token
  - [ ] `GET /auth/me` - Récupère l'utilisateur actuel
- [ ] Implémenter la génération des tokens JWT (access token + refresh token)
- [ ] Implémenter la whitelist d'emails/domaines Google pour restriction d'accès staff
- [ ] Créer le middleware JWT pour protéger les routes
- [ ] Adapter le modèle `User` pour Google OAuth (google_id, display_name, profile_picture_url)
- [ ] Implémenter la gestion des rôles (admin/staff) basée sur la whitelist ou la base de données

#### Backend - API REST - Gestion des utilisateurs (Admin)
- [ ] `GET /users` - Liste tous les utilisateurs autorisés
- [ ] `GET /users/{user_id}` - Récupère un utilisateur par ID
- [ ] `POST /users` - Ajoute un utilisateur à la whitelist (création manuelle)
- [ ] `PUT /users/{user_id}` - Modifie un utilisateur (rôle, statut)
- [ ] `DELETE /users/{user_id}` - Supprime un utilisateur de la whitelist
- [ ] `PATCH /users/{user_id}/activate` - Active un utilisateur
- [ ] `PATCH /users/{user_id}/deactivate` - Désactive un utilisateur

#### Backend - Temps restant pour les matchs
- [ ] Ajouter le champ `estimated_duration_minutes` dans `MatchSchedule` (déjà prévu dans le modèle)
- [ ] Créer un endpoint ou logique pour calculer le temps restant :
  - [ ] Calcul basé sur `scheduled_datetime` + `estimated_duration_minutes` - `now()`
  - [ ] Prendre en compte `actual_start_datetime` si le match a commencé
  - [ ] Retourner le temps restant dans la réponse `GET /matches/{match_id}` ou endpoint dédié
- [ ] Implémenter la mise à jour du temps restant en temps réel (optionnel : WebSocket, ou calcul côté client)

#### Frontend Admin/Staff - Authentification
- [ ] Page de connexion avec bouton "Connexion Google"
- [ ] Intégrer le flux OAuth Google (redirection vers backend)
- [ ] Gérer le stockage des tokens (localStorage/sessionStorage, avec gestion de sécurité)
- [ ] Créer un contexte d'authentification (AuthContext)
- [ ] Implémenter les routes protégées (redirection si non authentifié)
- [ ] Créer un composant de vérification de rôle (staff/admin)
- [ ] Gérer la déconnexion
- [ ] Afficher les informations utilisateur (nom, photo de profil) dans la navigation
- [ ] Page de gestion des utilisateurs (admin uniquement)

#### Frontend Admin/Staff - Affichage du temps restant
- [ ] Ajouter l'affichage du temps restant dans la page détail d'un match
- [ ] Créer un composant de compte à rebours (timer)
- [ ] Afficher le temps restant dans la liste des matchs (si pertinent)
- [ ] Gérer les différents états : temps prévu, match en cours, match terminé

---

### Livrable 3 (06/02/2026) : Page score en direct, page affichant les règles par sport, feuille de matchs et événements du matchs

#### Backend - Feuille de match (MatchSheet)
- [ ] Finaliser les modèles `MatchSheet` et `PlayerMatchSheet` si pas déjà fait
- [ ] Créer les endpoints pour la feuille de match :
  - [ ] `GET /matches/{match_id}/sheets` - Liste les feuilles de match (une par équipe)
  - [ ] `GET /matches/{match_id}/sheets/{team_sport_id}` - Récupère une feuille de match spécifique
  - [ ] `POST /matches/{match_id}/sheets` - Crée une feuille de match pour une équipe
  - [ ] `PUT /matches/{match_id}/sheets/{team_sport_id}` - Modifie une feuille de match
  - [ ] `POST /matches/{match_id}/sheets/{team_sport_id}/players` - Ajoute un joueur à la feuille
  - [ ] `PUT /player-match-sheets/{player_match_sheet_id}` - Modifie un joueur sur la feuille (starter, jersey_number, captain)
  - [ ] `DELETE /player-match-sheets/{player_match_sheet_id}` - Retire un joueur de la feuille

#### Backend - Événements de match (MatchEvent)
- [ ] Finaliser le modèle `MatchEvent` avec tous les types d'événements (enum)
- [ ] Créer les endpoints pour les événements :
  - [ ] `GET /matches/{match_id}/events` - Liste tous les événements d'un match (triés par minute)
  - [ ] `GET /matches/{match_id}/events/{event_id}` - Récupère un événement
  - [ ] `POST /matches/{match_id}/events` - Crée un événement (but, carton, remplacement, etc.)
  - [ ] `PUT /matches/{match_id}/events/{event_id}` - Modifie un événement
  - [ ] `DELETE /matches/{match_id}/events/{event_id}` - Supprime un événement

#### Backend - Règles par sport
- [ ] Ajouter le champ `rules` dans le modèle `Sport` (ou créer une table dédiée si nécessaire)
- [ ] Créer les endpoints pour les règles :
  - [ ] `GET /sports/{sport_id}/rules` - Récupère les règles d'un sport
  - [ ] `PUT /sports/{sport_id}/rules` - Modifie les règles (admin uniquement)
- [ ] Implémenter le stockage des règles (texte ou JSON structuré)

#### Backend - Score en direct (WebSocket optionnel)
- [ ] Implémenter WebSocket avec FastAPI (optionnel mais recommandé)
- [ ] Créer un endpoint WebSocket pour les mises à jour en temps réel
- [ ] Diffuser les mises à jour de scores, événements, statuts de match
- [ ] Gérer les connexions multiples et la gestion des rooms par match

#### Frontend Admin/Staff - Feuille de match
- [ ] Page de gestion de feuille de match (création/édition)
- [ ] Interface pour sélectionner les joueurs de l'équipe (depuis TeamSport)
- [ ] Interface pour définir les titulaires (starters) et remplaçants
- [ ] Interface pour attribuer les numéros de maillot pour le match
- [ ] Interface pour désigner le capitaine du match
- [ ] Affichage de la composition d'équipe (liste ordonnée)
- [ ] Validation avant enregistrement (nombre min/max de joueurs selon le sport)

#### Frontend Admin/Staff - Événements de match
- [ ] Page ou modal de saisie d'événements en temps réel
- [ ] Interface pour ajouter un événement (type, joueur, minute, description)
- [ ] Liste chronologique des événements du match
- [ ] Filtres par type d'événement
- [ ] Possibilité de modifier/supprimer un événement
- [ ] Affichage visuel des événements (icônes selon le type : but, carton, remplacement)

#### Frontend Admin/Staff - Règles par sport
- [ ] Page d'affichage des règles par sport (lecture seule pour staff)
- [ ] Page d'édition des règles (admin uniquement, éditeur de texte riche si possible)
- [ ] Navigation entre les sports pour consulter les règles

#### Frontend Admin/Staff - Score en direct
- [ ] Page dédiée "Score en direct" avec liste des matchs en cours
- [ ] Affichage en temps réel des scores (mise à jour automatique ou WebSocket)
- [ ] Affichage des événements en direct
- [ ] Interface optimisée pour saisie rapide des scores et événements
- [ ] Indicateur visuel pour les matchs en cours vs terminés

---

### Livrable 4 (13/02/2026) : Interface public, tests complets et correctifs

#### Frontend Public - Configuration
- [ ] Initialiser le projet React + TypeScript
- [ ] Configurer le routage (React Router)
- [ ] Configurer les appels API (axios/fetch)
- [ ] Mettre en place la gestion d'état légère
- [ ] Configurer les styles (cohérents avec l'interface admin mais adaptés au public)

#### Frontend Public - Pages principales
- [ ] Page d'accueil (présentation, prochains matchs, classements généraux)
- [ ] Page liste des sports
- [ ] Page détail d'un sport (équipes, tournois, classements)
- [ ] Page liste des équipes
- [ ] Page détail d'une équipe (sports, joueurs, résultats)
- [ ] Page liste des tournois
- [ ] Page détail d'un tournoi (phases, poules, matchs, classement)
- [ ] Page classements (général, par sport, par tournoi)
- [ ] Page planning/calendrier des matchs (vue calendrier ou liste)
- [ ] Page détail d'un match (scores, sets, événements, compositions)
- [ ] Page score en direct (matchs en cours en temps réel)
- [ ] Page règles par sport (affichage des règles)
- [ ] Navigation principale et footer

#### Frontend Public - Fonctionnalités temps réel
- [ ] Intégration WebSocket pour mises à jour en direct (si implémenté côté backend)
- [ ] Affichage des scores mis à jour automatiquement
- [ ] Notification des nouveaux événements de match
- [ ] Indicateur "En direct" pour les matchs en cours

#### Frontend Public - Optimisations
- [ ] Design responsive (mobile-first)
- [ ] Optimisation des performances (lazy loading, pagination)
- [ ] Gestion des erreurs et états de chargement
- [ ] SEO de base (meta tags, structure sémantique)

#### Tests - Backend
- [ ] Tests unitaires pour les modèles
- [ ] Tests unitaires pour les services (calculs de classements, validations)
- [ ] Tests d'intégration pour les endpoints API (avec pytest)
- [ ] Tests d'authentification et permissions
- [ ] Tests de validation des schémas Pydantic
- [ ] Tests de régression pour les règles métier critiques

#### Tests - Frontend
- [ ] Tests unitaires pour les composants critiques (calculs, formatage)
- [ ] Tests d'intégration pour les flux principaux (navigation, appels API)
- [ ] Tests E2E pour les scénarios clés (avec Playwright ou Cypress) :
  - [ ] Création d'un tournoi (admin)
  - [ ] Saisie d'un score (staff)
  - [ ] Consultation des classements (public)

#### Déploiement - Finalisation
- [ ] Configuration HTTPS avec certificats SSL (Let's Encrypt)
- [ ] Configuration Nginx complète (reverse proxy, cache, compression)
- [ ] Variables d'environnement de production
- [ ] Scripts de déploiement et documentation
- [ ] Backup de la base de données (stratégie et scripts)
- [ ] Monitoring de base (logs, health checks)

#### Documentation
- [ ] Documentation API complète (vérifier Swagger/OpenAPI)
- [ ] Guide de déploiement détaillé
- [ ] Guide utilisateur pour le staff/admin
- [ ] README mis à jour avec instructions complètes

#### Correctifs et polish
- [ ] Correction des bugs identifiés pendant les tests
- [ ] Optimisations de performance (requêtes DB, cache)
- [ ] Amélioration de l'UX/UI (feedback utilisateur, messages d'erreur clairs)
- [ ] Vérification de l'accessibilité (a11y) de base
- [ ] Revue de sécurité (injection, XSS, CSRF)
- [ ] Tests de charge basiques (si possible)

#### Préparation production
- [ ] Vérification de toutes les fonctionnalités selon les spécifications
- [ ] Tests sur environnement de staging/production
- [ ] Formation des utilisateurs finaux (staff/admin)
- [ ] Documentation finale

---

## 12. Règles pour l’IA (Cursor – Mémoire Projet)

> À respecter pour toute nouvelle feature

* Seuls les **admins** peuvent créer ou modifier un tournoi
* Un tournoi possède **un type** (poules, élimination, mixte)
* Un tournoi est composé de **phases ordonnées**
* Les matchs appartiennent toujours à une **phase de tournoi**
* Les points sont attribués **selon le classement final du tournoi**
* Les classements globaux sont calculés à partir des classements de tournois
* Toute modification de score passe par `PUT /matches/{id}/score`
* Le frontend public est strictement **read-only**

---

## 13. Évolutions possibles

* Arbitrage avancé par sport
* Historique et statistiques détaillées
* Export PDF / CSV
* Application mobile

---

## 14. Philosophie du projet

> Une application simple, robuste et maintenable, adaptée aux contraintes réelles d’un événement sportif universitaire, tout en restant évolutive pour les éditions futures.

---

Fin du document.
