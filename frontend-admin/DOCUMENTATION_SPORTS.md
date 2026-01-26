# Documentation Table de Marquage — Sports

Ce document décrit les tables de marquage pour chaque sport géré par l'application de la Coupe de l'Université UCL.

---

## Vue d'ensemble

| Sport | Type de score | Unité | Spécificités |
|-------|--------------|-------|--------------|
| **Basketball** | Points | 1, 2, 3 pts | Shot clock, fautes techniques, 2 périodes |
| **Football** | Buts | 1 but | Cartons jaunes/rouges, 2 mi-temps |
| **Handball** | Buts | 1 but | Cartons jaunes/rouges, 2 mi-temps |
| **Volleyball** | Sets/Points | 25 pts/set | Service, meilleur des X sets |
| **Badminton** | Sets/Points | 21 pts/set | Service, meilleur des X sets |
| **Pétanque** | Points | 1-6 pts/mène | Mènes, cochonnet, score cible |
| **Fléchettes** | Points | 501 dégressif | Volées, multiplicateurs, BUST |

---

## Basketball

### Interface de la Table de Marque

La table de marque permet de gérer le déroulement d'un match de basket-ball via une interface numérique.

### Chrono principal
- **Affichage** : Temps restant dans la période (mi-temps).
- **Boutons associés** :
  - **Démarrer / Arrêter** : Lance ou arrête le chrono principal.
  - **+1s** : Ajoute une seconde au chrono principal (utile pour corriger une erreur ou ajuster le temps).

### Shot Clock (SC)
- **Définition** : Compteur de possession, généralement 24 secondes (peut être réinitialisé à 14s selon la situation).
- **Boutons associés** :
  - **Masquer SC / Afficher SC** : Permet de masquer ou d'afficher le shot clock à l'écran.
  - **Pause SC / Reprendre SC** : Met le shot clock en pause ou le relance.
  - **Reset SC** : Remet le shot clock à 24 secondes et le démarre.
  - **Reset SC Smart** : Remet le shot clock à 24s ou 14s selon la situation de jeu (rebond offensif, faute, etc.).
  - **+1s SC** : Ajoute une seconde au shot clock.

### Score et équipes
- **Sélection des équipes** : Choix des équipes A et B via menu déroulant.
- **Boutons associés** :
  - **+1 / +2 / +3** : Ajoute 1, 2 ou 3 points à l'équipe sélectionnée.
  - **-1 / -2 / -3** : Retire 1, 2 ou 3 points à l'équipe sélectionnée (correction d'erreur).
  - **Swap Sides** : Permute l'affichage des équipes (utile à la mi-temps).

### Fautes et sanctions
- **Fautes techniques** :
  - **+1 faute technique** : Ajoute une faute technique à l'équipe ou au joueur concerné.
  - **-1 faute technique** : Retire une faute technique (correction).

### Période
- **Affichage** : MT1 (première mi-temps), MT2 (seconde mi-temps).
- **Bouton associé** : Permet de passer à la période suivante.

### Autres termes
- **Type de match** : Sélection du type (poule, finale, etc.).
- **Terrain** : Sélection du terrain où se joue le match.
- **Buzzer** : Déclenche un signal sonore (fin de période, fin de possession).

---

## Football

### Interface de la Table de Marque

La table de marque football permet de gérer le déroulement d'un match via une interface numérique.

### Chrono principal
- **Affichage** : Temps écoulé ou restant dans la période (mi-temps).
- **Boutons associés** :
  - **Démarrer / Arrêter** : Lance ou arrête le chrono principal.
  - **+1s** : Ajoute une seconde au chrono principal (correction ou ajustement).
  - **Mi-temps / Fin de match** : Permet de passer à la mi-temps ou de terminer le match.

