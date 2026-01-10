import { useEffect, useState } from "react";

export type TournamentMatchType = "qualifications" | "poule" | "loser-bracket" | "quarts" | "demi-finale" | "finale" | "petite-finale";
export type TournamentMatchStatus = "planifié" | "en-cours" | "terminé" | "annulé";
export type TournamentMatch = {
  id: string;
  label: string;
  teamA: string;
  teamB: string;
  type: TournamentMatchType;
  status: TournamentMatchStatus;
  date?: string;
  time?: string;
  court?: string;
  scoreA?: number;
  scoreB?: number;
  duration?: number;
  position?: { x: number; y: number };
};

/**
 * Hook pour charger les matchs d'un tournoi à partir de l'ID du sport et du mapping teamSportIdToName.
 * Retourne { matches, error }.
 */
export function useTournamentMatches(sportId?: string, teamSportIdToName?: Record<number, string>) {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nextMatchId, setNextMatchId] = useState<number>(1);

  // Ajoute un match et incrémente l'ID


    const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);

    function addMatch(match: Omit<TournamentMatch, "id">) {
      const id = `match-${nextMatchId}`;
      setMatches([...matches, { ...match, id }]);
      setNextMatchId(nextMatchId + 1);
    }

    function updateMatch(updatedMatch: TournamentMatch) {
      setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
      setSelectedMatch(updatedMatch);
    }

    function deleteMatch(matchId: string) {
      setMatches(matches.filter(m => m.id !== matchId));
      setSelectedMatch(null);
    }

  useEffect(() => {
    if (!sportId || !teamSportIdToName || Object.keys(teamSportIdToName).length === 0) return;
    const loadTournamentMatches = async () => {
      try {
        const tournamentsResponse = await fetch(`http://localhost:8000/tournaments`);
        if (!tournamentsResponse.ok) throw new Error("Impossible de charger les tournois");
        const tournamentsData = await tournamentsResponse.json();
        const tournaments = Array.isArray(tournamentsData.data?.items)
          ? tournamentsData.data.items
          : Array.isArray(tournamentsData.data)
          ? tournamentsData.data
          : [];
        const tournament = tournaments.find((t: any) => t.sport_id === parseInt(sportId));
        if (!tournament) throw new Error("Aucun tournoi trouvé pour ce sport.");
        const response = await fetch(`http://localhost:8000/matches?tournament_id=${tournament.id}`);
        if (!response.ok) throw new Error("Impossible de charger les matchs du tournoi");
        const data = await response.json();
        const all = data.data || [];
        const collected: TournamentMatch[] = all.map((m: any) => {
          let type: TournamentMatchType = "qualifications";
          if (m.match_type === "qualification") type = "qualifications";
          else if (m.match_type === "bracket") {
            if (m.bracket_type === "semifinal") type = "demi-finale";
            else if (m.bracket_type === "final") type = "finale";
            else if (m.bracket_type === "third_place") type = "petite-finale";
            else type = "bracket" as TournamentMatchType;
          }
          return {
            id: m.id?.toString() || "",
            label: m.label || "",
            teamA: m.team_a_source || "",
            teamB: m.team_b_source || "",
            type,
            status: m.status === "upcoming" ? "planifié" : 
                   m.status === "in_progress" ? "en-cours" :
                   m.status === "completed" ? "terminé" : "planifié",
            court: m.court ? m.court.trim() : "",
            scoreA: m.score_a,
            scoreB: m.score_b,
            date: m.date,
            time: m.time,
          };
        });
        setMatches(collected);
      } catch (err: any) {
        setError(err.message || "Impossible de charger les matchs du tournoi.");
      }
    };
    loadTournamentMatches();
  }, [sportId, teamSportIdToName]);

    return {
      matches,
      error,
      addMatch,
      updateMatch,
      deleteMatch,
      selectedMatch,
      setSelectedMatch,
      nextMatchId,
      setNextMatchId,
      setMatches,
  };
}
