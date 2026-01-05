// Logique de résolution et de progression des équipes dans le tournoi

export type Match = {
  id: string;
  teamA: string;
  teamB: string;
  date: string;
  time: string;
  court: string;
  status: "planifié" | "en-cours" | "terminé" | "annulé";
  duration: number;
  type: "qualifications" | "poule" | "phase-finale" | "loser-bracket";
  scoreA?: number;
  scoreB?: number;
  winnerPoints?: number;
  loserPoints?: number;
  winnerCode?: string;
  loserCode?: string;
  position: { x: number; y: number };
  isPoolContainer?: boolean;
  poolTeams?: string[];
  poolMatches?: string[];
  bracketMatchType?: "quarts" | "demi" | "finale" | "petite-finale";
  loserBracketMatchType?: "loser-round-1" | "loser-round-2" | "loser-round-3" | "loser-finale";
  winnerDestination?: string;
  loserDestination?: string;
};

export type Pool = {
  id: string;
  name: string;
  teams: string[];
  matches: Match[];
  position: { x: number; y: number };
  qualifiedToFinals: number;
  qualifiedToLoserBracket: number;
};

export type Bracket = {
  id: string;
  name: string;
  enabledRounds: ("quarts" | "demi" | "finale" | "petite-finale")[];
  teams: string[];
  matches: Match[];
  position: { x: number; y: number };
  winnerPoints?: number;
  loserPoints?: number;
  loserToLoserBracket: boolean;
};

export type LoserBracket = {
  id: string;
  name: string;
  enabledRounds: ("loser-round-1" | "loser-round-2" | "loser-round-3" | "loser-finale")[];
  teams: string[];
  matches: Match[];
  position: { x: number; y: number };
  winnerPoints?: number;
  loserPoints?: number;
};

export type PoolStanding = {
  team: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  scoreDiff: number;
};

/**
 * Résout le nom d'une équipe à partir d'un code dynamique
 * Ex: WQ1 -> vainqueur du match de qualification 1
 *     P1-2 -> 2ème de la poule 1
 *     WSF1 -> vainqueur de la demi-finale 1
 */
export function resolveTeamName(
  code: string,
  matches: Match[],
  pools: Pool[],
  brackets: Bracket[],
  loserBrackets: LoserBracket[]
): string {
  // Si c'est déjà un nom d'équipe simple (pas un code)
  if (!code || code.trim() === "") return "";
  
  // Vérifier si c'est un code de vainqueur de qualification (WQ1, WQ2, etc.)
  if (code.startsWith("WQ")) {
    const qualifMatch = matches.find(m => m.type === "qualifications" && m.winnerCode === code);
    if (qualifMatch && qualifMatch.status === "terminé") {
      const winner = getMatchWinner(qualifMatch);
      if (winner) return resolveTeamName(winner, matches, pools, brackets, loserBrackets);
    }
    return code; // Pas encore joué ou pas de résultat
  }

  // Vérifier si c'est un classement de poule (P1-1, Poule A-2, etc.)
  const poolPattern = /^(.+)-(\d+)$/;
  const poolMatch = code.match(poolPattern);
  if (poolMatch) {
    const poolName = poolMatch[1];
    const position = parseInt(poolMatch[2], 10);
    const pool = pools.find(p => p.name === poolName);
    
    if (pool) {
      const standings = calculatePoolStandings(pool);
      if (standings.length >= position) {
        return resolveTeamName(standings[position - 1].team, matches, pools, brackets, loserBrackets);
      }
    }
    return code; // Poule non trouvée ou position invalide
  }

  // Vérifier si c'est un code de vainqueur de bracket (WQF1, WSF1, WF, WPF, etc.)
  if (code.startsWith("W") && (code.includes("QF") || code.includes("SF") || code === "WF" || code === "WPF")) {
    for (const bracket of brackets) {
      const bracketMatch = bracket.matches.find(m => m.winnerCode === code);
      if (bracketMatch && bracketMatch.status === "terminé") {
        const winner = getMatchWinner(bracketMatch);
        if (winner) return resolveTeamName(winner, matches, pools, brackets, loserBrackets);
      }
    }
    return code; // Pas encore joué
  }

  // Vérifier si c'est un code de perdant de bracket (LQF1, LSF1, LF, LPF, etc.)
  if (code.startsWith("L") && (code.includes("QF") || code.includes("SF") || code === "LF" || code === "LPF")) {
    for (const bracket of brackets) {
      const bracketMatch = bracket.matches.find(m => m.loserCode === code);
      if (bracketMatch && bracketMatch.status === "terminé") {
        const loser = getMatchLoser(bracketMatch);
        if (loser) return resolveTeamName(loser, matches, pools, brackets, loserBrackets);
      }
    }
    return code; // Pas encore joué
  }

  // Vérifier si c'est un code de loser bracket (WLR1-1, WLR2-1, WLF, etc.)
  if (code.startsWith("WLR") || code === "WLF") {
    for (const loserBracket of loserBrackets) {
      const lbMatch = loserBracket.matches.find(m => m.winnerCode === code);
      if (lbMatch && lbMatch.status === "terminé") {
        const winner = getMatchWinner(lbMatch);
        if (winner) return resolveTeamName(winner, matches, pools, brackets, loserBrackets);
      }
    }
    return code; // Pas encore joué
  }

  if (code.startsWith("LLR") || code === "LLF") {
    for (const loserBracket of loserBrackets) {
      const lbMatch = loserBracket.matches.find(m => m.loserCode === code);
      if (lbMatch && lbMatch.status === "terminé") {
        const loser = getMatchLoser(lbMatch);
        if (loser) return resolveTeamName(loser, matches, pools, brackets, loserBrackets);
      }
    }
    return code; // Pas encore joué
  }

  // C'est probablement un nom d'équipe normal
  return code;
}

