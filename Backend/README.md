# Backend - Coupe Universitaire UCL 2026

API REST FastAPI pour la gestion de la Coupe Universitaire UCL 2026.

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du dossier `Backend/` avec les variables suivantes :

```env
# Configuration de l'application
DEBUG=true
DATABASE_URL=sqlite:///./data/coupe_ucl_2026.db

# Sécurité
SECRET_KEY=your-secret-key-change-in-production

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5050,http://localhost:5150
```

Voir `app/config.py` pour toutes les variables disponibles.

## Installation

```bash
cd Backend
pip install -r requirements.txt
```

## Démarrage

### Mode développement

```bash
cd Backend
uvicorn app.main:app --reload
```

L'API sera accessible sur `http://localhost:8000`

### Documentation interactive

- Swagger UI : `http://localhost:8000/docs`
- ReDoc : `http://localhost:8000/redoc`

## Structure du projet

```
Backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Point d'entrée FastAPI
│   ├── config.py            # Configuration de l'application
│   ├── db.py                # Configuration SQLAlchemy
│   ├── exceptions.py        # Gestion des erreurs
│   ├── middleware.py        # Middleware de sécurité et logging
│   ├── models/              # Modèles SQLAlchemy
│   ├── schemas/             # Schémas Pydantic
│   ├── routers/             # Routes API
│   └── services/            # Logique métier
├── requirements.txt
└── README.md
```

## Base de données

La base de données SQLite est initialisée automatiquement au démarrage de l'application. Les tables sont créées via `Base.metadata.create_all()` dans `app/db.py`.

Le fichier de base de données sera créé dans `./data/coupe_ucl_2026.db` (ou selon `DATABASE_URL`).

## Endpoints

### Généraux

- `GET /` - Informations de base sur l'API
- `GET /health` - Vérification de l'état de l'API

Les autres endpoints seront ajoutés progressivement selon le plan de développement.

## Réponses standardisées

Toutes les réponses suivent un format standardisé :

**Succès** :
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

**Erreur** :
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {...}
  }
}
```

