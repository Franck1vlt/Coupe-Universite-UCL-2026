export interface PetanqueTeamData {
  name: string;
  logo_url: string;
  score: number;      // Score actuel (0 au départ, monte vers 13)
  sets: number;       // Nombre de sets gagnés (si mode tournoi)
}

// Historique d'une mène pour permettre l'annulation
export interface MeneHistory {
  winner: "A" | "B";      // Équipe gagnante de la mène
  points: number;         // Points marqués (1-6)
  scoreABefore: number;   // Score équipe A avant la mène
  scoreBBefore: number;   // Score équipe B avant la mène
  cochonnetBefore: "A" | "B"; // Qui avait le cochonnet avant
}

export interface MatchData {
  matchId: string;
  teamA: PetanqueTeamData;
  teamB: PetanqueTeamData;
  matchGround?: string;
  matchType: string;
  gameMode?: "BO3" | "BO5";  // Mode de jeu (si plusieurs sets)
  cochonnetTeam: "A" | "B";  // Équipe qui doit lancer le cochonnet
  pendingPoints: number;     // Points en attente de validation (1-6)
  pendingWinner: "A" | "B" | null; // Équipe gagnante en attente de validation
  meneHistory: MeneHistory[]; // Historique des mènes pour annulation
  targetScore: number;        // Score à atteindre (13 par défaut)
}
