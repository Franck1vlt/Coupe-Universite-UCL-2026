"use client";

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { SportCode, SportConfig, sportsConfig } from './config';

// Interface pour les props des scoreboards
export interface ScoreboardProps {
  matchId?: string;
  config?: SportConfig;
}

// Ré-exporter les types et fonctions depuis config
export type { SportCode, SportConfig };
export { sportsConfig, isValidSport, getSportConfig, getAvailableSports } from './config';

// Registry des composants de scoreboard
const scoreboardRegistry: Record<SportCode, () => Promise<{ default: ComponentType<ScoreboardProps> }>> = {
  football: () => import('../../../features/scoreboards/football/Scoreboard'),
  handball: () => import('../../../features/scoreboards/handball/Scoreboard'),
  basketball: () => import('../../../features/scoreboards/basketball/Scoreboard'),
  // volleyball: () => import('../../../features/scoreboards/volleyball/Scoreboard'),
  badminton: () => import('../../../features/scoreboards/badminton/Scoreboard'),
  // petanque: () => import('../../../features/scoreboards/petanque/Scoreboard'),
  // flechettes: () => import('../../../features/scoreboards/flechettes/Scoreboard'),
};

// Registry des composants spectateurs
const spectatorsRegistry: Record<SportCode, () => Promise<{ default: ComponentType<ScoreboardProps> }>> = {
  football: () => import('../../../features/scoreboards/football/spectators/Scoreboard'),
  handball: () => import('../../../features/scoreboards/handball/spectators/Scoreboard'),
  basketball: () => import('../../../features/scoreboards/basketball/spectators/Scoreboard'),
  // volleyball: () => import('../../../features/scoreboards/volleyball/spectators/Scoreboard'),
  badminton: () => import('../../../features/scoreboards/badminton/spectators/Scoreboard'),
  // petanque: () => import('../../../features/scoreboards/petanque/spectators/Scoreboard'),
  // flechettes: () => import('../../../features/scoreboards/flechettes/spectators/Scoreboard'),
};

// Fonction pour récupérer le composant scoreboard
export function getScoreboardComponent(sportCode: SportCode) {
  const componentLoader = scoreboardRegistry[sportCode];
  if (!componentLoader) {
    // Fallback or error component
    const FallbackComponent: ComponentType<ScoreboardProps> = () => (
      <div>Scoreboard non disponible pour ce sport.</div>
    );
    return dynamic(() => Promise.resolve({ default: FallbackComponent }), { ssr: false });
  }
  
  return dynamic(componentLoader, {
    loading: () => <div className="flex items-center justify-center min-h-screen">Chargement...</div>,
    ssr: false, // Désactiver SSR si nécessaire pour les scoreboards
  });
}

// Fonction pour récupérer le composant spectateurs
export function getSpectatorsComponent(sportCode: SportCode) {
  const componentLoader = spectatorsRegistry[sportCode];
  if (!componentLoader) {
    // Fallback or error component
    const FallbackComponent: ComponentType<ScoreboardProps> = () => (
      <div>Vue spectateur non disponible pour ce sport.</div>
    );
    return dynamic(() => Promise.resolve({ default: FallbackComponent }), { ssr: false });
  }
  
  return dynamic(componentLoader, {
    loading: () => <div className="flex items-center justify-center min-h-screen">Chargement...</div>,
    ssr: false,
  });
}