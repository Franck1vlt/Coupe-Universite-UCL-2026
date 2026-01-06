export interface TeamData {
  name?: string;
  score: number;
  yellowCards: number;
  redCards: number;
  penalties: number;
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
