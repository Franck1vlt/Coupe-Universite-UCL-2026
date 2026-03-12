import { useState, useCallback } from "react";
import { Pool, Match } from "../types/tournament.types";

// Une ligue a la même structure qu'une poule, mais sans génération automatique de matchs
export type League = Pool;

export function useLeagues(initialLeagues: League[] = []) {
  const [leagues, setLeagues] = useState<League[]>(initialLeagues);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);

  /**
   * Ajouter une nouvelle ligue
   */
  const addLeague = useCallback((name: string, position: { x: number; y: number }) => {
    const newLeague: League = {
      id: `league-${Date.now()}`,
      name,
      teams: [],
      matches: [],
      position,
      qualifiedToFinals: 8,
      qualifiedToLoserBracket: 0,
    };

    setLeagues((prev) => [...prev, newLeague]);
    setSelectedLeague(newLeague);
    return newLeague;
  }, []);

  /**
   * Mettre à jour une ligue
   */
  const updateLeague = useCallback((updatedLeague: League) => {
    setLeagues((prev) => prev.map((l) => (l.id === updatedLeague.id ? updatedLeague : l)));
    setSelectedLeague(updatedLeague);
  }, []);

  /**
   * Supprimer une ligue
   */
  const deleteLeague = useCallback((leagueId: string) => {
    setLeagues((prev) => prev.filter((l) => l.id !== leagueId));
    setSelectedLeague(null);
  }, []);

  /**
   * Mettre à jour un match dans une ligue
   */
  const updateLeagueMatch = useCallback((leagueId: string, updatedMatch: Match) => {
    setLeagues((prev) =>
      prev.map((l) => {
        if (l.id === leagueId) {
          return {
            ...l,
            matches: l.matches.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)),
          };
        }
        return l;
      })
    );
  }, []);

  /**
   * Déplacer une ligue
   */
  const moveLeague = useCallback((leagueId: string, position: { x: number; y: number }) => {
    setLeagues((prev) => prev.map((l) => (l.id === leagueId ? { ...l, position } : l)));
  }, []);

  return {
    leagues,
    selectedLeague,
    setLeagues,
    setSelectedLeague,
    addLeague,
    updateLeague,
    deleteLeague,
    updateLeagueMatch,
    moveLeague,
  };
}
