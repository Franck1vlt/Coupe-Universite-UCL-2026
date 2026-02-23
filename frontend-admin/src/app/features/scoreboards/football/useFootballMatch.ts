import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { MatchData } from "./types";
import { submitMatchResultWithPropagation, updateMatchStatus as updateStatus } from "../common/useMatchPropagation";
import { useLiveScoreSync } from "../common/useLiveScoreSync";

export type MatchPlayer = {
  id: number;
  team_sport_id: number;
  team: "A" | "B";
  first_name?: string | null;
  last_name?: string | null;
  jersey_number?: number | null;
  is_captain: boolean;
  is_active: boolean;
};

// Événement local (en mémoire pendant le match, persisté en lot sur END)
export type LocalMatchEvent = {
  localId: number;
  team: "A" | "B";
  player_id?: number | null;
  match_time_seconds?: number | null;
  timestamp: string; // ISO, utilisé pour l'animation spectateur
  player?: {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    jersey_number?: number | null;
  } | null;
};

// Calcule la minute football : 45s → 1', 0s → 0'
const toMinute = (secs: number | null | undefined): number =>
    Math.ceil((secs ?? 0) / 60);

// Ajout du type tournamentId si besoin
type MatchDataWithTournament = MatchData & { tournamentId?: string | number; court?: string; numericId?: number };

