export interface TeamData {
  name?: string;
  logo_url?: string;
  score: number;
  yellowCards: number;
  redCards: number;
  penalties: number;
  technicalFouls: number;
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
  hasPenalties: boolean;
  matchType?: string;
}
