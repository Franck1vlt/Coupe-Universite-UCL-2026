"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type ApiScoreType = "points" | "goals" | "sets";

type Sport = {
  id: number;
  name: string;
  score_type: ApiScoreType;
  created_at?: string;
};

type MatchStatus = "upcoming" | "in_progress" | "completed" | "cancelled";

type Match = {
  id: number;
  status: MatchStatus;
  team_sport_a_id: number | null;
  team_sport_b_id: number | null;
  team_a_source?: string; // Ajouté pour les placeholders
  team_b_source?: string; // Ajouté pour les placeholders
  score_a: number | null;
  score_b: number | null;
  phase_id: number;
  tournament_id?: number; // Ajouté
  sport_id?: number; // Ajouté
  referee_user_id: number | null;
  created_by_user_id: number;
  updated_by_user_id: number | null;
  created_at: string;
  updated_at: string | null;
  comment: string | null;
};

type TeamSport = {
  id: number;
  team_id: number;
  sport_id: number;
};

type Team = {
  id: number;
  name: string;
};

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

const formatStatus = (status: MatchStatus): string => {
  switch (status) {
    case "upcoming":
      return "À venir";
    case "in_progress":
      return "En cours";
    case "completed":
      return "Terminé";
    case "cancelled":
      return "Annulé";
    default:
      return status;
  }
};

