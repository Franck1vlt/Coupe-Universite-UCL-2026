"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Types pour les équipes et le classement
type Team = {
  id: number;
  name: string;
  logo_url?: string;
  primary_color?: string;
  created_at?: string;
};

type TeamRankingData = {
  team: Team;
  total_points: number;
  tournaments_participated: number;
  position: number;
};

export default function TableauScoresPage() {
  const [rankings, setRankings] = useState<TeamRankingData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fonction pour récupérer les équipes
  const fetchTeams = async (): Promise<Team[]> => {
    try {
      const response = await fetch('http://localhost:8000/teams');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des équipes');
      }
      const data = await response.json();
      return data.success ? data.data.items : [];
    } catch (err) {
      console.error('Erreur fetch teams:', err);
      return [];
    }
  };

  // Fonction simulée pour récupérer le classement final
  const simulateFinalRanking = (teams: Team[]): TeamRankingData[] => {
    return teams.map((team) => {
      const tournamentsParticipated = Math.floor(Math.random() * 8) + 1;
      const tournamentsWon = Math.floor(Math.random() * (tournamentsParticipated / 2));
      const tournamentsSecond = Math.floor(Math.random() * (tournamentsParticipated - tournamentsWon));
      const tournamentsThird = Math.floor(Math.random() * (tournamentsParticipated - tournamentsWon - tournamentsSecond));
      
      const totalPoints = (tournamentsWon * 100) + (tournamentsSecond * 70) + (tournamentsThird * 40) + 
                         (Math.max(0, tournamentsParticipated - tournamentsWon - tournamentsSecond - tournamentsThird) * 10);

      return {
        team,
        total_points: totalPoints,
        tournaments_participated: tournamentsParticipated,
        position: 0,
      };
    }).sort((a, b) => b.total_points - a.total_points)
      .map((item, index) => ({ ...item, position: index + 1 }));
  };

  // Chargement des données
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const teamsData = await fetchTeams();
        
        // Simulation du classement final
        const rankingData = simulateFinalRanking(teamsData);
        setRankings(rankingData);
        
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement des données');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Fonction pour obtenir la couleur de badge selon la position
  const getPositionBadgeColor = (position: number) => {
    if (position === 1) return "bg-yellow-500 text-yellow-900";
    if (position === 2) return "bg-gray-400 text-gray-900";
    if (position === 3) return "bg-amber-600 text-amber-900";
    return "bg-blue-500 text-white";
  };

  // Fonction pour obtenir l'emoji de médaille
  const getMedalEmoji = (position: number) => {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du classement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 text-xl font-semibold mb-2">Erreur</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8">
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
      
      <header className="mb-12 text-center">
        <img
          src="/img/coupe.png"
          alt="Logo Coupe de l'Université"
          className="mx-auto mb-6 h-24 w-24 object-contain"
        />
        <h1 className="text-4xl font-bold text-gray-800 mb-2">🏆 Tableau de Classement</h1>
        <p className="text-gray-600 text-lg">
          Classement général des équipes
        </p>
      </header>

      <section className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-transparent p-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-800">
                    Position
                  </th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-800">
                    Équipe
                  </th>
                  <th className="px-6 py-4 text-center text-lg font-semibold text-gray-800">
                    Points Totaux
                  </th>
                  <th className="px-6 py-4 text-center text-lg font-semibold text-gray-800">
                    Tournois
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((item) => (
                  <tr 
                    key={item.team.id} 
                    className="border-b border-gray-100 hover:bg-blue-50 transition-colors"
                  >
                    {/* Position */}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getPositionBadgeColor(item.position)}`}>
                          {getMedalEmoji(item.position)} #{item.position}
                        </span>
                      </div>
                    </td>

                    {/* Équipe */}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {item.team.logo_url ? (
                            <img 
                              className="h-12 w-12 rounded-full object-cover" 
                              src={item.team.logo_url} 
                              alt={`Logo ${item.team.name}`}
                            />
                          ) : (
                            <div 
                              className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                              style={{ backgroundColor: item.team.primary_color || '#6B7280' }}
                            >
                              {item.team.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-lg font-semibold text-gray-900">
                            {item.team.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Points totaux */}
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {item.total_points}
                      </div>
                    </td>

                    {/* Tournois participés */}
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg text-gray-900">
                        {item.tournaments_participated}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
