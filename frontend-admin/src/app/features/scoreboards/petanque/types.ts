export interface PetanqueTeamData {
  name: string;
  logo_url: string;
  score: number;      // Score actuel de l'équipe (points marqués, commence à 0)
}

export interface MatchData {
  matchId: string;
  teamA: PetanqueTeamData;
  teamB: PetanqueTeamData;
  matchType: string;
  cochonnetOwner: "A" | "B";  // Équipe qui lance le cochonnet
  currentMene: number;         // Numéro de la mène en cours
}
