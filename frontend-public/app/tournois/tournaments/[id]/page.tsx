"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMatchSSE, type LiveScoreData } from "../../../hooks/useMatchSSE";
import {
  resolveTeamName,
  type Match as TournamentLogicMatch,
  type Pool as TournamentLogicPool,
  type Bracket as TournamentLogicBracket,
  type LoserBracket as TournamentLogicLoserBracket,
} from "./tournamentLogic";

type ApiScoreType = "points" | "goals" | "sets";

type Sport = {
  id: number;
  name: string;
  code: string;
  score_type: ApiScoreType;
  created_at?: string;
};

type TournamentMatchType =
  | "qualifications"
  | "poule"
  | "loser-bracket"
  | "quarts"
  | "demi-finale"
  | "finale"
  | "petite-finale";

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
  scoreDiff?: number;
};

type RankingFilter = "poules" | "final";

type MatchPlayer = {
  id: number;
  team: "A" | "B";
  first_name?: string | null;
  last_name?: string | null;
  jersey_number?: number | null;
  is_captain: boolean;
};

type MatchEvent = {
  id: number;
  event_type: "goal" | "yellow_card" | "red_card";
  team: "A" | "B";
  match_time_seconds?: number | null;
  player?: {
    first_name?: string | null;
    last_name?: string | null;
    jersey_number?: number | null;
  } | null;
};

type ModalTab = "events" | "players";

