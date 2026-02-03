# Guide de Déploiement - Coupe de l'Université UCL 2026

Ce guide explique comment déployer l'application sur un VPS avec Docker et configurer le pipeline CI/CD GitHub Actions.

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Configuration du VPS](#2-configuration-du-vps)
3. [Configuration DNS](#3-configuration-dns)
4. [Certificats SSL](#4-certificats-ssl)
5. [Configuration GitHub](#5-configuration-github)
6. [Premier déploiement](#6-premier-déploiement)
7. [Pipeline CI/CD](#7-pipeline-cicd)
8. [Maintenance](#8-maintenance)
9. [Dépannage](#9-dépannage)

---

## 1. Prérequis

### Sur le VPS
- **OS** : Ubuntu 22.04 LTS (recommandé) ou Debian 12
- **RAM** : Minimum 2 Go (4 Go recommandé)
- **CPU** : 2 vCPUs minimum
- **Stockage** : 20 Go minimum
- **Ports ouverts** : 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Outils requis
- Docker et Docker Compose
- Git
- Un nom de domaine configuré

### Fichiers requis
- Certificats SSL (`.pem` et `.key`)
- Clé SSH pour le déploiement

---

## 2. Configuration du VPS

### 2.1 Connexion initiale

```bash
ssh root@VOTRE_IP_VPS
```

### 2.2 Créer un utilisateur de déploiement (recommandé)

```bash
# Créer l'utilisateur
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Configurer SSH pour l'utilisateur
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 2.3 Installer Docker

```bash
# Mettre à jour le système
apt update && apt upgrade -y

# Installer les dépendances
apt install -y ca-certificates curl gnupg lsb-release

# Ajouter la clé GPG Docker
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Ajouter le repository Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Vérifier l'installation
docker --version
docker compose version
```

### 2.4 Configurer le firewall

```bash
# Installer ufw si nécessaire
apt install -y ufw

# Configurer les règles
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# Activer le firewall
ufw enable
ufw status
```

### 2.5 Créer la structure du projet

```bash
# Créer le dossier du projet
mkdir -p /var/www/coupe-universitaire
chown -R deploy:deploy /var/www/coupe-universitaire

# Créer les dossiers nécessaires
mkdir -p /var/www/coupe-universitaire/certs
mkdir -p /var/www/coupe-universitaire/data
```

---

## 3. Configuration DNS

Configurez les enregistrements DNS suivants chez votre registrar :

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | @ | `VOTRE_IP_VPS` | 3600 |
| A | api | `VOTRE_IP_VPS` | 3600 |
| A | admin | `VOTRE_IP_VPS` | 3600 |

**Exemple pour `coupedeluniversite.fr` :**
- `coupedeluniversite.fr` → IP du VPS (frontend public)
- `api.coupedeluniversite.fr` → IP du VPS (backend API)
- `admin.coupedeluniversite.fr` → IP du VPS (frontend admin)

### Vérifier la propagation DNS

```bash
# Depuis votre machine locale
nslookup coupedeluniversite.fr
nslookup api.coupedeluniversite.fr
nslookup admin.coupedeluniversite.fr
```

---

## 4. Certificats SSL

### Option A : Certificats existants (votre cas)

```bash
# Se connecter au VPS
ssh deploy@VOTRE_IP_VPS

# Copier vos certificats
sudo cp /chemin/vers/votre-certificat.pem /var/www/coupe-universitaire/certs/coupedeluniversite.pem
sudo cp /chemin/vers/votre-cle.key /var/www/coupe-universitaire/certs/coupedeluniversite.key

# Sécuriser les permissions
sudo chmod 600 /var/www/coupe-universitaire/certs/*
sudo chown root:root /var/www/coupe-universitaire/certs/*
```

### Option B : Let's Encrypt (gratuit, automatique)

Si vous souhaitez utiliser Let's Encrypt à l'avenir :

1. Modifier `docker-compose.yml` :
```yaml
# Remplacer tls=true par certresolver
- "traefik.http.routers.backend.tls.certresolver=letsencrypt"
```

2. Modifier `traefik/traefik.yml` :
```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: votre-email@example.com
      storage: /etc/traefik/acme.json
      httpChallenge:
        entryPoint: web
```

---

## 5. Configuration GitHub

### 5.1 Générer une clé SSH pour le déploiement

```bash
# Sur votre machine locale
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# Afficher la clé publique (à ajouter sur le VPS)
cat ~/.ssh/github_deploy_key.pub

# Afficher la clé privée (à ajouter dans GitHub Secrets)
cat ~/.ssh/github_deploy_key
```

### 5.2 Ajouter la clé publique sur le VPS

```bash
# Se connecter au VPS
ssh deploy@VOTRE_IP_VPS

# Ajouter la clé publique
echo "CONTENU_DE_github_deploy_key.pub" >> ~/.ssh/authorized_keys
```

### 5.3 Configurer les secrets GitHub

1. Aller sur votre repository GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Cliquer sur **New repository secret**

Ajouter les secrets suivants :

| Nom du secret | Valeur |
|---------------|--------|
| `SERVER_HOST` | IP de votre VPS (ex: `123.45.67.89`) |
| `SERVER_USER` | `deploy` (ou votre utilisateur) |
| `SERVER_SSH_KEY` | Contenu complet de `github_deploy_key` (clé privée) |

**Important** : Pour `SERVER_SSH_KEY`, copiez tout le contenu incluant :
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

---

## 6. Premier déploiement

### 6.1 Cloner le projet sur le VPS

```bash
ssh deploy@VOTRE_IP_VPS
cd /var/www/coupe-universitaire

# Cloner le repository
git clone https://github.com/VOTRE_USERNAME/Coupe-Universite-UCL-2026.git .

# Ou si déjà cloné
git pull origin main
```

### 6.2 Créer le fichier .env

```bash
cd /var/www/coupe-universitaire

# Créer le fichier .env
cat > .env << EOF
DOMAIN=coupedeluniversite.fr
EOF
```

### 6.3 Vérifier les certificats

```bash
# Vérifier que les certificats sont en place
ls -la /var/www/coupe-universitaire/certs/
# Doit afficher :
# coupedeluniversite.pem
# coupedeluniversite.key
```

### 6.4 Lancer les conteneurs

```bash
cd /var/www/coupe-universitaire

# Vérifier la configuration
docker compose config

# Construire et lancer
docker compose up -d --build

# Vérifier le statut
docker compose ps

# Voir les logs
docker compose logs -f
```

### 6.5 Vérifier le déploiement

```bash
# Tester l'API
curl -I https://api.coupedeluniversite.fr/health

# Tester le frontend admin
curl -I https://admin.coupedeluniversite.fr

# Tester le frontend public
curl -I https://coupedeluniversite.fr
```

---

## 7. Pipeline CI/CD

### 7.1 Fonctionnement

Le pipeline `.github/workflows/ci-cd.yml` s'exécute automatiquement à chaque push sur `main` :

```
Push sur main
    ↓
┌─────────────────────────────────┐
│  1. Checkout du code            │
├─────────────────────────────────┤
│  2. Tests Backend (Python 3.13) │
│     - pip install               │
│     - pytest                    │
├─────────────────────────────────┤
│  3. Lint Frontend Admin         │
│     - npm ci                    │
│     - npm run lint              │
├─────────────────────────────────┤
│  4. Lint Frontend Public        │
│     - npm ci                    │
│     - npm run lint              │
├─────────────────────────────────┤
│  5. Déploiement SSH             │
│     - git pull                  │
│     - docker compose up --build │
└─────────────────────────────────┘
```

### 7.2 Déclencher un déploiement

```bash
# Depuis votre machine locale
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main
```

Le déploiement se fait automatiquement. Suivez la progression dans :
**GitHub** → **Actions** → Cliquez sur le workflow en cours

### 7.3 Déploiement manuel (si nécessaire)

```bash
ssh deploy@VOTRE_IP_VPS
cd /var/www/coupe-universitaire
git pull origin main
docker compose up -d --build
```

---

## 8. Maintenance

### 8.1 Voir les logs

```bash
# Tous les services
docker compose logs -f

# Un service spécifique
docker compose logs -f backend
docker compose logs -f frontend-admin
docker compose logs -f traefik
```

### 8.2 Redémarrer les services

```bash
# Redémarrer tous les services
docker compose restart

# Redémarrer un service spécifique
docker compose restart backend
```

### 8.3 Mettre à jour les images

```bash
# Reconstruire et redémarrer
docker compose up -d --build

# Nettoyer les anciennes images
docker image prune -f
```

### 8.4 Sauvegarder la base de données

```bash
# Créer une sauvegarde
cp /var/www/coupe-universitaire/data/coupe_ucl_2026.db /var/www/coupe-universitaire/data/backup_$(date +%Y%m%d).db

# Automatiser avec cron (optionnel)
crontab -e
# Ajouter : 0 2 * * * cp /var/www/coupe-universitaire/data/coupe_ucl_2026.db /var/www/coupe-universitaire/data/backup_$(date +\%Y\%m\%d).db
```

### 8.5 Renouveler les certificats

Si vous utilisez des certificats manuels, pensez à les renouveler avant expiration :

```bash
# Remplacer les certificats
sudo cp nouveau-certificat.pem /var/www/coupe-universitaire/certs/coupedeluniversite.pem
sudo cp nouvelle-cle.key /var/www/coupe-universitaire/certs/coupedeluniversite.key

# Redémarrer Traefik
docker compose restart traefik
```

---

## 9. Dépannage

### Problème : Les conteneurs ne démarrent pas

```bash
# Vérifier les logs
docker compose logs

# Vérifier la configuration
docker compose config

# Reconstruire depuis zéro
docker compose down
docker compose up -d --build
```

### Problème : Erreur SSL / certificats

```bash
# Vérifier que les certificats existent
ls -la /var/www/coupe-universitaire/certs/

# Vérifier les permissions
sudo chmod 600 /var/www/coupe-universitaire/certs/*

# Vérifier la validité du certificat
openssl x509 -in /var/www/coupe-universitaire/certs/coupedeluniversite.pem -text -noout
```

### Problème : 502 Bad Gateway

```bash
# Vérifier que les services backend/frontend tournent
docker compose ps

# Vérifier les logs des services
docker compose logs backend
docker compose logs frontend-admin

# Redémarrer les services
docker compose restart
```

### Problème : Pipeline GitHub échoue

1. Vérifier les secrets dans **Settings** → **Secrets**
2. Vérifier les logs dans **Actions** → Cliquer sur le workflow
3. Tester la connexion SSH manuellement :
```bash
ssh -i ~/.ssh/github_deploy_key deploy@VOTRE_IP_VPS
```

### Problème : Espace disque insuffisant

```bash
# Vérifier l'espace disque
df -h

# Nettoyer Docker
docker system prune -a -f
docker volume prune -f
```

### Problème : Base de données corrompue

```bash
# Restaurer depuis une sauvegarde
cp /var/www/coupe-universitaire/data/backup_YYYYMMDD.db /var/www/coupe-universitaire/data/coupe_ucl_2026.db

# Redémarrer le backend
docker compose restart backend
```

---

## Checklist de déploiement

- [ ] VPS configuré avec Docker
- [ ] Firewall configuré (ports 22, 80, 443)
- [ ] DNS configuré (domaine + sous-domaines)
- [ ] Certificats SSL en place
- [ ] Clé SSH de déploiement générée
- [ ] Secrets GitHub configurés
- [ ] Fichier `.env` créé sur le VPS
- [ ] Premier `docker compose up -d --build` réussi
- [ ] Tests des URLs (API, admin, public)
- [ ] Pipeline CI/CD testé

---

## Support

En cas de problème :
1. Consulter les logs : `docker compose logs -f`
2. Vérifier le statut : `docker compose ps`
3. Consulter la documentation Docker/Traefik
4. Ouvrir une issue sur le repository GitHub
