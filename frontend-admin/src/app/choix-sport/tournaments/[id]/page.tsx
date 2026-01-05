"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  resolveTeamName, 
  calculatePoolStandings,
  calculateFinalRankings,
  type Match as TournamentLogicMatch,
  type Pool as TournamentLogicPool,
  type Bracket as TournamentLogicBracket,
  type LoserBracket as TournamentLogicLoserBracket,
  type PoolStanding
} from "../../../configuration-coupe/tournaments/[id]/tournamentLogic";

type ApiScoreType = "points" | "goals" | "sets";

type Sport = {
  id: number;
  name: string;
  score_type: ApiScoreType;
  created_at?: string;
};

type TournamentMatchType = "qualifications" | "poule" | "loser-bracket" | "quarts" | "demi-finale" | "finale" | "petite-finale";

type TournamentMatchStatus = "planifié" | "en-cours" | "terminé" | "annulé";

type TournamentMatch = {
  id: string;
  label: string;
  teamA: string;
  teamB: string;
  type: TournamentMatchType;
  status: TournamentMatchStatus;
  date?: string;
  time?: string;
  scoreA?: number;
  scoreB?: number;
};

type Pool = {
  id: string;
  name: string;
  teams: string[];
  qualifiedToFinals?: number;
  qualifiedToLoserBracket?: number;
};

type RankingEntry = {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  scoreDiff?: number; // Ajouté pour la différence de buts
};

type RankingFilter = "poules" | "final";

const formatScoreType = (scoreType: ApiScoreType): string => {
  switch (scoreType) {
    case "points":
      return "Points";
    case "goals":
      return "Buts";
    case "sets":
      return "Sets";
    default:
      return "Points";
  }
};

