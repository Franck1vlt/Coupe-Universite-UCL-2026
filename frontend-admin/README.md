# Frontend Admin - Coupe de l'Universite UCL 2026

Application d'administration pour la gestion des tournois sportifs de la Coupe de l'Universite UCL.

## Stack Technique

- **Framework** : Next.js 16.1.1
- **React** : 19.2.3
- **TypeScript** : 5.x
- **Styling** : Tailwind CSS 4
- **Auth** : NextAuth 5.0.0-beta.30
- **Real-time** : Socket.io-client 4.8.3
- **Drag & Drop** : @hello-pangea/dnd 18.0.1

---

## Prerequis

- Node.js 20+ (LTS recommande)
- npm 10+
- Docker (pour le deploiement)

---

## Installation Locale

### 1. Cloner le repository

```bash
git clone https://github.com/[votre-repo]/Coupe-Universite-UCL-2026.git
cd Coupe-Universite-UCL-2026/frontend-admin
```

### 2. Installer les dependances

```bash
npm ci
```

### 3. Configuration de l'environnement

Creer un fichier `.env.local` a la racine de `frontend-admin/` :

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Lancer en mode developpement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

---

## Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de developpement |
| `npm run build` | Build l'application pour la production |
| `npm run start` | Lance le serveur de production |
| `npm run lint` | Execute ESLint pour verifier le code |

---

## Deploiement Docker

### Build de l'image

```bash
docker build -t frontend-admin .
```

### Lancer le conteneur

```bash
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://api:8000 frontend-admin
```

---

## Deploiement avec Docker Compose (Recommande)

Le projet complet utilise Docker Compose pour orchestrer tous les services.

### Depuis la racine du projet

```bash
# Build et demarrage de tous les services
docker compose up -d --build

# Voir les logs
docker compose logs -f frontend-admin

# Arreter les services
docker compose down
```

### Architecture des services

```
                    +-------------+
                    |   Traefik   |
                    |  (port 80)  |
                    +------+------+
                           |
       +-------------------+-------------------+
       |                   |                   |
+------+------+    +-------+-------+   +-------+-------+
| Frontend    |    | Frontend      |   | Backend       |
| Admin       |    | Public        |   | FastAPI       |
| (port 3000) |    | (port 3100)   |   | (port 8000)   |
+-------------+    +---------------+   +---------------+
       |                   |                   |
       +-------------------+-------------------+
                           |
                    +------+------+
                    |   SQLite    |
                    |   (data/)   |
                    +-------------+
```

### URLs apres deploiement

| Service | URL |
|---------|-----|
| Frontend Admin | `https://votre-domaine.com/admin` |
| Frontend Public | `https://votre-domaine.com/` |
| API Backend | `https://votre-domaine.com/api` |
| Traefik Dashboard | `http://votre-domaine.com:8080` |

---

## Dockerfile Explique

```dockerfile
# ===== Build =====
FROM node:20-alpine AS builder

WORKDIR /app

# Installation des dependances
COPY package*.json ./
RUN npm ci

# Build de l'application
COPY . .
RUN npm run build

# ===== Runtime =====
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copie des fichiers buildes
COPY --from=builder /app ./

EXPOSE 3000
```

Le Dockerfile utilise un **multi-stage build** pour optimiser la taille de l'image finale.

---

## Variables d'Environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL de l'API Backend | `http://localhost:8000` |
| `NEXTAUTH_URL` | URL de base pour NextAuth | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret pour NextAuth | (generer avec `openssl rand -base64 32`) |

---

## Structure du Projet

```
frontend-admin/
├── src/
│   ├── app/                    # Pages Next.js (App Router)
│   │   ├── layout.tsx          # Layout principal
│   │   ├── page.tsx            # Page d'accueil staff
│   │   ├── login/              # Authentification
│   │   ├── configuration-coupe/ # Configuration tournois
│   │   ├── choix-sport/        # Selection sport & matchs
│   │   ├── features/scoreboards/ # Tables de marquage
│   │   ├── tableau-scores/     # Classements
│   │   └── scores-direct/      # Scores en direct
│   ├── middleware.ts           # Middleware d'auth
│   └── lib/                    # Utilitaires
├── public/                     # Assets statiques
├── Dockerfile                  # Configuration Docker
├── package.json                # Dependances
└── tsconfig.json               # Configuration TypeScript
```

---

## Deploiement en Production

### 1. Prerequis serveur

- Docker 24+
- Docker Compose 2.x
- Domaine configure avec DNS pointant vers le serveur

### 2. Configuration SSL

Modifier `traefik/traefik.yml` avec votre email pour Let's Encrypt :

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: votre-email@exemple.com
```

### 3. Deploiement

```bash
# Sur le serveur de production
git pull origin main
docker compose up -d --build
```

### 4. CI/CD (GitHub Actions)

Le projet inclut un workflow CI/CD dans `.github/workflows/ci-cd.yml` qui :

1. Execute les tests
2. Se connecte au serveur via SSH
3. Pull le code et rebuild les conteneurs

---

## Troubleshooting

### Le build echoue

```bash
# Nettoyer le cache npm
rm -rf node_modules package-lock.json
npm install
```

### Erreur de connexion API

Verifier que :
1. Le backend est en cours d'execution
2. `NEXT_PUBLIC_API_URL` pointe vers la bonne URL
3. Les CORS sont configures sur le backend

### Erreur Docker

```bash
# Reconstruire sans cache
docker compose build --no-cache
docker compose up -d
```

---

## Documentation Supplementaire

- [DOCUMENTATION_SPORTS.md](./DOCUMENTATION_SPORTS.md) - Tables de marquage par sport
- [COMPONENTS_HOOKS.md](./COMPONENTS_HOOKS.md) - Composants et hooks
- [API_USAGE.md](./API_USAGE.md) - Endpoints API utilises

---

## Support

Pour toute question ou probleme, contacter l'equipe d'organisation de la Coupe de l'Universite UCL.