export function useFootballMatch(initialMatchId: string | null) {
    const { data: session } = useSession();
    const token = (session as { accessToken?: string } | null)?.accessToken;
    const [matchData, setMatchData] = useState<MatchDataWithTournament>({
        matchId: initialMatchId || "",
        teamA: { name: "Team A", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        teamB: { name: "Team B", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        chrono: { time: 0, running: false, interval: null },
        hasPenalties: false,
        matchType: "",
        tournamentId: undefined
    });

    // Hook pour synchronisation live vers backend SSE
    const { sendLiveScore, cleanup: cleanupLiveScore } = useLiveScoreSync();

    const updateMatchStatus = async (status: 'scheduled' | 'in_progress' | 'completed') => {
        if (!initialMatchId) return;
        await updateStatus(initialMatchId, status, token);
    };

    const submitMatchResult = async () => {
        if (!initialMatchId) return;

        await submitMatchResultWithPropagation({
            matchId: initialMatchId,
            tournamentId: matchData.tournamentId,
            token,
            payload: {
                score_a: matchData.teamA.score,
                score_b: matchData.teamB.score,
                status: 'completed',
            },
            onSuccess: (propagationResult) => {
                if (propagationResult.propagatedMatches > 0) {
                    alert(`Match terminé !\n${propagationResult.propagatedMatches} match(s) propagé(s).`);
                } else {
                    alert('Match terminé !');
                }
            },
            onError: (error) => {
                console.error('[Football Hook] ❌ Error:', error);
                alert('Erreur lors de la fin du match : ' + error);
            },
        });
    };

    const intervalRef = useRef<number | null>(null);
    const [court, setCourt] = useState<string>("");

    // Événements locaux (en mémoire uniquement, persistés en lot sur END)
    const [players, setPlayers] = useState<MatchPlayer[]>([]);
    const [pendingEvents, setPendingEvents] = useState<LocalMatchEvent[]>([]);
    const pendingEventCounter = useRef(0);
    const [pendingGoalTeam, setPendingGoalTeam] = useState<"A" | "B" | null>(null);

    // UN SEUL useEffect pour récupérer les données du match
    useEffect(() => {
        if (!initialMatchId) return;

        async function fetchMatchData() {
            // Récupérer d'abord le statut du match
            try {
                const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}/status`);
                if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    console.log('[Football Hook] Current match status:', statusData.data?.status);
                }
            } catch (e) {
                console.error('[Football Hook] Erreur lors de la récupération du statut:', e);
            }
            try {
                console.log('[Football Hook] Fetching match data for matchId:', initialMatchId);

                // 1. Récupérer les données du match
                const matchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}`);
                if (!matchResponse.ok) {
                    console.error('[Football Hook] Match not found:', matchResponse.status);
                    throw new Error('Match not found');
                }
                const matchResult = await matchResponse.json();
                const match = matchResult.data;
                console.log('[Football Hook] Match data:', match);

                // 2. Récupérer les informations des équipes
                let teamAName = "Team A";
                let teamALogo = "";
                let teamBName = "Team B";
                let teamBLogo = "";

                // Équipe A
                if (match.team_sport_a_id) {
                    console.log('[Football Hook] Fetching team_sport_a:', match.team_sport_a_id);
                    const teamSportAResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team-sports/${match.team_sport_a_id}`);
                    if (teamSportAResponse.ok) {
                        const teamSportAData = await teamSportAResponse.json();
                        console.log('[Football Hook] TeamSport A data:', teamSportAData.data);
                        const teamAResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSportAData.data.team_id}`);
                        if (teamAResponse.ok) {
                            const teamAData = await teamAResponse.json();
                            teamAName = teamAData.data.name;
                            teamALogo = teamAData.data.logo_url || "";
                            console.log('[Football Hook] Team A:', teamAName);
                        }
                    }
                } else if (match.team_a_source) {
                    teamAName = match.team_a_source;
                    console.log('[Football Hook] Team A (source fallback):', teamAName);
                }

                // Équipe B
                if (match.team_sport_b_id) {
                    console.log('[Football Hook] Fetching team_sport_b:', match.team_sport_b_id);
                    const teamSportBResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team-sports/${match.team_sport_b_id}`);
                    if (teamSportBResponse.ok) {
                        const teamSportBData = await teamSportBResponse.json();
                        console.log('[Football Hook] TeamSport B data:', teamSportBData.data);
                        const teamBResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSportBData.data.team_id}`);
                        if (teamBResponse.ok) {
                            const teamBData = await teamBResponse.json();
                            teamBName = teamBData.data.name;
                            teamBLogo = teamBData.data.logo_url || "";
                            console.log('[Football Hook] Team B:', teamBName);
                        }
                    }
                } else if (match.team_b_source) {
                    teamBName = match.team_b_source;
                    console.log('[Football Hook] Team B (source fallback):', teamBName);
                }

                // 3. Récupérer les informations de planification (terrain)
                let courtName: string | undefined = undefined;
                console.log('[Football Hook] Fetching schedule for match:', initialMatchId);
                const scheduleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}/schedule`);
                console.log('[Football Hook] Schedule response status:', scheduleResponse.status);
                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    console.log('[Football Hook] Schedule data:', scheduleData.data);
                    if (scheduleData.data?.court_name) {
                        courtName = scheduleData.data.court_name;
                        setCourt(courtName ?? "");
                    }
                }

                // 4. Déterminer le type de match
                let matchType = "Match";
                if (match.match_type === "qualification") {
                    matchType = "Qualifications";
                } else if (match.match_type === "pool") {
                    matchType = "Poule";
                } else if (match.match_type === "bracket") {
                    if (match.bracket_type === "quarterfinal") matchType = "Quart de finale";
                    else if (match.bracket_type === "semifinal") matchType = "Demi-finale";
                    else if (match.bracket_type === "final") matchType = "Finale";
                    else if (match.bracket_type === "third_place") matchType = "Petite finale";
                    else matchType = match.label || "Bracket";
                } else if (match.match_type === "loser_bracket") {
                    matchType = match.label || "Repêchage";
                }

                console.log('[Football Hook] Final values - TeamA:', teamAName, 'TeamB:', teamBName, 'MatchType:', matchType, 'Court:', courtName);

                // 5. Mettre à jour le state avec les données récupérées
                setMatchData(prev => ({
                    ...prev,
                    teamA: { ...prev.teamA, name: teamAName, logo_url: teamALogo },
                    teamB: { ...prev.teamB, name: teamBName, logo_url: teamBLogo },
                    matchType: matchType,
                    tournamentId: match.tournament_id || match.tournamentId || undefined,
                    court: courtName,
                    numericId: match.id
                }));

                console.log('[Football Hook] Match data updated successfully');

            } catch (error) {
                console.error('[Football Hook] Error fetching match data:', error);
            }

            // Charger la fiche de match (joueurs uniquement — les événements sont en mémoire)
            try {
                const playersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}/players`);
                if (playersRes.ok) {
                    const playersData = await playersRes.json();
                    setPlayers(playersData.data || []);
                }
            } catch (e) {
                console.warn('[Football Hook] Erreur chargement joueurs:', e);
            }
        }

        fetchMatchData();
    }, [initialMatchId]);

    // Helper to get the correct team key
    function teamKey(team: "A" | "B"): "teamA" | "teamB" {
        return team === "A" ? "teamA" : "teamB";
    }

    /** ---------- CHRONO ---------- */
    const [formattedTime, setFormattedTime] = useState<string>("00:00");
    function formatChrono(time: number): string {
        const min = Math.floor(time / 60);
        const sec = time % 60;
        return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    }
    useEffect(() => {
        setFormattedTime(formatChrono(matchData.chrono.time));
    }, [matchData.chrono.time]);

    const startChrono = () => {
        if (matchData.chrono.running) return;
        updateMatchStatus('in_progress');
        setMatchData((prev) => ({
            ...prev,
            chrono: { ...prev.chrono, running: true }
        }));
        intervalRef.current = window.setInterval(() => {
            setMatchData((prev) => ({
                ...prev,
                chrono: { ...prev.chrono, time: prev.chrono.time + 1 }
            }));
        }, 1000);
    };

    const stopChrono = () => {
        setMatchData((prev) => ({
            ...prev,
            chrono: { ...prev.chrono, running: false }
        }));
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const handleEnd = async () => {
        stopChrono();

        // Détermination du vainqueur
        let winner = undefined;
        if (matchData.teamA.score > matchData.teamB.score) {
            winner = matchData.teamA.name || "ÉQUIPE A";
        } else if (matchData.teamB.score > matchData.teamA.score) {
            winner = matchData.teamB.name || "ÉQUIPE B";
        }

        // Met à jour le localStorage avec le vainqueur
        try {
            const payload = {
                team1: matchData.teamA.name || "ÉQUIPE A",
                team2: matchData.teamB.name || "ÉQUIPE B",
                matchType: matchData.matchType || "Match",
                court: matchData.court || court || "Terrain",
                score1: matchData.teamA.score,
                score2: matchData.teamB.score,
                yellowCards1: Math.max(0, matchData.teamA.yellowCards),
                yellowCards2: Math.max(0, matchData.teamB.yellowCards),
                redCards1: Math.max(0, matchData.teamA.redCards),
                redCards2: Math.max(0, matchData.teamB.redCards),
                chrono: formattedTime,
                lastUpdate: new Date().toISOString(),
                winner,
            };
            localStorage.setItem("liveFootballMatch", JSON.stringify(payload));
            if (initialMatchId) {
                localStorage.setItem(`liveFootballMatch_${initialMatchId}`, JSON.stringify(payload));
            }
        } catch (e) {
            // Ignore storage errors
        }

        // 1. Soumettre le résultat du match (score + statut)
        await submitMatchResult();

        // 2. Persister les événements en lot — uniquement si END est pressé
        const currentPendingEvents = pendingEvents; // snapshot au moment du END
        if (currentPendingEvents.length > 0) {
            const matchId = matchData.numericId?.toString() || initialMatchId;
            if (matchId) {
                try {
                    await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/matches/${matchId}/events/batch`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify(
                                currentPendingEvents.map(e => ({
                                    team: e.team,
                                    player_id: e.player_id ?? null,
                                    match_time_seconds: e.match_time_seconds ?? null,
                                }))
                            ),
                        }
                    );
                } catch (e) {
                    console.error('[Football Hook] Erreur sauvegarde événements batch:', e);
                }
            }
        }
    };

    /** ---------- POINTS / BUTS ---------- */

    const addPoint = (team: "A" | "B") => {
        const teamPlayers = players.filter(p => p.team === team);
        if (teamPlayers.length > 0) {
            // Ouvrir le modal de sélection du buteur
            setPendingGoalTeam(team);
        } else {
            // Comportement direct si aucun roster configuré
            setMatchData((p: MatchDataWithTournament) => {
                const k = teamKey(team);
                return { ...p, [k]: { ...p[k], score: p[k].score + 1 } };
            });
        }
    };

    const cancelGoalModal = () => setPendingGoalTeam(null);

    const confirmGoal = (playerId?: number) => {
        if (!pendingGoalTeam) return;
        const team = pendingGoalTeam;
        setPendingGoalTeam(null);

        // Chercher les infos du joueur dans le roster
        const player = playerId ? players.find(p => p.id === playerId) ?? null : null;

        // Ajouter l'événement en mémoire locale (pas d'appel API)
        const localId = ++pendingEventCounter.current;
        setPendingEvents(prev => [...prev, {
            localId,
            team,
            player_id: player?.id ?? null,
            match_time_seconds: matchData.chrono.time,
            timestamp: new Date().toISOString(),
            player: player ? {
                id: player.id,
                first_name: player.first_name,
                last_name: player.last_name,
                jersey_number: player.jersey_number,
            } : null,
        }]);

        // Incrémenter le score localement
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return { ...p, [k]: { ...p[k], score: p[k].score + 1 } };
        });
    };

    const subPoint = (team: "A" | "B") => {
        // Supprimer le dernier événement local de cette équipe
        setPendingEvents(prev => {
            const lastIdx = [...prev].map((e, i) => ({ e, i }))
                .filter(({ e }) => e.team === team)
                .pop()?.i ?? -1;
            return lastIdx === -1 ? prev : prev.filter((_, i) => i !== lastIdx);
        });

        // Décrémenter le score localement
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return { ...p, [k]: { ...p[k], score: Math.max(0, p[k].score - 1) } };
        });
    };

    /** ---------- CARTONS ---------- */
    const addYellowCard = (team: "A" | "B") =>
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return { ...p, [k]: { ...p[k], yellowCards: p[k].yellowCards + 1 } };
        });

    const subYellowCard = (team: "A" | "B") =>
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return { ...p, [k]: { ...p[k], yellowCards: Math.max(0, p[k].yellowCards - 1) } };
        });

    const addRedCard = (team: "A" | "B") =>
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return { ...p, [k]: { ...p[k], redCards: p[k].redCards + 1 } };
        });

    const subRedCard = (team: "A" | "B") =>
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return { ...p, [k]: { ...p[k], redCards: Math.max(0, p[k].redCards - 1) } };
        });

    /** ---------- METADATA UPDATES ---------- */
    const setTeamName = (team: "A" | "B", name: string) =>
        setMatchData((p: MatchDataWithTournament) => ({
            ...p,
            [`team${team}`]: { ...p[`team${team}` as "teamA" | "teamB"], name },
        }));

    const setTeamLogo = (team: "A" | "B", logo_url: string) =>
        setMatchData((p: MatchDataWithTournament) => ({
            ...p,
            [`team${team}`]: { ...p[`team${team}` as "teamA" | "teamB"], logo_url },
        }));

    const setMatchType = (type: string) =>
        setMatchData((p: MatchDataWithTournament) => ({ ...p, matchType: type }));

    /** ---------- SYNC TO LOCAL STORAGE + BACKEND SSE ---------- */
    useEffect(() => {
        try {
            // Construire la liste des événements pour les spectateurs (minutes arrondies au supérieur)
            const eventsForSpectators = pendingEvents.map(e => ({
                minute: toMinute(e.match_time_seconds),
                playerNumber: e.player?.jersey_number ?? null,
                playerName: e.player
                    ? [e.player.first_name, e.player.last_name].filter(Boolean).join(" ") || null
                    : null,
                team: e.team,
            }));

            // Dernier but pour l'animation spectateur
            const lastEvent = pendingEvents[pendingEvents.length - 1];
            const lastGoal = lastEvent ? {
                minute: toMinute(lastEvent.match_time_seconds),
                playerNumber: lastEvent.player?.jersey_number ?? null,
                playerName: lastEvent.player
                    ? [lastEvent.player.first_name, lastEvent.player.last_name].filter(Boolean).join(" ") || null
                    : null,
                teamName: lastEvent.team === "A"
                    ? (matchData.teamA.name || "Équipe A")
                    : (matchData.teamB.name || "Équipe B"),
                team: lastEvent.team,
                timestamp: lastEvent.timestamp,
            } : null;

            const payload = {
                team1: matchData.teamA.name || "ÉQUIPE A",
                team2: matchData.teamB.name || "ÉQUIPE B",
                logo1: matchData.teamA.logo_url || "",
                logo2: matchData.teamB.logo_url || "",
                matchType: matchData.matchType || "Match",
                court: matchData.court || court || "Terrain",
                score1: matchData.teamA.score,
                score2: matchData.teamB.score,
                yellowCards1: Math.max(0, matchData.teamA.yellowCards),
                yellowCards2: Math.max(0, matchData.teamB.yellowCards),
                redCards1: Math.max(0, matchData.teamA.redCards),
                redCards2: Math.max(0, matchData.teamB.redCards),
                chrono: formattedTime,
                lastGoal,
                lastUpdate: new Date().toISOString(),
            };

            localStorage.setItem("liveFootballMatch", JSON.stringify(payload));
            if (initialMatchId) {
                localStorage.setItem(`liveFootballMatch_${initialMatchId}`, JSON.stringify(payload));
            }

            if (initialMatchId) {
                const sseMatchId = matchData.numericId?.toString() || initialMatchId;
                sendLiveScore({
                    matchId: sseMatchId,
                    sport: 'football' as any,
                    payload,
                });
            }
        } catch (e) {
            // Ignore storage errors
        }
    }, [matchData, formattedTime, court, initialMatchId, sendLiveScore, pendingEvents]);

    // Cleanup à l'unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (initialMatchId) {
                cleanupLiveScore(initialMatchId);
            }
        };
    }, [initialMatchId, cleanupLiveScore]);

    /** ---------- SWIPE / INVERSION DES ÉQUIPES ---------- */
    const swapSides = () =>
        setMatchData((p: MatchDataWithTournament) => ({
            ...p,
            teamA: { ...p.teamB },
            teamB: { ...p.teamA },
        }));

    return {
        matchData, formattedTime, handleEnd, startChrono, stopChrono,
        addPoint, subPoint,
        addYellowCard, subYellowCard, addRedCard, subRedCard,
        setTeamName, setTeamLogo, setMatchType, swapSides, court,
        // Fiche de match & événements
        players, pendingEvents, pendingGoalTeam, confirmGoal, cancelGoalModal,
    };
}
