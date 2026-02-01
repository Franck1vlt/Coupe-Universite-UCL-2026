export interface FlechettesTeamData {
  name: string;
  logo_url: string;
  score: number;      // Score actuel dans le set (301 au départ, descend vers 0)
  sets: number;       // Nombre de sets gagnés
  players: string[];  // Noms des 2 joueurs ["Joueur 1", "Joueur 2"]
}

export interface MatchData {
  matchId: string;
  teamA: FlechettesTeamData;
  teamB: FlechettesTeamData;
  matchType: string;
  gameMode?: "BO3" | "BO5";  // Mode de jeu
  currentPlayerIndex?: number;  // 0=1A, 1=1B, 2=2A, 3=2B
  currentThrows?: number[];     // Les fléchettes de la volée en cours (max 3)
  previousScoreA?: number;      // Score précédent pour annulation BUST
  previousScoreB?: number;
  lastThrowWasDouble?: boolean; // Pour vérifier le double-out
}
