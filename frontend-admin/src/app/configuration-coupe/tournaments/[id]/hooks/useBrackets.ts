import { useState, useCallback } from "react";
import { Bracket, LoserBracket } from "../types/tournament.types";

export function useBrackets(
  initialBrackets: Bracket[] = [],
  initialLoserBrackets: LoserBracket[] = []
) {
  const [brackets, setBrackets] = useState<Bracket[]>(initialBrackets);
  const [loserBrackets, setLoserBrackets] = useState<LoserBracket[]>(initialLoserBrackets);
  const [selectedBracket, setSelectedBracket] = useState<Bracket | null>(null);
  const [selectedLoserBracket, setSelectedLoserBracket] = useState<LoserBracket | null>(null);

  /**
   * Ajouter un nouveau bracket
   */
  const addBracket = useCallback((name: string, position: { x: number; y: number }) => {
    const newBracket: Bracket = {
      id: `bracket-${Date.now()}`,
      name,
      enabledRounds: [],
      teams: [],
      matches: [],
      position,
      loserToLoserBracket: false,
    };

    setBrackets((prev) => [...prev, newBracket]);
    setSelectedBracket(newBracket);
    return newBracket;
  }, []);

  /**
   * Mettre à jour un bracket
   */
  const updateBracket = useCallback((updatedBracket: Bracket) => {
    setBrackets((prev) =>
      prev.map((b) => (b.id === updatedBracket.id ? updatedBracket : b))
    );
    setSelectedBracket(updatedBracket);
  }, []);

  /**
   * Supprimer un bracket
   */
  const deleteBracket = useCallback((bracketId: string) => {
    setBrackets((prev) => prev.filter((b) => b.id !== bracketId));
    setSelectedBracket(null);
  }, []);

  /**
   * Ajouter un loser bracket
   */
  const addLoserBracket = useCallback((name: string, position: { x: number; y: number }) => {
    const newLoserBracket: LoserBracket = {
      id: `loser-bracket-${Date.now()}`,
      name,
      enabledRounds: [],
      teams: [],
      matches: [],
      position,
    };

    setLoserBrackets((prev) => [...prev, newLoserBracket]);
    setSelectedLoserBracket(newLoserBracket);
    return newLoserBracket;
  }, []);

  /**
   * Mettre à jour un loser bracket
   */
  const updateLoserBracket = useCallback((updatedLoserBracket: LoserBracket) => {
    setLoserBrackets((prev) =>
      prev.map((lb) => (lb.id === updatedLoserBracket.id ? updatedLoserBracket : lb))
    );
    setSelectedLoserBracket(updatedLoserBracket);
  }, []);

  /**
   * Supprimer un loser bracket
   */
  const deleteLoserBracket = useCallback((loserBracketId: string) => {
    setLoserBrackets((prev) => prev.filter((lb) => lb.id !== loserBracketId));
    setSelectedLoserBracket(null);
  }, []);

  /**
   * Déplacer un bracket
   */
  const moveBracket = useCallback((bracketId: string, position: { x: number; y: number }) => {
    setBrackets((prev) => prev.map((b) => (b.id === bracketId ? { ...b, position } : b)));
  }, []);

  /**
   * Déplacer un loser bracket
   */
  const moveLoserBracket = useCallback((loserBracketId: string, position: { x: number; y: number }) => {
    setLoserBrackets((prev) =>
      prev.map((lb) => (lb.id === loserBracketId ? { ...lb, position } : lb))
    );
  }, []);

  return {
    brackets,
    loserBrackets,
    selectedBracket,
    selectedLoserBracket,
    setBrackets,
    setLoserBrackets,
    setSelectedBracket,
    setSelectedLoserBracket,
    addBracket,
    updateBracket,
    deleteBracket,
    addLoserBracket,
    updateLoserBracket,
    deleteLoserBracket,
    moveBracket,
    moveLoserBracket,
  };
}