export default function TournamentScoringChoicePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sport, setSport] = useState<Sport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [teamAName, setTeamAName] = useState<string>("");
  const [teamBName, setTeamBName] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [tempScoreA, setTempScoreA] = useState<string>("");
  const [tempScoreB, setTempScoreB] = useState<string>("");
  const [showScoreInput, setShowScoreInput] = useState(false);

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

    const fetchMatch = async (matchId: string) => {
      try {
        const res = await fetch(`http://localhost:8000/matches/${matchId}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error?.message || "Match introuvable");
        }
        
        const data = await res.json();
        const matchData = data.data as Match;
        setMatch(matchData);
        
        // Utiliser directement sport_id si disponible
        if (matchData.sport_id) {
          await fetchSport(matchData.sport_id.toString());
        }
        
        // Récupérer les noms des équipes si disponibles
        if (matchData.team_sport_a_id && matchData.team_sport_b_id) {
          await fetchTeamNames(matchData.team_sport_a_id, matchData.team_sport_b_id);
        } else {
          // Équipes non encore définies (utiliser les sources comme placeholder)
          setTeamAName(matchData.team_a_source || "Équipe A");
          setTeamBName(matchData.team_b_source || "Équipe B");
        }
      } catch (e: any) {
        console.error("❌ Erreur lors du chargement du match:", e);
        setError("Match introuvable: " + e.message);
      }
    };

    const fetchTeamNames = async (teamSportAId: number, teamSportBId: number) => {
      try {
        // Récupérer TeamSport A
        const resA = await fetch(`http://localhost:8000/team-sports/${teamSportAId}`, {
          headers: { Accept: "application/json" },
        });
        if (resA.ok) {
          const dataA = await resA.json();
          const teamSportA = dataA.data as TeamSport;
          
          // Récupérer Team A
          const resTeamA = await fetch(`http://localhost:8000/teams/${teamSportA.team_id}`, {
            headers: { Accept: "application/json" },
          });
          if (resTeamA.ok) {
            const teamDataA = await resTeamA.json();
            setTeamAName((teamDataA.data as Team).name);
          }
        }

        // Récupérer TeamSport B
        const resB = await fetch(`http://localhost:8000/team-sports/${teamSportBId}`, {
          headers: { Accept: "application/json" },
        });
        if (resB.ok) {
          const dataB = await resB.json();
          const teamSportB = dataB.data as TeamSport;
          
          // Récupérer Team B
          const resTeamB = await fetch(`http://localhost:8000/teams/${teamSportB.team_id}`, {
            headers: { Accept: "application/json" },
          });
          if (resTeamB.ok) {
            const teamDataB = await resTeamB.json();
            setTeamBName((teamDataB.data as Team).name);
          }
        }
      } catch (e: any) {
        console.error("Erreur lors du chargement des noms d'équipes:", e);
      }
    };

    const matchId = searchParams.get("matchId");
    if (matchId) {
      fetchMatch(matchId);
    }
  }, [searchParams]);

  const startMatch = async () => {
    if (!match) return;
    
    setUpdating(true);
    try {
      const matchId = searchParams.get("matchId");
      if (!matchId) {
        alert("ID de match manquant");
        return;
      }

      // Mettre à jour via l'API
      const response = await fetch(`http://localhost:8000/matches/${matchId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ 
          status: "in_progress",
          updated_by_user_id: 1 // TODO: utiliser l'utilisateur connecté
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors du démarrage du match");
      }
      
      const data = await response.json();
      setMatch(data.data as Match);
      console.log("✅ Match démarré:", data.data);
    } catch (e: any) {
      console.error("❌ Erreur:", e);
      alert("Erreur lors du démarrage du match: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const endMatch = async () => {
    if (!match) return;
    
    setUpdating(true);
    try {
      const matchId = searchParams.get("matchId");
      if (!matchId) {
        alert("ID de match manquant");
        return;
      }

      // Mettre à jour via l'API
      const response = await fetch(`http://localhost:8000/matches/${matchId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ 
          status: "completed",
          updated_by_user_id: 1 // TODO: utiliser l'utilisateur connecté
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de la fin du match");
      }
      
      const data = await response.json();
      setMatch(data.data as Match);
      console.log("✅ Match terminé:", data.data);
    } catch (e: any) {
      console.error("❌ Erreur:", e);
      alert("Erreur lors de la fin du match: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const declareWinner = async (teamNumber: 1 | 2) => {
    if (!match) return;
    
    setUpdating(true);
    try {
      const matchId = searchParams.get("matchId");
      if (!matchId) {
        alert("ID de match manquant");
        return;
      }

      // Déterminer les scores pour déclarer le vainqueur
      const score_a = teamNumber === 1 ? (match.score_a || 0) + 1 : (match.score_a || 0);
      const score_b = teamNumber === 2 ? (match.score_b || 0) + 1 : (match.score_b || 0);

      // Mettre à jour via l'API
      const response = await fetch(`http://localhost:8000/matches/${matchId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ 
          score_a, 
          score_b,
          status: "completed",
          updated_by_user_id: 1 // TODO: utiliser l'utilisateur connecté
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de l'enregistrement du vainqueur");
      }
      
      const data = await response.json();
      setMatch(data.data as Match);
      
      const winnerName = teamNumber === 1 ? teamAName : teamBName;
      alert(`${winnerName} a gagné le match!`);
      console.log("✅ Vainqueur enregistré:", data.data);
    } catch (e: any) {
      console.error("❌ Erreur:", e);
      alert("Erreur lors de l'enregistrement du vainqueur: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const updateScores = async () => {
    if (!match) return;

    const scoreA = parseInt(tempScoreA);
    const scoreB = parseInt(tempScoreB);

    if (isNaN(scoreA) || isNaN(scoreB)) {
      alert("Veuillez entrer des scores valides");
      return;
    }

    setUpdating(true);
    try {
      const matchId = searchParams.get("matchId");
      if (!matchId) {
        alert("ID de match manquant");
        return;
      }

      const response = await fetch(`http://localhost:8000/matches/${matchId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          score_a: scoreA,
          score_b: scoreB,
          updated_by_user_id: 1 // TODO: utiliser l'utilisateur connecté
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de la mise à jour des scores");
      }

      const data = await response.json();
      setMatch(data.data as Match);
      setShowScoreInput(false);
      setTempScoreA("");
      setTempScoreB("");
      console.log("✅ Scores mis à jour:", data.data);
    } catch (e: any) {
      console.error("❌ Erreur:", e);
      alert("Erreur lors de la mise à jour des scores: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const incrementScore = async (team: "a" | "b") => {
    if (!match) return;

    setUpdating(true);
    try {
      const matchId = searchParams.get("matchId");
      if (!matchId) {
        alert("ID de match manquant");
        return;
      }

      const score_a = team === "a" ? (match.score_a || 0) + 1 : (match.score_a || 0);
      const score_b = team === "b" ? (match.score_b || 0) + 1 : (match.score_b || 0);

      const response = await fetch(`http://localhost:8000/matches/${matchId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          score_a,
          score_b,
          updated_by_user_id: 1
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erreur lors de l'ajout du point");
      }

      const data = await response.json();
      setMatch(data.data as Match);
      console.log("✅ Point ajouté:", data.data);
    } catch (e: any) {
      console.error("❌ Erreur:", e);
      alert("Erreur lors de l'ajout du point: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const goToScoringPage = () => {
    if (!sport) return;

    const name = sport.name.toLowerCase();
    const matchId = searchParams.get("matchId");

    if (name.includes("badminton")) {
      // Pour l'instant on ignore matchId, mais il pourra être
      // utilisé plus tard pour charger la bonne feuille.
      router.push("/table-marquage/badminton");
      return;
    }

    // TODO: ajouter ici les autres mappings (football, volley, etc.)

    alert(
      "La table de marquage spécifique pour ce sport n'est pas encore configurée."
    );
  };

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

      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {loading
            ? "Chargement..."
            : sport
            ? `Table de marquage - ${sport.name}`
            : "Table de marquage"}
        </h1>
        {sport && (
          <p className="text-gray-600 text-sm">
            Type de score : {formatScoreType(sport.score_type)}
          </p>
        )}
        {!loading && error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </header>

      <section className="w-full max-w-xl">
        {/* Section de gestion du match */}
        {match && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Gestion du Match
            </h2>
            
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Statut actuel:</p>
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                match.status === "upcoming" ? "bg-blue-100 text-blue-800" :
                match.status === "in_progress" ? "bg-green-100 text-green-800" :
                match.status === "completed" ? "bg-gray-100 text-gray-800" :
                "bg-red-100 text-red-800"
              }`}>
                {formatStatus(match.status)}
              </span>
            </div>

            {/* Affichage des équipes */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`p-4 rounded-lg border-2 ${
                match.score_a !== null && match.score_b !== null && match.score_a > match.score_b
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200"
              }`}>
                <h3 className="font-semibold text-gray-800 mb-3">{teamAName}</h3>
                <div className="text-4xl font-bold text-center mb-4 text-blue-600">
                  {match.score_a !== null ? match.score_a : "-"}
                </div>

                {match.status === "in_progress" && (
                  <div className="flex flex-col gap-2 mb-3">
                    <button
                      onClick={() => incrementScore("a")}
                      disabled={updating}
                      className="w-full px-3 py-2 bg-green-600 text-black rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      +1 Point
                    </button>
                  </div>
                )}

                {match.score_a !== null && match.score_b !== null && match.score_a > match.score_b && (
                  <div className="mt-2 text-center">
                    <span className="text-green-600 font-bold text-lg">🏆 Vainqueur</span>
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                match.score_a !== null && match.score_b !== null && match.score_b > match.score_a
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200"
              }`}>
                <h3 className="font-semibold text-gray-800 mb-3">{teamBName}</h3>
                <div className="text-4xl font-bold text-center mb-4 text-blue-600">
                  {match.score_b !== null ? match.score_b : "-"}
                </div>

                {match.status === "in_progress" && (
                  <div className="flex flex-col gap-2 mb-3">
                    <button
                      onClick={() => incrementScore("b")}
                      disabled={updating}
                      className="w-full px-3 py-2 bg-green-600 text-black rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      +1 Point
                    </button>
                  </div>
                )}

                {match.score_a !== null && match.score_b !== null && match.score_b > match.score_a && (
                  <div className="mt-2 text-center">
                    <span className="text-green-600 font-bold text-lg">🏆 Vainqueur</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section d'entrée manuelle des scores */}
            {match.status === "in_progress" && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                {!showScoreInput ? (
                  <button
                    onClick={() => setShowScoreInput(true)}
                    className="w-full px-4 py-2 bg-gray-600 text-black rounded-lg text-sm font-medium hover:bg-gray-700 transition"
                  >
                    Entrer les scores manuellement
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Score {teamAName}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={tempScoreA}
                          onChange={(e) => setTempScoreA(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Score {teamBName}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={tempScoreB}
                          onChange={(e) => setTempScoreB(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={updateScores}
                        disabled={updating || !tempScoreA || !tempScoreB}
                        className="flex-1 px-4 py-2 bg-blue-600 text-black rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => {
                          setShowScoreInput(false);
                          setTempScoreA("");
                          setTempScoreB("");
                        }}
                        className="flex-1 px-4 py-2 bg-gray-400 text-black rounded-lg text-sm font-medium hover:bg-gray-500 transition"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Boutons de contrôle */}
            <div className="flex flex-col gap-3">
              {match.status === "upcoming" && (
                <button
                  onClick={startMatch}
                  disabled={updating}
                  className="w-full px-4 py-3 rounded-lg bg-blue-600 text-black text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Démarrer le match
                </button>
              )}

              {match.status === "in_progress" && (
                <button
                  onClick={endMatch}
                  disabled={updating}
                  className="w-full px-4 py-3 rounded-lg bg-red-600 text-black text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
                >
                  Terminer le match
                </button>
              )}

              {match.status === "completed" && (
                <div className="text-center py-3 text-gray-600 font-medium">
                  ✅ Match terminé
                </div>
              )}
            </div>
          </div>
        )}

        {!match && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-yellow-800">
              Aucun match sélectionné. Veuillez fournir un matchId dans l'URL.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