/**
 * Retourne le vainqueur d'un match
 */
export function getMatchWinner(match: Match): string | null {
  if (match.status !== "terminé") return null;
  if (match.scoreA === undefined || match.scoreB === undefined) return null;
  
  if (match.scoreA > match.scoreB) return match.teamA;
  if (match.scoreB > match.scoreA) return match.teamB;
  return null; // Égalité (à gérer selon les règles)
}

/**
 * Retourne le perdant d'un match
 */
export function getMatchLoser(match: Match): string | null {
  if (match.status !== "terminé") return null;
  if (match.scoreA === undefined || match.scoreB === undefined) return null;
  
  if (match.scoreA > match.scoreB) return match.teamB;
  if (match.scoreB > match.scoreA) return match.teamA;
  return null; // Égalité (à gérer selon les règles)
}

/**
 * Calcule le classement d'une poule
 */
export function calculatePoolStandings(pool: Pool): PoolStanding[] {
  const standings: Map<string, PoolStanding> = new Map();

  // Initialiser les statistiques pour chaque équipe
  pool.teams.forEach(team => {
    standings.set(team, {
      team,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      scoreDiff: 0
    });
  });

  // Calculer les résultats de chaque match
  pool.matches.forEach(match => {
    if (match.status === "terminé" && match.scoreA !== undefined && match.scoreB !== undefined) {
      const standingA = standings.get(match.teamA);
      const standingB = standings.get(match.teamB);

      if (standingA && standingB) {
        standingA.played++;
        standingB.played++;

        if (match.scoreA > match.scoreB) {
          // Équipe A gagne
          standingA.won++;
          standingA.points += 3; // 3 points pour une victoire (règle standard)
          standingB.lost++;
        } else if (match.scoreB > match.scoreA) {
          // Équipe B gagne
          standingB.won++;
          standingB.points += 3;
          standingA.lost++;
        } else {
          // Égalité
          standingA.points += 1;
          standingB.points += 1;
        }

        // Calculer la différence de score
        standingA.scoreDiff += match.scoreA - match.scoreB;
        standingB.scoreDiff += match.scoreB - match.scoreA;
      }
    }
  });

  // Trier par points décroissants, puis par différence de buts
  return Array.from(standings.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.scoreDiff - a.scoreDiff;
  });
}

/**
 * Propage automatiquement les résultats d'un match vers les matchs suivants
 */
export function propagateMatchResults(
  completedMatch: Match,
  allMatches: Match[],
  pools: Pool[],
  brackets: Bracket[],
  loserBrackets: LoserBracket[]
): {
  updatedMatches: Match[];
  updatedBrackets: Bracket[];
  updatedLoserBrackets: LoserBracket[];
} {
  const winner = getMatchWinner(completedMatch);
  const loser = getMatchLoser(completedMatch);

  let updatedMatches = [...allMatches];
  let updatedBrackets = [...brackets];
  let updatedLoserBrackets = [...loserBrackets];

  if (!winner || !loser) return { updatedMatches, updatedBrackets, updatedLoserBrackets };

  // Propager le vainqueur
  if (completedMatch.winnerCode && completedMatch.winnerDestination) {
    // Chercher le match de destination
    for (let i = 0; i < updatedBrackets.length; i++) {
      const bracket = updatedBrackets[i];
      const matchIndex = bracket.matches.findIndex(m => {
        // Vérifier si le match de destination attend ce vainqueur
        return m.teamA === completedMatch.winnerCode || m.teamB === completedMatch.winnerCode;
      });

      if (matchIndex !== -1) {
        const targetMatch = bracket.matches[matchIndex];
        const updatedMatch = { ...targetMatch };

        if (updatedMatch.teamA === completedMatch.winnerCode) {
          updatedMatch.teamA = winner;
        } else if (updatedMatch.teamB === completedMatch.winnerCode) {
          updatedMatch.teamB = winner;
        }

        bracket.matches[matchIndex] = updatedMatch;
        updatedBrackets[i] = { ...bracket };
      }
    }

    // Vérifier aussi dans les loser brackets
    for (let i = 0; i < updatedLoserBrackets.length; i++) {
      const lb = updatedLoserBrackets[i];
      const matchIndex = lb.matches.findIndex(m => {
        return m.teamA === completedMatch.winnerCode || m.teamB === completedMatch.winnerCode;
      });

      if (matchIndex !== -1) {
        const targetMatch = lb.matches[matchIndex];
        const updatedMatch = { ...targetMatch };

        if (updatedMatch.teamA === completedMatch.winnerCode) {
          updatedMatch.teamA = winner;
        } else if (updatedMatch.teamB === completedMatch.winnerCode) {
          updatedMatch.teamB = winner;
        }

        lb.matches[matchIndex] = updatedMatch;
        updatedLoserBrackets[i] = { ...lb };
      }
    }
  }

  // Propager le perdant (vers loser bracket si configuré)
  if (completedMatch.loserCode && completedMatch.loserDestination === "LOSER_BRACKET") {
    for (let i = 0; i < updatedLoserBrackets.length; i++) {
      const lb = updatedLoserBrackets[i];
      const matchIndex = lb.matches.findIndex(m => {
        return m.teamA === completedMatch.loserCode || m.teamB === completedMatch.loserCode;
      });

      if (matchIndex !== -1) {
        const targetMatch = lb.matches[matchIndex];
        const updatedMatch = { ...targetMatch };

        if (updatedMatch.teamA === completedMatch.loserCode) {
          updatedMatch.teamA = loser;
        } else if (updatedMatch.teamB === completedMatch.loserCode) {
          updatedMatch.teamB = loser;
        }

        lb.matches[matchIndex] = updatedMatch;
        updatedLoserBrackets[i] = { ...lb };
      }
    }
  }

  return { updatedMatches, updatedBrackets, updatedLoserBrackets };
}

