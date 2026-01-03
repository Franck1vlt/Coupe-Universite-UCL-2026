"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Sport = {
  id: number;
  name: string;
  score_type: string;
  created_at?: string;
};

type Match = {
  id: number;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  status: "En cours" | "Terminé" | "À venir" | "En pause";
  time: string;
  court: string;
};

type Ranking = {
  position: number;
  team: string;
  played: number;
  won: number;
  lost: number;
  points: number;
};

export default function ScoresDirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sportId = searchParams.get("sport");
  
  const [sport, setSport] = useState<Sport | null>(null);
  const [activeTab, setActiveTab] = useState<"matches" | "ranking" | "stats">("matches");
  const [matches, setMatches] = useState<Match[]>([]);
  const [ranking, setRanking] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupération du sport
  const fetchSport = async () => {
    if (!sportId) return;
    
    try {
      const res = await fetch(`http://localhost:8000/sports/${sportId}`, { 
        method: "GET", 
        headers: { "Accept": "application/json" } 
      });
      if (!res.ok) throw new Error("Impossible de charger le sport.");
      const data = await res.json();
      setSport(data.data);
    } catch (e: any) {
      setError(e?.message || "Erreur lors du chargement.");
    }
  };

  // Données factices pour la démonstration
  const generateMockData = () => {
    const mockMatches: Match[] = [
      {
        id: 1,
        team1: "JUNIA",
        team2: "FGES",
        score1: 2,
        score2: 1,
        status: "En cours",
        time: "45'",
        court: "Terrain A"
      },
      {
        id: 2,
        team1: "IESEG",
        team2: "ESME",
        score1: 0,
        score2: 3,
        status: "Terminé",
        time: "90'",
        court: "Terrain B"
      },
      {
        id: 3,
        team1: "ISA",
        team2: "HEI",
        score1: 0,
        score2: 0,
        status: "À venir",
        time: "14:30",
        court: "Terrain A"
      },
      {
        id: 4,
        team1: "EDHEC",
        team2: "SKEMA",
        score1: 1,
        score2: 1,
        status: "En pause",
        time: "HT",
        court: "Terrain C"
      }
    ];

    const mockRanking: Ranking[] = [
      { position: 1, team: "ESME", played: 3, won: 3, lost: 0, points: 9 },
      { position: 2, team: "JUNIA", played: 3, won: 2, lost: 1, points: 6 },
      { position: 3, team: "IESEG", played: 3, won: 2, lost: 1, points: 6 },
      { position: 4, team: "FGES", played: 3, won: 1, lost: 2, points: 3 },
      { position: 5, team: "HEI", played: 2, won: 1, lost: 1, points: 3 },
      { position: 6, team: "ISA", played: 2, won: 0, lost: 2, points: 0 },
      { position: 7, team: "EDHEC", played: 2, won: 0, lost: 2, points: 0 },
      { position: 8, team: "SKEMA", played: 2, won: 0, lost: 2, points: 0 }
    ];

    setMatches(mockMatches);
    setRanking(mockRanking);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSport()]).finally(() => {
      generateMockData();
      setLoading(false);
    });
  }, [sportId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "En cours": return "bg-green-100 text-green-800";
      case "Terminé": return "bg-gray-100 text-gray-800";
      case "À venir": return "bg-blue-100 text-blue-800";
      case "En pause": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500 text-lg">Chargement du tournoi...</div>
      </main>
    );
  }

  if (error || !sport) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">
            {error || "Sport non trouvé"}
          </div>
          <button
            onClick={() => router.push("/choix-sport")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Retour aux sports
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header sticky */}
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/choix-sport")}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4l-6 6m0 0l6 6m-6-6h14" />
                </svg>
                Retour
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Tournoi de {sport.name}</h1>
                <p className="text-gray-600">Scores en direct</p>
              </div>
            </div>
            
            {/* Live indicator */}
            <div className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-700 font-medium text-sm">EN DIRECT</span>
            </div>
          </div>
          
          {/* Navigation tabs */}
          <nav className="flex gap-6 mt-4 border-b">
            <button
              onClick={() => setActiveTab("matches")}
              className={`pb-2 px-1 border-b-2 font-medium transition ${
                activeTab === "matches"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Matchs en cours
            </button>
            <button
              onClick={() => setActiveTab("ranking")}
              className={`pb-2 px-1 border-b-2 font-medium transition ${
                activeTab === "ranking"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Classement
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`pb-2 px-1 border-b-2 font-medium transition ${
                activeTab === "stats"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Statistiques
            </button>
          </nav>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Tab: Matchs */}
        {activeTab === "matches" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Matchs du tournoi</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {matches.map((match) => (
                <div key={match.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  {/* En-tête du match */}
                  <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                        {match.status}
                      </span>
                      <span className="text-gray-600 text-sm">{match.court}</span>
                    </div>
                    <div className="text-gray-600 font-medium">{match.time}</div>
                  </div>
                  
                  {/* Score du match */}
                  <div className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-gray-800 mb-1">{match.team1}</div>
                        <div className="text-lg font-semibold text-gray-800">{match.team2}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-800 mb-1">{match.score1}</div>
                        <div className="text-3xl font-bold text-gray-800">{match.score2}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  {match.status === "En cours" && (
                    <div className="bg-gray-50 px-4 py-3 flex justify-between">
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        Voir détails
                      </button>
                      <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">
                        Mettre à jour score
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Classement */}
        {activeTab === "ranking" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Classement général</h2>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Équipe
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      J
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      G
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pts
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ranking.map((team) => (
                    <tr key={team.position} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          team.position <= 3 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {team.position}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{team.team}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
                        {team.played}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-green-600 font-medium">
                        {team.won}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-red-600 font-medium">
                        {team.lost}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="font-bold text-lg text-gray-900">{team.points}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Statistiques */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Statistiques du tournoi</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">16</div>
                <div className="text-gray-600">Matchs joués</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-3xl font-bold text-green-600 mb-2">48</div>
                <div className="text-gray-600">Buts marqués</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-3xl font-bold text-purple-600 mb-2">8</div>
                <div className="text-gray-600">Équipes participantes</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Meilleurs buteurs</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Pierre Dupont (JUNIA)</span>
                  <span className="font-bold text-blue-600">5 buts</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Marie Martin (ESME)</span>
                  <span className="font-bold text-blue-600">4 buts</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium">Jean Dubois (IESEG)</span>
                  <span className="font-bold text-blue-600">3 buts</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
