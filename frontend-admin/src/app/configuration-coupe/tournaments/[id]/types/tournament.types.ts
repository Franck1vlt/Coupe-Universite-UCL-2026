// Types centralisés pour la configuration de tournoi

export type Sport = {
  id: number;
  name: string;
  score_type: string;
  created_at?: string;
};

export type MatchType = "qualifications" | "poule" | "phase-finale" | "loser-bracket";
export type MatchStatus = "planifié" | "en-cours" | "terminé" | "annulé";
export type BracketMatchType = "quarts" | "demi" | "finale" | "petite-finale";
export type LoserBracketMatchType = "loser-round-1" | "loser-round-2" | "loser-round-3" | "loser-finale";

export type Match = {
  id: string;
  uuid?: string;
  teamA: string;
  teamB: string;
  label?: string;
  date: string;
  time: string;
  court: string;
  status: MatchStatus;
  duration: number;
  type: MatchType;
  scoreA?: number;
  scoreB?: number;
  winnerPoints?: number;
  loserPoints?: number;
  winnerCode?: string;
  loserCode?: string;
  position: { x: number; y: number };
  // Pour les poules
  isPoolContainer?: boolean;
  poolTeams?: string[];
  poolMatches?: string[];
  // Pour les brackets
  bracketMatchType?: BracketMatchType;
  loserBracketMatchType?: LoserBracketMatchType;
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
  enabledRounds: BracketMatchType[];
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
  enabledRounds: LoserBracketMatchType[];
  teams: string[];
  matches: Match[];
  position: { x: number; y: number };
  winnerPoints?: number;
  loserPoints?: number;
};

export type Team = {
  id: string;
  name: string;
};

export type Court = {
  id: string;
  name: string;
};

export type TournamentStructure = {
  qualification_matches: any[];
  pools: any[];
  brackets: any[];
  loserBrackets: any[];
};

export type TournamentState = {
  id: number | null;
  name: string;
  sportId: number | null;
  matches: Match[];
  pools: Pool[];
  brackets: Bracket[];
  loserBrackets: LoserBracket[];
  selectedMatch: Match | null;
  selectedPool: Pool | null;
  selectedBracket: Bracket | null;
  selectedLoserBracket: LoserBracket | null;
};

export type Position = {
  x: number;
  y: number;
};

export type DragState = {
  isDragging: boolean;
  draggedItem: Match | Pool | Bracket | null;
  draggedType: "match" | "pool" | "bracket" | null;
};