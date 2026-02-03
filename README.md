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

## 🚀 Démarrage Rapide

### Option 1 : Docker (Recommandé)

```bash
# Cloner le projet
git clone https://github.com/Franck1vlt/Coupe-Universite-UCL-2026.git
cd Coupe-Universite-UCL-2026

# Lancer avec Docker Compose
docker-compose up -d

# Accéder aux interfaces
# Admin : http://localhost:3000
# Public : http://localhost:3100
# API : http://localhost:8000
```

### Option 2 : Développement Local

**Backend**
```bash
cd Backend
python -m venv venv
source venv/bin/activate  # Windows: ./venv/Scripts/Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend Admin**
```bash
cd frontend-admin
npm install
npm run dev
```

**Frontend Public**
```bash
cd frontend-public
npm install
npm run dev
```

### Variables d'Environnement

Créez un fichier `.env` à la racine (voir `.env.example`) :

```env
# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# API URLs
API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📚 Documentation

### Documentation API

L'API REST est documentée automatiquement via Swagger UI :
- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

### Guides Détaillés

- [📖 Documentation Complète de l'API](docs/api.md)
- [🏗️ Architecture Détaillée](docs/architecture.md)
- [🚢 Guide de Déploiement](docs/DEPLOYMENT.md)
- [🔄 Migration API](docs/MIGRATION_API_TOURNOIS.md)

---

## 🔐 Authentification

L'application utilise un système d'authentification basé sur JWT :

- **Admin** : Accès complet à toutes les fonctionnalités
- **Staff** : Gestion des tournois, matchs, et scores
- **Technicien** : Saisie des scores uniquement

Les utilisateurs doivent être préalablement ajoutés à la base de données par un administrateur.

---

## 📊 Modèle de Données (Aperçu)

### Entités Principales

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
# Auteurs :
- Franck VALMONT