import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Match, Pool, Bracket, LoserBracket, MatchStatus } from "../types/tournament.types";

export function useTournamentApi(tournamentId: number | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Mapper le statut pour l'API
   */
  const mapStatus = (status: MatchStatus): string => {
    const map: Record<string, string> = {
      "planifié": "upcoming",
      "en-cours": "in_progress",
      "terminé": "completed",
    };
    return map[status] || "upcoming";
  };

  /**
   * Mapper le type de bracket pour l'API
   */
  const mapBracketTypeToSQL = (bracketType: string | undefined): string | null => {
    if (!bracketType) return null;
    const map: Record<string, string> = {
      quarts: "quarterfinal",
      demi: "semifinal",
      finale: "final",
      "petite-finale": "third_place",
      "loser-round-1": "loser_round_1",
      "loser-round-2": "loser_round_2",
      "loser-round-3": "loser_round_3",
      "loser-finale": "loser_final",
    };
    return map[bracketType] || null;
  };

  /**
   * Charger la structure du tournoi
   */
  const loadTournament = useCallback(async () => {
    if (!tournamentId) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournamentId}/structure`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      console.error("Erreur lors du chargement:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  /**
   * Sauvegarder la structure du tournoi
   */
  const saveTournament = useCallback(async (
    matches: Match[],
    pools: Pool[],
    brackets: Bracket[],
    loserBrackets: LoserBracket[]
  ) => {
    if (!tournamentId) {
      throw new Error("Aucun tournoi sélectionné");
    }

    setIsLoading(true);
    setError(null);

    try {
      const structure = {
        // 1. QUALIFICATIONS
        qualification_matches: matches
          .filter((m) => m.type === "qualifications")
          .map((m) => ({
            uuid: m.uuid || uuidv4(),
            ...(m.id && /^\d+$/.test(m.id) ? { id: parseInt(m.id) } : {}),
            match_type: "qualification",
            label: m.label || m.winnerCode || null,
            status: mapStatus(m.status),
            court: m.court || null,
            scheduled_datetime: m.date && m.time ? `${m.date}T${m.time}:00` : null,
            duration: m.duration || 90,
            team_a_source: m.teamA || null,
            team_b_source: m.teamB || null,
          })),

        // 2. POULES
        pools: pools.map((pool, pIdx) => ({
          name: pool.name,
          display_order: pIdx + 1,
          matches: pool.matches.map((m) => ({
            uuid: m.uuid || uuidv4(),
            ...(m.id && /^\d+$/.test(m.id) ? { id: parseInt(m.id) } : {}),
            match_type: "pool",
            label: m.label || null,
            status: mapStatus(m.status),
            court: m.court || null,
            scheduled_datetime: m.date && m.time ? `${m.date}T${m.time}:00` : null,
            duration: m.duration || 90,
            team_a_source: m.teamA || null,
            team_b_source: m.teamB || null,
          })),
        })),

        // 3. BRACKETS
        brackets: brackets.map((b) => ({
          name: b.name,
          matches: b.matches.map((m) => ({
            uuid: m.uuid || uuidv4(),
            ...(m.id && /^\d+$/.test(m.id) ? { id: parseInt(m.id) } : {}),
            match_type: "bracket",
            bracket_type: mapBracketTypeToSQL(m.bracketMatchType),
            label: m.label || m.winnerCode,
            status: mapStatus(m.status),
            court: m.court || null,
            scheduled_datetime: m.date && m.time ? `${m.date}T${m.time}:00` : null,
            duration: m.duration || 90,
            team_a_source: m.teamA || null,
            team_b_source: m.teamB || null,
          })),
        })),

        // 4. LOSER BRACKETS
        loserBrackets: loserBrackets.map((lb) => ({
          name: lb.name,
          matches: lb.matches.map((m) => ({
            uuid: m.uuid || uuidv4(),
            ...(m.id && /^\d+$/.test(m.id) ? { id: parseInt(m.id) } : {}),
            match_type: "bracket",
            bracket_type: mapBracketTypeToSQL(m.bracketMatchType),
            label: m.label || m.winnerCode,
            status: mapStatus(m.status),
            court: m.court || null,
            scheduled_datetime: m.date && m.time ? `${m.date}T${m.time}:00` : null,
            duration: m.duration || 90,
            team_a_source: m.teamA || null,
            team_b_source: m.teamB || null,
          })),
        })),
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournament_structure/${tournamentId}/structure`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(structure),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Serveur : ${errorText}`);
      }

      const result = await response.json();

      // Synchroniser les IDs retournés par le backend
      if (result.matches && Array.isArray(result.matches)) {
        const syncMatchWithDB = (localM: Match) => {
          const dbMatch = result.matches.find((bm: any) => bm.uuid === localM.uuid);
          if (dbMatch) {
            return { ...localM, id: dbMatch.id.toString() };
          }
          return localM;
        };

        return {
          syncedMatches: matches.map(syncMatchWithDB),
          syncedPools: pools.map((p) => ({
            ...p,
            matches: p.matches.map(syncMatchWithDB),
          })),
          syncedBrackets: brackets.map((b) => ({
            ...b,
            matches: b.matches.map(syncMatchWithDB),
          })),
          syncedLoserBrackets: loserBrackets.map((lb) => ({
            ...lb,
            matches: lb.matches.map(syncMatchWithDB),
          })),
        };
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      console.error("Erreur lors de la sauvegarde:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  return {
    loadTournament,
    saveTournament,
    isLoading,
    error,
  };
}