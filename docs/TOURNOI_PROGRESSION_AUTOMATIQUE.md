# 🏆 Système de Tournoi avec Progression Automatique

## Vue d'ensemble

Ce système permet de créer et gérer des tournois complexes avec progression automatique des équipes à travers différentes phases :
- **Qualifications** : Matchs préliminaires
- **Poules** : Groupes de plusieurs équipes avec classement
- **Phase Finale** : Brackets à élimination directe (quarts, demi, finale)
- **Loser Bracket** : Repêchage pour les perdants

## 🎯 Fonctionnalités Clés

### 1. Résolution Dynamique des Équipes

Le système utilise des **codes dynamiques** pour référencer les équipes qui avancent automatiquement :

#### Codes de Vainqueurs de Qualifications
- `WQ1`, `WQ2`, `WQ3`, etc. = Vainqueur du match de qualification 1, 2, 3...

#### Codes de Classement de Poules
- `Poule A-1` = 1er de la Poule A
- `Poule A-2` = 2ème de la Poule A
- `P1-1` = 1er de la poule "P1"

#### Codes de Brackets (Phase Finale)
- `WQF1`, `WQF2`, etc. = Vainqueur du quart de finale 1, 2...
- `WSF1`, `WSF2` = Vainqueur de la demi-finale 1, 2
- `WF` = Vainqueur de la finale
- `WPF` = Vainqueur de la petite finale
- `LQF1`, `LSF1`, etc. = Perdant du quart/demi...

#### Codes de Loser Bracket
- `WLR1-1`, `WLR1-2` = Vainqueur du loser round 1, match 1, 2...
- `WLF` = Vainqueur de la finale loser bracket

### 2. Propagation Automatique des Résultats

Quand un match est marqué comme **"terminé"** avec des scores :
- Le **vainqueur** avance automatiquement vers le match suivant configuré
- Le **perdant** va au loser bracket si configuré
- Les **classements de poules** sont recalculés automatiquement
- Les **points** sont attribués selon la configuration

### 3. Calcul du Classement des Poules

Le classement est calculé automatiquement selon :
1. **Points** : 3 pour une victoire, 1 pour un nul, 0 pour une défaite
2. **Différence de buts** en cas d'égalité de points

## 📋 Exemples d'Utilisation

### Exemple 1 : Qualifications → Phase Finale Simple

**Configuration :**
1. Créer 2 matchs de qualifications avec codes `WQ1` et `WQ2`
2. Créer une Phase Finale avec seulement "Finale" activée
3. Dans la Phase Finale, sélectionner `WQ1` et `WQ2` comme équipes

**Résultat :**
- Quand les 2 matchs de qualifications sont terminés
- Les vainqueurs apparaissent automatiquement dans la finale
- Le vainqueur de la finale reçoit les points configurés

### Exemple 2 : Poule → Finale Directe

**Configuration :**
1. Créer une Poule avec 6 équipes
2. Configurer "2 qualifiés pour la phase finale"
3. Créer une Phase Finale avec seulement "Finale" activée
4. Sélectionner `Poule 1-1` et `Poule 1-2` dans la Phase Finale

**Résultat :**
- Les matchs de poule sont générés automatiquement
- Quand tous les matchs sont terminés, le classement est calculé
- Les 1er et 2ème vont automatiquement en finale

### Exemple 3 : Poule → Phase Finale + Loser Bracket

**Configuration :**
1. Créer une Poule avec 8 équipes
2. Configurer "4 qualifiés pour la phase finale"
3. Créer une Phase Finale avec "Demi-finales" et "Finale"
   - Sélectionner `Poule 1-1`, `Poule 1-2`, `Poule 1-3`, `Poule 1-4`
   - Activer "Les perdants vont au loser bracket"
4. Créer un Loser Bracket
   - Sélectionner les codes de perdants (ex: `LSF1`, `LSF2`)

**Résultat :**
- Le top 4 de la poule va en demi-finales
- Les perdants des demi vont au loser bracket
- Les vainqueurs des demi vont en finale

### Exemple 4 : Tournoi Complet avec Repêchage

**Configuration :**
1. **Qualifications** : 4 matchs → `WQ1`, `WQ2`, `WQ3`, `WQ4`
2. **Poule** : Les 4 vainqueurs des qualifs forment la poule
   - Top 2 qualifiés pour la phase finale
