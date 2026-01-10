import { useState, useEffect, useCallback } from "react";
import { useMatches } from "./useMatches";
import { usePools } from "./usePools";
import { useBrackets } from "./useBrackets";
import { useTournamentApi } from "./useTournamentApi";
import { Match, Pool, Bracket, LoserBracket } from "../types/tournament.types";

export function useTournament(tournamentId: number | null) {
  const [tournamentName, setTournamentName] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Hooks spécialisés
  const matchesHook = useMatches();
  const poolsHook = usePools();
  const bracketsHook = useBrackets();
  const apiHook = useTournamentApi(tournamentId);

  /**
   * Charger les données depuis l'API
   */
  const loadData = useCallback(async () => {
    if (!tournamentId) return;

    const data = await apiHook.loadTournament();
    if (!data) return;

    // Charger les matchs de qualification
    if (data.qualification_matches) {
      const loadedMatches = data.qualification_matches.map((m: any) => ({
        id: m.id.toString(),
        uuid: m.uuid,
        label: m.label,
        teamA: m.team_a_source ?? "",
        teamB: m.team_b_source ?? "",
        date: m.scheduled_datetime?.split("T")[0] ?? m.date ?? "",
        time: m.scheduled_datetime?.split("T")[1]?.slice(0, 5) ?? m.time ?? "",
        court: m.court ?? "",
        status: m.status === "upcoming" ? "planifié" : 
                m.status === "in_progress" ? "en-cours" :
                m.status === "completed" ? "terminé" : "planifié",
        duration: m.duration || 90,
        type: "qualifications" as const,
        scoreA: m.score_a,
        scoreB: m.score_b,
        winnerCode: m.label,
        position: { x: 100, y: 100 + (m.match_order || 0) * 100 },
      }));
      matchesHook.setMatches(loadedMatches);
    }

    // Charger les poules
    if (data.pools) {
      const loadedPools = data.pools.map((p: any, idx: number) => ({
        id: p.id?.toString() || `pool-${idx}`,
        name: p.name,
        teams: [],
        matches: (p.matches || []).map((m: any) => ({
          id: m.id.toString(),
          uuid: m.uuid,
          label: m.label,
          teamA: m.team_a_source ?? "",
          teamB: m.team_b_source ?? "",
          date: m.scheduled_datetime?.split("T")[0] ?? m.date ?? "",
          time: m.scheduled_datetime?.split("T")[1]?.slice(0, 5) ?? m.time ?? "",
          court: m.court ?? "",
          status: m.status === "upcoming" ? "planifié" : 
                  m.status === "in_progress" ? "en-cours" :
                  m.status === "completed" ? "terminé" : "planifié",
          duration: m.duration || 90,
          type: "poule" as const,
          scoreA: m.score_a,
          scoreB: m.score_b,
          position: { x: 0, y: 0 },
        })),
        position: { x: 300, y: 100 + idx * 300 },
        qualifiedToFinals: p.qualified_to_finals || 2,
        qualifiedToLoserBracket: p.qualified_to_loser_bracket || 0,
      }));
      poolsHook.setPools(loadedPools);
    }

    // Charger les brackets
    if (data.bracket_matches) {
      const bracketMatches = data.bracket_matches.map((m: any) => ({
        id: m.id.toString(),
        uuid: m.uuid,
        label: m.label,
        teamA: m.team_a_source ?? "",
        teamB: m.team_b_source ?? "",
        date: m.scheduled_datetime?.split("T")[0] ?? m.date ?? "",
        time: m.scheduled_datetime?.split("T")[1]?.slice(0, 5) ?? m.time ?? "",
        court: m.court ?? "",
        status: m.status === "upcoming" ? "planifié" : 
                m.status === "in_progress" ? "en-cours" :
                m.status === "completed" ? "terminé" : "planifié",
        duration: m.duration || 90,
        type: "phase-finale" as const,
        scoreA: m.score_a,
        scoreB: m.score_b,
        bracketMatchType: m.bracket_type,
        winnerCode: m.label,
        position: { x: 0, y: 0 },
      }));

      bracketsHook.setBrackets([{
        id: "bracket-1",
        name: "Phase Finale",
        enabledRounds: [],
        teams: [],
        matches: bracketMatches,
        position: { x: 800, y: 100 },
        loserToLoserBracket: false,
      }]);
    }

    // Charger les loser brackets
    if (data.loser_bracket_matches) {
      const loserMatches = data.loser_bracket_matches.map((m: any) => ({
        id: m.id.toString(),
        uuid: m.uuid,
        label: m.label,
        teamA: m.team_a_source ?? "",
        teamB: m.team_b_source ?? "",
        date: m.scheduled_datetime?.split("T")[0] ?? m.date ?? "",
        time: m.scheduled_datetime?.split("T")[1]?.slice(0, 5) ?? m.time ?? "",
        court: m.court ?? "",
        status: m.status === "upcoming" ? "planifié" : 
                m.status === "in_progress" ? "en-cours" :
                m.status === "completed" ? "terminé" : "planifié",
        duration: m.duration || 90,
        type: "loser-bracket" as const,
        scoreA: m.score_a,
        scoreB: m.score_b,
        loserBracketMatchType: m.bracket_type,
        position: { x: 0, y: 0 },
      }));

      bracketsHook.setLoserBrackets([{
        id: "loser-bracket-1",
        name: "Loser Bracket",
        enabledRounds: [],
        teams: [],
        matches: loserMatches,
        position: { x: 600, y: 100 },
      }]);
    }

    setIsInitialized(true);
  }, [tournamentId]);

  /**
   * Sauvegarder les données
   */
  const save = useCallback(async () => {
    try {
      const result = await apiHook.saveTournament(
        matchesHook.matches,
        poolsHook.pools,
        bracketsHook.brackets,
        bracketsHook.loserBrackets
      );

      if (result) {
        // Synchroniser les IDs retournés
        matchesHook.setMatches(result.syncedMatches);
        poolsHook.setPools(result.syncedPools);
        bracketsHook.setBrackets(result.syncedBrackets);
        bracketsHook.setLoserBrackets(result.syncedLoserBrackets);
      }

      alert("✅ Tournoi sauvegardé avec succès !");
    } catch (error) {
      alert("❌ Erreur lors de la sauvegarde");
      console.error(error);
    }
  }, [
    matchesHook.matches,
    poolsHook.pools,
    bracketsHook.brackets,
    bracketsHook.loserBrackets,
  ]);

  /**
   * Réinitialiser
   */
  const reset = useCallback(() => {
    matchesHook.setMatches([]);
    poolsHook.setPools([]);
    bracketsHook.setBrackets([]);
    bracketsHook.setLoserBrackets([]);
    matchesHook.setSelectedMatch(null);
    poolsHook.setSelectedPool(null);
    bracketsHook.setSelectedBracket(null);
    bracketsHook.setSelectedLoserBracket(null);
  }, []);

  // Charger les données au montage
  useEffect(() => {
    if (tournamentId && !isInitialized) {
      loadData();
    }
  }, [tournamentId, isInitialized, loadData]);

  return {
    // État
    tournamentId,
    tournamentName,
    isLoading: apiHook.isLoading,
    error: apiHook.error,

    // Matchs
    matches: matchesHook.matches,
    selectedMatch: matchesHook.selectedMatch,
    setSelectedMatch: matchesHook.setSelectedMatch,
    addMatch: matchesHook.addMatch,
    updateMatch: matchesHook.updateMatch,
    deleteMatch: matchesHook.deleteMatch,
    adjustQualificationMatchesCount: matchesHook.adjustQualificationMatchesCount,

    // Poules
    pools: poolsHook.pools,
    selectedPool: poolsHook.selectedPool,
    setSelectedPool: poolsHook.setSelectedPool,
    addPool: poolsHook.addPool,
    updatePool: poolsHook.updatePool,
    deletePool: poolsHook.deletePool,
    updatePoolMatch: poolsHook.updatePoolMatch,

    // Brackets
    brackets: bracketsHook.brackets,
    loserBrackets: bracketsHook.loserBrackets,
    selectedBracket: bracketsHook.selectedBracket,
    selectedLoserBracket: bracketsHook.selectedLoserBracket,
    setSelectedBracket: bracketsHook.setSelectedBracket,
    setSelectedLoserBracket: bracketsHook.setSelectedLoserBracket,
    addBracket: bracketsHook.addBracket,
    updateBracket: bracketsHook.updateBracket,
    deleteBracket: bracketsHook.deleteBracket,
    addLoserBracket: bracketsHook.addLoserBracket,
    updateLoserBracket: bracketsHook.updateLoserBracket,
    deleteLoserBracket: bracketsHook.deleteLoserBracket,

    // Actions
    save,
    reset,
    reload: loadData,
  };
}