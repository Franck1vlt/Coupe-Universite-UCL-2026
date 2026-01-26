# Composants et Hooks - Frontend Admin

Documentation technique des composants et hooks utilises dans l'application d'administration de la Coupe de l'Universite UCL.

---

## Table des Matieres

1. [Hooks de Gestion de Tournoi](#hooks-de-gestion-de-tournoi)
2. [Hooks de Table de Marquage](#hooks-de-table-de-marquage)
3. [Composants de Configuration](#composants-de-configuration)
4. [Composants de Scoreboard](#composants-de-scoreboard)

---

## Hooks de Gestion de Tournoi

Ces hooks se trouvent dans `src/app/configuration-coupe/tournaments/[id]/hooks/`

### useTournament

**Fichier** : `useTournament.ts`

Hook principal orchestrant toute la logique de gestion d'un tournoi.

```typescript
function useTournament(tournamentId: number | null)
```

**Retourne** :
| Propriete | Type | Description |
|-----------|------|-------------|
| `tournamentId` | `number \| null` | ID du tournoi actuel |
| `tournamentName` | `string` | Nom du tournoi |
| `isLoading` | `boolean` | Etat de chargement |
| `error` | `string \| null` | Message d'erreur |
| `matches` | `Match[]` | Liste des matchs de qualification |
| `pools` | `Pool[]` | Liste des poules |
| `brackets` | `Bracket[]` | Liste des brackets de phase finale |
| `loserBrackets` | `LoserBracket[]` | Liste des loser brackets |
| `save()` | `Function` | Sauvegarde le tournoi |
| `reset()` | `Function` | Reinitialise le tournoi |
| `reload()` | `Function` | Recharge depuis l'API |

**Exemple d'utilisation** :
```typescript
const {
  matches,
  pools,
  brackets,
  save,
  addMatch,
  updateMatch
} = useTournament(tournamentId);
```

---

### useTournamentApi

**Fichier** : `useTournamentApi.ts`

Hook gerant la communication HTTP avec l'API backend pour les tournois.

```typescript
function useTournamentApi(tournamentId: number | null)
```

**Fonctions principales** :
| Fonction | Description |
|----------|-------------|
| `loadTournament()` | Charge la structure du tournoi depuis l'API |
| `saveTournament(matches, pools, brackets, loserBrackets)` | Sauvegarde la structure vers l'API |

**Mapping des statuts** :
- `planifie` → `upcoming`
- `en-cours` → `in_progress`
- `termine` → `completed`

**Mapping des types de bracket** :
- `quarts` → `quarterfinal`
- `demi` → `semifinal`
- `finale` → `final`
- `petite-finale` → `third_place`

---

### useMatches

**Fichier** : `useMatches.ts`

Hook pour la gestion des matchs de qualification et de phase finale.

```typescript
function useMatches()
```

**Retourne** :
| Propriete | Type | Description |
|-----------|------|-------------|
| `matches` | `Match[]` | Liste des matchs |
| `selectedMatch` | `Match \| null` | Match selectionne |
| `setSelectedMatch` | `Function` | Definit le match selectionne |
| `addMatch(type, position)` | `Function` | Ajoute un match |
| `updateMatch(match)` | `Function` | Met a jour un match |
| `deleteMatch(matchId)` | `Function` | Supprime un match |
| `adjustQualificationMatchesCount(count)` | `Function` | Ajuste le nombre de matchs de qualification |
| `getMatchesByType(type)` | `Function` | Filtre les matchs par type |
| `getMatchById(id)` | `Function` | Recupere un match par ID |
| `moveMatch(id, position)` | `Function` | Deplace un match (drag-and-drop) |

---

### usePools

**Fichier** : `usePools.ts`

Hook pour la gestion des poules/groupes.

```typescript
function usePools()
```

**Retourne** :
| Propriete | Type | Description |
|-----------|------|-------------|
| `pools` | `Pool[]` | Liste des poules |
| `selectedPool` | `Pool \| null` | Poule selectionnee |
| `addPool(name, position)` | `Function` | Ajoute une poule |
| `updatePool(pool)` | `Function` | Met a jour une poule |
| `deletePool(poolId)` | `Function` | Supprime une poule |
| `addTeamToPool(poolId, teamName)` | `Function` | Ajoute une equipe |
| `removeTeamFromPool(poolId, teamName)` | `Function` | Retire une equipe |
| `updatePoolMatch(poolId, match)` | `Function` | Met a jour un match de poule |
| `movePool(poolId, position)` | `Function` | Deplace une poule |

---

### useBrackets

**Fichier** : `useBrackets.ts`

Hook pour la gestion des brackets (phase finale et loser bracket).

```typescript
function useBrackets()
```

**Retourne** :
| Propriete | Type | Description |
|-----------|------|-------------|
| `brackets` | `Bracket[]` | Brackets de phase finale |
| `loserBrackets` | `LoserBracket[]` | Loser brackets |
| `addBracket()` | `Function` | Ajoute un bracket |
| `updateBracket(bracket)` | `Function` | Met a jour un bracket |
| `deleteBracket(bracketId)` | `Function` | Supprime un bracket |
| `addLoserBracket()` | `Function` | Ajoute un loser bracket |
| `updateLoserBracket(bracket)` | `Function` | Met a jour un loser bracket |
| `deleteLoserBracket(bracketId)` | `Function` | Supprime un loser bracket |

---

### useSelectedTile

**Fichier** : `useSelectedTile.ts`

Hook pour gerer la selection des tuiles dans l'interface de configuration.

```typescript
function useSelectedTile()
```

**Retourne** :
| Propriete | Type | Description |
|-----------|------|-------------|
| `selectedTile` | `Tile \| null` | Tuile selectionnee |
| `setSelectedTile` | `Function` | Definit la tuile selectionnee |
| `clearSelection` | `Function` | Efface la selection |

---

### useUsedTeamsByPhase

**Fichier** : `useUsedTeamsByPhase.ts`

Hook pour suivre quelles equipes sont utilisees dans chaque phase du tournoi.

```typescript
function useUsedTeamsByPhase(pools: Pool[], brackets: Bracket[])
```

**Retourne** :
| Propriete | Type | Description |
|-----------|------|-------------|
| `usedTeams` | `Map<string, Set<string>>` | Equipes par phase |
| `isTeamUsed(teamName, phase)` | `Function` | Verifie si une equipe est deja utilisee |

---

## Hooks de Table de Marquage

Ces hooks se trouvent dans `src/app/features/scoreboards/`

### useMatchPropagation

**Fichier** : `common/useMatchPropagation.ts`

Hook centralisant la propagation des resultats de matchs.

```typescript
function useMatchPropagation()
```

**Retourne** :
| Fonction | Description |
|----------|-------------|
| `submitMatchResultWithPropagation(options)` | Soumet le resultat et propage |
| `propagateTournamentResults(tournamentId)` | Declenche la propagation |
| `updateMatchStatus(matchId, status)` | Met a jour le statut du match |
| `getTournamentIdFromMatch(matchId)` | Recupere l'ID du tournoi depuis un match |

**Interface SubmitResultOptions** :
```typescript
interface SubmitResultOptions {
  matchId: string;
  tournamentId?: string | number;
  payload: {
    score_a: number;
    score_b: number;
    status?: 'upcoming' | 'in_progress' | 'completed';
    team_sport_a_id?: number;
    team_sport_b_id?: number;
  };
  onSuccess?: (result) => void;
  onError?: (error) => void;
}
```

---

### Hooks par Sport

Chaque sport a son propre hook dans `src/app/features/scoreboards/{sport}/`

#### useFootballMatch / useHandballMatch

**Fichiers** : `football/useFootballMatch.ts`, `handball/useHandballMatch.ts`

```typescript
function useFootballMatch(matchId: string | null)
function useHandballMatch(matchId: string | null)
```

**Retourne** :
| Propriete | Type | Description |
|-----------|------|-------------|
| `matchData` | `MatchData` | Donnees du match |
| `formattedTime` | `string` | Temps formate (MM:SS) |
| `startChrono()` | `Function` | Demarre le chrono |
| `stopChrono()` | `Function` | Arrete le chrono |
| `setChrono(min, sec)` | `Function` | Definit le chrono |
| `addSecond()` | `Function` | Ajoute 1 seconde |
| `addPoint(team)` | `Function` | Ajoute un but |
| `subPoint(team)` | `Function` | Retire un but |
| `addYellowCard(team)` | `Function` | Ajoute carton jaune |
| `subYellowCard(team)` | `Function` | Retire carton jaune |
| `addRedCard(team)` | `Function` | Ajoute carton rouge |
| `subRedCard(team)` | `Function` | Retire carton rouge |
| `swapSides()` | `Function` | Permute les equipes |
| `togglePeriod()` | `Function` | Change de periode |
| `handleEnd()` | `Function` | Termine le match |
| `updateMatchStatus(status)` | `Function` | Met a jour le statut |

---

#### useBasketballMatch

**Fichier** : `basketball/useBasketballMatch.ts`

Memes fonctions que football/handball, plus :

| Propriete | Type | Description |
|-----------|------|-------------|
| `addTechnicalFoul(team)` | `Function` | Ajoute faute technique |
| `subTechnicalFoul(team)` | `Function` | Retire faute technique |
| `shotClock` | `object` | Gestion du shot clock |

---

#### useVolleyballMatch / useBadmintonMatch

**Fichiers** : `volleyball/useVolleyballMatch.ts`, `badminton/useBadmintonMatch.ts`

```typescript
function useVolleyballMatch(matchId: string | null)
function useBadmintonMatch(matchId: string | null)
```

**Retourne** :
| Propriete | Type | Description |
|-----------|------|-------------|
| `matchData` | `MatchData` | Donnees (avec sets) |
| `formattedTime` | `string` | Temps de pause |
| `startChrono()` | `Function` | Demarre timer pause |
| `stopChrono()` | `Function` | Arrete timer |
| `resetChrono()` | `Function` | Reset timer |
| `addPoint(team)` | `Function` | Ajoute un point |
| `subPoint(team)` | `Function` | Retire un point |
| `changeService()` | `Function` | Change le service |
| `setNumSets(n)` | `Function` | Definit nombre de sets |
| `handleEnd()` | `Function` | Termine le match |

**Structure matchData** :
```typescript
{
  teamA: { name, score, sets },
  teamB: { name, score, sets },
  serviceTeam: "A" | "B",
  numberOfSets: number
}
```

---

#### usePetanqueMatch

**Fichier** : `petanque/usePetanqueMatch.ts`

```typescript
function usePetanqueMatch(matchId: string | null)
```

**Retourne** :
| Propriete | Type | Description |
|-----------|------|-------------|
| `matchData` | `MatchData` | Donnees du match |
| `addThrow(points)` | `Function` | Ajoute des points a la mene |
| `cancelLastThrow()` | `Function` | Annule le dernier ajout |
| `validateThrow()` | `Function` | Valide la mene |
| `resetSet()` | `Function` | Reinitialise le set |
| `getCochonnetTeam()` | `Function` | Retourne l'equipe au cochonnet |
| `selectMeneWinner(team)` | `Function` | Selectionne le gagnant de mene |
| `setTargetScore(score)` | `Function` | Definit le score cible |
| `changeService()` | `Function` | Change le lanceur du cochonnet |

**Structure matchData** :
```typescript
{
  teamA: { name, score },
  teamB: { name, score },
  targetScore: number,
  meneHistory: MeneResult[],
  pendingWinner: "A" | "B" | null,
  pendingPoints: number
}
```

---

#### useFlechettesMatch

**Fichier** : `flechettes/useFlechettesMatch.ts`

```typescript
function useFlechettesMatch(matchId: string | null)
```

**Retourne** :
| Propriete | Type | Description |
|-----------|------|-------------|
| `matchData` | `MatchData` | Donnees du match |
| `addThrow(value, isDouble?)` | `Function` | Ajoute un lancer |
| `multiplyLastThrow(mult)` | `Function` | Multiplie le dernier lancer |
| `cancelLastThrow()` | `Function` | Annule le dernier lancer |
| `validateThrow()` | `Function` | Valide la volee |
| `declareBust()` | `Function` | Declare un BUST |
| `resetSet()` | `Function` | Reinitialise le set |
| `getCurrentPlayer()` | `Function` | Retourne le joueur actuel |
| `getCurrentTeam()` | `Function` | Retourne l'equipe actuelle |
| `gameMode` | `"BO3" \| "BO5"` | Mode de jeu |
| `setGameMode(mode)` | `Function` | Change le mode |
| `swipeGameMode()` | `Function` | Bascule le mode |

**Structure matchData** :
```typescript
{
  teamA: { name, score, sets, players },
  teamB: { name, score, sets, players },
  currentThrows: number[],
  gameMode: "BO3" | "BO5"
}
```

---

## Composants de Configuration

Ces composants se trouvent dans `src/app/configuration-coupe/tournaments/[id]/components/`

### MatchTile

**Fichier** : `MatchTile.tsx`

Tuile representant un match individuel.

**Props** :
```typescript
interface MatchTileProps {
  match: Match;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onUpdate: (match: Match) => void;
}
```

**Affiche** :
- Labels des equipes (teamA vs teamB)
- Date et heure
- Terrain
- Statut (planifie, en-cours, termine)
- Score si disponible

---

### PoolTile

**Fichier** : `PoolTile.tsx`

Tuile representant une poule/groupe.

**Props** :
```typescript
interface PoolTileProps {
  pool: Pool;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onUpdate: (pool: Pool) => void;
}
```

**Affiche** :
- Nom de la poule
- Liste des equipes
- Matchs de la poule
- Nombre de qualifies vers phase finale
- Nombre de qualifies vers loser bracket

---

### BracketTile

**Fichier** : `BracketTile.tsx`

Tuile representant un bracket de phase finale.

**Props** :
```typescript
interface BracketTileProps {
  bracket: Bracket;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onUpdate: (bracket: Bracket) => void;
}
```

**Affiche** :
- Nom du bracket
- Matchs par round (quarts, demi, finale)
- Connexions entre matchs

---

### LoserBracketTile

**Fichier** : `LoserBracketTile.tsx`

Tuile representant un loser bracket (repechage).

**Props** :
```typescript
interface LoserBracketTileProps {
  loserBracket: LoserBracket;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onUpdate: (bracket: LoserBracket) => void;
}
```

**Affiche** :
- Nom du loser bracket
- Matchs de repechage
- Connexions avec le bracket principal

---

## Composants de Scoreboard

Ces composants se trouvent dans `src/app/features/scoreboards/{sport}/`

### Structure par Sport

Chaque sport a deux composants :
- `Scoreboard.tsx` : Interface admin/staff
- `spectators/Scoreboard.tsx` : Affichage pour le public

### Scoreboard Admin (commun)

**Elements communs** :
- Panel gauche : Configuration (equipes, terrain, type de match)
- Panel droit : Interface de marquage
- Boutons de controle : Start, Stop, Swipe, END
- Affichage du score en temps reel

### Scoreboard Spectateurs (commun)

**Elements communs** :
- Affichage plein ecran optimise
- Score large et lisible
- Animations sur changement de score
- Noms des equipes
- Information du match (type, terrain)

---

## Types Communs

### Match

```typescript
interface Match {
  id: string;
  uuid?: string;
  teamA: string;
  teamB: string;
  label?: string;
  date: string;
  time: string;
  court: string;
  status: "planifie" | "en-cours" | "termine" | "annule";
  duration: number;
  type: "qualifications" | "poule" | "phase-finale" | "loser-bracket";
  scoreA?: number;
  scoreB?: number;
  winnerCode?: string;
  loserCode?: string;
  bracketMatchType?: BracketMatchType;
  position: { x: number; y: number };
}
```

### Pool

```typescript
interface Pool {
  id: string;
  name: string;
  teams: string[];
  matches: Match[];
  position: { x: number; y: number };
  qualifiedToFinals: number;
  qualifiedToLoserBracket: number;
}
```

### Bracket

```typescript
interface Bracket {
  id: string;
  name: string;
  enabledRounds: BracketMatchType[];
  teams: string[];
  matches: Match[];
  position: { x: number; y: number };
  loserToLoserBracket: boolean;
}
```

### LoserBracket

```typescript
interface LoserBracket {
  id: string;
  name: string;
  enabledRounds: LoserBracketMatchType[];
  teams: string[];
  matches: Match[];
  position: { x: number; y: number };
}
```

---

## Utilitaires

### lib/utils.ts

**Fonction cn()** :
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Combine et fusionne les classes Tailwind CSS.

---

## Middleware d'Authentification

**Fichier** : `src/middleware.ts`

Protege les routes et gere les redirections :
- Routes publiques : `/login`, `/api/auth`
- Redirige vers `/login` si non authentifie
- Redirige vers `/` si deja authentifie sur `/login`

---

## Architecture des Donnees

```
useTournament (orchestrateur)
├── useMatches (matchs de qualification)
├── usePools (poules)
├── useBrackets (brackets + loser brackets)
└── useTournamentApi (communication API)

use{Sport}Match (table de marquage)
└── useMatchPropagation (propagation resultats)
```

---

## Bonnes Pratiques

1. **Separation des concerns** : Chaque hook gere un aspect specifique
2. **Composition** : useTournament compose les autres hooks
3. **Immutabilite** : Les mises a jour creent de nouvelles references
4. **Optimisation** : useCallback et useMemo pour eviter les re-renders
5. **Typage** : TypeScript strict pour toutes les interfaces
