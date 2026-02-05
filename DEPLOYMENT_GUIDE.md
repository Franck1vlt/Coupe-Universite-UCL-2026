# Guide de Deploiement - Coupe de l'Universite UCL 2026

Ce guide explique comment deployer l'application sur un VPS avec le domaine `coupedeluniversite.fr`.

**Stack:** Podman + Podman Compose + Traefik

---

## 1. Configuration DNS

Configurez ces enregistrements DNS chez votre registrar (OVH, Gandi, etc.):

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | @ | `IP_DE_VOTRE_VPS` | 3600 |
| A | admin | `IP_DE_VOTRE_VPS` | 3600 |
| A | api | `IP_DE_VOTRE_VPS` | 3600 |
| A | traefik | `IP_DE_VOTRE_VPS` | 3600 (optionnel) |

**Resultat:**
- `coupedeluniversite.fr` -> Frontend Public
- `admin.coupedeluniversite.fr` -> Frontend Admin
- `api.coupedeluniversite.fr` -> Backend API
- `traefik.coupedeluniversite.fr` -> Dashboard Traefik (optionnel)

---

## 2. Preparation du VPS

### 2.1 Prerequis

```bash
# Mise a jour du systeme
sudo apt update && sudo apt upgrade -y

# Installation de Podman
sudo apt install podman -y

# Installation de Podman Compose
pip install podman-compose

# Creer les alias (ajouter dans ~/.bashrc)
echo 'alias p="podman"' >> ~/.bashrc
echo 'alias pc="podman-compose"' >> ~/.bashrc
source ~/.bashrc

# Installation de Git
sudo apt install git -y

# Activer le socket Podman pour l'utilisateur
systemctl --user enable podman.socket
systemctl --user start podman.socket
```

### 2.2 Configuration du firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2.3 Verifier le socket Podman

```bash
# Le socket doit etre actif
ls -la /run/user/$(id -u)/podman/podman.sock

# Si le chemin est different, ajuster dans docker-compose.yml
```

---

## 3. Deploiement Initial

### 3.1 Cloner le projet

```bash
cd ~
git clone https://github.com/VOTRE_USERNAME/Coupe-Universite-UCL-2026.git coupe-universite-ucl-2026
cd coupe-universite-ucl-2026
```

### 3.2 Configurer l'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Generer les secrets
SECRET_KEY=$(openssl rand -hex 32)
AUTH_SECRET=$(openssl rand -base64 32)

echo "SECRET_KEY: $SECRET_KEY"
echo "AUTH_SECRET: $AUTH_SECRET"

# Editer le fichier .env
nano .env
```

**Contenu du fichier `.env`:**

```env
DOMAIN=coupedeluniversite.fr

# Secrets (utiliser les valeurs generees ci-dessus)
SECRET_KEY=votre_secret_key_genere
AUTH_SECRET=votre_auth_secret_genere

# Credentials admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=VotreMotDePasseAdmin123!

STAFF_USERNAME=staff
STAFF_PASSWORD=VotreMotDePasseStaff123!
```

### 3.3 Verifier les certificats SSL

```bash
# Les certificats doivent etre dans traefik/certs/
ls -la traefik/certs/
# coupedeluniversite.pem
# coupedeluniversite.key
```

### 3.4 Lancer le deploiement

```bash
# Avec l'alias pc (podman-compose)
pc -f docker-compose.yml up -d --build

# Verifier les logs
pc -f docker-compose.yml logs -f

# Verifier le status
pc -f docker-compose.yml ps
```

---

## 4. Configuration GitHub Actions (CI/CD)

### 4.1 Creer une cle SSH pour le deploiement

Sur votre machine locale:

```bash
# Generer une paire de cles
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# Afficher la cle publique (a ajouter sur le VPS)
cat ~/.ssh/github_deploy.pub

# Afficher la cle privee (a ajouter dans GitHub Secrets)
cat ~/.ssh/github_deploy
```

### 4.2 Configurer le VPS

```bash
# Sur le VPS, ajouter la cle publique
nano ~/.ssh/authorized_keys
# Coller la cle publique

# Verifier les permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 4.3 Configurer GitHub Secrets

Dans votre repo GitHub: **Settings > Secrets and variables > Actions**

Ajouter ces secrets:

| Secret | Valeur |
|--------|--------|
| `SSH_HOST` | IP de votre VPS (ex: `203.0.113.50`) |
| `SSH_USER` | Utilisateur SSH (ex: `ubuntu` ou `root`) |
| `SSH_PRIVATE_KEY` | Contenu complet de la cle privee |

---

## 5. Maintenance

### 5.1 Voir les logs

```bash
# Tous les services
pc -f docker-compose.yml logs -f

# Un service specifique
pc -f docker-compose.yml logs -f backend
pc -f docker-compose.yml logs -f frontend-admin
pc -f docker-compose.yml logs -f traefik
```

