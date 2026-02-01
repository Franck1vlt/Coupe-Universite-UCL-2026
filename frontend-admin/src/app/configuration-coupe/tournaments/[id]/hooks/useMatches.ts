import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Match, MatchType, MatchStatus } from "../types/tournament.types";

export function useMatches(initialMatches: Match[] = []) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [nextMatchId, setNextMatchId] = useState(1);

  /**
   * Ajouter un nouveau match
   */
  const addMatch = useCallback((matchType: MatchType, position: { x: number; y: number }) => {
    const newMatch: Match = {
      id: `match-${nextMatchId}`,
      uuid: uuidv4(),
      label: matchType === "qualifications" ? `WQ${nextMatchId}` : undefined,
      teamA: "",
      teamB: "",
      date: "",
      time: "",
      court: "",
      status: "planifié" as MatchStatus,
      duration: 90,
      type: matchType,
      position,
      winnerPoints: 0,
      loserPoints: 0,
      winnerCode: matchType === "qualifications" ? `WQ${nextMatchId}` : undefined,
    };

    setMatches((prev) => [...prev, newMatch]);
    setSelectedMatch(newMatch);
    setNextMatchId((prev) => prev + 1);

    return newMatch;
  }, [nextMatchId]);

  /**
   * Mettre à jour un match
   */
  const updateMatch = useCallback((updatedMatch: Match) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === updatedMatch.id ? { ...updatedMatch } : m))
    );
    setSelectedMatch(updatedMatch);
  }, []);

  /**
   * Supprimer un match
   */
  const deleteMatch = useCallback((matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    setSelectedMatch(null);
  }, []);

  /**
   * Ajuster le nombre de matchs de qualification
   */
  const adjustQualificationMatchesCount = useCallback((targetCount: number) => {
    if (targetCount <= 0) return;

    const currentQualifs = matches.filter((m) => m.type === "qualifications");

    // Ne supprime pas automatiquement
    if (targetCount <= currentQualifs.length) {
      return;
    }

    // Créer les nouveaux matchs
    const anchorMatch = currentQualifs[0] || selectedMatch;
    const baseX = anchorMatch ? anchorMatch.position.x : 100;
    const baseY = anchorMatch ? anchorMatch.position.y : 100;

    const newMatches: Match[] = [];
    let currentId = nextMatchId;

    for (let i = currentQualifs.length; i < targetCount; i++) {
      const index = i + 1;
      newMatches.push({
        id: `match-${currentId}`,
        uuid: uuidv4(),
        label: `WQ${index}`,
        teamA: "",
        teamB: "",
        date: "",
        time: "",
        court: "",
        status: "planifié",
        duration: 90,
        type: "qualifications",
        position: { x: baseX, y: baseY + (i - currentQualifs.length) * 90 },
        winnerPoints: 0,
        loserPoints: 0,
        winnerCode: `WQ${index}`,
      });
      currentId++;
    }

    setMatches((prev) => [...prev, ...newMatches]);
    setNextMatchId(currentId);
  }, [matches, selectedMatch, nextMatchId]);

  /**
   * Obtenir les matchs par type
   */
  const getMatchesByType = useCallback((type: MatchType) => {
    return matches.filter((m) => m.type === type);
  }, [matches]);

  /**
   * Obtenir un match par ID
   */
  const getMatchById = useCallback((id: string) => {
    return matches.find((m) => m.id === id);
  }, [matches]);

  /**
   * Déplacer un match
   */
  const moveMatch = useCallback((matchId: string, position: { x: number; y: number }) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, position } : m))
    );
  }, []);

  return {
    matches,
    selectedMatch,
    setMatches,
    setSelectedMatch,
    addMatch,
    updateMatch,
    deleteMatch,
    adjustQualificationMatchesCount,
    getMatchesByType,
    getMatchById,
    moveMatch,
  };
}