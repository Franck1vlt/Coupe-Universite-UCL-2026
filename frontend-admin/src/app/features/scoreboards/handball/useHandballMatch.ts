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
    event_type: "goal" | "yellow_card" | "red_card";
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

// Convertit les secondes écoulées en minute affichable
const toMinute = (secs: number | null | undefined): number =>
    Math.ceil((secs ?? 0) / 60);

// Ajout du type tournamentId si besoin
type MatchDataWithTournament = MatchData & { tournamentId?: string | number; court?: string; numericId?: number };
const HALF_TIME_DURATION = 10 * 60; // 10 minutes en secondes


export function useHandballMatch(initialMatchId: string | null) {
    console.log('[Handball Hook] ========== VERSION 3.0 - With match events ==========');
    const { data: session } = useSession();
    const token = (session as { accessToken?: string } | null)?.accessToken;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // Hook pour synchronisation live vers backend SSE
    const { sendLiveScore, cleanup: cleanupLiveScore } = useLiveScoreSync();

    const [matchData, setMatchData] = useState<MatchDataWithTournament>({
        matchId: initialMatchId || "",
        teamA: { name: "Team A", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        teamB: { name: "Team B", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        chrono: { time: HALF_TIME_DURATION, running: false, interval: null },
        hasPenalties: false,
        matchType: "",
        tournamentId: undefined
    });

    const intervalRef = useRef<number | null>(null);
    const [court, setCourt] = useState<string>("");

    // Fiche de match & événements locaux
    const [players, setPlayers] = useState<MatchPlayer[]>([]);
    const [pendingEvents, setPendingEvents] = useState<LocalMatchEvent[]>([]);
    const pendingEventCounter = useRef(0);
    const [pendingCardEvent, setPendingCardEvent] = useState<{
        team: "A" | "B";
        event_type: "yellow_card" | "red_card";
    } | null>(null);

    // UN SEUL useEffect pour récupérer les données du match
    useEffect(() => {
        if (!initialMatchId) return;

        async function fetchMatchData() {
            try {
                console.log('[Handball Hook] ========== STARTING FETCH ==========');
                console.log('[Handball Hook] Fetching match data for matchId:', initialMatchId);

                // 1. Récupérer les données du match
                const matchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}`);
                if (!matchResponse.ok) {
                    console.error('[Handball Hook] Match not found:', matchResponse.status);
                    throw new Error('Match not found');
                }
                const matchResult = await matchResponse.json();
                const match = matchResult.data;
                console.log('[Handball Hook] Match data:', match);

                // 2. Récupérer le tournament_id depuis la phase
                let tournamentId: number | undefined = undefined;
                if (match.phase_id) {
                    console.log('[Handball Hook] Fetching tournament phase:', match.phase_id);
                    const phaseResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament-phases/${match.phase_id}`);
                    if (phaseResponse.ok) {
                        const phaseData = await phaseResponse.json();
                        tournamentId = phaseData.data.tournament_id;
                        console.log('[Handball Hook] TournamentId from phase:', tournamentId);
                    }
                }

                // 3. Récupérer les informations des équipes
                let teamAName = "Team A";
                let teamALogo = "";
                let teamBName = "Team B";
                let teamBLogo = "";

                // Équipe A
                if (match.team_sport_a_id) {
                    console.log('[Handball Hook] Fetching team_sport_a:', match.team_sport_a_id);
                    const teamSportAResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team-sports/${match.team_sport_a_id}`);
                    if (teamSportAResponse.ok) {
                        const teamSportAData = await teamSportAResponse.json();
                        console.log('[Handball Hook] TeamSport A data:', teamSportAData.data);
                        const teamAResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSportAData.data.team_id}`);
                        if (teamAResponse.ok) {
                            const teamAData = await teamAResponse.json();
                            teamAName = teamAData.data.name;
                            teamALogo = teamAData.data.logo_url || "";
                            console.log('[Handball Hook] Team A:', teamAName);
                        }
                    }
                } else if (match.team_a_source) {
                    teamAName = match.team_a_source;
                    console.log('[Handball Hook] Team A (source fallback):', teamAName);
                }

                // Équipe B
                if (match.team_sport_b_id) {
                    console.log('[Handball Hook] Fetching team_sport_b:', match.team_sport_b_id);
                    const teamSportBResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team-sports/${match.team_sport_b_id}`);
                    if (teamSportBResponse.ok) {
                        const teamSportBData = await teamSportBResponse.json();
                        console.log('[Handball Hook] TeamSport B data:', teamSportBData.data);
                        const teamBResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSportBData.data.team_id}`);
                        if (teamBResponse.ok) {
                            const teamBData = await teamBResponse.json();
                            teamBName = teamBData.data.name;
                            teamBLogo = teamBData.data.logo_url || "";
                            console.log('[Handball Hook] Team B:', teamBName);
                        }
                    }
                } else if (match.team_b_source) {
                    teamBName = match.team_b_source;
                    console.log('[Handball Hook] Team B (source fallback):', teamBName);
                }

                // 3. Récupérer les informations de planification (terrain)
                let courtName: string | undefined = undefined;
                console.log('[Handball Hook] Fetching schedule for match:', initialMatchId);
                const scheduleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}/schedule`);
                console.log('[Handball Hook] Schedule response status:', scheduleResponse.status);
                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    console.log('[Handball Hook] Schedule data:', scheduleData.data);
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

                console.log('[Handball Hook] Final values - TeamA:', teamAName, 'TeamB:', teamBName, 'MatchType:', matchType, 'Court:', courtName);
                console.log('[Handball Hook] TournamentId:', tournamentId);

                // 5. Mettre à jour le state avec les données récupérées
                setMatchData(prev => ({
                    ...prev,
                    teamA: { ...prev.teamA, name: teamAName, logo_url: teamALogo },
                    teamB: { ...prev.teamB, name: teamBName, logo_url: teamBLogo },
                    matchType: matchType,
                    tournamentId: tournamentId,
                    court: courtName,
                    numericId: match.id
                }));

                console.log('[Handball Hook] Match data updated with tournamentId:', tournamentId);

            } catch (error) {
                console.error('[Handball Hook] Error fetching match data:', error);
            }

            // Charger le roster des joueurs
            try {
                const playersRes = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}/players`
                );
                if (playersRes.ok) {
                    const playersData = await playersRes.json();
                    setPlayers(playersData.data || []);
                }
            } catch (e) {
                console.warn("[Handball Hook] Erreur chargement joueurs:", e);
            }
        }

        fetchMatchData();
    }, [initialMatchId]);

    // Helper to get the correct team key
    function teamKey(team: "A" | "B"): "teamA" | "teamB" {
        return team === "A" ? "teamA" : "teamB";
    }

    /** ---------- CHRONO ---------- */
    const [formattedTime, setFormattedTime] = useState<string>("10:00");
    // Pour forcer le switch visuel de période (MT1/MT2)
    const [periodSwitchChecked, setPeriodSwitchChecked] = useState(false);
    function formatChrono(time: number): string {
        const min = Math.floor(time / 60);
        const sec = time % 60;
        return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    }
    useEffect(() => {
        setFormattedTime(formatChrono(matchData.chrono.time));
    }, [matchData.chrono.time]);

    // Période (MT1 / MT2)
    const [period, setPeriod] = useState<"MT1" | "MT2">("MT1");

    // Temps écoulé en secondes selon la mi-temps (chrono compte à rebours)
    const getElapsedSeconds = (): number =>
        period === "MT1"
            ? HALF_TIME_DURATION - matchData.chrono.time
            : HALF_TIME_DURATION + (HALF_TIME_DURATION - matchData.chrono.time);

    const startChrono = () => {
        if (intervalRef.current !== null) return;

        setMatchData((prev) => ({
            ...prev,
            chrono: {
                ...prev.chrono,
                time:
                    prev.chrono.time === 0
                        ? HALF_TIME_DURATION
                        : prev.chrono.time,
                running: true,
            },
        }));

        intervalRef.current = window.setInterval(() => {
            setMatchData((prev) => {
                const newTime = Math.max(0, prev.chrono.time - 1);

                if (newTime === 0 && prev.chrono.time > 0) {
                    if (intervalRef.current !== null) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }

                    if (period === "MT1") {
                        setTimeout(() => {
                            setPeriod("MT2");
                            setPeriodSwitchChecked(true);
                            setMatchData((p) => ({
                                ...p,
                                chrono: {
                                    ...p.chrono,
                                    time: HALF_TIME_DURATION,
                                    running: false,
                                },
                            }));
                        }, 100);
                    }

                    return {
                        ...prev,
                        chrono: { ...prev.chrono, time: 0, running: false },
                    };
                }

                return {
                    ...prev,
                    chrono: { ...prev.chrono, time: newTime },
                };
            });
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

    const addSecond = () => {
        setMatchData((prev) => ({
            ...prev,
            chrono: { ...prev.chrono, time: prev.chrono.time + 1 }
        }));
    };

    const setChrono = (minutes: number, seconds: number) => {
        const totalSeconds = minutes * 60 + seconds;
        setMatchData((p) => ({
            ...p,
            chrono: { ...p.chrono, time: totalSeconds },
        }));
    };

    const togglePeriod = () => {
        if (period === "MT1") {
            setPeriod("MT2");
            setPeriodSwitchChecked(true);
        } else {
            setPeriod("MT1");
            setPeriodSwitchChecked(false);
        }
    };

    // Fonction de synchronisation globale (Score + Chrono)
    const syncMatchStatus = async (scoreA: number, scoreB: number, currentChrono: string) => {
        if (!initialMatchId) return;
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            await fetch(`${API_URL}/matches/${initialMatchId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ score_a: scoreA, score_b: scoreB, time: currentChrono })
            });
        } catch (e) {
            console.error("Erreur de synchro", e);
        }
    };

    // Synchro automatique du chrono toutes les 10 secondes
    useEffect(() => {
        if (matchData.chrono.running) {
            const syncInterval = setInterval(() => {
                syncMatchStatus(matchData.teamA.score, matchData.teamB.score, formattedTime);
            }, 10000);
            return () => clearInterval(syncInterval);
        }
    }, [matchData.chrono.running, formattedTime]);

    /** ---------- POINTS / BUTS ---------- */

    /** addPoint : incrémente directement sans modal de sélection joueur */
    const addPoint = (team: "A" | "B") => {
        let newScoreA = matchData.teamA.score;
        let newScoreB = matchData.teamB.score;
        if (team === "A") newScoreA += 1; else newScoreB += 1;
        setMatchData(prev => ({
            ...prev,
            teamA: { ...prev.teamA, score: team === "A" ? prev.teamA.score + 1 : prev.teamA.score },
            teamB: { ...prev.teamB, score: team === "B" ? prev.teamB.score + 1 : prev.teamB.score },
        }));
        syncMatchStatus(newScoreA, newScoreB, formattedTime);
    };

    const subPoint = (team: "A" | "B") => {
        // Supprimer le dernier événement "goal" de cette équipe
        setPendingEvents((prev) => {
            const lastIdx =
                [...prev]
                    .map((e, i) => ({ e, i }))
                    .filter(({ e }) => e.event_type === "goal" && e.team === team)
                    .pop()?.i ?? -1;
            return lastIdx === -1 ? prev : prev.filter((_, i) => i !== lastIdx);
        });

        let newScoreA = matchData.teamA.score;
        let newScoreB = matchData.teamB.score;
        if (team === "A") newScoreA = Math.max(0, newScoreA - 1);
        else newScoreB = Math.max(0, newScoreB - 1);
        setMatchData(prev => ({
            ...prev,
            teamA: { ...prev.teamA, score: team === "A" ? Math.max(0, prev.teamA.score - 1) : prev.teamA.score },
            teamB: { ...prev.teamB, score: team === "B" ? Math.max(0, prev.teamB.score - 1) : prev.teamB.score },
        }));
        syncMatchStatus(newScoreA, newScoreB, formattedTime);
    };

    /** ---------- CARTONS ---------- */

    const addYellowCard = (team: "A" | "B") => {
        const teamPlayers = players.filter((p) => p.team === team);
        if (teamPlayers.length > 0) {
            setPendingCardEvent({ team, event_type: "yellow_card" });
        } else {
            setMatchData((p: MatchDataWithTournament) => {
                const k = teamKey(team);
                return { ...p, [k]: { ...p[k], yellowCards: p[k].yellowCards + 1 } };
            });
            const localId = ++pendingEventCounter.current;
            setPendingEvents((prev) => [
                ...prev,
                {
                    localId,
                    event_type: "yellow_card" as const,
                    team,
                    player_id: null,
                    match_time_seconds: getElapsedSeconds(),
                    timestamp: new Date().toISOString(),
                    player: null,
                },
            ]);
        }
    };

    const subYellowCard = (team: "A" | "B") => {
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return { ...p, [k]: { ...p[k], yellowCards: Math.max(0, p[k].yellowCards - 1) } };
        });
        setPendingEvents((prev) => {
            const lastIdx =
                [...prev]
                    .map((e, i) => ({ e, i }))
                    .filter(({ e }) => e.event_type === "yellow_card" && e.team === team)
                    .pop()?.i ?? -1;
            return lastIdx === -1 ? prev : prev.filter((_, i) => i !== lastIdx);
        });
    };

    const addRedCard = (team: "A" | "B") => {
        const teamPlayers = players.filter((p) => p.team === team);
        if (teamPlayers.length > 0) {
            setPendingCardEvent({ team, event_type: "red_card" });
        } else {
            setMatchData((p: MatchDataWithTournament) => {
                const k = teamKey(team);
                return { ...p, [k]: { ...p[k], redCards: p[k].redCards + 1 } };
            });
            const localId = ++pendingEventCounter.current;
            setPendingEvents((prev) => [
                ...prev,
                {
                    localId,
                    event_type: "red_card" as const,
                    team,
                    player_id: null,
                    match_time_seconds: getElapsedSeconds(),
                    timestamp: new Date().toISOString(),
                    player: null,
                },
            ]);
        }
    };

    const subRedCard = (team: "A" | "B") => {
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return { ...p, [k]: { ...p[k], redCards: Math.max(0, p[k].redCards - 1) } };
        });
        setPendingEvents((prev) => {
            const lastIdx =
                [...prev]
                    .map((e, i) => ({ e, i }))
                    .filter(({ e }) => e.event_type === "red_card" && e.team === team)
                    .pop()?.i ?? -1;
            return lastIdx === -1 ? prev : prev.filter((_, i) => i !== lastIdx);
        });
    };

    const confirmCard = (playerId?: number) => {
        if (!pendingCardEvent) return;
        const { team, event_type } = pendingCardEvent;
        setPendingCardEvent(null);

        const player = playerId ? (players.find((p) => p.id === playerId) ?? null) : null;

        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            if (event_type === "yellow_card") {
                return { ...p, [k]: { ...p[k], yellowCards: p[k].yellowCards + 1 } };
            }
            return { ...p, [k]: { ...p[k], redCards: p[k].redCards + 1 } };
        });

        const localId = ++pendingEventCounter.current;
        setPendingEvents((prev) => [
            ...prev,
            {
                localId,
                event_type,
                team,
                player_id: player?.id ?? null,
                match_time_seconds: getElapsedSeconds(),
                timestamp: new Date().toISOString(),
                player: player
                    ? { id: player.id, first_name: player.first_name, last_name: player.last_name, jersey_number: player.jersey_number }
                    : null,
            },
        ]);
    };

    const cancelCardModal = () => setPendingCardEvent(null);

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

    /** ---------- STATUS ---------- */
    const updateMatchStatus = async (status: 'scheduled' | 'in_progress' | 'completed') => {
        if (!initialMatchId) return;
        await updateStatus(initialMatchId, status, token);
    };

    /** ---------- SUBMIT RESULT ---------- */
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
                console.error('[Handball Hook] Error:', error);
                alert('Erreur lors de la fin du match : ' + error);
            },
        });
    };

    /** ---------- END MATCH ---------- */
    const handleEnd = async () => {
        stopChrono();

        // 1. Soumettre le résultat du match
        await submitMatchResult();

        // 2. Persister les événements en lot — uniquement si END est pressé
        const currentPendingEvents = pendingEvents;
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
                                currentPendingEvents.map((e) => ({
                                    team: e.team,
                                    event_type: e.event_type,
                                    player_id: e.player_id ?? null,
                                    match_time_seconds: e.match_time_seconds ?? null,
                                }))
                            ),
                        }
                    );
                } catch (e) {
                    console.error("[Handball Hook] Erreur sauvegarde événements batch:", e);
                }
            }
        }
    };

    /** ---------- SYNC TO LOCAL STORAGE + BACKEND SSE ---------- */
    useEffect(() => {
        try {
            // Dernier événement pour l'animation spectateur
            const lastEvent = pendingEvents[pendingEvents.length - 1];
            const lastGoal = lastEvent
                ? {
                    event_type: lastEvent.event_type,
                    minute: toMinute(lastEvent.match_time_seconds),
                    playerNumber: lastEvent.player?.jersey_number ?? null,
                    playerName: lastEvent.player
                        ? [lastEvent.player.first_name, lastEvent.player.last_name]
                            .filter(Boolean)
                            .join(" ") || null
                        : null,
                    teamName:
                        lastEvent.team === "A"
                            ? matchData.teamA.name || "Équipe A"
                            : matchData.teamB.name || "Équipe B",
                    team: lastEvent.team,
                    timestamp: lastEvent.timestamp,
                }
                : null;

            const payload = {
                team1: matchData.teamA.name || "ÉQUIPE A",
                team2: matchData.teamB.name || "ÉQUIPE B",
                logo1: matchData.teamA.logo_url || "",
                logo2: matchData.teamB.logo_url || "",
                matchType: matchData.matchType || "Match",
                matchGround: matchData.court || court || "Terrain",
                score1: matchData.teamA.score,
                score2: matchData.teamB.score,
                yellowCards1: Math.max(0, matchData.teamA.yellowCards),
                yellowCards2: Math.max(0, matchData.teamB.yellowCards),
                redCards1: Math.max(0, matchData.teamA.redCards),
                redCards2: Math.max(0, matchData.teamB.redCards),
                chrono: formattedTime,
                period,
                lastGoal,
                lastUpdate: new Date().toISOString(),
            };

            localStorage.setItem("liveHandballMatch", JSON.stringify(payload));
            if (initialMatchId) {
                localStorage.setItem(`liveHandballMatch_${initialMatchId}`, JSON.stringify(payload));
            }

            if (initialMatchId) {
                const sseMatchId = matchData.numericId?.toString() || initialMatchId;
                sendLiveScore({
                    matchId: sseMatchId,
                    sport: 'handball' as any,
                    payload,
                });
            }
        } catch {
            // Ignore storage errors
        }
    }, [matchData, formattedTime, period, court, initialMatchId, sendLiveScore, pendingEvents]);

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
        matchData, formattedTime, handleEnd, updateMatchStatus,
        startChrono, stopChrono, addSecond, setChrono,
        addPoint, subPoint,
        addYellowCard, subYellowCard, addRedCard, subRedCard,
        setTeamName, setTeamLogo, setMatchType, swapSides,
        court, togglePeriod, period, periodSwitchChecked, setPeriodSwitchChecked,
        // Fiche de match & événements
        players, pendingEvents,
        pendingCardEvent, confirmCard, cancelCardModal,
    };
}
