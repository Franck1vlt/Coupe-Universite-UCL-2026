# ============================================
# Script de configuration - Coupe de l'Universite
# ============================================
# Usage: .\scripts\setup.ps1 [-Mode dev|prod]
#
# Ce script configure l'environnement apres un git clone

param(
    [string]$Mode = "dev"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup - Coupe de l'Universite UCL    " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Mode: $Mode" -ForegroundColor Yellow

# ============================================
# Verification des prerequis
# ============================================
Write-Host ""
Write-Host "Verification des prerequis..." -ForegroundColor Yellow

# Node.js
try {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Node.js n'est pas installe" -ForegroundColor Red
    Write-Host "  Installer Node.js 20+: https://nodejs.org/"
    exit 1
}

# npm
try {
    $npmVersion = npm -v
    Write-Host "[OK] npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] npm n'est pas installe" -ForegroundColor Red
    exit 1
}

# Python
try {
    $pythonVersion = python --version
    Write-Host "[OK] $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Python non trouve (necessaire pour dev backend local)" -ForegroundColor Yellow
}

# Docker (pour prod)
if ($Mode -eq "prod") {
    try {
        $dockerVersion = docker --version
        Write-Host "[OK] $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "[ERREUR] Docker n'est pas installe (requis pour prod)" -ForegroundColor Red
        exit 1
    }

    try {
        docker compose version | Out-Null
        Write-Host "[OK] Docker Compose" -ForegroundColor Green
    } catch {
        Write-Host "[ERREUR] Docker Compose n'est pas installe" -ForegroundColor Red
        exit 1
    }
}

# ============================================
# Configuration du fichier .env
# ============================================
Write-Host ""
Write-Host "Configuration de l'environnement..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host "Creation du fichier .env depuis .env.example..."
    Copy-Item ".env.example" ".env"
    Write-Host "[IMPORTANT] Editez le fichier .env avec vos valeurs!" -ForegroundColor Yellow
    Write-Host "  - DOMAIN=coupedeluniversite.fr"
    Write-Host "  - SECRET_KEY, AUTH_SECRET"
    Write-Host "  - ADMIN_PASSWORD, STAFF_PASSWORD"
} else {
    Write-Host "[OK] Fichier .env existe deja" -ForegroundColor Green
}

# ============================================
# Installation des dependances Frontend
# ============================================
Write-Host ""
Write-Host "Installation des dependances frontend..." -ForegroundColor Yellow

# Frontend Admin
Write-Host "Installation frontend-admin..."
Set-Location frontend-admin
npm ci
Set-Location ..
Write-Host "[OK] frontend-admin" -ForegroundColor Green

# Frontend Public
Write-Host "Installation frontend-public..."
Set-Location frontend-public
npm ci
Set-Location ..
Write-Host "[OK] frontend-public" -ForegroundColor Green

# ============================================
# Installation des dependances Backend (dev uniquement)
# ============================================
if ($Mode -eq "dev") {
    Write-Host ""
    Write-Host "Installation des dependances backend..." -ForegroundColor Yellow

    Set-Location Backend

    # Creer un environnement virtuel si necessaire
    if (-not (Test-Path "venv")) {
        Write-Host "Creation de l'environnement virtuel Python..."
        python -m venv venv
    }

    # Installer les dependances
    Write-Host "Installation des packages Python..."
    & .\venv\Scripts\pip install -r requirements.txt

    Set-Location ..
    Write-Host "[OK] Backend Python" -ForegroundColor Green
}

# ============================================
# Verification de la base de donnees
# ============================================
Write-Host ""
Write-Host "Verification de la base de donnees..." -ForegroundColor Yellow

if (-not (Test-Path "Backend\data")) {
    New-Item -ItemType Directory -Path "Backend\data" -Force | Out-Null
}

if (Test-Path "Backend\data\coupe_ucl_2026.db") {
    Write-Host "[OK] Base de donnees trouvee" -ForegroundColor Green
} else {
    Write-Host "[INFO] Base de donnees non trouvee" -ForegroundColor Yellow
    Write-Host "  Elle sera creee automatiquement au premier demarrage du backend"
}

# ============================================
# Resume
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Configuration terminee!              " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

if ($Mode -eq "dev") {
    Write-Host "Pour demarrer en developpement:"
    Write-Host ""
    Write-Host "  Backend:"
    Write-Host "    cd Backend"
    Write-Host "    .\venv\Scripts\activate"
    Write-Host "    uvicorn app.main:app --reload --port 8000"
    Write-Host ""
    Write-Host "  Frontend Admin:"
    Write-Host "    cd frontend-admin && npm run dev"
    Write-Host ""
    Write-Host "  Frontend Public:"
    Write-Host "    cd frontend-public && npm run dev"
    Write-Host ""
    Write-Host "  Ou avec Docker (dev):"
    Write-Host "    docker compose up -d"
} else {
    Write-Host "Pour deployer en production:"
    Write-Host ""
    Write-Host "  1. Verifiez le fichier .env"
    Write-Host "  2. Lancez: docker compose -f docker-compose.yml up -d --build"
    Write-Host ""
    Write-Host "URLs:"
    Write-Host "  - https://coupedeluniversite.fr (public)"
    Write-Host "  - https://admin.coupedeluniversite.fr (admin)"
    Write-Host "  - https://api.coupedeluniversite.fr (API)"
}
