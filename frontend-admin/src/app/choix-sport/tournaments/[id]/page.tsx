"use client";

import { useEffect, useState, useMemo } from "react";
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
  code: string;
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
  court?: string;
  courtId?: number;
  scheduledDatetime?: string;
  estimatedDurationMinutes?: number;
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
  tournamentLoserBrackets: TournamentLogicLoserBracket[],
  teamSportIdToName?: Record<number, string>
): string => {
  if (!teamName || teamName === "Équipe A" || teamName === "Équipe B") {
    return "En attente";
  }
  
  // Essayer d'abord de résoudre via l'API mapping si disponible
  if (teamSportIdToName) {
    const numTeamName = parseInt(teamName);
    if (!isNaN(numTeamName) && teamSportIdToName[numTeamName]) {
      return teamSportIdToName[numTeamName];
    }
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
  const [sportCode, setSportCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [rankingFilter, setRankingFilter] = useState<RankingFilter>("poules");
  const [showMenu, setShowMenu] = useState(false);
  const [showMatchSelect, setShowMatchSelect] = useState(false);
  
  // État pour stocker le mapping team_sport_id → team_name
  const [teamSportIdToName, setTeamSportIdToName] = useState<Record<number, string>>({});
  
  // États pour stocker les données du tournoi
  const [tournamentMatches, setTournamentMatches] = useState<TournamentLogicMatch[]>([]);
  const [tournamentPools, setTournamentPools] = useState<TournamentLogicPool[]>([]);
  const [tournamentBrackets, setTournamentBrackets] = useState<TournamentLogicBracket[]>([]);
  const [tournamentLoserBrackets, setTournamentLoserBrackets] = useState<TournamentLogicLoserBracket[]>([]);

  // Charger le mapping des équipes au chargement
  useEffect(() => {
    const loadTeamNames = async () => {
      try {
        // Charger toutes les équipes
        const teamsRes = await fetch(`http://localhost:8000/teams`);
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const teams = teamsData.data?.items || teamsData.data || [];
          
          // Créer un mapping team_sport_id → team_name
          const mapping: Record<number, string> = {};
          
          for (const team of teams) {
            const sportsRes = await fetch(`http://localhost:8000/teams/${team.id}/sports`);
            if (sportsRes.ok) {
              const sportsData = await sportsRes.json();
              const teamSports = sportsData.data || [];
              
              for (const ts of teamSports) {
                mapping[ts.id] = team.name;
              }
            }
          }
          
          setTeamSportIdToName(mapping);
          console.log("✅ Mapping team_sport_id → team_name chargé:", mapping);
        }
      } catch (err) {
        console.warn("⚠️ Erreur lors du chargement du mapping d'équipes:", err);
      }
    };
    
    loadTeamNames();
  }, []);

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
        const sportData = data.data as Sport;
        setSport(sportData);

        // Déduire le code du sport à partir du nom (backend ne fournit pas 'code')
        const name = (sportData?.name || "").trim().toLowerCase();
        const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
        const n = normalize(name);
        let code: string | null = null;
        if (n.includes('foot')) code = 'football';
        else if (n.includes('hand')) code = 'handball';
        else if (n.includes('basket')) code = 'basketball';
        else if (n.includes('volley')) code = 'volleyball';
        else if (n.includes('badminton')) code = 'badminton';
        else if (n.includes('petanque')) code = 'petanque';
        else if (n.includes('flechette')) code = 'flechettes';
        if (code) setSportCode(code);
      } catch (e: any) {
        setError(e?.message || "Erreur lors du chargement du sport.");
      } finally {
        setLoading(false);
      }
    };

    const id = params?.id;
    if (typeof id === "string") {
      fetchSport(id);
    }
  }, [params]);

  // Une fois que le mapping est chargé, charger la structure du tournoi
  useEffect(() => {
      if (Object.keys(teamSportIdToName).length === 0) return;
      const id = params?.id;
      if (typeof id !== "string") return;

      const loadTournamentMatches = async () => {
        try {
          // 1. Récupérer le tournoi spécifique au sport via le filtre backend
          // Cela évite de charger tous les tournois de la base
          const tournamentsResponse = await fetch(`http://localhost:8000/tournaments?sport_id=${id}`);
          if (!tournamentsResponse.ok) throw new Error("Impossible de charger le tournoi");
          
          const tournamentsData = await tournamentsResponse.json();
          const items = tournamentsData.data?.items || [];
          
          // Comme on filtre par sport_id, on prend le premier résultat
          const tournament = items.length > 0 ? items[0] : null;

          if (!tournament) throw new Error("Aucun tournoi trouvé pour ce sport. Veuillez le configurer d'abord.");

          // 2. Charger la STRUCTURE du tournoi (c'est là que sont vos matchs configurés)
          // On utilise la route définie dans tournament_structure.py
          const response = await fetch(`http://localhost:8000/tournaments/${tournament.id}/structure`);
          if (!response.ok) throw new Error("Impossible de charger la structure du tournoi");
          
          const structureData = await response.json();
          const data = structureData.data || structureData; // Adaptation selon le format de réponse (create_success_response ou direct)

          // 3. Aplatir la structure (Qualifs + Poules + Brackets) en une liste unique de matchs
          const collected: TournamentMatch[] = [];

          // Fonction helper pour mapper le format Backend vers Frontend
          const mapMatch = (m: any, forcedType?: TournamentMatchType): TournamentMatch => {
            let type: TournamentMatchType = forcedType || "qualifications";
            
            // Détection du type si pas forcé
            if (!forcedType) {
              if (m.match_type === "qualification") type = "qualifications";
              else if (m.bracket_type === "loser") type = "loser-bracket"; // Gestion spécifique loser bracket
              else if (m.match_type === "bracket") {
                if (m.bracket_type === "quarterfinal") type = "quarts"; // Mapping explicite si nécessaire
                else if (m.bracket_type === "semifinal") type = "demi-finale";
                else if (m.bracket_type === "final") type = "finale";
                else if (m.bracket_type === "third_place") type = "petite-finale";
                else type = "quarts"; // Par défaut pour les brackets classiques
              }
            }

            return {
              id: m.id?.toString() || "",
              label: m.label || `Match ${m.match_order || ""}`,
              teamA: m.team_a_source || (m.team_sport_a_id ? m.team_sport_a_id.toString() : "Équipe A"),
              teamB: m.team_b_source || (m.team_sport_b_id ? m.team_sport_b_id.toString() : "Équipe B"),
              type: type,
              status: m.status === "upcoming" ? "planifié" : 
                    m.status === "in_progress" ? "en-cours" :
                    m.status === "completed" ? "terminé" : "planifié",
              court: m.court ? m.court.trim() : (m.court_id ? `Terrain #${m.court_id}` : ""),
              courtId: m.court_id,
              scheduledDatetime: m.scheduled_datetime,
              estimatedDurationMinutes: m.estimated_duration_minutes,
              scoreA: m.score_a,
              scoreB: m.score_b,
              date: m.date,
              time: m.time,
            };
          };

          // A. Ajout des qualifications
          if (data.qualification_matches) {
            data.qualification_matches.forEach((m: any) => collected.push(mapMatch(m, "qualifications")));
          }

          // B. Ajout des matchs de poules
          if (data.pools) {
            data.pools.forEach((pool: any) => {
              if (pool.matches) {
                pool.matches.forEach((m: any) => collected.push(mapMatch(m, "poule")));
              }
            });
            // On met aussi à jour l'état des poules pour les classements
            setPools(data.pools.map((p: any) => ({
              id: p.id.toString(),
              name: p.name,
              teams: p.teams || [], // Il faudra peut-être adapter si teams n'est pas rempli
              qualifiedToFinals: p.qualified_to_finals,
              qualifiedToLoserBracket: p.qualified_to_loser_bracket
            })));
          }

          // C. Ajout des brackets (Winner)
          if (data.bracket_matches) {
            data.bracket_matches.forEach((m: any) => collected.push(mapMatch(m)));
          }

          // D. Ajout des brackets (Loser)
          if (data.loser_bracket_matches) {
            data.loser_bracket_matches.forEach((m: any) => collected.push(mapMatch(m, "loser-bracket")));
          }

          // Trier les matchs : terminés en bas, planifiés en haut (optionnel)
          // collected.sort((a, b) => ... );

          setMatches(collected);
          
          // Mise à jour des données brutes pour la logique de tournoi (calculs JS)
          setTournamentMatches(collected as unknown as TournamentLogicMatch[]); // Adaptation de type simple
          // Note: Pour une logique JS parfaite, il faudrait aussi mapper vers TournamentLogicPool, etc.
          
        } catch (err) {
          console.error("❌ Impossible de charger les matchs du tournoi:", err);
          setError("Impossible de charger les matchs. Vérifiez que la structure est bien générée.");
        }
      };
      
      loadTournamentMatches();
    }, [params, teamSportIdToName]);

  // Générer le classement des poules avec les vrais résultats
  const generatePoolRankings = async (): Promise<Map<string, RankingEntry[]>> => {
    const poolRankings = new Map<string, RankingEntry[]>();
    
    // Récupérer le classement de chaque poule via l'API
    for (const pool of pools) {
      try {
        const response = await fetch(`http://localhost:8000/pools/${pool.id}/standings`);
        if (response.ok) {
          const data = await response.json();
          const standings = data.data || [];
          
          // Convertir les standings de l'API au format RankingEntry
          const ranking: RankingEntry[] = standings.map((standing: any) => ({
            position: standing.position || 1,
            team: standing.team_name || "",
            played: (standing.wins || 0) + (standing.losses || 0) + (standing.draws || 0),
            won: standing.wins || 0,
            drawn: standing.draws || 0,
            lost: standing.losses || 0,
            points: standing.points || 0,
            scoreDiff: standing.goal_difference || 0,
          }));
          
          poolRankings.set(pool.name, ranking);
        } else {
          console.warn(`⚠️ Impossible de récupérer le classement de la poule ${pool.id}`);
          // Fallback: calculer localement
          const standings = calculatePoolStandings(pools.find(p => p.id === pool.id) as TournamentLogicPool);
          const ranking: RankingEntry[] = standings.map((standing, index) => ({
            position: index + 1,
            team: standing.team,
            played: standing.played,
            won: standing.won,
            drawn: 0,
            lost: standing.lost,
            points: standing.points,
            scoreDiff: standing.scoreDiff,
          }));
          poolRankings.set(pool.name, ranking);
        }
      } catch (err) {
        console.warn(`⚠️ Erreur lors du chargement du classement de la poule ${pool.id}:`, err);
        // Fallback: calculer localement
        const standings = calculatePoolStandings(pools.find(p => p.id === pool.id) as TournamentLogicPool);
        const ranking: RankingEntry[] = standings.map((standing, index) => ({
          position: index + 1,
          team: standing.team,
          played: standing.played,
          won: standing.won,
          drawn: 0,
          lost: standing.lost,
          points: standing.points,
          scoreDiff: standing.scoreDiff,
        }));
        poolRankings.set(pool.name, ranking);
      }
    }
    
    return poolRankings;
  };

  // Générer le classement final avec les vrais points
  // NOTE: Cette fonction est maintenant appelée dans un useEffect

  // États pour stocker les rankings
  const [poolRankings, setPoolRankings] = useState<Map<string, RankingEntry[]>>(new Map());
  const [finalRanking, setFinalRanking] = useState<RankingEntry[]>([]);

  // Charger les classements des poules via l'API
  useEffect(() => {
    if (pools.length === 0) {
      setPoolRankings(new Map());
      return;
    }

    const loadPoolRankings = async () => {
      const rankings = await generatePoolRankings();
      setPoolRankings(rankings);
    };

    loadPoolRankings();
  }, [pools]);

  // Charger le classement final
  useEffect(() => {
    const finalRankings = calculateFinalRankings(
      tournamentMatches,
      tournamentPools,
      tournamentBrackets,
      tournamentLoserBrackets
    );
    
    const ranking = Array.from(finalRankings.entries())
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
    
    setFinalRanking(ranking);
  }, [tournamentMatches, tournamentPools, tournamentBrackets, tournamentLoserBrackets]);

  const handleResetAllMatches = () => {
    if (!params.id || typeof params.id !== 'string') return;
    
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les matchs ? Cette action est irréversible.')) {
      // D'abord, trouver l'ID du tournoi pour ce sport
      fetch(`http://localhost:8000/tournaments`)
        .then(res => res.json())
        .then(data => {
          const tournaments = Array.isArray(data.data.items) 
            ? data.data.items 
            : Array.isArray(data.data) 
            ? data.data 
            : [];
          const tournament = tournaments.find((t: any) => t.sport_id === parseInt(params.id as string));
          
          if (!tournament) {
            throw new Error("Tournoi introuvable");
          }
          
          // Appeler l'API pour réinitialiser les matchs
          return fetch(`http://localhost:8000/tournaments/${tournament.id}/reset-matches`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
          });
        })
        .then(res => {
          if (!res.ok) throw new Error("Erreur lors de la réinitialisation");
          return res.json();
        })
        .then(data => {
          console.log("✅ Réinitialisation réussie:", data);
          alert("Tous les matchs ont été réinitialisés !");
          // Recharger la page pour afficher les changements
          window.location.reload();
        })
        .catch(err => {
          console.error("❌ Erreur:", err);
          alert("Erreur lors de la réinitialisation: " + err.message);
        });
    }
    setShowMenu(false);
  };

  const handlePropagateResults = () => {
    if (!params.id || typeof params.id !== 'string') return;
    
    // Trouver l'ID du tournoi pour ce sport
    fetch(`http://localhost:8000/tournaments`)
      .then(res => res.json())
      .then(data => {
        const tournaments = Array.isArray(data.data.items) 
          ? data.data.items 
          : Array.isArray(data.data) 
          ? data.data 
          : [];
        const tournament = tournaments.find((t: any) => t.sport_id === parseInt(params.id as string));
        
        if (!tournament) {
          throw new Error("Tournoi introuvable");
        }
        
        // Appeler l'API pour propager les résultats
        return fetch(`http://localhost:8000/tournaments/${tournament.id}/propagate-results`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        });
      })
      .then(res => {
        if (!res.ok) throw new Error("Erreur lors de la propagation");
        return res.json();
      })
      .then(data => {
        console.log("✅ Propagation réussie:", data);
        alert(`${data.data.propagated_matches} match(s) propagé(s) avec succès !`);
        // Recharger la page pour afficher les changements
        window.location.reload();
      })
      .catch(err => {
        console.error("❌ Erreur:", err);
        alert("Erreur lors de la propagation: " + err.message);
      });
    
    setShowMenu(false);
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-8">
      {/* Header avec bouton retour, titre et menu 3 points */}
      <header className="w-full max-w-6xl mb-8">
        <div className="flex items-center justify-between">
          {/* Bouton retour */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 bg-white rounded-full shadow px-4 py-2 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
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

          {/* Titre au centre */}
          <div className="text-center flex-1 mx-4">
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
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 mb-2">{error}</p>
                <button
                  onClick={() => router.push(`/configuration-coupe/tournaments/${params.id}`)}
                  className="text-sm text-red-700 hover:text-red-800 font-medium underline"
                >
                  Aller à la configuration du tournoi →
                </button>
              </div>
            )}
          </div>

          {/* Menu 3 points */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Options"
            >
              <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                <button
                  onClick={() => {
                    setShowMatchSelect(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">Modifier un match</div>
                    <div className="text-xs text-gray-500">Choisir un match à éditer</div>
                  </div>
                </button>
                <button
                  onClick={handlePropagateResults}
                  className="w-full text-left px-4 py-3 hover:bg-green-50 transition flex items-center gap-3 border-t border-gray-100"
                >
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div>
                    <div className="font-medium text-black">Propager les résultats</div>
                    <div className="text-xs text-green-600">Mettre à jour les matchs suivants</div>
                  </div>
                </button>
                <button
                  onClick={handleResetAllMatches}
                  className="w-full text-left px-4 py-3 hover:bg-red-50 transition flex items-center gap-3 border-t border-gray-100"
                >
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <div>
                    <div className="font-medium text-black">Réinitialiser tous les matchs</div>
                    <div className="text-xs text-red-500">Remettre à zéro tous les scores</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal de sélection de match */}
      {showMatchSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Sélectionner un match à modifier</h3>
              <button
                onClick={() => setShowMatchSelect(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6">
              {matches.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucun match disponible</p>
              ) : (
                <div className="grid gap-3">
                  {matches.map((match) => (
                    <button
                      key={match.id}
                      onClick={() => {
                        if (!sportCode) return;
                        router.push(`/choix-sport/tournaments/table-marquage/${sportCode}?matchId=${match.id}`);
                        setShowMatchSelect(false);
                      }}
                      className="text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg p-4 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMatchTypeBadge(match.type)}`}>
                            {match.type === "qualifications" ? "Qualifs" : match.type}
                          </span>
                          {match.label && (
                            <span className="text-xs font-semibold text-gray-700">{match.label}</span>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMatchStatusBadge(match.status)}`}>
                          {match.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900">
                          {formatTeamName(match.teamA, tournamentMatches, tournamentPools, tournamentBrackets, tournamentLoserBrackets)}
                        </span>
                        <span className="text-gray-500 mx-2">vs</span>
                        <span className="font-medium text-gray-900">
                          {formatTeamName(match.teamB, tournamentMatches, tournamentPools, tournamentBrackets, tournamentLoserBrackets)}
                        </span>
                      </div>
                      {match.status === "terminé" && match.scoreA !== undefined && match.scoreB !== undefined && (
                        <div className="mt-2 text-center text-sm font-bold text-blue-600">
                          {match.scoreA} - {match.scoreB}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    {/* Sections du contenu */}
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

        {(() => {console.log('MATCHES AFFICHÉS', matches); return null;})()}
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
            sportCode && router.push(
            `/choix-sport/tournaments/table-marquage/${sportCode}?matchId=${match.id}`
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
                {/* Affichage du score : 0-0 par défaut si planifié, sinon score ou VS */}
                {match.status === "planifié" ? (
                  <span className="text-black font-bold text-base">0 - 0</span>
                ) : match.scoreA !== undefined && match.scoreB !== undefined ? (
                  <span className="text-black font-bold text-base">{match.scoreA} - {match.scoreB}</span>
                ) : (
                  <span className="text-black text-xs">VS</span>
                )}
              </div>
              <span className={match.status === "terminé" && match.scoreA !== undefined && match.scoreB !== undefined && match.scoreB > match.scoreA ? "font-bold text-green-600" : ""}>
                {formatTeamName(match.teamB, tournamentMatches, tournamentPools, tournamentBrackets, tournamentLoserBrackets)}
              </span>
              </div>
              {/* Ajout date, heure et terrain */}
              {(match.date || match.time || match.court) && (
                <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-2">
                  {match.court && (
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {match.court}
                    </span>
                  )}
                  {match.date && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {match.date}
                    </span>
                  )}
                  {match.time && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {match.time}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
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
                    <h3 className="font-semibold text-red-600">Classement Final du Tournoi</h3>
                    <p className="text-xs text-black mt-1">Points cumulés de toutes les phases (qualifs, brackets, finales)</p>
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