3. **Phase Finale** : 
   - Demi-finales avec `Poule 1-1` et `Poule 1-2`
   - Finale
   - Petite finale (pour 3ème place)
4. **Loser Bracket** :
   - 3ème et 4ème de la poule
   - Perdants des demi-finales
   - Match pour 5ème place

## 🔧 Comment Utiliser

### Configuration du Tournoi

1. **Page de Configuration** (`/configuration-coupe/tournaments/[id]`)
   - Glisser-déposer les tuiles depuis la palette
   - Configurer chaque phase (équipes, rounds, points)
   - Cliquer sur "Enregistrer" pour sauvegarder

2. **Configuration des Équipes**
   - Pour les matchs simples : sélectionner les équipes depuis la liste
   - Pour les phases automatiques : utiliser les codes (WQ1, P1-1, etc.)

3. **Configuration des Points**
   - Définir les points pour vainqueur/perdant de chaque phase
   - Ces points sont cumulés dans le classement final

### Gestion des Matchs

1. **Planifier un match** :
   - Définir date, heure, terrain
   - Statut automatiquement "planifié"

2. **Terminer un match** :
   - Changer le statut à "terminé"
   - Entrer les scores finaux
   - ✅ La propagation se fait automatiquement !

### Visualisation

1. **Cliquer sur "Visualiser"** depuis la page de configuration
2. **Onglet "Bracket"** :
   - Voir tous les matchs organisés par phase
   - Classements des poules en temps réel
   - Codes résolus en noms d'équipes réels
3. **Onglet "Classement"** :
   - Classement final de toutes les équipes
   - Points cumulés de toutes les phases

## 💡 Bonnes Pratiques

### Organisation des Codes

- Numérotez les qualifications de façon cohérente (WQ1, WQ2, WQ3...)
- Nommez les poules clairement (Poule A, Poule B, Groupe 1...)
- Utilisez les codes standards pour les brackets (WQF1, WSF1, WF...)

### Points et Récompenses

- **Exemple de système de points** :
  - Vainqueur finale : 100 points
  - Perdant finale : 70 points
  - Vainqueur petite finale : 60 points
  - Perdant petite finale : 50 points
  - Perdants demi-finales : 40 points

### Gestion des Poules

- Minimum 3 équipes par poule (sinon un seul match)
- Bien définir le nombre de qualifiés avant de créer la phase suivante
- Tous les matchs de la poule doivent être terminés pour un classement fiable

## 🔍 Résolution de Problèmes

### Les équipes n'apparaissent pas automatiquement

- Vérifier que le match précédent est bien "terminé"
- Vérifier que les scores sont saisis
- Vérifier que les codes correspondent (WQ1 dans le match ET dans la destination)

### Le classement de poule n'est pas correct

- S'assurer que tous les matchs sont terminés
- Vérifier que les scores sont corrects
- Le système utilise : Points (3/1/0) puis différence de buts

### Les points ne s'affichent pas dans le classement

- Vérifier que les champs "Points vainqueur/perdant" sont renseignés
- Vérifier que les matchs sont terminés avec des scores
- Sauvegarder la configuration après modifications

## 📁 Architecture Technique

### Fichiers Créés

1. **`tournamentLogic.ts`** : Logique métier
   - `resolveTeamName()` : Résout les codes en noms
   - `calculatePoolStandings()` : Calcule le classement
   - `propagateMatchResults()` : Propage les résultats
   - `calculateFinalRankings()` : Classement final

2. **`page.tsx` (modifié)** : Page de configuration
   - Import des fonctions de logique
   - Propagation automatique dans `updateMatch()`, `updateBracketMatch()`, etc.
   - Bouton "Visualiser" ajouté

3. **`visualisation/page.tsx`** : Page de visualisation
   - Affichage du bracket complet
   - Classements de poules
   - Classement final
   - Résolution en temps réel des codes

### Persistance

- **LocalStorage** : `tournament-layout-{id}`
- Sauvegarde automatique lors du clic sur "Enregistrer"
- Chargement automatique à l'ouverture de la page

## 🚀 Prochaines Étapes Possibles

1. **Export PDF** du bracket et du classement
2. **Notifications** quand une équipe avance
3. **Timeline** des matchs par date/heure
4. **Statistiques** par équipe (matchs joués, victoires, défaites)
5. **Synchronisation** avec la base de données backend
6. **Mode spectateur** en temps réel avec WebSocket

---

**Bon tournoi ! 🏆**
