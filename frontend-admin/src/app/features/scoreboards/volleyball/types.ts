export interface TeamData {
  name?: string;
  logo_url?: string;
  score: number;
  sets: number;
}

export interface ChronoData {
  running: boolean;
  time: number;
  interval: NodeJS.Timeout | null;
}

export interface MatchData {
  teamA: TeamData;
  teamB: TeamData;
  chrono: ChronoData;
  matchId: string | null;
  currentSet: number;
  numberOfSets: number;
  matchType: string; 
}