/**
 * Calcule le classement final de tous les tournois
 */
export function calculateFinalRankings(
  matches: Match[],
  pools: Pool[],
  brackets: Bracket[],
  loserBrackets: LoserBracket[]
): Map<string, number> {
  const rankings = new Map<string, number>();

  // Ajouter les points des matchs de qualification
  matches.forEach(match => {
    if (match.status === "terminé" && match.type === "qualifications") {
      const winner = getMatchWinner(match);
      const loser = getMatchLoser(match);

      if (winner && match.winnerPoints !== undefined) {
        const resolvedWinner = resolveTeamName(winner, matches, pools, brackets, loserBrackets);
        rankings.set(resolvedWinner, (rankings.get(resolvedWinner) || 0) + match.winnerPoints);
      }
      if (loser && match.loserPoints !== undefined) {
        const resolvedLoser = resolveTeamName(loser, matches, pools, brackets, loserBrackets);
        rankings.set(resolvedLoser, (rankings.get(resolvedLoser) || 0) + match.loserPoints);
      }
    }
  });

  // Ajouter les points des matchs de poule
  pools.forEach(pool => {
    pool.matches.forEach(match => {
      if (match.status === "terminé") {
        const winner = getMatchWinner(match);
        const loser = getMatchLoser(match);

        if (winner && match.winnerPoints !== undefined) {
          const resolvedWinner = resolveTeamName(winner, matches, pools, brackets, loserBrackets);
          rankings.set(resolvedWinner, (rankings.get(resolvedWinner) || 0) + match.winnerPoints);
        }
        if (loser && match.loserPoints !== undefined) {
          const resolvedLoser = resolveTeamName(loser, matches, pools, brackets, loserBrackets);
          rankings.set(resolvedLoser, (rankings.get(resolvedLoser) || 0) + match.loserPoints);
        }
      }
    });
  });

  // Ajouter les points des brackets
  brackets.forEach(bracket => {
    bracket.matches.forEach(match => {
      if (match.status === "terminé") {
        const winner = getMatchWinner(match);
        const loser = getMatchLoser(match);

        if (winner && match.winnerPoints !== undefined) {
          const resolvedWinner = resolveTeamName(winner, matches, pools, brackets, loserBrackets);
          rankings.set(resolvedWinner, (rankings.get(resolvedWinner) || 0) + match.winnerPoints);
        }
        if (loser && match.loserPoints !== undefined) {
          const resolvedLoser = resolveTeamName(loser, matches, pools, brackets, loserBrackets);
          rankings.set(resolvedLoser, (rankings.get(resolvedLoser) || 0) + match.loserPoints);
        }
      }
    });
  });

  // Ajouter les points des loser brackets
  loserBrackets.forEach(lb => {
    lb.matches.forEach(match => {
      if (match.status === "terminé") {
        const winner = getMatchWinner(match);
        const loser = getMatchLoser(match);

        if (winner && match.winnerPoints !== undefined) {
          const resolvedWinner = resolveTeamName(winner, matches, pools, brackets, loserBrackets);
          rankings.set(resolvedWinner, (rankings.get(resolvedWinner) || 0) + match.winnerPoints);
        }
        if (loser && match.loserPoints !== undefined) {
          const resolvedLoser = resolveTeamName(loser, matches, pools, brackets, loserBrackets);
          rankings.set(resolvedLoser, (rankings.get(resolvedLoser) || 0) + match.loserPoints);
        }
      }
    });
  });

  return rankings;
}
