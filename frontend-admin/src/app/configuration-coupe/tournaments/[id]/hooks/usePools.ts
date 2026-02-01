import { useState, useCallback } from "react";
import { Pool, Match } from "../types/tournament.types";

export function usePools(initialPools: Pool[] = []) {
  const [pools, setPools] = useState<Pool[]>(initialPools);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);

  /**
   * Ajouter une nouvelle poule
   */
  const addPool = useCallback((name: string, position: { x: number; y: number }) => {
    const newPool: Pool = {
      id: `pool-${Date.now()}`,
      name,
      teams: [],
      matches: [],
      position,
      qualifiedToFinals: 2,
      qualifiedToLoserBracket: 0,
    };

    setPools((prev) => [...prev, newPool]);
    setSelectedPool(newPool);
    return newPool;
  }, []);

  /**
   * Mettre à jour une poule
   */
  const updatePool = useCallback((updatedPool: Pool) => {
    setPools((prev) => prev.map((p) => (p.id === updatedPool.id ? updatedPool : p)));
    setSelectedPool(updatedPool);
  }, []);

  /**
   * Supprimer une poule
   */
  const deletePool = useCallback((poolId: string) => {
    setPools((prev) => prev.filter((p) => p.id !== poolId));
    setSelectedPool(null);
  }, []);

  /**
   * Ajouter une équipe à une poule
   */
  const addTeamToPool = useCallback((poolId: string, teamName: string) => {
    setPools((prev) =>
      prev.map((p) => {
        if (p.id === poolId && !p.teams.includes(teamName)) {
          return { ...p, teams: [...p.teams, teamName] };
        }
        return p;
      })
    );
  }, []);

  /**
   * Retirer une équipe d'une poule
   */
  const removeTeamFromPool = useCallback((poolId: string, teamName: string) => {
    setPools((prev) =>
      prev.map((p) => {
        if (p.id === poolId) {
          return { ...p, teams: p.teams.filter((t) => t !== teamName) };
        }
        return p;
      })
    );
  }, []);

  /**
   * Mettre à jour un match dans une poule
   */
  const updatePoolMatch = useCallback((poolId: string, updatedMatch: Match) => {
    setPools((prev) =>
      prev.map((p) => {
        if (p.id === poolId) {
          return {
            ...p,
            matches: p.matches.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)),
          };
        }
        return p;
      })
    );
  }, []);

  /**
   * Déplacer une poule
   */
  const movePool = useCallback((poolId: string, position: { x: number; y: number }) => {
    setPools((prev) => prev.map((p) => (p.id === poolId ? { ...p, position } : p)));
  }, []);

  return {
    pools,
    selectedPool,
    setPools,
    setSelectedPool,
    addPool,
    updatePool,
    deletePool,
    addTeamToPool,
    removeTeamFromPool,
    updatePoolMatch,
    movePool,
  };
}