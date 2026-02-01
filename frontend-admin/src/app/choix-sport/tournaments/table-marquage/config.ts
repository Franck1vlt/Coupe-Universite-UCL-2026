// Types de sports supportés
export type SportCode = 'football' | 'handball' | 'basketball' | 'volleyball' | 'badminton' | 'petanque'| 'flechettes';

// Configuration par sport
export interface SportConfig {
  code: SportCode;
  name: string;
  scoreIncrements: number[];
  periods: number;
  periodDuration: number; // en minutes
  rules: {
    canTie: boolean;
    maxFouls?: number;
    timeouts?: number;
    hasOvertime?: boolean;
  };
}

// Configuration des sports
export const sportsConfig: Record<SportCode, SportConfig> = {
  football: {
    code: 'football',
    name: 'Football',
    scoreIncrements: [1],
    periods: 2,
    periodDuration: 45,
    rules: {
      canTie: true,
      hasOvertime: false,
    }
  },
  handball: {
    code: 'handball',
    name: 'Handball',
    scoreIncrements: [1],
    periods: 2,
    periodDuration: 30,
    rules: {
      canTie: false,
      timeouts: 3,
      hasOvertime: true,
    }
  },
  basketball: {
    code: 'basketball',
    name: 'Basketball',
    scoreIncrements: [1, 2, 3],
    periods: 4,
    periodDuration: 10,
    rules: {
      canTie: false,
      maxFouls: 5,
      hasOvertime: true,
    }
  },
  volleyball: {
    code: 'volleyball',
    name: 'Volleyball',
    scoreIncrements: [1],
    periods: 5, // Best of 5 sets
    periodDuration: 0, // Not time-based
    rules: {
      canTie: false,
      hasOvertime: false, // Tie-break set
    }
  },
  badminton: {
    code: 'badminton',
    name: 'Badminton',
    scoreIncrements: [1],
    periods: 3, // Best of 3 games
    periodDuration: 0, // Not time-based
    rules: {
      canTie: false,
      hasOvertime: false,
    }
  },
  petanque: {
    code: 'petanque',
    name: 'Pétanque',
    scoreIncrements: [1],
    periods: 1,
    periodDuration: 0, // Not time-based
    rules: {
      canTie: false,
      hasOvertime: false,
    }
  },
  flechettes: {
    code: 'flechettes',
    name: 'Fléchettes',
    scoreIncrements: [1], // Depends on the target hit
    periods: 1,
    periodDuration: 0, // Not time-based
    rules: {
      canTie: false,
      hasOvertime: false,
    }
  },
};

// Fonction pour vérifier si un sport est valide
export function isValidSport(sport: string): sport is SportCode {
  return sport in sportsConfig;
}

// Fonction pour récupérer la config d'un sport
export function getSportConfig(sportCode: SportCode): SportConfig {
  return sportsConfig[sportCode];
}

// Liste des sports disponibles
export function getAvailableSports(): SportCode[] {
  return Object.keys(sportsConfig) as SportCode[];
}