### Score et équipes
- **Sélection des équipes** : Choix des équipes A et B via menu déroulant.
- **Boutons associés** :
  - **+1 / +2 / +3** : Ajoute 1, 2 ou 3 buts à l'équipe sélectionnée.
  - **-1 / -2 / -3** : Retire 1, 2 ou 3 buts à l'équipe sélectionnée (correction d'erreur).
  - **Swap Sides** : Permute l'affichage des équipes (utile à la mi-temps).

### Cartons et sanctions
- **Cartons jaunes / rouges** :
  - **+1 jaune / +1 rouge** : Ajoute un carton jaune ou rouge à l'équipe ou au joueur concerné.
  - **-1 jaune / -1 rouge** : Retire un carton (correction).

### Période
- **Affichage** : MT1 (première mi-temps), MT2 (seconde mi-temps).
- **Bouton associé** : Permet de passer à la période suivante via un toggle switch.

### Autres termes
- **Type de match** : Sélection du type (poule, finale, etc.).
- **Terrain** : Sélection du terrain où se joue le match.

---

## Handball

### Interface de la Table de Marque

La table de marque handball fonctionne de manière similaire au football.

### Chrono principal
- **Affichage** : Temps écoulé dans la période.
- **Boutons associés** :
  - **Start** : Démarre le chrono et passe le match en statut "en cours".
  - **Stop** : Arrête le chrono.
  - **+1s** : Ajoute une seconde au chrono.
  - **Réglage manuel** : Champs minutes/secondes pour ajuster le chrono.

### Score et équipes
- **Affichage** : Score affiché au format "Team A X - Y Team B".
- **Boutons associés** :
  - **+** : Ajoute un but à l'équipe.
  - **-** : Retire un but (correction).
  - **Swipe** : Permute les équipes.

### Cartons et sanctions
- **Cartons jaunes** : Boutons +/- pour chaque équipe (fond jaune).
- **Cartons rouges** : Boutons +/- pour chaque équipe (fond rouge).

### Période
- **Toggle MT1/MT2** : Switch pour basculer entre les mi-temps.

### Boutons de contrôle
- **Retour** : Revient à la page précédente.
- **Spectateurs** : Ouvre la vue spectateur dans un nouvel onglet.
- **END** : Termine le match et propage les résultats.

---

## Volleyball

### Interface de la Table de Marque

Le volleyball utilise un système de sets avec gestion du service.

### Affichage principal
- **Sets** : Affichage "X - Y" du nombre de sets gagnés par chaque équipe.
- **Points** : Score du set en cours.
- **Service** : Icône de balle indiquant quelle équipe a le service.

### Score et équipes
- **Sélection des équipes** : Choix des équipes A et B.
- **Nombre de sets** : Configuration du nombre de sets à jouer.
- **Boutons associés** :
  - **+/-** : Ajoute ou retire un point à l'équipe.
  - **Service** : Change l'équipe au service.
  - **Swipe** : Permute l'affichage des équipes.

### Chrono (Pause)
- Timer de pause entre les sets.
- **Start Timer / Stop / Reset** : Contrôle du chrono de pause.

### Boutons de contrôle
- **Start Match** : Démarre le match (statut "en cours").
- **END** : Termine le match, soumet le résultat et redirige vers le tournoi.

---

## Badminton

### Interface de la Table de Marque

Le badminton utilise un système de sets avec gestion du service, similaire au volleyball.

