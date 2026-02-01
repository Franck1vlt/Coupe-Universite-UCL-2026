"use client";

import { useEffect, useState, useMemo } from "react";
import { useMatchSSE, type LiveScoreData } from "../features/scoreboards/common/useMatchSSE";

// --- TYPES ---
// Basé sur votre modèle Match dans match.py
interface Team {
  id: number;
  name: string;
  logo_url?: string;
  primary_color?: string;
}

interface TeamSport {
  id: number;
  team?: Team; // Peut être null si non chargé
  team_sport_name?: string; // Nom spécifique si surchargé
}

interface Match {
  id: number;
  uuid: string;
  match_type: string; // 'qualification', 'pool', 'bracket', etc.
  label?: string; // ex: "Finale", "Poule A - Match 1"
  status: "upcoming" | "in_progress" | "completed" | "cancelled";

  // Scores
  score_a: number | null;
  score_b: number | null;

  // Infos terrain/horaire
  court?: string;
  time?: string;

  // Équipes : Relation via ORM
  team_sport_a?: TeamSport;
  team_sport_b?: TeamSport;

  // Équipes : Sources textuelles (fallback)
  team_a_source?: string;
  team_b_source?: string;

  // Sport info
  sport_code?: string;
  sport_name?: string;
  tournament_name?: string;
  tournament_id?: number;
}

// Helper to normalize sport code
const normalizeSport = (sport: string | undefined): string => {
  if (!sport) return "unknown";
  const normalized = sport.toLowerCase().trim();
  const sportMap: Record<string, string> = {
    "volley": "volleyball",
    "volley-ball": "volleyball",
    "foot": "football",
    "basket": "basketball",
    "hand": "handball",
    "petanque": "petanque",
    "pétanque": "petanque",
    "flechettes": "flechettes",
    "fléchettes": "flechettes",
    "darts": "flechettes",
  };
  return sportMap[normalized] || normalized;
};

// Helper to extract gender from tournament name
const extractGender = (tournamentName: string | undefined): { label: string; color: string } | null => {
  if (!tournamentName) return null;
  const lower = tournamentName.toLowerCase();
  if (lower.includes("homme") || lower.includes("men") || lower.includes("masculin")) {
    return { label: "Hommes", color: "text-blue-400" };
  }
  if (lower.includes("femme") || lower.includes("women") || lower.includes("féminin") || lower.includes("feminin")) {
    return { label: "Femmes", color: "text-pink-400" };
  }
  if (lower.includes("mixte") || lower.includes("mixed")) {
    return { label: "Mixte", color: "text-purple-400" };
  }
  return null;
};