### 5.2 Redemarrer un service

```bash
pc -f docker-compose.yml restart backend
```

### 5.3 Mettre a jour manuellement

```bash
cd ~/coupe-universite-ucl-2026
git pull origin main
pc -f docker-compose.yml up -d --build
```

### 5.4 Backup de la base de donnees

```bash
# La BDD est dans un volume Podman nomme
# Lister les volumes
p volume ls

# Localiser le volume backend-data
p volume inspect coupe-universite-ucl-2026_backend-data

# Creer un backup depuis le container
pc -f docker-compose.yml exec backend cp /app/data/coupe_ucl_2026.db /app/data/backup_$(date +%Y%m%d).db

# Ou copier depuis le volume vers l'hote
p cp coupe-backend:/app/data/coupe_ucl_2026.db ./backup_$(date +%Y%m%d).db
```

### 5.5 Restaurer un backup

```bash
# Arreter le backend
pc -f docker-compose.yml stop backend

# Copier le backup dans le container
p cp ./backup_YYYYMMDD.db coupe-backend:/app/data/coupe_ucl_2026.db

# Redemarrer
pc -f docker-compose.yml start backend
```

### 5.6 Importer une BDD existante

Si vous avez une BDD locale a importer sur le VPS:

```bash
# Depuis votre machine locale, copier la BDD sur le VPS
scp Backend/data/coupe_ucl_2026.db user@VPS_IP:~/coupe-universite-ucl-2026/

# Sur le VPS, copier dans le volume
pc -f docker-compose.yml stop backend
p cp ~/coupe-universite-ucl-2026/coupe_ucl_2026.db coupe-backend:/app/data/
pc -f docker-compose.yml start backend
```

---

## 6. Troubleshooting

### Le site n'est pas accessible

1. Verifier que les DNS sont propages:
   ```bash
   nslookup coupedeluniversite.fr
   nslookup admin.coupedeluniversite.fr
   nslookup api.coupedeluniversite.fr
   ```

2. Verifier que les containers tournent:
   ```bash
   pc -f docker-compose.yml ps
   ```

3. Verifier les logs Traefik:
   ```bash
   pc -f docker-compose.yml logs traefik
   ```

### Erreur Socket Podman

Si Traefik ne peut pas se connecter au socket:

```bash
# Verifier le chemin du socket
ls -la /run/user/$(id -u)/podman/podman.sock

# Ajuster le chemin dans docker-compose.yml si necessaire
# Ligne: /run/user/1000/podman/podman.sock:/var/run/docker.sock:ro
```

### Erreur SSL/Certificat

1. Verifier que les certificats existent:
   ```bash
   ls -la traefik/certs/
   ```

2. Verifier que les noms correspondent dans `traefik/traefik.yml`

### Erreur de connexion a la base de donnees

1. Verifier que le volume existe:
   ```bash
   p volume ls | grep backend-data
   ```

2. Verifier le contenu du volume:
   ```bash
   pc -f docker-compose.yml exec backend ls -la /app/data/
   ```

### Le CI/CD echoue

1. Verifier les secrets GitHub (SSH_HOST, SSH_USER, SSH_PRIVATE_KEY)
2. Verifier que les alias `pc` sont disponibles dans le shell non-interactif
3. Tester la connexion SSH manuellement

---

## 7. URLs de Production

| Service | URL |
|---------|-----|
| Site public | https://coupedeluniversite.fr |
| Admin | https://admin.coupedeluniversite.fr |
| API | https://api.coupedeluniversite.fr |
| API Docs | https://api.coupedeluniversite.fr/docs |
| Traefik Dashboard | https://traefik.coupedeluniversite.fr (si active) |

---

## 8. Checklist de Deploiement

- [ ] DNS configures (A records pour @, admin, api)
- [ ] VPS prepare (Podman, podman-compose, firewall)
- [ ] Alias configures (`p` et `pc`)
- [ ] Socket Podman actif
- [ ] Projet clone sur le VPS
- [ ] Fichier `.env` configure avec les secrets
- [ ] Certificats SSL dans `traefik/certs/`
- [ ] `pc -f docker-compose.yml up -d --build` execute
- [ ] Sites accessibles via HTTPS
- [ ] GitHub Secrets configures (SSH_HOST, SSH_USER, SSH_PRIVATE_KEY)
- [ ] CI/CD teste avec un push sur main
- [ ] BDD importee si necessaire

---

## 9. Commandes Rapides

```bash
# Alias
p = podman
pc = podman-compose

# Demarrer
pc -f docker-compose.yml up -d --build

# Arreter
pc -f docker-compose.yml down

# Logs
pc -f docker-compose.yml logs -f

# Status
pc -f docker-compose.yml ps

# Rebuild un service
pc -f docker-compose.yml up -d --build backend

# Entrer dans un container
pc -f docker-compose.yml exec backend bash
```