### Affichage principal
- **Sets** : Affichage "X - Y" du nombre de sets gagnés.
- **Points** : Score du set en cours (jusqu'à 21 points).
- **Service** : Icône de volant indiquant l'équipe au service.

### Score et équipes
- **Nombre de sets** : Configuration du nombre de sets (généralement 3).
- **Boutons associés** :
  - **+/-** : Ajoute ou retire un point.
  - **Service** : Change le service.
  - **Swipe** : Permute les équipes.

### Chrono (Pause)
- Timer pour les pauses entre sets.
- Contrôles identiques au volleyball.

### Boutons de contrôle
- **Start Match** : Démarre le match.
- **END** : Termine et soumet les résultats.

---

## Pétanque

### Interface de la Table de Marque

La pétanque utilise un système de mènes avec attribution de points.

### Affichage principal
- **Score** : Points totaux de chaque équipe.
- **Cochonnet** : Icône indiquant quelle équipe lance le cochonnet.
- **Mène en cours** : Numéro de la mène actuelle.
- **Score cible** : Nombre de points pour gagner (configurable, généralement 13).

### Système de mène
1. **Sélection du gagnant** : Boutons pour choisir l'équipe gagnante de la mène.
2. **Attribution des points** : Boutons 1 à 6 pour le nombre de points.
3. **Validation** : Bouton "Valider mène" pour confirmer.
4. **Annulation** : Bouton "Annuler" pour corriger.

### Configuration
- **Points par match** : Réglage du score cible (1-21 points).

### Boutons de contrôle
- **Start** : Démarre le match.
- **Service** : Change l'équipe qui lance le cochonnet.
- **Swipe** : Permute les équipes.
- **Reset** : Réinitialise le set.
- **END** : Termine le match.

---

## Fléchettes

### Interface de la Table de Marque

Les fléchettes utilisent un système de 501 points dégressif avec sets.

### Affichage principal
- **Score** : Points restants pour chaque équipe (commence à 501).
- **Sets** : Nombre de sets gagnés "X - Y".
- **Joueur actuel** : Indication de qui doit jouer.
- **Volée en cours** : Affichage des lancers de la volée actuelle.

### Mode de jeu
- **BO3** : Best of 3 (2 sets gagnants).
- **BO5** : Best of 5 (3 sets gagnants).

### Système de lancer
1. **Points (1-20)** : Boutons pour chaque valeur de cible.
2. **Bull (25)** : Centre simple.
3. **Bull Double (50)** : Centre double (bullseye).
4. **Manqué** : Enregistre un lancer raté (0 point).

### Multiplicateurs
- **x1 (Simple)** : Valeur normale.
- **x2 (Double)** : Double la valeur du dernier lancer.
- **x3 (Triple)** : Triple la valeur du dernier lancer.

### Actions de volée
- **Annuler dernière** : Annule le dernier lancer de la volée.
- **BUST** : Déclare un dépassement (score revient au début de la volée).
- **Valider volée** : Confirme la volée et passe au joueur suivant.

### Boutons de contrôle
- **Start** : Démarre le match.
- **Mode de jeu** : Bascule entre BO3 et BO5.
- **Swipe** : Permute les équipes.
- **Reset Set** : Réinitialise le set en cours.
- **END** : Termine le match.

---

## Bonnes pratiques générales

1. **Vérification** : Toujours vérifier l'exactitude des scores avant validation.
2. **Corrections** : Utiliser les boutons de correction (+1s, -1, etc.) en cas d'erreur.
3. **Statut du match** : S'assurer de démarrer le match avant de comptabiliser les points.
4. **Fin de match** : Cliquer sur END uniquement quand le match est terminé.
5. **Vue spectateur** : Utiliser le bouton "Spectateurs" pour afficher le score au public.

---

## Statuts des matchs

| Statut | Description |
|--------|-------------|
| `planifié` | Match programmé, pas encore commencé |
| `en-cours` | Match en cours de jeu |
| `terminé` | Match terminé, résultat enregistré |
| `annulé` | Match annulé |

---

## Types de match

| Type | Phase |
|------|-------|
| `Qualification` | Tour de qualification |
| `Poule` | Phase de poules |
| `Quart de finale` | Quarts de finale |
| `Demi-finale` | Demi-finales |
| `Petite Finale` | Match pour la 3ème place |
| `Finale` | Match final |

---

> Cette documentation est destinée aux officiels et bénévoles en charge des tables de marque lors du tournoi Coupe Université UCL. Pour toute question, se référer à l'organisation ou au règlement officiel du tournoi.