// --- COMPOSANT PRINCIPAL ---
export default function ScoresDirectPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveScores, setLiveScores] = useState<Map<number, LiveScoreData>>(new Map());

  // URL de l'API (ajustez si nécessaire)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Extraire les IDs des matchs en cours pour SSE
  const inProgressMatchIds = useMemo(() => {
    return matches.map(m => m.id).filter(id => !isNaN(id));
  }, [matches]);

  // SSE pour les scores en temps réel
  const { scores: sseScores, connectionState } = useMatchSSE({
    matchIds: inProgressMatchIds,
    enabled: inProgressMatchIds.length > 0,
    onScoreUpdate: (data) => {
      console.log('[ScoresDirect] SSE update:', data);
      setLiveScores(prev => {
        const newMap = new Map(prev);
        newMap.set(data.match_id, data);
        return newMap;
      });
      setLastUpdated(new Date());
    }
  });

  // Fonction pour obtenir le score live d'un match
  const getLiveScore = (matchId: number) => {
    return liveScores.get(matchId) || sseScores.get(matchId);
  };

  // Fonction de récupération des données avec sport info
  const fetchLiveMatches = async () => {
    try {
      // Get all tournaments to map sport info
      const tournamentsRes = await fetch(`${API_URL}/tournaments`);
      const tournamentsData = await tournamentsRes.json();
      const tournaments = tournamentsData.data?.items || tournamentsData.data || [];

      // Create sport and tournament mapping
      const sportMap = new Map<number, { code: string; name: string }>();
      const tournamentMap = new Map<number, { sport_id: number; name: string }>(); // tournament_id -> { sport_id, name }

      for (const t of tournaments) {
        tournamentMap.set(t.id, { sport_id: t.sport_id, name: t.name });
        if (t.sport_id && !sportMap.has(t.sport_id)) {
          try {
            const sportRes = await fetch(`${API_URL}/sports/${t.sport_id}`);
            if (sportRes.ok) {
              const sportData = await sportRes.json();
              sportMap.set(t.sport_id, {
                code: sportData.data?.code || sportData.data?.slug || sportData.data?.name?.toLowerCase().replace(/\s+/g, '') || "unknown",
                name: sportData.data?.name || "Sport"
              });
            }
          } catch {
            // Ignore
          }
        }
      }

      // Fetch in_progress matches
      const response = await fetch(`${API_URL}/matches?status=in_progress`);
      if (!response.ok) throw new Error("Erreur réseau");

      const json = await response.json();
      const rawMatches = json.data ? json.data : (Array.isArray(json) ? json : []);

      // Enrich matches with sport and tournament info
      const enrichedMatches: Match[] = rawMatches.map((m: any) => {
        const tournamentInfo = tournamentMap.get(m.tournament_id);
        const sportInfo = tournamentInfo ? sportMap.get(tournamentInfo.sport_id) : null;
        return {
          ...m,
          uuid: m.uuid || `match-${m.id}`,
          sport_code: sportInfo?.code || "unknown",
          sport_name: sportInfo?.name || "Sport",
          tournament_name: tournamentInfo?.name || m.tournament_name,
        };
      });

      setMatches(enrichedMatches);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Erreur fetch live matches:", err);
      if (matches.length === 0) setError("Impossible de charger les scores en direct.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // On lance le rafraîchissement immédiatement
    fetchLiveMatches();

    // PUIS ON LE LANCE TOUTES LES 30 SECONDES (reduced from 3s since SSE handles live updates)
    const timer = setInterval(fetchLiveMatches, 30000);

    return () => clearInterval(timer);
  }, []);

  // Helper pour déterminer le nom à afficher (Logique Backend match.py)
  const getTeamName = (match: Match, side: "a" | "b") => {
    if (side === "a") {
      if (match.team_sport_a?.team?.name) return match.team_sport_a.team.name;
      if (match.team_sport_a?.team_sport_name) return match.team_sport_a.team_sport_name;
      return match.team_a_source || "Équipe A";
    } else {
      if (match.team_sport_b?.team?.name) return match.team_sport_b.team.name;
      if (match.team_sport_b?.team_sport_name) return match.team_sport_b.team_sport_name;
      return match.team_b_source || "Équipe B";
    }
  };

  // Transform match data for CompactScoreboard
  const getCompactMatch = (match: Match) => ({
    id: match.id,
    uuid: match.uuid || `match-${match.id}`,
    team_a_name: getTeamName(match, "a"),
    team_b_name: getTeamName(match, "b"),
    team_a_logo: match.team_sport_a?.team?.logo_url,
    team_b_logo: match.team_sport_b?.team?.logo_url,
    score_a: match.score_a,
    score_b: match.score_b,
    status: match.status,
    match_type: match.match_type,
    label: match.label,
    court: match.court,
    tournament_name: match.tournament_name,
  });

  // --- RENDU ---
  
  if (loading && matches.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      {/* En-tête */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Scores en Direct</h1>
            <p className="text-sm text-gray-400 mt-1">
              Mise à jour automatique • Dernière synchro : {lastUpdated?.toLocaleTimeString()}
            </p>
          </div>

          <div className={`flex items-center px-4 py-2 rounded-full border w-fit ${
            connectionState.isConnected
              ? 'bg-green-900/50 border-green-500'
              : connectionState.isConnecting
                ? 'bg-yellow-900/50 border-yellow-500'
                : 'bg-red-900/50 border-red-500'
          }`}>
            <span className="relative flex h-3 w-3 mr-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connectionState.isConnected ? 'bg-green-400' : connectionState.isConnecting ? 'bg-yellow-400' : 'bg-red-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                connectionState.isConnected ? 'bg-green-500' : connectionState.isConnecting ? 'bg-yellow-500' : 'bg-red-500'
              }`}></span>
            </span>
            <span className={`font-bold text-sm uppercase tracking-wide ${
              connectionState.isConnected ? 'text-green-400' : connectionState.isConnecting ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {connectionState.isConnected ? 'Live' : connectionState.isConnecting ? 'Connexion...' : 'Déconnecté'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto bg-red-900/50 border-l-4 border-red-500 p-4 mb-6 rounded shadow-sm">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Liste des matchs avec ScorebarScoreboard */}
      {matches.length === 0 ? (
        <div className="max-w-7xl mx-auto text-center py-16 bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-600">
          <p className="text-gray-400 text-lg">Aucun match en cours actuellement.</p>
          <p className="text-gray-500 text-sm mt-2">Le live démarrera dès le coup d'envoi du prochain match.</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => {
            const liveData = getLiveScore(match.id);
            const sport = liveData?.sport
              ? normalizeSport(liveData.sport)
              : normalizeSport(match.sport_code);

            const compactMatch = getCompactMatch(match);
            const data = liveData?.data;
            const gender = extractGender(match.tournament_name);

            // Scores avec données live
            const scoreA = data ? (data.score1 ?? data.scoreA ?? compactMatch.score_a ?? 0) : (compactMatch.score_a ?? 0);
            const scoreB = data ? (data.score2 ?? data.scoreB ?? compactMatch.score_b ?? 0) : (compactMatch.score_b ?? 0);
            const setsA = data?.sets1 ?? data?.setsA ?? null;
            const setsB = data?.sets2 ?? data?.setsB ?? null;
            const hasSets = setsA !== null && setsB !== null;

            return (
              <div
                key={match.id}
                className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden hover:border-green-500/50 transition-all hover:shadow-lg hover:shadow-green-500/10"
              >
                {/* Header avec sport et terrain */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-green-400">
                      {sport}
                    </span>
                    {gender && (
                      <span className={`text-xs font-medium ${gender.color}`}>
                        {gender.label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {data?.matchGround || compactMatch.court || "Terrain"}
                  </span>
                </div>

                {/* Corps de la card */}
                <div className="p-4">
                  {/* Équipe A */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {compactMatch.team_a_logo ? (
                        <img
                          src={compactMatch.team_a_logo}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover bg-gray-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-400 font-bold text-sm">
                            {compactMatch.team_a_name?.charAt(0) || "A"}
                          </span>
                        </div>
                      )}
                      <span className="font-semibold text-white truncate">
                        {data?.team1 || compactMatch.team_a_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasSets && (
                        <span className="text-sm text-gray-400 font-medium">
                          ({setsA})
                        </span>
                      )}
                      <span className={`text-2xl font-black min-w-[40px] text-center ${
                        scoreA > scoreB ? 'text-green-400' : 'text-white'
                      }`}>
                        {scoreA}
                      </span>
                    </div>
                  </div>

                  {/* Séparateur VS */}
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-gray-700"></div>
                    <span className="text-xs text-gray-500 font-bold">VS</span>
                    <div className="flex-1 h-px bg-gray-700"></div>
                  </div>

                  {/* Équipe B */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {compactMatch.team_b_logo ? (
                        <img
                          src={compactMatch.team_b_logo}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover bg-gray-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-400 font-bold text-sm">
                            {compactMatch.team_b_name?.charAt(0) || "B"}
                          </span>
                        </div>
                      )}
                      <span className="font-semibold text-white truncate">
                        {data?.team2 || compactMatch.team_b_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasSets && (
                        <span className="text-sm text-gray-400 font-medium">
                          ({setsB})
                        </span>
                      )}
                      <span className={`text-2xl font-black min-w-[40px] text-center ${
                        scoreB > scoreA ? 'text-green-400' : 'text-white'
                      }`}>
                        {scoreB}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer avec label/type de match */}
                {(compactMatch.label || compactMatch.tournament_name) && (
                  <div className="px-4 py-2 bg-gray-900/30 border-t border-gray-700">
                    <p className="text-xs text-gray-400 truncate">
                      {compactMatch.label || compactMatch.tournament_name}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}