const getMatchTypeBadge = (type: TournamentMatchType) => {
  switch (type) {
    case "qualifications":
      return "bg-indigo-100 text-indigo-800";
    case "poule":
      return "bg-purple-100 text-purple-800";
    case "loser-bracket":
      return "bg-orange-100 text-orange-800";
    case "quarts":
      return "bg-amber-100 text-amber-800";
    case "demi-finale":
      return "bg-red-100 text-red-800";
    case "finale":
      return "bg-yellow-100 text-yellow-800";
    case "petite-finale":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getMatchStatusBadge = (status: TournamentMatchStatus) => {
  switch (status) {
    case "planifié":
      return "bg-blue-100 text-blue-800";
    case "en-cours":
      return "bg-yellow-100 text-yellow-800";
    case "terminé":
      return "bg-green-100 text-green-800";
    case "annulé":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Fonction pour afficher un nom lisible au lieu des codes internes
const formatTeamName = (
  teamName: string, 
  tournamentMatches: TournamentLogicMatch[], 
  tournamentPools: TournamentLogicPool[], 
  tournamentBrackets: TournamentLogicBracket[], 
  tournamentLoserBrackets: TournamentLogicLoserBracket[]
): string => {
  if (!teamName || teamName === "Équipe A" || teamName === "Équipe B") {
    return "En attente";
  }
  
  // Utiliser la fonction de résolution pour obtenir le vrai nom
  const resolved = resolveTeamName(teamName, tournamentMatches, tournamentPools, tournamentBrackets, tournamentLoserBrackets);
  
  // Si le nom n'a pas changé et c'est toujours un code, afficher une version lisible
  if (resolved === teamName) {
    const codePatterns: Record<string, string> = {
      "WQ": "Vainqueur Qualif",
      "WQF": "Vainqueur Quart",
      "WSF": "Vainqueur Demi",
      "WF": "Vainqueur Finale",
      "WPF": "Vainqueur Petite Finale",
      "LQ": "Perdant Qualif",
      "LQF": "Perdant Quart",
      "LSF": "Perdant Demi",
      "LF": "Perdant Finale",
      "P": "Poule",
      "WLR": "Vainqueur LR",
      "LLR": "Perdant LR",
      "WLF": "Vainqueur Finale Loser",
    };
    
    for (const [code, label] of Object.entries(codePatterns)) {
      if (teamName.startsWith(code)) {
        const number = teamName.replace(code, "").replace(/[^0-9-]/g, "");
        return number ? `${label} ${number}` : label;
      }
    }
  }
  
  return resolved;
};

export default function TournamentViewPage() {
  const params = useParams();
  const router = useRouter();
  const [sport, setSport] = useState<Sport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [rankingFilter, setRankingFilter] = useState<RankingFilter>("poules");
  
  // États pour les données du tournoi (pour la résolution)
  const [tournamentMatches, setTournamentMatches] = useState<TournamentLogicMatch[]>([]);
  const [tournamentPools, setTournamentPools] = useState<TournamentLogicPool[]>([]);
  const [tournamentBrackets, setTournamentBrackets] = useState<TournamentLogicBracket[]>([]);
  const [tournamentLoserBrackets, setTournamentLoserBrackets] = useState<TournamentLogicLoserBracket[]>([]);

  useEffect(() => {
    const fetchSport = async (sportId: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:8000/sports/${sportId}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Sport introuvable");
        const data = await res.json();
        setSport(data.data as Sport);
      } catch (e: any) {
        setError(e?.message || "Erreur lors du chargement du sport.");
      } finally {
        setLoading(false);
      }
    };

    const id = params?.id;
    if (typeof id === "string") {
      fetchSport(id);

       if (typeof window !== "undefined") {
         try {
           const storageKey = `tournament-layout-${id}`;
           console.log("🔍 Recherche de la clé:", storageKey);
           
           const raw = window.localStorage.getItem(storageKey);
           console.log("📦 Données brutes trouvées:", raw ? "OUI" : "NON");
           
           if (raw) {
             const parsed = JSON.parse(raw) as {
               matches?: any[];
               pools?: any[];
               brackets?: any[];
               loserBrackets?: any[];
             };
             
             console.log("📊 Données parsées:", {
               nbMatches: parsed.matches?.length || 0,
               nbPools: parsed.pools?.length || 0,
               nbBrackets: parsed.brackets?.length || 0,
               nbLoserBrackets: parsed.loserBrackets?.length || 0,
               parsed
             });

             // Stocker les données complètes pour la résolution
             setTournamentMatches(parsed.matches || []);
             setTournamentPools(parsed.pools || []);
             setTournamentBrackets(parsed.brackets || []);
             setTournamentLoserBrackets(parsed.loserBrackets || []);

             const collected: TournamentMatch[] = [];
             const poolsData: Pool[] = [];

             (parsed.matches || []).forEach((m: any, index: number) => {
               collected.push({
                 id: m.id?.toString() || `m-${index}`,
                 label: m.winnerCode || "",
                 teamA: m.teamA || "Équipe A",
                 teamB: m.teamB || "Équipe B",
                 type: (m.type as TournamentMatchType) || "qualifications",
                 status: (m.status as TournamentMatchStatus) || "planifié",
                 date: m.date,
                 time: m.time,
                 scoreA: m.scoreA,
                 scoreB: m.scoreB,
               });
             });

             (parsed.pools || []).forEach((p: any) => {
               poolsData.push({
                 id: p.id?.toString() || "",
                 name: p.name || "Poule",
                 teams: Array.isArray(p.teams) ? p.teams : [],
                 qualifiedToFinals: p.qualifiedToFinals ?? 2,
                 qualifiedToLoserBracket: p.qualifiedToLoserBracket ?? 0,
               });

               (p.matches || []).forEach((m: any, idx: number) => {
                 collected.push({
                   id: m.id?.toString() || `pm-${idx}`,
                   label:
                     typeof p.name === "string"
                       ? `${p.name} - M${idx + 1}`
                       : "",
                   teamA: m.teamA || "Équipe A",
                   teamB: m.teamB || "Équipe B",
                   type: (m.type as TournamentMatchType) || "poule",
                   status: (m.status as TournamentMatchStatus) || "planifié",
                   date: m.date,
                   time: m.time,
                   scoreA: m.scoreA,
                   scoreB: m.scoreB,
                 });
               });
             });

             // Récupération des matchs des brackets (phase finale)
             (parsed.brackets || []).forEach((bracket: any) => {
               (bracket.matches || []).forEach((m: any, idx: number) => {
                 const typeMap: Record<string, TournamentMatchType> = {
                   "quarts": "quarts",
                   "demi": "demi-finale",
                   "finale": "finale",
                   "petite-finale": "petite-finale",
                 };
                 
                 collected.push({
                   id: m.id?.toString() || `bracket-${idx}`,
                   label: m.winnerCode || m.loserCode || "",
                   teamA: m.teamA || "Équipe A",
                   teamB: m.teamB || "Équipe B",
                   type: typeMap[m.bracketMatchType] || "finale",
                   status: (m.status as TournamentMatchStatus) || "planifié",
                   date: m.date,
                   time: m.time,
                   scoreA: m.scoreA,
                   scoreB: m.scoreB,
                 });
               });
             });

             // Récupération des matchs des loser brackets
             (parsed.loserBrackets || []).forEach((loserBracket: any) => {
               (loserBracket.matches || []).forEach((m: any, idx: number) => {
                 collected.push({
                   id: m.id?.toString() || `loser-${idx}`,
                   label: m.winnerCode || m.loserCode || "Loser Bracket",
                   teamA: m.teamA || "Équipe A",
                   teamB: m.teamB || "Équipe B",
                   type: "qualifications",
                   status: (m.status as TournamentMatchStatus) || "planifié",
                   date: m.date,
                   time: m.time,
                   scoreA: m.scoreA,
                   scoreB: m.scoreB,
                 });
               });
             });

             console.log("✅ Nombre total de matchs récupérés:", collected.length);
             console.log("✅ Nombre total de poules récupérées:", poolsData.length);
             setMatches(collected);
             setPools(poolsData);
             return;
           } else {
             console.log("⚠️ Aucune donnée trouvée dans localStorage pour cette clé");
           }
         } catch (err) {
           console.error(
             "❌ Erreur lors du chargement du layout du tournoi dans la vue tournoi:",
             err
           );
         }
       }

       setMatches([]);
    }
  }, [params]);

  // Générer le classement des poules avec les vrais résultats
  const generatePoolRankings = (): Map<string, RankingEntry[]> => {
    const poolRankings = new Map<string, RankingEntry[]>();
    
    tournamentPools.forEach((pool) => {
      const standings = calculatePoolStandings(pool);
      const ranking: RankingEntry[] = standings.map((standing, index) => ({
        position: index + 1,
        team: standing.team,
        played: standing.played,
        won: standing.won,
        drawn: 0, // On pourrait ajouter les nuls si nécessaire
        lost: standing.lost,
        points: standing.points,
        scoreDiff: standing.scoreDiff,
      }));
      
      poolRankings.set(pool.name, ranking);
    });
    
    return poolRankings;
  };

  // Générer le classement final avec les vrais points
  const generateFinalRanking = (): RankingEntry[] => {
    const finalRankings = calculateFinalRankings(
      tournamentMatches,
      tournamentPools,
      tournamentBrackets,
      tournamentLoserBrackets
    );
    
    return Array.from(finalRankings.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([team, points], index) => ({
        position: index + 1,
        team: resolveTeamName(team, tournamentMatches, tournamentPools, tournamentBrackets, tournamentLoserBrackets),
        played: 0, // À calculer si nécessaire
        won: 0,
        drawn: 0,
        lost: 0,
        points: points,
      }));
  };

  const poolRankings = generatePoolRankings();
  const finalRanking = generateFinalRanking();

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Bouton retour */}
      <button
        onClick={() => router.back()}
        className="absolute left-4 top-4 flex items-center gap-2 bg-white rounded-full shadow px-4 py-2 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Retour"
      >
        <svg
          className="w-5 h-5 text-blue-600"
          fill="none"
          viewBox="0 0 20 20"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4l-6 6m0 0l6 6m-6-6h14"
          />
        </svg>
        <span className="text-blue-700 font-medium">Retour</span>
      </button>

    <header className="mb-20 text-center">
      <h1 className="text-3xl font-bold text-black mb-2">
        {loading
        ? "Chargement du tournoi..."
        : sport
        ? `Tournoi ${sport.name}`
        : "Tournoi"}
      </h1>
      {sport && (
        <p className="text-black text-sm">
        Type de score : {formatScoreType(sport.score_type)}
        </p>
      )}
      {!loading && error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </header>
    <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="w-full max-w-4xl">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                <h2 className="text-xl font-semibold text-black">
                    Vue du tournoi
                </h2>
                <p className="text-black text-sm">
                    Qualifications, poules et phases finales sous forme de cartes.
                </p>
                </div>
            </div>

            {matches.length === 0 ? (
                <div className="text-center py-8">
                <p className="text-black text-sm mb-4">
                    Aucun match n'est encore configuré pour ce tournoi.
                </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((match) => (
                    <button
                    key={match.id}
                    onClick={() =>
                        router.push(
                        `/choix-sport/tournaments/table-marquage/${params.id}?matchId=${match.id}`
                        )
                    }
                    className="text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-2"
                    >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <span
                            className={`px-2 py-1 text-[10px] font-medium rounded-full ${getMatchTypeBadge(
                            match.type
                            )}`}
                        >
                            {match.type === "qualifications" ? "Qualifs" : match.type}
                        </span>
                        {match.type === "qualifications" && match.label && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-black">
                            {match.label}
                            </span>
                        )}
                        {match.type === "poule" && match.label && (
                            <span className="text-[11px] font-semibold text-black">
                            {match.label}
                            </span>
                        )}
                        </div>
                        <span
                        className={`px-2 py-1 text-[10px] font-medium rounded-full ${getMatchStatusBadge(
                            match.status
                        )}`}
                        >
                        {match.status}
                        </span>
                    </div>

                    <div className="mt-1">
                        <div className="flex items-center justify-between text-sm font-medium text-black">
                        <span className={match.status === "terminé" && match.scoreA !== undefined && match.scoreB !== undefined && match.scoreA > match.scoreB ? "font-bold text-green-600" : ""}>
                          {formatTeamName(match.teamA, tournamentMatches, tournamentPools, tournamentBrackets, tournamentLoserBrackets)}
                        </span>
                        <div className="flex items-center gap-2">
                          {match.status === "terminé" && match.scoreA !== undefined && match.scoreB !== undefined ? (
                            <span className="text-black font-bold text-base">
                              {match.scoreA} - {match.scoreB}
                            </span>
                          ) : (
                            <span className="text-black text-xs">VS</span>
                          )}
                        </div>
                        <span className={match.status === "terminé" && match.scoreA !== undefined && match.scoreB !== undefined && match.scoreB > match.scoreA ? "font-bold text-green-600" : ""}>
                          {formatTeamName(match.teamB, tournamentMatches, tournamentPools, tournamentBrackets, tournamentLoserBrackets)}
                        </span>
                        </div>
                        {(match.date || match.time) && (
                        <div className="mt-1 text-xs text-black">
                            {match.date} {match.time && `à ${match.time}`}
                        </div>
                        )}
                    </div>

                    <div className="mt-1 text-[11px] text-black flex items-center gap-1">
                        <span>Cliquer pour ouvrir la table de marquage</span>
                    </div>
                    </button>
                ))}
                </div>
            )}
            </div>
        </section>

        {/* Section des classements */}
        <section className="w-full max-w-4xl mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
                {/* Filtres de classement */}
                <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-black">
                    Classements
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setRankingFilter("poules")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        rankingFilter === "poules"
                            ? "bg-purple-600 text-black"
                            : "bg-gray-100 text-black hover:bg-gray-200"
                        } ${pools.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={pools.length === 0}
                    >
                        Classements de poules
                    </button>
                    <button
                    onClick={() => setRankingFilter("final")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        rankingFilter === "final"
                        ? "bg-yellow-600 text-white"
                        : "bg-gray-100 text-black hover:bg-gray-200"
                    }`}
                    >
                    Classement final
                    </button>
                </div>
                </div>

                {/* Affichage des classements de poules */}
                {rankingFilter === "poules" && pools.length > 0 && (
                <div className="space-y-6">
                    {Array.from(poolRankings.entries()).map(([poolName, ranking]) => {
                      const pool = pools.find(p => p.name === poolName);
                      const qualifiedToFinals = pool?.qualifiedToFinals || 0;
                      const qualifiedToLoserBracket = pool?.qualifiedToLoserBracket || 0;
                      
                      return (
                    <div key={poolName} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                        <h3 className="font-semibold text-black">{poolName}</h3>
                        {(qualifiedToFinals > 0 || qualifiedToLoserBracket > 0) && (
                          <div className="flex gap-4 mt-1 text-xs text-black">
                            {qualifiedToFinals > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-green-100 border border-green-400 rounded"></span>
                                {qualifiedToFinals} qualifié{qualifiedToFinals > 1 ? 's' : ''} phase finale
                              </span>
                            )}
                            {qualifiedToLoserBracket > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-orange-100 border border-orange-400 rounded"></span>
                                {qualifiedToLoserBracket} qualifié{qualifiedToLoserBracket > 1 ? 's' : ''} loser bracket
                              </span>
                            )}
                          </div>
                        )}
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Pos
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Équipe
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                J
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                G
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                N
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                P
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Pts
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {ranking.map((entry) => {
                              let bgColor = "hover:bg-gray-50";
                              if (entry.position <= qualifiedToFinals) {
                                bgColor = "bg-green-50 hover:bg-green-100 border-l-4 border-green-500";
                              } else if (entry.position <= qualifiedToFinals + qualifiedToLoserBracket) {
                                bgColor = "bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-500";
                              }
                              
                              return (
                                <tr key={entry.team} className={bgColor}>
                                <td className="px-4 py-3 text-sm font-medium text-black">
                                    {entry.position}
                                </td>
                                <td className="px-4 py-3 text-sm text-black">
                                    {entry.team}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-black">
                                    {entry.played}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-green-600">
                                    {entry.won}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-black">
                                    {entry.drawn}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-red-600">
                                    {entry.lost}
                                </td>
                                <td className="px-4 py-3 text-sm text-center font-bold text-black">
                                    {entry.points}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-black">
                                    {entry.scoreDiff !== undefined ? (entry.scoreDiff > 0 ? `+${entry.scoreDiff}` : entry.scoreDiff) : '-'}
                                </td>
                                </tr>
                              );
                            })}
                            </tbody>
                        </table>
                        </div>
                    </div>
                      );
                    })}
                </div>
                )}

                {/* Affichage du classement final */}
                {rankingFilter === "final" && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-100">
                    <h3 className="font-semibold text-yellow-900">Classement Final du Tournoi</h3>
                    <p className="text-xs text-yellow-700 mt-1">Points cumulés de toutes les phases (qualifs, brackets, finales)</p>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Pos
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Équipe
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Points Totaux
                            </th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {finalRanking.length > 0 ? (
                          finalRanking.map((entry) => (
                            <tr 
                            key={entry.team} 
                            className={`hover:bg-gray-50 ${
                                entry.position === 1 ? "bg-yellow-50" :
                                entry.position === 2 ? "bg-gray-100" :
                                entry.position === 3 ? "bg-orange-50" : ""
                            }`}
                            >
                            <td className="px-4 py-3 text-sm font-medium text-black">
                                {entry.position === 1 && "🥇 "}
                                {entry.position === 2 && "🥈 "}
                                {entry.position === 3 && "🥉 "}
                                {entry.position}
                            </td>
                            <td className="px-4 py-3 text-sm text-black font-medium">
                                {entry.team}
                            </td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-blue-600 text-lg">
                                {entry.points}
                            </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-black">
                              Aucun résultat pour le moment.<br/>
                              <span className="text-xs text-gray-500">Les points apparaîtront quand les matchs seront terminés.</span>
                            </td>
                          </tr>
                        )}
                        </tbody>
                    </table>
                    </div>
                </div>
                )}
            </div>
            </section>
      </div>
    </main>
  );
}
