import { useCallback } from 'react';

// Helper pour obtenir les équipes utilisées par phase
export function getUsedTeamsByPhase(
  matches: any[],
  pools: any[],
  brackets: any[],
  loserBrackets: any[],
  currentPhaseType: 'qualification' | 'pool' | 'bracket' | 'loser-bracket',
  currentPhaseId?: string
) {
  const usedTeams = {
    qualifications: new Set<string>(),
    pools: new Set<string>(),
    brackets: new Set<string>(),
    loserBrackets: new Set<string>()
  };
  matches.filter(m => m.type === "qualifications").forEach(match => {
    if (match.teamA) usedTeams.qualifications.add(match.teamA);
    if (match.teamB) usedTeams.qualifications.add(match.teamB);
  });
  pools.forEach(pool => {
    if (currentPhaseType === 'pool' && pool.id === currentPhaseId) return;
    pool.teams.forEach((team: string) => usedTeams.pools.add(team));
  });
  brackets.forEach(bracket => {
    if (currentPhaseType === 'bracket' && bracket.id === currentPhaseId) return;
    bracket.teams.forEach((team: string) => usedTeams.brackets.add(team));
  });
  loserBrackets.forEach(lb => {
    if (currentPhaseType === 'loser-bracket' && lb.id === currentPhaseId) return;
    lb.teams.forEach((team: string) => usedTeams.loserBrackets.add(team));
  });
  return usedTeams;
}
