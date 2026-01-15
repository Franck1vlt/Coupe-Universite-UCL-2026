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
  tournaments_won: number;
  tournaments_second: number;
  tournaments_third: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goal_difference: number;
  position: number;
};

type Sport = {
  id: number;
  name: string;
  code: string;
};

type Tournament = {
  id: number;
  name: string;
  sport_id: number;
  sport_name?: string;
};

export default function TableauScoresPage() {
  const [rankings, setRankings] = useState<TeamRankingData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
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

  // Fonction pour récupérer tous les tournois
  const fetchTournaments = async (): Promise<Tournament[]> => {
    try {
      const response = await fetch('http://localhost:8000/tournaments');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des tournois');
      }
      const data = await response.json();
      const tournamentsData = data.success ? data.data.items : [];

      // Récupérer les sports pour avoir les noms
      const sportsResponse = await fetch('http://localhost:8000/sports');
      const sportsData = await sportsResponse.json();
      const sports = sportsData.success ? sportsData.data.items : [];

      // Enrichir les tournois avec le nom du sport
      return tournamentsData.map((t: any) => {
        const sport = sports.find((s: any) => s.id === t.sport_id);
        return {
          ...t,
          sport_name: sport ? sport.name : `Sport ${t.sport_id}`
        };
      });
    } catch (err) {
      console.error('Erreur fetch tournaments:', err);
      return [];
    }
  };

  // Fonction pour récupérer le classement final global
  const fetchGlobalRanking = async (): Promise<TeamRankingData[]> => {
    try {
      const response = await fetch('http://localhost:8000/final-ranking');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du classement final');
      }
      const data = await response.json();
      const rankingData = data.success ? data.data : [];

      // Mapper les données de l'API vers notre format avec les objets Team
      return rankingData.map((entry: any) => {
        const team = teams.find(t => t.id === entry.team_id) || {
          id: entry.team_id,
          name: entry.team_name,
        };

        return {
          team,
          total_points: entry.total_points,
          tournaments_participated: entry.tournaments_played,
          tournaments_won: entry.tournaments_won,
          tournaments_second: entry.tournaments_second,
          tournaments_third: entry.tournaments_third,
          matches_played: entry.matches_played,
          wins: entry.wins,
          draws: entry.draws,
          losses: entry.losses,
          goal_difference: entry.goal_difference,
          position: entry.position,
        };
      });
    } catch (err) {
      console.error('Erreur fetch global ranking:', err);
      return [];
    }
  };

  // Fonction pour récupérer le classement d'un tournoi spécifique
  const fetchTournamentRanking = async (tournamentId: number): Promise<TeamRankingData[]> => {
    try {
      const response = await fetch(`http://localhost:8000/tournaments/${tournamentId}/final-ranking`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du classement du tournoi');
      }
      const data = await response.json();
      const rankingData = data.success ? data.data : [];

      // Mapper les données de l'API vers notre format
      return rankingData.map((entry: any) => {
        const team = teams.find(t => t.id === entry.team_id) || {
          id: entry.team_id,
          name: entry.team_name,
        };

        return {
          team,
          total_points: entry.total_points,
          tournaments_participated: 1,
          tournaments_won: entry.position === 1 ? 1 : 0,
          tournaments_second: entry.position === 2 ? 1 : 0,
          tournaments_third: entry.position === 3 ? 1 : 0,
          matches_played: entry.matches_played,
          wins: entry.wins,
          draws: entry.draws,
          losses: entry.losses,
          goal_difference: entry.goal_difference,
          position: entry.position,
        };
      });
    } catch (err) {
      console.error('Erreur fetch tournament ranking:', err);
      return [];
    }
  };

  // Chargement initial des équipes et tournois
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [teamsData, tournamentsData] = await Promise.all([
          fetchTeams(),
          fetchTournaments()
        ]);

        setTeams(teamsData);
        setTournaments(tournamentsData);
      } catch (err) {
        console.error('Erreur lors du chargement initial:', err);
      }
    };

    loadInitialData();
  }, []);

  // Chargement du classement (global ou par tournoi)
  useEffect(() => {
    const loadRanking = async () => {
      if (teams.length === 0) return;

      setLoading(true);
      try {
        let rankingData: TeamRankingData[];

        if (selectedTournamentId === null) {
          // Classement final global
          rankingData = await fetchGlobalRanking();
        } else {
          // Classement d'un tournoi spécifique
          rankingData = await fetchTournamentRanking(selectedTournamentId);
        }

        setRankings(rankingData);
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement des données');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadRanking();
  }, [selectedTournamentId, teams]);

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
        onClick={() => router.push("/")}
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
          {selectedTournamentId === null
            ? "Classement général de tous les tournois"
            : `Classement du tournoi ${tournaments.find(t => t.id === selectedTournamentId)?.sport_name || ""}`
          }
        </p>
      </header>

      <section className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-transparent p-8">
          {/* Filtre par tournoi */}
          <div className="mb-6 flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Filtrer par tournoi :</label>
            <select
              value={selectedTournamentId === null ? "" : selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value === "" ? null : parseInt(e.target.value))}
              className="px-4 py-2 text-black border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Classement général (tous les tournois)</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.sport_name}
                </option>
              ))}
            </select>
          </div>
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
                    Points
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-800">
                    Matchs
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-800">
                    V
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-800">
                    Diff
                  </th>
                  {selectedTournamentId === null && (
                    <>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-800">
                        🥇
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-800">
                        🥈
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-800">
                        🥉
                      </th>
                    </>
                  )}
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

                    {/* Matchs joués */}
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-gray-900">
                        {item.matches_played}
                      </div>
                    </td>

                    {/* Victoires */}
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-semibold text-green-600">
                        {item.wins}
                      </div>
                    </td>

                    {/* Différence de buts */}
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-gray-900">
                        {item.goal_difference > 0 ? `+${item.goal_difference}` : item.goal_difference}
                      </div>
                    </td>

                    {/* Podiums (uniquement pour le classement général) */}
                    {selectedTournamentId === null && (
                      <>
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm font-semibold text-yellow-600">
                            {item.tournaments_won}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm font-semibold text-gray-500">
                            {item.tournaments_second}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm font-semibold text-amber-600">
                            {item.tournaments_third}
                          </div>
                        </td>
                      </>
                    )}
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
