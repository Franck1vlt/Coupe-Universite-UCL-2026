#!/bin/bash
# ============================================
# Script de configuration - Coupe de l'Universite
# ============================================
# Usage: ./scripts/setup.sh [dev|prod]
#
# Ce script configure l'environnement apres un git clone

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup - Coupe de l'Universite UCL    ${NC}"
echo -e "${GREEN}========================================${NC}"

# Determiner le mode (dev ou prod)
MODE=${1:-dev}
echo -e "${YELLOW}Mode: $MODE${NC}"

# ============================================
# Verification des prerequis
# ============================================
echo ""
echo -e "${YELLOW}Verification des prerequis...${NC}"

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}[OK]${NC} Node.js: $NODE_VERSION"
else
    echo -e "${RED}[ERREUR]${NC} Node.js n'est pas installe"
    echo "  Installer Node.js 20+: https://nodejs.org/"
    exit 1
fi

# npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}[OK]${NC} npm: $NPM_VERSION"
else
    echo -e "${RED}[ERREUR]${NC} npm n'est pas installe"
    exit 1
fi

# Python (optionnel pour dev local sans Docker)
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}[OK]${NC} $PYTHON_VERSION"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    echo -e "${GREEN}[OK]${NC} $PYTHON_VERSION"
else
    echo -e "${YELLOW}[WARN]${NC} Python non trouve (necessaire pour dev backend local)"
fi

# Podman (pour prod)
if [ "$MODE" = "prod" ]; then
    if command -v podman &> /dev/null; then
        PODMAN_VERSION=$(podman --version)
        echo -e "${GREEN}[OK]${NC} $PODMAN_VERSION"
    else
        echo -e "${RED}[ERREUR]${NC} Podman n'est pas installe (requis pour prod)"
        echo "  Installer Podman: https://podman.io/getting-started/installation"
        exit 1
    fi

    if command -v podman-compose &> /dev/null; then
        echo -e "${GREEN}[OK]${NC} Podman Compose"
    else
        echo -e "${RED}[ERREUR]${NC} Podman Compose n'est pas installe"
        echo "  Installer: pip install podman-compose"
        exit 1
    fi
fi

# ============================================
# Configuration du fichier .env
# ============================================
echo ""
echo -e "${YELLOW}Configuration de l'environnement...${NC}"

if [ ! -f ".env" ]; then
    echo "Creation du fichier .env depuis .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}[IMPORTANT]${NC} Editez le fichier .env avec vos valeurs de production!"
    echo "  - DOMAIN=coupedeluniversite.fr"
    echo "  - SECRET_KEY (generer avec: openssl rand -hex 32)"
    echo "  - AUTH_SECRET (generer avec: openssl rand -base64 32)"
    echo "  - ADMIN_PASSWORD, STAFF_PASSWORD"
else
    echo -e "${GREEN}[OK]${NC} Fichier .env existe deja"
fi

# ============================================
# Installation des dependances Frontend
# ============================================
echo ""
echo -e "${YELLOW}Installation des dependances frontend...${NC}"

# Frontend Admin
echo "Installation frontend-admin..."
cd frontend-admin
npm ci
cd ..
echo -e "${GREEN}[OK]${NC} frontend-admin"

# Frontend Public
echo "Installation frontend-public..."
cd frontend-public
npm ci
cd ..
echo -e "${GREEN}[OK]${NC} frontend-public"

# ============================================
# Installation des dependances Backend (dev uniquement)
# ============================================
if [ "$MODE" = "dev" ]; then
    echo ""
    echo -e "${YELLOW}Installation des dependances backend...${NC}"

    cd Backend

    # Creer un environnement virtuel si necessaire
    if [ ! -d "venv" ]; then
        echo "Creation de l'environnement virtuel Python..."
        python3 -m venv venv || python -m venv venv
    fi

    # Activer le venv et installer les dependances
    echo "Installation des packages Python..."
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    else
        source venv/Scripts/activate
    fi
    pip install -r requirements.txt
    deactivate

    cd ..
    echo -e "${GREEN}[OK]${NC} Backend Python"
fi

# ============================================
# Verification de la base de donnees
# ============================================
echo ""
echo -e "${YELLOW}Verification de la base de donnees...${NC}"

mkdir -p Backend/data

if [ -f "Backend/data/coupe_ucl_2026.db" ]; then
    echo -e "${GREEN}[OK]${NC} Base de donnees trouvee"
else
    echo -e "${YELLOW}[INFO]${NC} Base de donnees non trouvee"
    echo "  Elle sera creee automatiquement au premier demarrage du backend"
fi

# ============================================
# Mode Production: Verification des certificats
# ============================================
if [ "$MODE" = "prod" ]; then
    echo ""
    echo -e "${YELLOW}Verification des certificats SSL...${NC}"

    if [ -f "traefik/certs/coupedeluniversite.pem" ] && [ -f "traefik/certs/coupedeluniversite.key" ]; then
        echo -e "${GREEN}[OK]${NC} Certificats SSL trouves"
    else
        echo -e "${RED}[ERREUR]${NC} Certificats SSL non trouves!"
        echo "  Placez vos certificats dans traefik/certs/"
        echo "  - coupedeluniversite.pem"
        echo "  - coupedeluniversite.key"
    fi
fi

# ============================================
# Resume
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Configuration terminee!              ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ "$MODE" = "dev" ]; then
    echo "Pour demarrer en developpement:"
    echo ""
    echo "  Backend:"
    echo "    cd Backend && source venv/bin/activate"
    echo "    uvicorn app.main:app --reload --port 8000"
    echo ""
    echo "  Frontend Admin:"
    echo "    cd frontend-admin && npm run dev"
    echo ""
    echo "  Frontend Public:"
    echo "    cd frontend-public && npm run dev"
else
    echo "Pour deployer en production (avec Podman):"
    echo ""
    echo "  1. Verifiez le fichier .env"
    echo "  2. Lancez: pc -f docker-compose.yml up -d --build"
    echo ""
    echo "  Alias configures sur le VPS:"
    echo "    p  = podman"
    echo "    pc = podman-compose"
    echo ""
    echo "URLs:"
    echo "  - https://coupedeluniversite.fr (public)"
    echo "  - https://admin.coupedeluniversite.fr (admin)"
    echo "  - https://api.coupedeluniversite.fr (API)"
fi
