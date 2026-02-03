# 🏆 Coupe Universitaire UCL 2026

Application web de gestion sportive pour la Coupe de l'Université Catholique de Louvain.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)

---

## 📋 À propos

Plateforme complète pour la gestion d'événements sportifs multi-disciplines, permettant :

- ✅ Gestion centralisée des tournois et matchs
- ⚡ Saisie des scores en temps réel
- 📊 Affichage public des résultats et classements
- 🎯 Calcul automatique des rankings
- 🔐 Authentification et gestion des rôles (admin, staff, technicien)
- 📱 Interface responsive pour utilisation terrain

---

## 🏗️ Architecture

```
┌─────────────────┐      ┌─────────────────┐
│ Frontend Public │      │ Frontend Admin  │
│   (Next.js)     │      │   (Next.js)     │
└────────┬────────┘      └────────┬────────┘
         │                        │
         └───────────┬────────────┘
                     │
              ┌──────▼──────┐
              │   Traefik   │
              │    Proxy    │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │   Backend   │
              │  (FastAPI)  │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │   SQLite    │
              └─────────────┘
```

### Stack Technique

**Backend**
- Python 3.13
- FastAPI (REST API)
- SQLAlchemy (ORM)
- Pydantic (Validation)
- JWT Authentication
- bcrypt (Hash passwords)

**Frontend Admin**
- Next.js 16 (App Router)
- TypeScript
- NextAuth.js (Authentication)
- Tailwind CSS
- shadcn/ui

**Frontend Public**
- Next.js 16
- TypeScript
- Tailwind CSS
- Interface lecture seule

**Infrastructure**
- Docker & Docker Compose
- Traefik (Reverse Proxy)
- SQLite Database
- GitHub Actions (CI/CD)

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

- **Sport** : Disciplines sportives (football, basketball, etc.)
- **Team** : Équipes participantes (facultés, organisations)
- **TeamSport** : Inscription d'une équipe dans un sport spécifique
- **Player** : Joueurs liés à un TeamSport
- **Tournament** : Compétitions organisées par sport
- **TournamentPhase** : Phases d'un tournoi (poules, élimination, finale)
- **Pool** : Poules dans une phase de tournoi
- **Match** : Rencontres entre deux équipes
- **MatchSchedule** : Planification des matchs (terrain, horaires)
- **Court** : Terrains disponibles
- **User** : Utilisateurs authentifiés (admin, staff, technicien)

**📖 Documentation complète du modèle de données** : Consultez [docs/architecture.md](docs/architecture.md) pour le schéma détaillé.

---

## 🔧 Endpoints API (Aperçu)

L'API expose les ressources suivantes :

### Authentification
- `POST /auth/login` - Connexion utilisateur
- `POST /auth/logout` - Déconnexion
- `GET /auth/me` - Utilisateur actuel

### Gestion
- `GET/POST/PUT/DELETE /sports` - Sports
- `GET/POST/PUT/DELETE /teams` - Équipes
- `GET/POST/PUT/DELETE /players` - Joueurs
- `GET/POST/PUT/DELETE /tournaments` - Tournois
- `GET/POST/PUT/DELETE /matches` - Matchs
- `GET/POST/PUT/DELETE /courts` - Terrains

### Scores & Classements
- `PATCH /matches/{id}/score` - Mise à jour des scores
- `GET /tournaments/{id}/ranking` - Classement d'un tournoi
- `GET /pools/{id}/standings` - Classement d'une poule

**📖 Documentation complète** : [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour proposer des améliorations :

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amelioration`)
3. Commitez vos changements (`git commit -m 'feat: ajout fonctionnalité'`)
4. Push vers la branche (`git push origin feature/amelioration`)
5. Ouvrez une Pull Request

### Convention de commits

Suivez la convention [Conventional Commits](https://www.conventionalcommits.org/) :
- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation
- `style:` Formatage du code
- `refactor:` Refactoring
- `test:` Tests
- `chore:` Tâches de maintenance

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 👥 Équipe

Développé pour la Coupe de l'Université Catholique de Louvain 2026.

---

## 📞 Support

Pour toute question ou problème :
- 📧 Email : contact@example.com
- 📖 Documentation : [docs/](docs/)
- 🐛 Issues : [GitHub Issues](https://github.com/Franck1vlt/Coupe-Universite-UCL-2026/issues)