// Événement live reçu via SSE (accumulé pendant un match en cours)
type LiveEventItem = {
  matchId: number;
  event_type: "goal" | "yellow_card" | "red_card";
  minute: number | null;
  playerNumber: number | null;
  playerName: string | null;
  teamName: string;
  team: "A" | "B";
  timestamp: string;
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
  teamSportIdToName?: Record<number, string>,
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
  const resolved = resolveTeamName(
    teamName,
    tournamentMatches,
    tournamentPools,
    tournamentBrackets,
    tournamentLoserBrackets,
  );

  // Si le nom n'a pas changé et c'est toujours un code, afficher une version lisible
  if (resolved === teamName) {
    const codePatterns: Record<string, string> = {
      WQ: "Vainqueur Qualif",
      WQF: "Vainqueur Quart",
      WSF: "Vainqueur Demi",
      WF: "Vainqueur Finale",
      WPF: "Vainqueur Petite Finale",
      LQ: "Perdant Qualif",
      LQF: "Perdant Quart",
      LSF: "Perdant Demi",
      LF: "Perdant Finale",
      P: "Poule",
      WLR: "Vainqueur LR",
      LLR: "Perdant LR",
      WLF: "Vainqueur Finale Loser",
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
  const [sport, setSport] = useState<Sport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clé de rafraîchissement automatique (incrémentée toutes les 30s)
  const [autoRefreshKey, setAutoRefreshKey] = useState(0);
  // Ref pour éviter le spinner de chargement lors des rafraîchissements silencieux
  const isInitialLoadRef = useRef(true);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [rankingFilter, setRankingFilter] = useState<RankingFilter>("poules");

  // État pour stocker le mapping team_sport_id → team_name
  const [teamSportIdToName, setTeamSportIdToName] = useState<
    Record<number, string>
  >({});

  // États pour stocker les données du tournoi
  const [tournamentMatches, setTournamentMatches] = useState<
    TournamentLogicMatch[]
  >([]);
  const [tournamentPools, setTournamentPools] = useState<TournamentLogicPool[]>(
    [],
  );
  const [tournamentBrackets, setTournamentBrackets] = useState<
    TournamentLogicBracket[]
  >([]);
  const [tournamentLoserBrackets, setTournamentLoserBrackets] = useState<
    TournamentLogicLoserBracket[]
  >([]);

  // États pour le modal de détail d'un match
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(
    null,
  );
  const [modalTab, setModalTab] = useState<ModalTab>("events");
  const [modalPlayers, setModalPlayers] = useState<MatchPlayer[]>([]);
  const [modalEvents, setModalEvents] = useState<MatchEvent[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Événements live accumulés via SSE (pendant les matchs en cours)
  const [liveMatchEvents, setLiveMatchEvents] = useState<
    Map<number, LiveEventItem[]>
  >(new Map());

  // Charger le mapping des équipes au chargement
  useEffect(() => {
    const loadTeamNames = async () => {
      try {
        // Charger toutes les équipes
        const teamsRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/teams`,
        );
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const teams = teamsData.data?.items || teamsData.data || [];

          // Créer un mapping team_sport_id → team_name
          const mapping: Record<number, string> = {};

          for (const team of teams) {
            const sportsRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/teams/${team.id}/sports`,
            );
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
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/sports/${sportId}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          },
        );
        if (!res.ok) throw new Error("Sport introuvable");
        const data = await res.json();
        const sportData = data.data as Sport;
        setSport(sportData);
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

    const isSilentRefresh = !isInitialLoadRef.current;

    const loadTournamentMatches = async () => {
      try {
        // 1. Récupérer le tournoi spécifique
        const tournamentsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/tournaments?sport_id=${id}`,
        );
        if (!tournamentsResponse.ok)
          throw new Error("Impossible de charger le tournoi");

        const tournamentsData = await tournamentsResponse.json();
        const items = tournamentsData.data?.items || [];
        const tournament = items.length > 0 ? items[0] : null;

        if (!tournament) throw new Error("Aucun tournoi trouvé pour ce sport.");

        // 2. Charger la STRUCTURE du tournoi
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/structure`,
        );
        if (!response.ok) throw new Error("Impossible de charger la structure");

        const structureData = await response.json();
        const data = structureData.data || structureData;

        // Helper de mapping
        const mapMatch = (
          m: any,
          forcedType?: TournamentMatchType,
          poolId?: string,
        ): TournamentMatch => {
          let type: TournamentMatchType = forcedType || "qualifications";
          if (!forcedType) {
            if (m.match_type === "qualification") {
              type = "qualifications";
            } else if (m.match_type === "pool" || m.match_type === "poule") {
              type = "poule";
            }
            // Vérifier si bracket_type contient "loser" (ex: "loser", "loser_round_1", etc.)
            else if (m.bracket_type && m.bracket_type.includes("loser")) {
              type = "loser-bracket";
            } else if (m.match_type === "bracket") {
              if (m.bracket_type === "quarterfinal") type = "quarts";
              else if (m.bracket_type === "semifinal") type = "demi-finale";
              else if (m.bracket_type === "final") type = "finale";
              else if (m.bracket_type === "third_place") type = "petite-finale";
              else type = "quarts";
            } else {
              // Valeur par défaut si aucun type n'est reconnu
              type = "qualifications";
            }
          }

          // ✅ FIX COMPLET: Résolution robuste des noms d'équipes
          const resolveTeamName = (
            teamSportId: number | null | undefined,
            teamSource: string | null | undefined,
          ): string => {
            // 1. Si team_sport_id existe, récupérer le nom depuis le mapping
            if (teamSportId) {
              const mappedName = teamSportIdToName[teamSportId];
              if (mappedName) {
                console.log(
                  `✅ Resolved team_sport_id ${teamSportId} → ${mappedName}`,
                );
                return mappedName;
              } else {
                console.warn(
                  `⚠️ team_sport_id ${teamSportId} not found in mapping, fallback to ID`,
                );
                return teamSportId.toString();
              }
            }

            // 2. Sinon, utiliser team_source (qui peut être un nom ou un code comme "WQ1")
            if (teamSource) {
              console.log(`📝 Using team_source: ${teamSource}`);
              return teamSource;
            }

            // 3. Dernier recours
            console.warn(
              `⚠️ No team_sport_id or team_source for match ${m.id}`,
            );
            return "À définir";
          };

          const teamAValue = resolveTeamName(
            m.team_sport_a_id,
            m.team_a_source,
          );
          const teamBValue = resolveTeamName(
            m.team_sport_b_id,
            m.team_b_source,
          );

          // Extraire date et time depuis scheduled_datetime ou les champs directs
          let matchDate = m.date || "";
          let matchTime = m.time || "";
          if (m.scheduled_datetime) {
            const parts = m.scheduled_datetime.split("T");
            matchDate = parts[0] || matchDate;
            matchTime = parts[1]?.slice(0, 5) || matchTime;
          }

          return {
            id: m.id?.toString() || "",
            label: m.label || `Match ${m.match_order || ""}`,
            teamA: teamAValue,
            teamB: teamBValue,
            type: type,
            status:
              m.status === "upcoming"
                ? "planifié"
                : m.status === "in_progress"
                  ? "en-cours"
                  : m.status === "completed"
                    ? "terminé"
                    : "planifié",
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
        if (data.qualification_matches)
          data.qualification_matches.forEach((m: any) =>
            collected.push(mapMatch(m, "qualifications")),
          );

        // ✅ Charger aussi les informations des poules
        const poolsData: Pool[] = [];
        if (data.pools) {
          data.pools.forEach((p: any) => {
            const poolIdStr = p.id?.toString() || "";
            // Passer le poolId à mapMatch pour associer les matchs à leur poule
            p.matches?.forEach((m: any) =>
              collected.push(mapMatch(m, "poule", poolIdStr)),
            );

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
        if (data.bracket_matches)
          data.bracket_matches.forEach((m: any) => collected.push(mapMatch(m)));
        if (data.loser_bracket_matches)
          data.loser_bracket_matches.forEach((m: any) =>
            collected.push(mapMatch(m, "loser-bracket")),
          );

        setMatches(collected);

        // --- INSERTION DE LA LOGIQUE DE PROPAGATION AUTOMATIQUE ---
        // Si au moins un match est terminé, on demande au backend de mettre à jour les suivants
        const hasCompletedMatches = collected.some(
          (m) => m.status === "terminé",
        );

        if (hasCompletedMatches) {
          console.log("🔄 Propagation automatique des résultats...");
          const propagateRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/propagate-results`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            },
          );

          if (propagateRes.ok) {
            const propData = await propagateRes.json();
            // Si des matchs ont effectivement été modifiés, on recharge la structure
            if (propData.data?.propagated_matches > 0) {
              console.log(
                `✅ ${propData.data.propagated_matches} matchs mis à jour. Rechargement...`,
              );

              const refreshRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/structure`,
              );
              const refreshData = await refreshRes.json();
              const newData = refreshData.data || refreshData;

              // Créer une nouvelle fonction mapMatch avec le mapping mis à jour
              const mapMatchRefresh = (
                m: any,
                forcedType?: TournamentMatchType,
                poolId?: string,
              ): TournamentMatch => {
                let type: TournamentMatchType = forcedType || "qualifications";
                if (!forcedType) {
                  if (m.match_type === "qualification") type = "qualifications";
                  else if (m.match_type === "pool" || m.match_type === "poule")
                    type = "poule";
                  // Vérifier si bracket_type contient "loser" (ex: "loser", "loser_round_1", etc.)
                  else if (m.bracket_type && m.bracket_type.includes("loser"))
                    type = "loser-bracket";
                  else if (m.match_type === "bracket") {
                    if (m.bracket_type === "quarterfinal") type = "quarts";
                    else if (m.bracket_type === "semifinal")
                      type = "demi-finale";
                    else if (m.bracket_type === "final") type = "finale";
                    else if (m.bracket_type === "third_place")
                      type = "petite-finale";
                    else type = "quarts";
                  }
                }

                // Même logique de résolution que mapMatch
                const resolveTeamNameRefresh = (
                  teamSportId: number | null | undefined,
                  teamSource: string | null | undefined,
                ): string => {
                  if (teamSportId) {
                    const mappedName = teamSportIdToName[teamSportId];
                    if (mappedName) return mappedName;
                    return teamSportId.toString();
                  }
                  if (teamSource) return teamSource;
                  return "À définir";
                };

                const teamAValue = resolveTeamNameRefresh(
                  m.team_sport_a_id,
                  m.team_a_source,
                );
                const teamBValue = resolveTeamNameRefresh(
                  m.team_sport_b_id,
                  m.team_b_source,
                );

                // Extraire date et time depuis scheduled_datetime ou les champs directs
                let matchDate = m.date || "";
                let matchTime = m.time || "";
                if (m.scheduled_datetime) {
                  const parts = m.scheduled_datetime.split("T");
                  matchDate = parts[0] || matchDate;
                  matchTime = parts[1]?.slice(0, 5) || matchTime;
                }

                return {
                  id: m.id?.toString() || "",
                  label: m.label || `Match ${m.match_order || ""}`,
                  teamA: teamAValue,
                  teamB: teamBValue,
                  type: type,
                  status:
                    m.status === "upcoming"
                      ? "planifié"
                      : m.status === "in_progress"
                        ? "en-cours"
                        : m.status === "completed"
                          ? "terminé"
                          : "planifié",
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
              if (newData.qualification_matches)
                newData.qualification_matches.forEach((m: any) =>
                  refreshed.push(mapMatchRefresh(m, "qualifications")),
                );
              if (newData.pools)
                newData.pools.forEach((p: any) => {
                  const pId = p.id?.toString() || "";
                  p.matches?.forEach((m: any) =>
                    refreshed.push(mapMatchRefresh(m, "poule", pId)),
                  );
                });
              if (newData.bracket_matches)
                newData.bracket_matches.forEach((m: any) =>
                  refreshed.push(mapMatchRefresh(m)),
                );
              if (newData.loser_bracket_matches)
                newData.loser_bracket_matches.forEach((m: any) =>
                  refreshed.push(mapMatchRefresh(m, "loser-bracket")),
                );

              setMatches(refreshed);
              setTournamentMatches(
                refreshed as unknown as TournamentLogicMatch[],
              );
            }
          }
        } else {
          setTournamentMatches(collected as unknown as TournamentLogicMatch[]);
        }
        // --- FIN DE LA LOGIQUE DE PROPAGATION ---
        isInitialLoadRef.current = false;
      } catch (err) {
        console.error("❌ Erreur:", err);
        if (!isSilentRefresh) {
          setError("Erreur de chargement.");
        }
      }
    };

    loadTournamentMatches();
  }, [params, teamSportIdToName, autoRefreshKey]);

  // Rafraîchissement automatique toutes les 30s pour détecter les changements de statut
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // États pour stocker les rankings
  const [poolRankings, setPoolRankings] = useState<Map<string, RankingEntry[]>>(
    new Map(),
  );
  const [finalRanking, setFinalRanking] = useState<RankingEntry[]>([]);

  // État pour stocker les scores live SSE
  const [liveScores, setLiveScores] = useState<Map<number, LiveScoreData>>(
    new Map(),
  );

  // Extraire les IDs des matchs en cours pour SSE
  const inProgressMatchIds = useMemo(() => {
    return matches
      .filter((m) => m.status === "en-cours")
      .map((m) => parseInt(m.id))
      .filter((id) => !isNaN(id));
  }, [matches]);

  // SSE pour les scores en temps réel
  const { scores: sseScores, connectionState } = useMatchSSE({
    matchIds: inProgressMatchIds,
    enabled: inProgressMatchIds.length > 0,
    onScoreUpdate: (data) => {
      console.log("[Tournament] SSE score update:", data);
      setLiveScores((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.match_id, data);
        return newMap;
      });

      // Accumuler les événements live depuis le champ lastGoal de l'SSE
      const lastGoal = data.data?.lastGoal as
        | {
            event_type: "goal" | "yellow_card" | "red_card";
            minute: number | null;
            playerNumber: number | null;
            playerName: string | null;
            teamName: string;
            team: "A" | "B";
            timestamp: string;
          }
        | null
        | undefined;

      if (lastGoal?.timestamp && lastGoal?.event_type) {
        // Nouvel event : accumuler si pas déjà présent
        setLiveMatchEvents((prev) => {
          const existing = prev.get(data.match_id) ?? [];
          if (existing.some((e) => e.timestamp === lastGoal.timestamp))
            return prev;
          const newMap = new Map(prev);
          newMap.set(data.match_id, [
            ...existing,
            {
              matchId: data.match_id,
              event_type: lastGoal.event_type,
              minute: lastGoal.minute ?? null,
              playerNumber: lastGoal.playerNumber ?? null,
              playerName: lastGoal.playerName ?? null,
              teamName: lastGoal.teamName ?? "",
              team: lastGoal.team ?? "A",
              timestamp: lastGoal.timestamp,
            },
          ]);
          return newMap;
        });
      } else if (!lastGoal) {
        // lastGoal null = l'admin a réinitialisé les events → vider le cache public
        setLiveMatchEvents((prev) => {
          if (!prev.has(data.match_id)) return prev;
          const newMap = new Map(prev);
          newMap.delete(data.match_id);
          return newMap;
        });
      }
    },
  });

  // Nettoyer liveMatchEvents pour les matchs qui ne sont plus "en-cours"
  useEffect(() => {
    setLiveMatchEvents((prev) => {
      const activeIds = new Set(inProgressMatchIds);
      let changed = false;
      const newMap = new Map(prev);
      for (const key of newMap.keys()) {
        if (!activeIds.has(key)) {
          newMap.delete(key);
          changed = true;
        }
      }
      return changed ? newMap : prev;
    });
  }, [inProgressMatchIds]);

  // Fonction pour obtenir le score live d'un match
  const getLiveScore = (matchId: string) => {
    const numId = parseInt(matchId);
    if (isNaN(numId)) return null;
    return liveScores.get(numId) || sseScores.get(numId);
  };

  // Formater les secondes en MM:SS pour l'affichage des événements
  const formatMatchTime = (seconds: number | null | undefined): string => {
    if (seconds == null) return "?";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Formater le nom d'un joueur avec numéro de maillot
  const formatPlayerName = (player: MatchEvent["player"]): string => {
    if (!player) return "Joueur inconnu";
    const parts = [player.first_name, player.last_name].filter(Boolean);
    const name = parts.join(" ") || "Joueur inconnu";
    return player.jersey_number != null
      ? `#${player.jersey_number} ${name}`
      : name;
  };

  // Ouvrir le modal de détail d'un match
  const openMatchDetail = async (match: TournamentMatch) => {
    setSelectedMatch(match);
    setModalTab("events");
    setModalLoading(true);
    setModalPlayers([]);
    setModalEvents([]);
    try {
      // Toujours charger les joueurs
      const playersRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/matches/${match.id}/players`,
      );
      if (playersRes.ok) {
        const d = await playersRes.json();
        setModalPlayers(d.data || []);
      }

      // Events API uniquement pour les matchs terminés.
      // Pour les matchs en cours, les events sont en mémoire côté admin
      // et arriveron via SSE dans liveMatchEvents.
      if (match.status !== "en-cours") {
        const eventsRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/matches/${match.id}/events`,
        );
        if (eventsRes.ok) {
          const d = await eventsRes.json();
          setModalEvents(d.data || []);
        }
      }
    } finally {
      setModalLoading(false);
    }
  };

  // Générer le classement des poules avec les vrais résultats
  const generatePoolRankings = () => {
    const newPoolRankings = new Map<string, RankingEntry[]>();

    pools.forEach((pool) => {
      // 1. On récupère les matchs de cette poule via poolId (plus fiable que le label)
      const poolMatches = matches.filter(
        (m) => m.type === "poule" && m.poolId === pool.id,
      );

      console.log(
        `🏆 Pool "${pool.name}" (id: ${pool.id}): ${poolMatches.length} matchs trouvés`,
      );

      const stats: Record<string, RankingEntry> = {};

      // 2. Initialiser les équipes de la poule à partir des matchs
      const teamsInPool = Array.from(
        new Set(poolMatches.flatMap((m) => [m.teamA, m.teamB])),
      ).filter((t) => t && t !== "À définir" && t !== "En attente");

      teamsInPool.forEach((teamName) => {
        stats[teamName] = {
          position: 0,
          team: teamName,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          points: 0,
          scoreDiff: 0,
        };
      });

      // 3. Calcul des points (3 victoire, 1 nul, 0 défaite)
      poolMatches.forEach((m) => {
        if (
          m.status !== "terminé" ||
          m.scoreA === undefined ||
          m.scoreB === undefined
        )
          return;

        const { teamA, teamB, scoreA, scoreB } = m;
        if (!stats[teamA] || !stats[teamB]) return;

        stats[teamA].played++;
        stats[teamB].played++;
        stats[teamA].scoreDiff =
          (stats[teamA].scoreDiff || 0) + (scoreA - scoreB);
        stats[teamB].scoreDiff =
          (stats[teamB].scoreDiff || 0) + (scoreB - scoreA);

        if (scoreA > scoreB) {
          stats[teamA].points += 3;
          stats[teamA].won++;
          stats[teamB].lost++;
          console.log(
            `  ✅ ${teamA} bat ${teamB} (${scoreA}-${scoreB}) → ${teamA} +3 pts`,
          );
        } else if (scoreB > scoreA) {
          stats[teamB].points += 3;
          stats[teamB].won++;
          stats[teamA].lost++;
          console.log(
            `  ✅ ${teamB} bat ${teamA} (${scoreB}-${scoreA}) → ${teamB} +3 pts`,
          );
        } else {
          stats[teamA].points += 1;
          stats[teamB].points += 1;
          stats[teamA].drawn++;
          stats[teamB].drawn++;
          console.log(
            `  🤝 Match nul ${teamA} vs ${teamB} (${scoreA}-${scoreB}) → +1 pt chacun`,
          );
        }
      });

      // 4. Tri par points puis différence de buts/scores
      const sorted = Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return (b.scoreDiff || 0) - (a.scoreDiff || 0);
      });

      sorted.forEach((e, i) => (e.position = i + 1));
      newPoolRankings.set(pool.name, sorted);

      console.log(
        `📊 Classement ${pool.name}:`,
        sorted.map((s) => `${s.position}. ${s.team} (${s.points} pts)`),
      );
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
      if (!params.id || typeof params.id !== "string") return;

      try {
        // Récupérer le tournoi
        const tournamentsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/tournaments?sport_id=${params.id}`,
        );
        const tournamentsData = await tournamentsResponse.json();
        const items = tournamentsData.data?.items || [];
        const tournament = items.length > 0 ? items[0] : null;

        if (!tournament) return;

        // Récupérer le classement final depuis l'API
        const rankingResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournament.id}/final-ranking`,
        );
        if (!rankingResponse.ok) {
          console.warn("Impossible de charger le classement final");
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
        console.error("Erreur lors du chargement du classement final:", err);
      }
    };

    loadFinalRanking();
  }, [params.id, matches]);

  // Fermer le modal avec la touche Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedMatch(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-8">
      {/* Header avec bouton retour, titre et menu 3 points */}
      <header className="w-full max-w-6xl mb-8">
        <div className="flex items-center justify-between">
          {/* Bouton retour */}
          <button
            onClick={() => router.push("/tournois")}
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
          </div>
        </div>
      </header>

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

            {matches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  Aucun match programmé pour le moment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...matches]
                  .sort((a, b) => {
                    // Trier par date et heure (les plus proches en premier)
                    const dateTimeA =
                      a.date && a.time ? new Date(`${a.date}T${a.time}`) : null;
                    const dateTimeB =
                      b.date && b.time ? new Date(`${b.date}T${b.time}`) : null;

                    // Les matchs sans date vont à la fin
                    if (!dateTimeA && !dateTimeB) return 0;
                    if (!dateTimeA) return 1;
                    if (!dateTimeB) return -1;

                    return dateTimeA.getTime() - dateTimeB.getTime();
                  })
                  .map((match) => {
                    const liveData = getLiveScore(match.id);
                    const isEnCours = match.status === "en-cours";
                    const isSetSport = sport?.score_type === "sets";

                    // Use live scores if available
                    const displayScoreA =
                      isEnCours && liveData
                        ? (liveData.data?.score1 ??
                          liveData.data?.scoreA ??
                          match.scoreA ??
                          0)
                        : (match.scoreA ?? 0);
                    const displayScoreB =
                      isEnCours && liveData
                        ? (liveData.data?.score2 ??
                          liveData.data?.scoreB ??
                          match.scoreB ??
                          0)
                        : (match.scoreB ?? 0);

                    // Sets pour les sports à sets (volleyball, badminton, etc.)
                    const displaySets1 =
                      isSetSport && isEnCours && liveData
                        ? (liveData.data?.sets1 ?? null)
                        : null;
                    const displaySets2 =
                      isSetSport && isEnCours && liveData
                        ? (liveData.data?.sets2 ?? null)
                        : null;

                    return (
                      <div
                        key={match.id}
                        onClick={() => openMatchDetail(match)}
                        className={`relative border rounded-xl p-4 shadow-sm flex flex-col gap-2 transition-all bg-white cursor-pointer hover:shadow-md ${isEnCours ? "border-green-300 ring-2 ring-green-100" : "border-gray-200"}`}
                      >
                        {/* Badge de statut et type */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 text-[10px] font-medium rounded-full ${getMatchTypeBadge(
                                match.type,
                              )}`}
                            >
                              {match.type === "qualifications"
                                ? "Qualifs"
                                : match.type}
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
                          <div className="flex items-center gap-1">
                            <span
                              className={`px-2 py-1 text-[10px] font-medium rounded-full ${getMatchStatusBadge(
                                match.status,
                              )}`}
                            >
                              {match.status}
                            </span>
                          </div>
                        </div>

                        {/* Contenu principal : Équipes et Scores */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm font-medium text-black">
                            {/* Équipe A */}
                            <span
                              className={`flex-1 text-left ${(match.status === "terminé" || isEnCours) && displayScoreA > displayScoreB ? "font-bold text-black" : "text-gray-700"}`}
                            >
                              {formatTeamName(
                                match.teamA,
                                tournamentMatches,
                                tournamentPools,
                                tournamentBrackets,
                                tournamentLoserBrackets,
                              )}
                            </span>

                            {/* Score central */}
                            <div className="flex flex-col items-center justify-center min-w-[90px] px-2 gap-1">
                              {match.status === "planifié" ? (
                                <span className="text-gray-400 font-bold text-lg">
                                  0 - 0
                                </span>
                              ) : isSetSport ? (
                                <>
                                  {/* Affichage sets */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                                      Sets
                                    </span>
                                  </div>
                                  <div
                                    className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${isEnCours ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"}`}
                                  >
                                    <span
                                      className={`text-lg font-bold ${(match.scoreA ?? 0) > (match.scoreB ?? 0) ? "text-black" : "text-gray-500"}`}
                                    >
                                      {isEnCours && displaySets1 != null
                                        ? displaySets1
                                        : (match.scoreA ?? 0)}
                                    </span>
                                    <span className="text-gray-300 text-xs">
                                      -
                                    </span>
                                    <span
                                      className={`text-lg font-bold ${(match.scoreB ?? 0) > (match.scoreA ?? 0) ? "text-black" : "text-gray-500"}`}
                                    >
                                      {isEnCours && displaySets2 != null
                                        ? displaySets2
                                        : (match.scoreB ?? 0)}
                                    </span>
                                  </div>
                                  {/* Points du set en cours (seulement si live) */}
                                  {isEnCours && (
                                    <div className="flex items-center gap-1 bg-green-100 border border-green-200 px-2 py-0.5 rounded">
                                      <span className="text-sm font-semibold text-green-800">
                                        {displayScoreA}
                                      </span>
                                      <span className="text-green-400 text-xs">
                                        :
                                      </span>
                                      <span className="text-sm font-semibold text-green-800">
                                        {displayScoreB}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div
                                  className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${isEnCours ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"}`}
                                >
                                  <span
                                    className={`text-lg ${displayScoreA > displayScoreB ? "font-bold text-black" : "text-gray-600"}`}
                                  >
                                    {displayScoreA}
                                  </span>
                                  <span className="text-gray-300 text-xs">
                                    :
                                  </span>
                                  <span
                                    className={`text-lg ${displayScoreB > displayScoreA ? "font-bold text-black" : "text-gray-600"}`}
                                  >
                                    {displayScoreB}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Équipe B */}
                            <span
                              className={`flex-1 text-right ${(match.status === "terminé" || isEnCours) && displayScoreB > displayScoreA ? "font-bold text-black" : "text-gray-700"}`}
                            >
                              {formatTeamName(
                                match.teamB,
                                tournamentMatches,
                                tournamentPools,
                                tournamentBrackets,
                                tournamentLoserBrackets,
                              )}
                            </span>
                          </div>

                          {/* Chrono live sur la carte */}
                          {isEnCours && liveData?.data?.chrono && (
                            <div className="flex justify-center mt-1 mb-1">
                              <div className="flex items-center gap-1 bg-gray-900 text-white px-2 py-0.5 rounded-full text-[10px] font-mono">
                                <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                                {liveData.data.chrono as string}
                              </div>
                            </div>
                          )}

                          {/* Informations complémentaires : Date, Heure, Terrain */}
                          {(match.date || match.time || match.court) && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2 items-center justify-center">
                              {match.court && (
                                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                  </svg>
                                  {match.court}
                                </span>
                              )}
                              {match.date && (
                                <span className="flex items-center gap-1 text-gray-500 text-[10px]">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  {match.date}
                                </span>
                              )}
                              {match.time && (
                                <span className="flex items-center gap-1 text-gray-500 text-[10px]">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  {match.time}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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
              <h2 className="text-xl font-semibold text-black">Classements</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setRankingFilter("poules")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${rankingFilter === "poules" ? "bg-purple-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"} ${pools.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={pools.length === 0}
                >
                  Classements de poules
                </button>
                <button
                  onClick={() => setRankingFilter("final")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${rankingFilter === "final" ? "bg-yellow-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"}`}
                >
                  Classement final
                </button>
              </div>
            </div>

            {/* Affichage des classements de poules */}
            {rankingFilter === "poules" && pools.length > 0 && (
              <div className="space-y-6">
                {Array.from(poolRankings.entries()).map(
                  ([poolName, ranking]) => {
                    const pool = pools.find((p) => p.name === poolName);
                    const qualifiedToFinals = pool?.qualifiedToFinals || 0;
                    const qualifiedToLoserBracket =
                      pool?.qualifiedToLoserBracket || 0;

                    return (
                      <div
                        key={poolName}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                          <h3 className="font-semibold text-black">
                            {poolName}
                          </h3>
                          <div className="flex flex-wrap gap-4 mt-1 text-xs text-black">
                            {qualifiedToFinals > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-green-100 border border-green-400 rounded"></span>
                                {qualifiedToFinals} qualifié
                                {qualifiedToFinals > 1 ? "s" : ""} phase finale
                              </span>
                            )}
                            {qualifiedToLoserBracket > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-orange-100 border border-orange-400 rounded"></span>
                                {qualifiedToLoserBracket} qualifié
                                {qualifiedToLoserBracket > 1 ? "s" : ""} loser
                                bracket
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
                                  bgColor =
                                    "bg-green-50 hover:bg-green-100 border-l-4 border-green-500";
                                } else if (
                                  entry.position <=
                                  qualifiedToFinals + qualifiedToLoserBracket
                                ) {
                                  bgColor =
                                    "bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-500";
                                } else if (entry.position === 3) {
                                  // Meilleur 3ème - couleur bleue pour indiquer qu'il peut être repêché
                                  bgColor =
                                    "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500";
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
                                      {entry.scoreDiff !== undefined
                                        ? entry.scoreDiff > 0
                                          ? `+${entry.scoreDiff}`
                                          : entry.scoreDiff
                                        : "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}

            {/* Affichage du classement final */}
            {rankingFilter === "final" && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-100">
                  <h3 className="font-semibold text-red-600">
                    Classement Final du Tournoi
                  </h3>
                  <p className="text-xs text-black mt-1">
                    Points cumulés de toutes les phases (qualifs, brackets,
                    finales)
                  </p>
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
                              entry.position === 1
                                ? "bg-yellow-50"
                                : entry.position === 2
                                  ? "bg-gray-100"
                                  : entry.position === 3
                                    ? "bg-orange-50"
                                    : ""
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
                              {entry.scoreDiff !== undefined
                                ? entry.scoreDiff > 0
                                  ? `+${entry.scoreDiff}`
                                  : entry.scoreDiff
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-blue-600 text-lg">
                              {entry.points}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-8 text-center text-black"
                          >
                            Aucun résultat pour le moment.
                            <br />
                            <span className="text-xs text-gray-500">
                              Les points apparaîtront quand les matchs seront
                              terminés.
                            </span>
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

      {/* Modal de détail du match */}
      {selectedMatch &&
        (() => {
          const liveData = getLiveScore(selectedMatch.id);
          const isEnCours = selectedMatch.status === "en-cours";
          const isSetSport = sport?.score_type === "sets";

          const modalScoreA =
            isEnCours && liveData
              ? (liveData.data?.score1 ??
                liveData.data?.scoreA ??
                selectedMatch.scoreA ??
                0)
              : (selectedMatch.scoreA ?? 0);
          const modalScoreB =
            isEnCours && liveData
              ? (liveData.data?.score2 ??
                liveData.data?.scoreB ??
                selectedMatch.scoreB ??
                0)
              : (selectedMatch.scoreB ?? 0);
          const modalSets1 =
            isSetSport && isEnCours && liveData
              ? (liveData.data?.sets1 ?? null)
              : null;
          const modalSets2 =
            isSetSport && isEnCours && liveData
              ? (liveData.data?.sets2 ?? null)
              : null;

          const teamAName = formatTeamName(
            selectedMatch.teamA,
            tournamentMatches,
            tournamentPools,
            tournamentBrackets,
            tournamentLoserBrackets,
          );
          const teamBName = formatTeamName(
            selectedMatch.teamB,
            tournamentMatches,
            tournamentPools,
            tournamentBrackets,
            tournamentLoserBrackets,
          );

          const playersA = modalPlayers.filter((p) => p.team === "A");
          const playersB = modalPlayers.filter((p) => p.team === "B");

          return (
            <div
              className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setSelectedMatch(null)}
            >
              <div
                className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* En-tête du modal */}
                <div
                  className={`px-5 pt-5 pb-4 ${isEnCours ? "bg-gradient-to-br from-green-50 to-white" : "bg-white"}`}
                >
                  {/* Barre de fermeture + badges */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-1 text-[10px] font-medium rounded-full ${getMatchTypeBadge(selectedMatch.type)}`}
                      >
                        {selectedMatch.type === "qualifications"
                          ? "Qualifs"
                          : selectedMatch.type}
                      </span>
                      {selectedMatch.label && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-700">
                          {selectedMatch.label}
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-[10px] font-medium rounded-full flex items-center gap-1 ${getMatchStatusBadge(selectedMatch.status)}`}
                      >
                        {isEnCours && (
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                        )}
                        {selectedMatch.status}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedMatch(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors ml-2 flex-shrink-0"
                      aria-label="Fermer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Score principal */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Équipe A */}
                    <div className="flex-1 text-left">
                      <p
                        className={`text-sm font-bold leading-tight ${selectedMatch.status !== "planifié" && modalScoreA > modalScoreB ? "text-black" : "text-gray-600"}`}
                      >
                        {teamAName}
                      </p>
                    </div>

                    {/* Zone score */}
                    <div className="flex flex-col items-center gap-1">
                      {selectedMatch.status === "planifié" ? (
                        <span className="text-2xl font-bold text-gray-300">
                          VS
                        </span>
                      ) : isSetSport ? (
                        <>
                          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                            Sets
                          </div>
                          <div
                            className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${isEnCours ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"}`}
                          >
                            <span
                              className={`text-2xl font-bold ${(selectedMatch.scoreA ?? 0) >= (selectedMatch.scoreB ?? 0) ? "text-black" : "text-gray-400"}`}
                            >
                              {modalSets1 != null
                                ? modalSets1
                                : (selectedMatch.scoreA ?? 0)}
                            </span>
                            <span className="text-gray-300">-</span>
                            <span
                              className={`text-2xl font-bold ${(selectedMatch.scoreB ?? 0) > (selectedMatch.scoreA ?? 0) ? "text-black" : "text-gray-400"}`}
                            >
                              {modalSets2 != null
                                ? modalSets2
                                : (selectedMatch.scoreB ?? 0)}
                            </span>
                          </div>
                          {isEnCours && (
                            <div className="flex items-center gap-2 bg-green-100 border border-green-200 px-3 py-1 rounded-lg">
                              <span className="text-base font-semibold text-green-800">
                                {modalScoreA}
                              </span>
                              <span className="text-green-400 text-xs font-bold">
                                :
                              </span>
                              <span className="text-base font-semibold text-green-800">
                                {modalScoreB}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div
                          className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${isEnCours ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"}`}
                        >
                          <span
                            className={`text-2xl font-bold ${modalScoreA > modalScoreB ? "text-black" : "text-gray-400"}`}
                          >
                            {modalScoreA}
                          </span>
                          <span className="text-gray-300">:</span>
                          <span
                            className={`text-2xl font-bold ${modalScoreB > modalScoreA ? "text-black" : "text-gray-400"}`}
                          >
                            {modalScoreB}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Équipe B */}
                    <div className="flex-1 text-right">
                      <p
                        className={`text-sm font-bold leading-tight ${selectedMatch.status !== "planifié" && modalScoreB > modalScoreA ? "text-black" : "text-gray-600"}`}
                      >
                        {teamBName}
                      </p>
                    </div>
                  </div>

                  {/* Chrono live */}
                  {isEnCours && liveData?.data?.chrono && (
                    <div className="flex justify-center mt-2">
                      <div className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-mono">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        {liveData.data.chrono as string}
                      </div>
                    </div>
                  )}

                  {/* Infos terrain / date */}
                  {(selectedMatch.court ||
                    selectedMatch.date ||
                    selectedMatch.time) && (
                    <div className="flex flex-wrap gap-2 justify-center mt-3 pt-3 border-t border-gray-100">
                      {selectedMatch.court && (
                        <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {selectedMatch.court}
                        </span>
                      )}
                      {selectedMatch.date && (
                        <span className="flex items-center gap-1 text-gray-500 text-[10px]">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {selectedMatch.date}
                        </span>
                      )}
                      {selectedMatch.time && (
                        <span className="flex items-center gap-1 text-gray-500 text-[10px]">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {selectedMatch.time}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Onglets */}
                <div className="flex border-b border-gray-100 px-5">
                  <button
                    onClick={() => setModalTab("events")}
                    className={`flex items-center gap-1.5 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                      modalTab === "events"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Événements
                  </button>
                  <button
                    onClick={() => setModalTab("players")}
                    className={`flex items-center gap-1.5 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                      modalTab === "players"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Joueurs
                  </button>
                </div>

                {/* Contenu scrollable */}
                <div className="overflow-y-auto flex-1 p-5">
                  {modalLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : modalTab === "events" ? (
                    (() => {
                      // Pour un match en cours : events SSE accumulés en temps réel
                      // Pour un match terminé/planifié : events chargés depuis l'API
                      const matchNumId = parseInt(selectedMatch.id);
                      const sseEvents = !isNaN(matchNumId)
                        ? (liveMatchEvents.get(matchNumId) ?? []).filter(e => e.matchId === matchNumId)
                        : [];
                      const displayLiveEvents = isEnCours;

                      const eventIcon = (
                        type: "goal" | "yellow_card" | "red_card",
                      ) => {
                        if (type === "goal")
                          return (
                            <span className="text-xl flex-shrink-0">
                              {sport?.code === "football"
                                ? "⚽"
                                : sport?.code === "basketball"
                                  ? "🏀"
                                  : sport?.code === "handball"
                                    ? "🤾"
                                    : "🏆"}
                            </span>
                          );
                        if (type === "yellow_card")
                          return (
                            <span className="w-5 h-6 bg-yellow-400 rounded-sm flex-shrink-0 shadow-sm" />
                          );
                        return (
                          <span className="w-5 h-6 bg-red-500 rounded-sm flex-shrink-0 shadow-sm" />
                        );
                      };
                      const eventLabel = (
                        type: "goal" | "yellow_card" | "red_card",
                      ) =>
                        type === "goal"
                          ? "But"
                          : type === "yellow_card"
                            ? "Carton jaune"
                            : "Carton rouge";

                      if (displayLiveEvents) {
                        // Affichage des events SSE (match en cours)
                        return sseEvents.length === 0 ? (
                          <div className="text-center py-10">
                            <svg
                              className="w-12 h-12 text-gray-200 mx-auto mb-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            <p className="text-gray-400 text-sm">
                              Aucun événement pour le moment
                            </p>
                            <p className="text-gray-300 text-xs mt-1">
                              Les événements apparaissent en temps réel
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {[...sseEvents].reverse().map((event, i) => {
                              const isTeamA = event.team === "A";
                              return (
                                <div
                                  key={`${event.timestamp}-${i}`}
                                  className={`flex items-center gap-3 p-3 rounded-xl ${isTeamA ? "bg-blue-50" : "bg-orange-50"}`}
                                >
                                  {eventIcon(event.event_type)}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      {event.teamName}
                                    </p>
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {eventLabel(event.event_type)}
                                      {event.playerName && (
                                        <span className="text-gray-600 font-normal">
                                          {" — "}
                                          {event.playerNumber != null
                                            ? `#${event.playerNumber} `
                                            : ""}
                                          {event.playerName}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  {event.minute != null && (
                                    <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                                      {event.minute}&apos;
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      // Affichage des events API (match terminé ou planifié)
                      return modalEvents.length === 0 ? (
                        <div className="text-center py-10">
                          <svg
                            className="w-12 h-12 text-gray-200 mx-auto mb-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                          <p className="text-gray-400 text-sm">
                            Aucun événement enregistré
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {modalEvents.map((event) => {
                            const isTeamA = event.team === "A";
                            const eventTeamName = isTeamA
                              ? teamAName
                              : teamBName;
                            return (
                              <div
                                key={event.id}
                                className={`flex items-center gap-3 p-3 rounded-xl ${isTeamA ? "bg-blue-50" : "bg-orange-50"}`}
                              >
                                {eventIcon(event.event_type)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    {eventTeamName}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {eventLabel(event.event_type)}
                                    {event.player && (
                                      <span className="text-gray-600 font-normal">
                                        {" — "}
                                        {formatPlayerName(event.player)}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                {event.match_time_seconds != null && (
                                  <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                                    {formatMatchTime(event.match_time_seconds)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })() /* Onglet Joueurs */
                  ) : playersA.length === 0 && playersB.length === 0 ? (
                    <div className="text-center py-10">
                      <svg
                        className="w-12 h-12 text-gray-200 mx-auto mb-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <p className="text-gray-400 text-sm">
                        Aucun joueur enregistré
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Équipe A */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide truncate">
                            {teamAName}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          {playersA.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">
                              Aucun joueur
                            </p>
                          ) : (
                            playersA.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center gap-2 bg-blue-50 rounded-lg px-2.5 py-1.5"
                              >
                                <span className="text-xs font-mono font-bold text-blue-700 w-6 text-center flex-shrink-0">
                                  {p.jersey_number != null
                                    ? `#${p.jersey_number}`
                                    : "-"}
                                </span>
                                <span className="text-xs text-gray-800 truncate">
                                  {[p.first_name, p.last_name]
                                    .filter(Boolean)
                                    .join(" ") || "—"}
                                </span>
                                {p.is_captain && (
                                  <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1 rounded flex-shrink-0">
                                    C
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      {/* Équipe B */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide truncate">
                            {teamBName}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          {playersB.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">
                              Aucun joueur
                            </p>
                          ) : (
                            playersB.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center gap-2 bg-red-50 rounded-lg px-2.5 py-1.5"
                              >
                                <span className="text-xs font-mono font-bold text-red-700 w-6 text-center flex-shrink-0">
                                  {p.jersey_number != null
                                    ? `#${p.jersey_number}`
                                    : "-"}
                                </span>
                                <span className="text-xs text-gray-800 truncate">
                                  {[p.first_name, p.last_name]
                                    .filter(Boolean)
                                    .join(" ") || "—"}
                                </span>
                                {p.is_captain && (
                                  <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded flex-shrink-0">
                                    C
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </main>
  );
}
