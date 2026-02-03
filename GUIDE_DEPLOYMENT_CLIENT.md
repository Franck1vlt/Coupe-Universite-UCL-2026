# Guide de Déploiement - Coupe de l'Université UCL

Bienvenue ! Ce guide vous permet de lancer l'application de gestion sportive de deux manières différentes.

---

## ⚡ Option 1 : Lancer en local avec npm (Recommandé pour commencer)

### Prérequis
- **Node.js** (version 18 ou supérieure)
  - Télécharger depuis : https://nodejs.org/
  - Choisir la version "LTS" (Long Term Support)
- **Git** (pour cloner le projet)
  - Télécharger depuis : https://git-scm.com/

### Étapes

1. **Cloner le projet**
   ```bash
   git clone https://github.com/Franck1vlt/Coupe-Universite-UCL-2026.git
   ```

2. **Démarrer le backend (FastAPI)**
   
   Ouvrez un terminal dans le dossier `Backend` :
   ```bash
   cd Backend
   python -m venv venv
   ./venv/Script/Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
   Le backend sera accessible à : http://localhost:8000

3. **Démarrer le frontend-admin (Next.js) - Terminal 2**
   
   Ouvrez un deuxième terminal dans le dossier `frontend-admin` :
   ```bash
   cd frontend-admin
   npm run build
   npm run start
   ```
   Le frontend-admin sera accessible à : http://localhost:3000

4. **Démarrer le frontend-public (Next.js) - Terminal 3**
   
   Ouvrez un troisième terminal dans le dossier `frontend-public` :
   ```bash
   cd frontend-public
   npm run build
   npm run start -- -p 3100
   ```
   Le frontend-public sera accessible à : http://localhost:3100

### Se connecter
- **URL Admin** : http://localhost:3000
- **URL Publique** : http://localhost:3100
- **Identifiants** : Demander à l'administrateur

---

## 🐳 Option 2 : Lancer avec Docker (Recommandé en production)

### Prérequis
- **Docker Desktop**
  - Télécharger depuis : https://www.docker.com/products/docker-desktop
  - Installer et lancer Docker Desktop
- **Git** (pour cloner le projet)

### Étapes

1. **Cloner le projet**
   ```bash
   git clone https://github.com/Franck1vlt/Coupe-Universite-UCL-2026.git
   ```

2. **Lancer tous les services avec docker-compose**
   ```bash
   docker-compose build
   docker-compose up -d
   ```
   Cette commande lance automatiquement :
   - Le backend (FastAPI)
   - Le frontend-admin (Next.js)
   - Le frontend-public (Next.js)
   - Traefik (reverse proxy)

3. **Accéder à l'application**
   - **URL Admin** : http://localhost:3000
   - **URL Publique** : http://localhost:3100
   - **API Backend** : http://localhost:8000

4. **Arrêter l'application**
   ```bash
   docker-compose down
   ```

### Vérifier que tout fonctionne
```bash
docker-compose ps
```
Tous les conteneurs doivent être en vert "Up".

---

## 🔍 Dépannage

### Le port 3000 ou 8000 est déjà utilisé
```bash
# Arrêter les conteneurs existants
docker-compose down

# Ou tuer le processus sur le port
# Windows PowerShell :
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Docker ne démarre pas
1. Vérifier que Docker Desktop est bien lancé
2. Vérifier l'espace disque disponible
3. Redémarrer Docker Desktop

### Le backend ne se connecte pas à la base de données
- La base de données SQLite est stockée dans `./Backend/data/`
- Elle se crée automatiquement au premier lancement
- Vérifier les droits d'accès au dossier

### L'authentification ne fonctionne pas
- Vérifier les identifiants avec l'administrateur
- Vider le cache du navigateur (Ctrl+Shift+Suppr)
- Relancer le service : `docker-compose restart frontend-admin`

---

## 📊 Architecture

```
Utilisateur
    ↓
http://localhost:3000 (Admin)  ou  http://localhost:3100 (Public)
    ↓
Frontend (Next.js)
    ↓
http://localhost:8000
    ↓
Backend (FastAPI)
    ↓
Database SQLite (./Backend/data/)
```

---

## ❓ Support

Pour toute question ou problème, contactez l'équipe de développement.

Bon déploiement ! 🚀
