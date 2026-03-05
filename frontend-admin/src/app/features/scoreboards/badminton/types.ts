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

export type MatchPlayer = {
  id: number;
  team_sport_id: number;
  team: "A" | "B";
  first_name?: string | null;
  last_name?: string | null;
  jersey_number?: number | null;
  position?: string | null;
  is_captain: boolean;
  is_active: boolean;
};

export type LocalMatchEvent = {
  localId: number;
  event_type: "point";
  team: "A" | "B";
  player_id?: number | null;
  match_time_seconds?: number | null;
  timestamp: string;
  player?: {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    jersey_number?: number | null;
  } | null;
};