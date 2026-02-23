"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  resolveTeamName,
  calculatePoolStandings,
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
  winnerDestinationMatchId?: string | number | null;
  loserDestinationMatchId?: string | number | null;
  winnerDestinationSlot?: "A" | "B" | null;
  loserDestinationSlot?: "A" | "B" | null;
  poolId?: string; // ID de la poule pour les matchs de poule
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

type MatchPlayer = {
  id: number;
  team_sport_id: number;
  team: "A" | "B";
  first_name?: string | null;
  last_name?: string | null;
  jersey_number?: number | null;
  position?: string | null;
  is_captain: boolean;
  is_active: boolean;
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
      // On crée une expression régulière pour vérifier que le code est soit :
      // 1. Suivi d'un chiffre (ex: P1)
      // 2. Le nom exact (ex: P)
      const regex = new RegExp(`^${code}(\\d+|$)`);
      
      if (regex.test(teamName)) {
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
  const { data: session } = useSession();
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

  // État pour les scores en direct des matchs à sets (volleyball, badminton, fléchettes...)
  const [liveScores, setLiveScores] = useState<Record<string, { sets1: number; sets2: number; score1: number; score2: number; }>>({});

  // États pour la fiche de match (joueurs)
  const [rosterMatchId, setRosterMatchId] = useState<string | null>(null);
  const [rosterPlayers, setRosterPlayers] = useState<MatchPlayer[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState({ team: "A" as "A" | "B", jersey_number: "", first_name: "", last_name: "" });
  const [addingPlayer, setAddingPlayer] = useState(false);

  // Charger le mapping des équipes au chargement
  useEffect(() => {
    const loadTeamNames = async () => {
      try {
        // Charger toutes les équipes
        const teamsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`);
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const teams = teamsData.data?.items || teamsData.data || [];
          
          // Créer un mapping team_sport_id → team_name
          const mapping: Record<number, string> = {};
          
          for (const team of teams) {
            const sportsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${team.id}/sports`);
            if (sportsRes.ok) {
              const sportsData = await sportsRes.json();
              const teamSports = sportsData.data || [];
              
              for (const ts of teamSports) {
                mapping[ts.id] = team.name;
              }
            }
          }
          
          setTeamSportIdToName(mapping);
          console.log("✅ Mapping team_sport_id → team_name chargé:");
          console.table(mapping);
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sports/${sportId}`, {
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
                // 1. Récupérer le tournoi spécifique
                const tournamentsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments?sport_id=${id}`);
                if (!tournamentsResponse.ok) throw new Error("Impossible de charger le tournoi");
                
                const tournamentsData = await tournamentsResponse.json();
                const items = tournamentsData.data?.items || [];
                const tournament = items.length > 0 ? items[0] : null;

                if (!tournament) throw new Error("Aucun tournoi trouvé pour ce sport.");

                // 2. Charger la STRUCTURE du tournoi
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/structure`);
                if (!response.ok) throw new Error("Impossible de charger la structure");
                
                const structureData = await response.json();
                const data = structureData.data || structureData;

                // Helper de mapping
                const mapMatch = (m: any, forcedType?: TournamentMatchType, poolId?: string): TournamentMatch => {
                  let type: TournamentMatchType = forcedType || "qualifications";
                  if (!forcedType) {
                      if (m.match_type === "qualification") {
                        type = "qualifications";
                      }
                      else if (m.match_type === "pool" || m.match_type === "poule") {
                        type = "poule";
                      }
                      // Vérifier si bracket_type contient "loser" (ex: "loser", "loser_round_1", etc.)
                      else if (m.bracket_type && m.bracket_type.includes("loser")) {
                        type = "loser-bracket";
                      }
                      else if (m.match_type === "bracket") {
                        if (m.bracket_type === "quarterfinal") type = "quarts";
                        else if (m.bracket_type === "semifinal") type = "demi-finale";
                        else if (m.bracket_type === "final") type = "finale";
                        else if (m.bracket_type === "third_place") type = "petite-finale";
                        else type = "quarts";
                      }
                      else {
                        // Valeur par défaut si aucun type n'est reconnu
                        type = "qualifications";
                      }
                    }

                  // ✅ FIX COMPLET: Résolution robuste des noms d'équipes
                  const resolveTeamName = (teamSportId: number | null | undefined, teamSource: string | null | undefined): string => {
                    // 1. Si team_sport_id existe, récupérer le nom depuis le mapping
                    if (teamSportId) {
                      const mappedName = teamSportIdToName[teamSportId];
                      if (mappedName) {
                        console.log(`✅ Resolved team_sport_id ${teamSportId} → ${mappedName}`);
                        return mappedName;
                      } else {
                        console.warn(`⚠️ team_sport_id ${teamSportId} not found in mapping, fallback to ID`);
                        return teamSportId.toString();
                      }
                    }

                    // 2. Sinon, utiliser team_source (qui peut être un nom ou un code comme "WQ1")
                    if (teamSource) {
                      console.log(`📝 Using team_source: ${teamSource}`);
                      return teamSource;
                    }

                    // 3. Dernier recours
                    console.warn(`⚠️ No team_sport_id or team_source for match ${m.id}`);
                    return "À définir";
                  };

                  const teamAValue = resolveTeamName(m.team_sport_a_id, m.team_a_source);
                  const teamBValue = resolveTeamName(m.team_sport_b_id, m.team_b_source);

                  // Extraire date et time depuis scheduled_datetime ou les champs directs
                  let matchDate = m.date || "";
                  let matchTime = m.time || "";
                  if (m.scheduled_datetime) {
                    const parts = m.scheduled_datetime.split('T');
                    matchDate = parts[0] || matchDate;
                    matchTime = parts[1]?.slice(0, 5) || matchTime;
                  }

                  return {
                    id: m.id?.toString() || "",
                    label: m.label || `Match ${m.match_order || ""}`,
                    teamA: teamAValue,
                    teamB: teamBValue,
                    type: type,
                    status: m.status === "upcoming" ? "planifié" : m.status === "in_progress" ? "en-cours" : m.status === "completed" ? "terminé" : "planifié",
                    scoreA: m.score_a,
                    scoreB: m.score_b,
                    date: matchDate,
                    time: matchTime,
                    court: m.court || "",
                    winnerDestinationMatchId: m.winner_destination_match_id,
                    winnerDestinationSlot: m.winner_destination_slot,
                    loserDestinationMatchId: m.loser_destination_match_id,
                    loserDestinationSlot: m.loser_destination_slot,
                    poolId: poolId,
                  };
                };

                const collected: TournamentMatch[] = [];
                if (data.qualification_matches) data.qualification_matches.forEach((m: any) => collected.push(mapMatch(m, "qualifications")));

                // ✅ Charger aussi les informations des poules
                const poolsData: Pool[] = [];
                if (data.pools) {
                  data.pools.forEach((p: any) => {
                    const poolIdStr = p.id?.toString() || "";
                    // Passer le poolId à mapMatch pour associer les matchs à leur poule
                    p.matches?.forEach((m: any) => collected.push(mapMatch(m, "poule", poolIdStr)));

                    // Ajouter la poule à la liste
                    poolsData.push({
                      id: poolIdStr,
                      name: p.name || "",
                      teams: [], // Les équipes seront récupérées via l'API standings
                      qualifiedToFinals: p.qualified_to_finals || 2,
                      qualifiedToLoserBracket: p.qualified_to_loser_bracket || 0,
                    });
                  });
                }
                setPools(poolsData);
                if (data.bracket_matches) data.bracket_matches.forEach((m: any) => collected.push(mapMatch(m)));
                if (data.loser_bracket_matches) data.loser_bracket_matches.forEach((m: any) => collected.push(mapMatch(m, "loser-bracket")));

                setMatches(collected);

                // --- INSERTION DE LA LOGIQUE DE PROPAGATION AUTOMATIQUE ---
                // Si au moins un match est terminé, on demande au backend de mettre à jour les suivants
                const hasCompletedMatches = collected.some(m => m.status === "terminé");
                
                if (hasCompletedMatches) {
                  console.log("🔄 Propagation automatique des résultats...");
                  const propagateRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/propagate-results`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` })
                    }
                  });

                  if (propagateRes.ok) {
                    const propData = await propagateRes.json();
                    // Si des matchs ont effectivement été modifiés, on recharge la structure
                    if (propData.data?.propagated_matches > 0) {
                      console.log(`✅ ${propData.data.propagated_matches} matchs mis à jour. Rechargement...`);
                      
                      const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/structure`);
                      const refreshData = await refreshRes.json();
                      const newData = refreshData.data || refreshData;

                      // Créer une nouvelle fonction mapMatch avec le mapping mis à jour
                      const mapMatchRefresh = (m: any, forcedType?: TournamentMatchType, poolId?: string): TournamentMatch => {
                        let type: TournamentMatchType = forcedType || "qualifications";
                        if (!forcedType) {
                          if (m.match_type === "qualification") type = "qualifications";
                          else if (m.match_type === "pool" || m.match_type === "poule") type = "poule";
                          // Vérifier si bracket_type contient "loser" (ex: "loser", "loser_round_1", etc.)
                          else if (m.bracket_type && m.bracket_type.includes("loser")) type = "loser-bracket";
                          else if (m.match_type === "bracket") {
                            if (m.bracket_type === "quarterfinal") type = "quarts";
                            else if (m.bracket_type === "semifinal") type = "demi-finale";
                            else if (m.bracket_type === "final") type = "finale";
                            else if (m.bracket_type === "third_place") type = "petite-finale";
                            else type = "quarts";
                          }
                        }

                        // Même logique de résolution que mapMatch
                        const resolveTeamNameRefresh = (teamSportId: number | null | undefined, teamSource: string | null | undefined): string => {
                          if (teamSportId) {
                            const mappedName = teamSportIdToName[teamSportId];
                            if (mappedName) return mappedName;
                            return teamSportId.toString();
                          }
                          if (teamSource) return teamSource;
                          return "À définir";
                        };

                        const teamAValue = resolveTeamNameRefresh(m.team_sport_a_id, m.team_a_source);
                        const teamBValue = resolveTeamNameRefresh(m.team_sport_b_id, m.team_b_source);

                        // Extraire date et time depuis scheduled_datetime ou les champs directs
                        let matchDate = m.date || "";
                        let matchTime = m.time || "";
                        if (m.scheduled_datetime) {
                          const parts = m.scheduled_datetime.split('T');
                          matchDate = parts[0] || matchDate;
                          matchTime = parts[1]?.slice(0, 5) || matchTime;
                        }

                        return {
                          id: m.id?.toString() || "",
                          label: m.label || `Match ${m.match_order || ""}`,
                          teamA: teamAValue,
                          teamB: teamBValue,
                          type: type,
                          status: m.status === "upcoming" ? "planifié" : m.status === "in_progress" ? "en-cours" : m.status === "completed" ? "terminé" : "planifié",
                          scoreA: m.score_a,
                          scoreB: m.score_b,
                          date: matchDate,
                          time: matchTime,
                          court: m.court || "",
                          winnerDestinationMatchId: m.winner_destination_match_id,
                          winnerDestinationSlot: m.winner_destination_slot,
                          loserDestinationMatchId: m.loser_destination_match_id,
                          loserDestinationSlot: m.loser_destination_slot,
                          poolId: poolId,
                        };
                      };

                      const refreshed: TournamentMatch[] = [];
                      if (newData.qualification_matches) newData.qualification_matches.forEach((m: any) => refreshed.push(mapMatchRefresh(m, "qualifications")));
                      if (newData.pools) newData.pools.forEach((p: any) => {
                        const pId = p.id?.toString() || "";
                        p.matches?.forEach((m: any) => refreshed.push(mapMatchRefresh(m, "poule", pId)));
                      });
                      if (newData.bracket_matches) newData.bracket_matches.forEach((m: any) => refreshed.push(mapMatchRefresh(m)));
                      if (newData.loser_bracket_matches) newData.loser_bracket_matches.forEach((m: any) => refreshed.push(mapMatchRefresh(m, "loser-bracket")));

                      setMatches(refreshed);
                      setTournamentMatches(refreshed as unknown as TournamentLogicMatch[]);
                    }
                  }
                } else {
                  setTournamentMatches(collected as unknown as TournamentLogicMatch[]);
                }
                // --- FIN DE LA LOGIQUE DE PROPAGATION ---

              } catch (err) {
                console.error("❌ Erreur:", err);
                setError("Erreur de chargement.");
              }
            };
            
            loadTournamentMatches();
          }, [params, teamSportIdToName]);

  useEffect(() => {
    // Auto-assigner les équipes aux matchs de qualification si nécessaire
    const autoAssignQualificationTeams = async () => {
      if (!params.id || typeof params.id !== 'string') return;
      if (Object.keys(teamSportIdToName).length === 0) return;
      
      try {
        // Récupérer le tournoi
        const tournamentsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments?sport_id=${params.id}`);
        const tournamentsData = await tournamentsResponse.json();
        const items = tournamentsData.data?.items || [];
        const tournament = items.length > 0 ? items[0] : null;
        
        if (!tournament) return;
        
        // Récupérer la structure
        const structureResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/structure`);
        const structureData = await structureResponse.json();
        const data = structureData.data || structureData;
        
        // Vérifier s'il y a des matchs de qualification sans équipes
        const qualificationMatches = data.qualification_matches || [];
        const matchesNeedingTeams = qualificationMatches.filter(
          (m: any) => !m.team_sport_a_id || !m.team_sport_b_id
        );
        
        if (matchesNeedingTeams.length === 0) {
          // Tous les matchs ont déjà des équipes, rien à faire
          return;
        }
        
        console.log(`🔧 Auto-assignation: ${matchesNeedingTeams.length} matchs ont besoin d'équipes`);
        
        // Récupérer les team-sports disponibles
        const teamSportsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sports/${params.id}/team-sports`);
        const teamSportsData = await teamSportsResponse.json();
        const teamSports = teamSportsData.data || [];
        
        if (teamSports.length < matchesNeedingTeams.length * 2) {
          console.warn(`⚠️ Pas assez d'équipes : ${teamSports.length} disponibles, ${matchesNeedingTeams.length * 2} nécessaires`);
          return;
        }
        
        // Assigner automatiquement
        let teamIndex = 0;
        let assignedCount = 0;
        
        for (const match of matchesNeedingTeams) {
          const teamA = teamSports[teamIndex];
          const teamB = teamSports[teamIndex + 1];
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${match.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` })
            },
            body: JSON.stringify({
              team_sport_a_id: teamA.id,
              team_sport_b_id: teamB.id
            }),
          });
          
          if (response.ok) {
            console.log(`✅ Match ${match.id} auto-assigné`);
            assignedCount++;
          }
          
          teamIndex += 2;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        if (assignedCount > 0) {
          console.log(`🎉 Auto-assignation terminée: ${assignedCount} matchs`);
          // Recharger pour afficher les équipes assignées
          window.location.reload();
        }
        
      } catch (err) {
        console.error('Erreur lors de l\'auto-assignation:', err);
        // Ne pas bloquer l'application en cas d'erreur
      }
    };
    
    // Lancer l'auto-assignation
    autoAssignQualificationTeams();
  }, [params.id, teamSportIdToName]);


  // États pour stocker les rankings
  const [poolRankings, setPoolRankings] = useState<Map<string, RankingEntry[]>>(new Map());
  const [finalRanking, setFinalRanking] = useState<RankingEntry[]>([]);
  
  // Générer le classement des poules avec les vrais résultats
  const generatePoolRankings = () => {
    const newPoolRankings = new Map<string, RankingEntry[]>();

    pools.forEach((pool) => {
      // 1. On récupère les matchs de cette poule via poolId (plus fiable que le label)
      const poolMatches = matches.filter(m =>
        m.type === "poule" && m.poolId === pool.id
      );

      console.log(`🏆 Pool "${pool.name}" (id: ${pool.id}): ${poolMatches.length} matchs trouvés`);

      const stats: Record<string, RankingEntry> = {};

      // 2. Initialiser les équipes de la poule à partir des matchs
      const teamsInPool = Array.from(new Set(poolMatches.flatMap(m => [m.teamA, m.teamB])))
        .filter(t => t && t !== "À définir" && t !== "En attente");

      teamsInPool.forEach(teamName => {
        stats[teamName] = {
          position: 0, team: teamName, played: 0, won: 0, drawn: 0, lost: 0, points: 0, scoreDiff: 0
        };
      });

      // 3. Calcul des points (3 victoire, 1 nul, 0 défaite)
      poolMatches.forEach((m) => {
        if (m.status !== "terminé" || m.scoreA === undefined || m.scoreB === undefined) return;

        const { teamA, teamB, scoreA, scoreB } = m;
        if (!stats[teamA] || !stats[teamB]) return;

        stats[teamA].played++;
        stats[teamB].played++;
        stats[teamA].scoreDiff = (stats[teamA].scoreDiff || 0) + (scoreA - scoreB);
        stats[teamB].scoreDiff = (stats[teamB].scoreDiff || 0) + (scoreB - scoreA);

        if (scoreA > scoreB) {
          stats[teamA].points += 3;
          stats[teamA].won++;
          stats[teamB].lost++;
          console.log(`  ✅ ${teamA} bat ${teamB} (${scoreA}-${scoreB}) → ${teamA} +3 pts`);
        } else if (scoreB > scoreA) {
          stats[teamB].points += 3;
          stats[teamB].won++;
          stats[teamA].lost++;
          console.log(`  ✅ ${teamB} bat ${teamA} (${scoreB}-${scoreA}) → ${teamB} +3 pts`);
        } else {
          stats[teamA].points += 1;
          stats[teamB].points += 1;
          stats[teamA].drawn++;
          stats[teamB].drawn++;
          console.log(`  🤝 Match nul ${teamA} vs ${teamB} (${scoreA}-${scoreB}) → +1 pt chacun`);
        }
      });

      // 4. Tri par points puis différence de buts/scores
      const sorted = Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return (b.scoreDiff || 0) - (a.scoreDiff || 0);
      });

      sorted.forEach((e, i) => e.position = i + 1);
      newPoolRankings.set(pool.name, sorted);

      console.log(`📊 Classement ${pool.name}:`, sorted.map(s => `${s.position}. ${s.team} (${s.points} pts)`));
    });

    setPoolRankings(newPoolRankings);
  };

  // Charger les classements des poules via l'API
  useEffect(() => {
    generatePoolRankings();
  }, [pools, rankingFilter, matches]);

  // Charger le classement final depuis l'API
  useEffect(() => {
    const loadFinalRanking = async () => {
      if (!params.id || typeof params.id !== 'string') return;

      try {
        // Récupérer le tournoi
        const tournamentsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments?sport_id=${params.id}`);
        const tournamentsData = await tournamentsResponse.json();
        const items = tournamentsData.data?.items || [];
        const tournament = items.length > 0 ? items[0] : null;

        if (!tournament) return;

        // Récupérer le classement final depuis l'API
        const rankingResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/final-ranking`);
        if (!rankingResponse.ok) {
          console.warn('Impossible de charger le classement final');
          return;
        }

        const rankingData = await rankingResponse.json();
        const apiRanking = rankingData.data || [];

        // Convertir au format attendu par le frontend
        const ranking = apiRanking.map((entry: any) => ({
          position: entry.position,
          team: entry.team_name,
          played: entry.matches_played,
          won: entry.wins,
          drawn: entry.draws,
          lost: entry.losses,
          points: entry.total_points,
          scoreDiff: entry.goal_difference,
        }));

        setFinalRanking(ranking);
      } catch (err) {
        console.error('Erreur lors du chargement du classement final:', err);
      }
    };

    loadFinalRanking();
  }, [params.id, matches]);

  // Polling des scores en direct pour les matchs à sets (en-cours ET terminés)
  // Les données live restent en mémoire côté backend après la fin du match
  useEffect(() => {
    if (sport?.score_type !== 'sets') return;

    const setsMatches = matches.filter(m => m.status === 'en-cours' || m.status === 'terminé');
    if (setsMatches.length === 0) return;

    const fetchLiveScores = async () => {
      const updates: Record<string, { sets1: number; sets2: number; score1: number; score2: number; }> = {};
      for (const match of setsMatches) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${match.id}/live-score`);
          if (res.ok) {
            const data = await res.json();
            const liveData = data.data?.data;
            if (liveData) {
              updates[match.id] = {
                sets1: liveData.sets1 ?? 0,
                sets2: liveData.sets2 ?? 0,
                score1: liveData.score1 ?? 0,
                score2: liveData.score2 ?? 0,
              };
            }
          }
        } catch {
          // Ignorer les erreurs de fetch individuel
        }
      }
      if (Object.keys(updates).length > 0) {
        setLiveScores(prev => ({ ...prev, ...updates }));
      }
    };

    fetchLiveScores();
    // Polling continu seulement si des matchs sont en cours
    const hasInProgress = setsMatches.some(m => m.status === 'en-cours');
    if (!hasInProgress) return;
    const interval = setInterval(fetchLiveScores, 5000);
    return () => clearInterval(interval);
  }, [matches, sport?.score_type]);

  // ── Fiche de match : fonctions ────────────────────────────────────────────

  const openRosterModal = async (matchId: string) => {
    setRosterMatchId(matchId);
    setRosterLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${matchId}/players`);
      if (res.ok) {
        const data = await res.json();
        setRosterPlayers(data.data || []);
      }
    } catch { /* silencieux */ }
    setRosterLoading(false);
  };

  const closeRosterModal = () => {
    setRosterMatchId(null);
    setRosterPlayers([]);
    setNewPlayerForm({ team: "A", jersey_number: "", first_name: "", last_name: "" });
  };

  const handleAddPlayer = async () => {
    if (!rosterMatchId) return;
    const token = (session as { accessToken?: string } | null)?.accessToken;
    setAddingPlayer(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${rosterMatchId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          team: newPlayerForm.team,
          jersey_number: newPlayerForm.jersey_number ? parseInt(newPlayerForm.jersey_number) : null,
          first_name: newPlayerForm.first_name || null,
          last_name: newPlayerForm.last_name || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRosterPlayers(prev => [...prev, data.data]);
        setNewPlayerForm(prev => ({ ...prev, jersey_number: "", first_name: "", last_name: "" }));
      } else {
        const err = await res.json();
        alert(err.message || "Erreur lors de l'ajout du joueur");
      }
    } catch { alert("Erreur réseau"); }
    setAddingPlayer(false);
  };

  const handleDeletePlayer = async (playerId: number) => {
    if (!rosterMatchId) return;
    const token = (session as { accessToken?: string } | null)?.accessToken;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${rosterMatchId}/players/${playerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRosterPlayers(prev => prev.filter(p => p.id !== playerId));
      } else {
        alert("Erreur lors de la suppression");
      }
    } catch { alert("Erreur réseau"); }
  };

  // ── Fin fiche de match ─────────────────────────────────────────────────────

  const handleResetAllMatches = async () => {
    if (!params.id || typeof params.id !== 'string') return;
    
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les matchs ? Cette action est irréversible.')) {
      try {
        // 1. Trouver le tournoi
        const tournamentsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments?sport_id=${params.id}`);
        if (!tournamentsResponse.ok) {
          throw new Error("Impossible de charger le tournoi");
        }
        
        const tournamentsData = await tournamentsResponse.json();
        const items = tournamentsData.data?.items || [];
        const tournament = items.length > 0 ? items[0] : null;
        
        if (!tournament) {
          throw new Error("Aucun tournoi trouvé pour ce sport");
        }
        
        console.log('📝 Tournoi trouvé:', tournament.id);
        
        // 2. Récupérer TOUS les matchs du tournoi
        const structureResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/structure`);
        if (!structureResponse.ok) {
          throw new Error("Impossible de charger la structure du tournoi");
        }
        
        const structureData = await structureResponse.json();
        const data = structureData.data || structureData;
        
        // Collecter tous les matchs avec leurs détails
        const allMatches: any[] = [];
        
        if (data.qualification_matches) {
          allMatches.push(...data.qualification_matches);
        }
        
        if (data.pools) {
          data.pools.forEach((p: any) => {
            if (p.matches) {
              allMatches.push(...p.matches);
            }
          });
        }
        
        if (data.bracket_matches) {
          allMatches.push(...data.bracket_matches);
        }
        
        if (data.loser_bracket_matches) {
          allMatches.push(...data.loser_bracket_matches);
        }
        
        console.log(`🔄 ${allMatches.length} matchs à réinitialiser`);
        
        // 3. Réinitialiser chaque match (dans l'ordre inverse pour éviter les dépendances)
        let successCount = 0;
        let errorCount = 0;
        
        // Trier par ordre décroissant de match_order pour réinitialiser d'abord les matchs finaux
        const sortedMatches = [...allMatches].sort((a, b) => (b.match_order || 0) - (a.match_order || 0));
        
        for (const match of sortedMatches) {
          if (!match.id) continue;
          
          try {
            // Préparer le payload de réinitialisation
            const resetPayload: any = {
              score_a: null,
              score_b: null,
              status: 'upcoming'
            };
            
            // Si le match avait des équipes assignées dynamiquement (depuis la propagation),
            // les remettre à null pour forcer la réinitialisation
            if (match.winner_destination_match_id || match.loser_destination_match_id) {
              // Ce match reçoit des équipes d'autres matchs, donc on remet les équipes à null
              resetPayload.team_sport_a_id = null;
              resetPayload.team_sport_b_id = null;
            }
            
            const resetResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${match.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` })
              },
              body: JSON.stringify(resetPayload),
            });
            
            if (resetResponse.ok) {
              successCount++;
              console.log(`✅ Match ${match.id} (${match.label || 'sans label'}) réinitialisé`);
            } else {
              const errorText = await resetResponse.text();
              errorCount++;
              console.error(`❌ Erreur pour le match ${match.id}:`, errorText);
            }
            
            // Petit délai pour éviter de surcharger le serveur
            await new Promise(resolve => setTimeout(resolve, 50));
            
          } catch (err) {
            errorCount++;
            console.error(`❌ Erreur pour le match ${match.id}:`, err);
          }
        }
        
        console.log(`📊 Réinitialisation terminée: ${successCount} réussis, ${errorCount} erreurs`);
        
        // 4. Appeler l'endpoint de réinitialisation du backend s'il existe
        try {
          const backendResetResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/reset-matches`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` })
            },
          });
          
          if (backendResetResponse.ok) {
            const backendData = await backendResetResponse.json();
            console.log("✅ Endpoint backend de réinitialisation appelé:", backendData);
          }
        } catch (err) {
          console.warn("⚠️ L'endpoint backend de réinitialisation n'est pas disponible ou a échoué");
        }
        
        if (successCount > 0) {
          alert(`Réinitialisation terminée !\n✅ ${successCount} match(s) réinitialisé(s)${errorCount > 0 ? '\n❌ ' + errorCount + ' erreur(s)' : ''}`);
          // Recharger la page pour afficher les changements
          window.location.reload();
        } else {
          alert(`Erreur : Aucun match n'a pu être réinitialisé.\nVérifiez la console pour plus de détails.`);
        }
        
      } catch (err: any) {
        console.error("❌ Erreur globale lors de la réinitialisation:", err);
        alert("Erreur lors de la réinitialisation: " + (err.message || "Erreur inconnue"));
      }
    }
    setShowMenu(false);
  };

  const fixTournamentDestinations = async () => {
    if (!params.id || typeof params.id !== 'string') return;
    
    console.log('🔧 === DÉBUT DE LA CORRECTION DES DESTINATIONS ===');
    
    try {
      // 1. Récupérer le tournoi
      const tournamentsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments?sport_id=${params.id}`);
      const tournamentsData = await tournamentsResponse.json();
      const tournament = tournamentsData.data?.items[0];
      
      if (!tournament) {
        throw new Error("Tournoi introuvable");
      }
      
      console.log('📝 Tournoi:', tournament.id);
      
      // 2. Récupérer la structure
      const structureResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/structure`);
      const structureData = await structureResponse.json();
      const data = structureData.data || structureData;
      
      // 3. Collecter tous les matchs
      const allMatches: any[] = [];
      
      if (data.qualification_matches) {
        allMatches.push(...data.qualification_matches.map((m: any) => ({ ...m, source: 'qualification' })));
      }
      
      if (data.pools) {
        data.pools.forEach((p: any) => {
          if (p.matches) {
            allMatches.push(...p.matches.map((m: any) => ({ ...m, source: 'pool' })));
          }
        });
      }
      
      if (data.bracket_matches) {
        allMatches.push(...data.bracket_matches.map((m: any) => ({ ...m, source: 'bracket' })));
      }
      
      if (data.loser_bracket_matches) {
        allMatches.push(...data.loser_bracket_matches.map((m: any) => ({ ...m, source: 'loser_bracket' })));
      }
      
      console.log(`📝 ${allMatches.length} matchs trouvés`);
      
      // 4. Vérifier et corriger les destinations
      let issuesFound = 0;
      let issuesFixed = 0;
      
      for (const match of allMatches) {
        const issues: string[] = [];
        
        // Vérifier winner_destination
        if (match.winner_destination_match_id && !match.winner_destination_slot) {
          issues.push(`winner_destination_slot manquant`);
        }
        
        // Vérifier loser_destination
        if (match.loser_destination_match_id && !match.loser_destination_slot) {
          issues.push(`loser_destination_slot manquant`);
        }
        
        if (issues.length > 0) {
          issuesFound++;
          console.log(`\n❌ Match ${match.id} (${match.label}):`);
          issues.forEach(issue => console.log(`   - ${issue}`));
          
          // Proposition de correction automatique
          console.log(`   💡 Correction suggérée:`);
          
          if (match.winner_destination_match_id && !match.winner_destination_slot) {
            // Deviner le slot en fonction du label ou de la position
            const suggestedSlot = match.label?.includes('1') ? 'A' : 'B';
            console.log(`   - winner_destination_slot: '${suggestedSlot}'`);
          }
          
          if (match.loser_destination_match_id && !match.loser_destination_slot) {
            const suggestedSlot = match.label?.includes('1') ? 'A' : 'B';
            console.log(`   - loser_destination_slot: '${suggestedSlot}'`);
          }
        }
      }
      
      console.log(`\n📊 Résumé:`);
      console.log(`   - ${issuesFound} match(s) avec des problèmes de configuration`);
      
      if (issuesFound > 0) {
        alert(`⚠️ ${issuesFound} match(s) ont des problèmes de configuration.\n\nVérifiez la console pour les détails.\n\nCes problèmes doivent être corrigés dans la configuration du tournoi (backend).`);
      } else {
        alert(`✅ Tous les matchs sont correctement configurés !`);
      }
      
      console.log('🔧 === FIN DE LA VÉRIFICATION ===');
      
    } catch (err: any) {
      console.error("❌ Erreur:", err);
      alert("Erreur: " + err.message);
    }
  };

  const handlePropagateResults = async () => {
    if (!params.id || typeof params.id !== 'string') return;
    
    try {
      // Utiliser l'endpoint avec le sport_id directement
      const tournamentsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments?sport_id=${params.id}`);
      if (!tournamentsResponse.ok) {
        throw new Error("Impossible de charger le tournoi");
      }
      
      const tournamentsData = await tournamentsResponse.json();
      const items = tournamentsData.data?.items || [];
      const tournament = items.length > 0 ? items[0] : null;
      
      if (!tournament) {
        throw new Error("Aucun tournoi trouvé pour ce sport");
      }
      
      console.log('📝 Tournoi trouvé:', tournament.id);
      
      // Appeler l'API pour propager les résultats
      const propagateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/propagate-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` })
        },
      });
      
      if (!propagateResponse.ok) {
        const errorData = await propagateResponse.json();
        throw new Error(errorData.message || "Erreur lors de la propagation");
      }
      
      const data = await propagateResponse.json();
      console.log("✅ Propagation réussie:", data);
      
      const propagatedCount = data.data?.propagated_matches || 0;
      if (propagatedCount > 0) {
        alert(`${propagatedCount} match(s) propagé(s) avec succès !`);
        // Recharger la page pour afficher les changements
        window.location.reload();
      } else {
        alert("Aucun match à propager. Tous les matchs sont déjà à jour.");
      }
      
    } catch (err: any) {
      console.error("❌ Erreur lors de la propagation:", err);
      alert("Erreur lors de la propagation: " + (err.message || "Erreur inconnue"));
    }
    
    setShowMenu(false);
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-8">
      {/* Header avec bouton retour, titre et menu 3 points */}
      <header className="w-full max-w-6xl mb-8">
        <div className="flex items-center justify-between">
          {/* Bouton retour */}
          <button
            onClick={() => router.push("/choix-sport")}
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
                <button
                  onClick={() => {
                    setShowMenu(false);
                    router.push(`/choix-sport/tournaments/${params.id}/split-screen`);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-purple-50 transition flex items-center gap-3 border-t border-gray-100"
                >
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  <div>
                    <div className="font-medium text-black">Écran Multi-Matchs</div>
                    <div className="text-xs text-purple-600">Afficher 2-4 matchs en simultané</div>
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
                          {sport?.score_type === "sets" && (
                            <span className="text-xs font-normal text-gray-500 ml-1">sets</span>
                          )}
                        </div>
                      )}
                      {match.status === "en-cours" && sport?.score_type === "sets" && liveScores[match.id] && (
                        <div className="mt-2 text-center">
                          <span className="text-sm font-bold text-yellow-600">
                            {liveScores[match.id].sets1} - {liveScores[match.id].sets2}
                            <span className="text-xs font-normal text-gray-500 ml-1">sets</span>
                          </span>
                          <span className="ml-2 text-xs text-blue-600 font-semibold">
                            {liveScores[match.id].score1} - {liveScores[match.id].score2} pts
                          </span>
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
          {[...matches].sort((a, b) => {
            // Trier par date et heure (les plus proches en premier)
            const dateTimeA = a.date && a.time ? new Date(`${a.date}T${a.time}`) : null;
            const dateTimeB = b.date && b.time ? new Date(`${b.date}T${b.time}`) : null;

            // Les matchs sans date vont à la fin
            if (!dateTimeA && !dateTimeB) return 0;
            if (!dateTimeA) return 1;
            if (!dateTimeB) return -1;

            return dateTimeA.getTime() - dateTimeB.getTime();
          }).map((match) => {
            const isTermine = match.status === "terminé";
            return (
            <div key={match.id} className="flex flex-col gap-1">
            <button
            onClick={() => {
              if (isTermine) return; // Double sécurité
              if (sportCode) {
                router.push(`/choix-sport/tournaments/table-marquage/${sportCode}?matchId=${match.id}`);
              }
            }}
            disabled={isTermine}
            className={`text-left border rounded-xl p-4 shadow-sm flex flex-col gap-2 transition-all w-full ${
              isTermine
                ? "bg-gray-100 border-gray-300 cursor-not-allowed opacity-75"
                : "bg-gray-50 hover:bg-gray-100 border-gray-200 hover:shadow-md"
            }`}
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
                {sport?.score_type === "sets" ? (
                  /* Affichage pour sports à sets : sets remportés + pts (en cours et terminés) */
                  <div className="flex flex-col items-center gap-0 min-w-[60px]">
                    {match.status === "planifié" ? (
                      <>
                        <span className="text-black font-bold text-sm">0 - 0</span>
                        <span className="text-[10px] text-gray-400">sets</span>
                      </>
                    ) : liveScores[match.id] ? (
                      /* Données live disponibles (en cours ou terminé) */
                      <>
                        <span className="text-black font-bold text-sm">
                          {liveScores[match.id].sets1} - {liveScores[match.id].sets2}
                          <span className="text-[10px] font-normal text-gray-500 ml-1">sets</span>
                        </span>
                        <span className={`font-semibold text-xs ${match.status === "terminé" ? "text-green-600" : "text-blue-600"}`}>
                          {liveScores[match.id].score1} - {liveScores[match.id].score2} pts
                        </span>
                      </>
                    ) : match.scoreA !== undefined && match.scoreB !== undefined ? (
                      /* Fallback sur le score DB si pas de données live */
                      <>
                        <span className="text-black font-bold text-sm">{match.scoreA} - {match.scoreB}</span>
                        <span className="text-[10px] text-gray-400">sets</span>
                      </>
                    ) : (
                      <span className="text-black text-xs">VS</span>
                    )}
                  </div>
                ) : (
                  /* Affichage standard pour sports sans sets */
                  <>
                    {match.status === "planifié" ? (
                      <span className="text-black font-bold text-base">0 - 0</span>
                    ) : match.scoreA !== undefined && match.scoreB !== undefined ? (
                      <span className="text-black font-bold text-base">{match.scoreA} - {match.scoreB}</span>
                    ) : (
                      <span className="text-black text-xs">VS</span>
                    )}
                  </>
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
              {isTermine ? (
                <span className="text-green-600 font-medium">✓ Match terminé - Résultat final</span>
              ) : (
                <span>Cliquer pour ouvrir la table de marquage</span>
              )}
            </div>
            </button>
            {sport?.score_type === "goals" && (
              <button
                onClick={(e) => { e.stopPropagation(); openRosterModal(match.id); }}
                className="mt-1 w-full flex items-center justify-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 py-1 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Fiche de match
              </button>
            )}
            </div>
            );
          })}
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
                        <div className="flex flex-wrap gap-4 mt-1 text-xs text-black">
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
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></span>
                            3ème (repêchage possible)
                          </span>
                        </div>
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
                              } else if (entry.position === 3) {
                                // Meilleur 3ème - couleur bleue pour indiquer qu'il peut être repêché
                                bgColor = "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500";
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
                            Diff
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Points
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
                            <td className="px-4 py-3 text-sm text-center text-black">
                                {entry.scoreDiff !== undefined ? (entry.scoreDiff > 0 ? `+${entry.scoreDiff}` : entry.scoreDiff) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-blue-600 text-lg">
                                {entry.points}
                            </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-black">
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

      {/* Modal Fiche de match */}
      {rosterMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={closeRosterModal}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-black">Fiche de match</h2>
              <button onClick={closeRosterModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>

            {rosterLoading ? (
              <p className="text-center text-gray-500 py-4">Chargement...</p>
            ) : (
              <>
                {/* Liste des joueurs par équipe */}
                {(["A", "B"] as const).map(team => {
                  const teamPlayers = rosterPlayers.filter(p => p.team === team);
                  const matchData = matches.find(m => m.id === rosterMatchId);
                  const teamLabel = team === "A" ? matchData?.teamA || "Équipe A" : matchData?.teamB || "Équipe B";
                  return (
                    <div key={team} className="mb-4">
                      <h3 className="text-sm font-semibold text-black mb-2">
                        Équipe {team} — {teamLabel}
                      </h3>
                      {teamPlayers.length === 0 ? (
                        <p className="text-xs text-gray-400 italic mb-2">Aucun joueur</p>
                      ) : (
                        <div className="space-y-1 mb-2">
                          {teamPlayers
                            .slice()
                            .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
                            .map(player => (
                              <div key={player.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                <span className="text-sm text-black">
                                  <span className="font-bold text-blue-600 mr-2">#{player.jersey_number ?? "?"}</span>
                                  {[player.first_name, player.last_name].filter(Boolean).join(" ") || "Anonyme"}
                                  {player.is_captain && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">C</span>}
                                </span>
                                <button
                                  onClick={() => handleDeletePlayer(player.id)}
                                  className="text-red-400 hover:text-red-600 text-xs font-medium"
                                >
                                  Retirer
                                </button>
                              </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Formulaire d'ajout */}
                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-black mb-3">Ajouter un joueur</h3>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Équipe</label>
                      <select
                        value={newPlayerForm.team}
                        onChange={e => setNewPlayerForm(prev => ({ ...prev, team: e.target.value as "A" | "B" }))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-black"
                      >
                        <option value="A">Équipe A</option>
                        <option value="B">Équipe B</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">N° maillot</label>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={newPlayerForm.jersey_number}
                        onChange={e => setNewPlayerForm(prev => ({ ...prev, jersey_number: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-black"
                        placeholder="Ex: 9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Prénom</label>
                      <input
                        type="text"
                        value={newPlayerForm.first_name}
                        onChange={e => setNewPlayerForm(prev => ({ ...prev, first_name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-black"
                        placeholder="Prénom"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nom</label>
                      <input
                        type="text"
                        value={newPlayerForm.last_name}
                        onChange={e => setNewPlayerForm(prev => ({ ...prev, last_name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-black"
                        placeholder="Nom"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddPlayer}
                    disabled={addingPlayer || !newPlayerForm.jersey_number}
                    className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {addingPlayer ? "Ajout..." : "Ajouter le joueur"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}