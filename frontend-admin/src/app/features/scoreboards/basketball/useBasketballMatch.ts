import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { MatchData, MatchPlayer, LocalMatchEvent } from "./types";
import { submitMatchResultWithPropagation, updateMatchStatus as updateStatus } from "../common/useMatchPropagation";
import { useLiveScoreSync } from "../common/useLiveScoreSync";

type MatchDataWithTournament = MatchData & { tournamentId?: string | number; court?: string; numericId?: number };
type TournamentMatchStatus = "planifié" | "en-cours" | "terminé" | "annulé";


export function useBasketballMatch(initialMatchId: string | null) {
    const { data: session } = useSession();
    const token = (session as { accessToken?: string } | null)?.accessToken;
    const HALF_TIME_DURATION = 6 * 60 + 30; // 6 minutes 30 secondes en secondes

    // Hook pour synchronisation live vers backend SSE
    const { sendLiveScore, cleanup: cleanupLiveScore } = useLiveScoreSync();

    const [matchData, setMatchData] = useState<MatchDataWithTournament>({
        matchId: initialMatchId || "",
        teamA: { name: "Team A", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0, technicalFouls: 0 },
        teamB: { name: "Team B", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0, technicalFouls: 0 },
        chrono: { time: HALF_TIME_DURATION, running: false, interval: null },
        hasPenalties: false,
        matchType: "",
        tournamentId: undefined
    });

    const intervalRef = useRef<number | null>(null);
    const [court, setCourt] = useState<string>("");

    // États pour les événements de paniers
    const [players, setPlayers] = useState<MatchPlayer[]>([]);
    const [pendingEvents, setPendingEvents] = useState<LocalMatchEvent[]>([]);
    const pendingEventCounter = useRef(0);
    // Dernier événement pour diffusion SSE vers le frontend public
    const [lastGoalPayload, setLastGoalPayload] = useState<{
        event_type: string;
        minute: null;
        playerNumber: number | null;
        playerName: string | null;
        team: "A" | "B";
        timestamp: string;
    } | null>(null);

    // Récupérer les données du match depuis l'API
    useEffect(() => {
        if (!initialMatchId) return;
        
        async function fetchMatchData() {
            try {
                console.log('[Basketball Hook] 📝 Fetching match data for matchId:', initialMatchId);
                
                const matchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}`);
                if (!matchResponse.ok) throw new Error('Match not found');
                const matchResult = await matchResponse.json();
                const match = matchResult.data;
                
                console.log('[Basketball Hook] 📝 Match data:', match);

                let teamAName = "Team A";
                let teamALogo = "";
                let teamBName = "Team B";
                let teamBLogo = "";

                // ⭐ NOUVEAU: Récupérer le tournamentId via phase_id
                let tournamentId: number | undefined = undefined;
                if (match.phase_id) {
                    try {
                        console.log('[Basketball Hook] 📝 Fetching tournament ID via phase_id:', match.phase_id);
                        const phaseResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament-phases/${match.phase_id}`);
                        if (phaseResponse.ok) {
                            const phaseData = await phaseResponse.json();
                            tournamentId = phaseData.data.tournament_id;
                            console.log('[Basketball Hook] ✅ Tournament ID found:', tournamentId);
                        }
                    } catch (err) {
                        console.error('[Basketball Hook] ❌ Erreur récupération tournamentId:', err);
                    }
                }

                // Équipe A
                if (match.team_sport_a_id) {
                    console.log('[Basketball Hook] 📝 Fetching team A, team_sport_id:', match.team_sport_a_id);
                    const teamSportAResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team-sports/${match.team_sport_a_id}`);
                    if (teamSportAResponse.ok) {
                        const teamSportAData = await teamSportAResponse.json();
                        const teamAResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSportAData.data.team_id}`);
                        if (teamAResponse.ok) {
                            const teamAData = await teamAResponse.json();
                            teamAName = teamAData.data.name;
                            teamALogo = teamAData.data.logo_url || "";
                            console.log('[Basketball Hook] ✅ Team A:', teamAName);
                        }
                    }
                } else if (match.team_a_source) {
                    teamAName = match.team_a_source;
                    console.log('[Basketball Hook] 📝 Team A (source):', teamAName);
                }

                // Équipe B
                if (match.team_sport_b_id) {
                    console.log('[Basketball Hook] 📝 Fetching team B, team_sport_id:', match.team_sport_b_id);
                    const teamSportBResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team-sports/${match.team_sport_b_id}`);
                    if (teamSportBResponse.ok) {
                        const teamSportBData = await teamSportBResponse.json();
                        const teamBResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSportBData.data.team_id}`);
                        if (teamBResponse.ok) {
                            const teamBData = await teamBResponse.json();
                            teamBName = teamBData.data.name;
                            teamBLogo = teamBData.data.logo_url || "";
                            console.log('[Basketball Hook] ✅ Team B:', teamBName);
                        }
                    }
                } else if (match.team_b_source) {
                    teamBName = match.team_b_source;
                    console.log('[Basketball Hook] 📝 Team B (source):', teamBName);
                }

                const scheduleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}/schedule`);
                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    if (scheduleData.data?.court_id) {
                        const courtResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courts/${scheduleData.data.court_id}`);
                        if (courtResponse.ok) {
                            const courtData = await courtResponse.json();
                            setCourt(courtData.data.name || "");
                            console.log('[Basketball Hook] 📝 Court:', courtData.data.name);
                        }
                    }
                }

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

                // ⭐ MODIFICATION: Ajouter tournamentId dans le state
                setMatchData(prev => ({
                    ...prev,
                    teamA: { ...prev.teamA, name: teamAName, logo_url: teamALogo },
                    teamB: { ...prev.teamB, name: teamBName, logo_url: teamBLogo },
                    matchType: matchType,
                    tournamentId: tournamentId,  // ⭐ NOUVEAU
                    numericId: match.id
                }));
                
                console.log('[Basketball Hook] ✅ Match data loaded successfully');

            } catch (error) {
                console.error('[Basketball Hook] ❌ Error fetching match data:', error);
            }
        }

        fetchMatchData();
    }, [initialMatchId]);

    // Fetch des joueurs enregistrés pour ce match
    useEffect(() => {
        if (!initialMatchId) return;
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}/players`)
            .then(r => r.json())
            .then(d => setPlayers(d.data || []))
            .catch(() => {});
    }, [initialMatchId]);

    // Shot clock (14s / 24s) géré séparément du chrono principal - en dixièmes de seconde
    const [shotClock, setShotClockState] = useState<number>(240); // 24.0 secondes
    const shotClockRunningRef = useRef<boolean>(false);
    const shotClockIntervalRef = useRef<number | null>(null);

    // Période (MT1 / MT2)
    const [period, setPeriod] = useState<"MT1" | "MT2">("MT1");

    // Timestamp buzzer pour synchronisation vers la vue spectateur
    const [buzzerFiredAt, setBuzzerFiredAt] = useState<number>(0);

    // Buzzer simple via WebAudio API
    const audioCtxRef = useRef<AudioContext | null>(null);
    const buzzer: { play: () => void } = {
        play: () => {
            setBuzzerFiredAt(Date.now());
            try {
                const AudioContextCtor: any = (window as any).AudioContext || (window as any).webkitAudioContext;
                if (!audioCtxRef.current && AudioContextCtor) {
                    audioCtxRef.current = new AudioContextCtor();
                }
                const ctx = audioCtxRef.current;
                if (!ctx) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "square";
                osc.frequency.value = 1000;
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.8);
            } catch {
                // silence en cas d'erreur audio
            }
        },
    };

    /** ---------- CHRONO ---------- */
    const startChrono = () => {
        // évite les doublons d'interval
        if (intervalRef.current !== null) return;

        // Chrono principal: décrément toutes les 1000ms (1 seconde)
        intervalRef.current = window.setInterval(() => {
            setMatchData((p) => {
                const newTime = Math.max(0, p.chrono.time - 1);

                // Buzzer automatique à zéro du chrono global
                if (newTime === 0 && p.chrono.time > 0) {
                    buzzer.play();
                    // Si on est en MT1, basculer automatiquement en MT2
                    if (period === "MT1") {
                        setTimeout(() => {
                            setPeriod("MT2");
                            setMatchData((prev) => ({
                                ...prev,
                                chrono: { ...prev.chrono, time: HALF_TIME_DURATION, running: false },
                            }));
                            setShotClockState(240); // 24.0s
                            shotClockRunningRef.current = false;
                        }, 100);
                    } else {
                        // Si on est en MT2, arrêt complet
                        if (intervalRef.current !== null) {
                            window.clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                        if (shotClockIntervalRef.current !== null) {
                            window.clearInterval(shotClockIntervalRef.current);
                            shotClockIntervalRef.current = null;
                        }
                        shotClockRunningRef.current = false;
                    }
                    return {
                        ...p,
                        chrono: { ...p.chrono, time: 0, running: false },
                    };
                }

                return {
                    ...p,
                    chrono: { ...p.chrono, time: newTime },
                };
            });
        }, 1000);

        // Shot clock: décrément toutes les 100ms (dixièmes de seconde)
        shotClockIntervalRef.current = window.setInterval(() => {
            if (shotClockRunningRef.current) {
                setShotClockState((prev) => {
                    const next = Math.max(0, prev - 1);
                    if (next === 0) {
                        // Reset automatique à 24s quand le shot clock arrive à 0
                        buzzer.play();
                        setTimeout(() => setShotClockState(240), 100);
                        return 0;
                    }
                    return next;
                });
            }
        }, 100);

        // Démarre aussi le shot clock
        shotClockRunningRef.current = true;

        // met juste le flag running à true
        setMatchData((prev) => ({
            ...prev,
            chrono: { ...prev.chrono, running: true },
        }));
    };

    const stopChrono = () => {
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (shotClockIntervalRef.current !== null) {
            window.clearInterval(shotClockIntervalRef.current);
            shotClockIntervalRef.current = null;
        }
        // Arrêt automatique du shot clock quand le chrono global s'arrête
        shotClockRunningRef.current = false;

        setMatchData((prev) => ({
            ...prev,
            chrono: { ...prev.chrono, running: false },
        }));
    };

    const formattedTime = `${String(
        Math.floor(matchData.chrono.time / 60)
    ).padStart(2, "0")}:${String(matchData.chrono.time % 60).padStart(2, "0")}`;

    /** ---------- HELPERS ---------- */
    const teamKey = (t: "A" | "B"): "teamA" | "teamB" => (t === "A" ? "teamA" : "teamB");

    /** ---------- SCORES ---------- */
    const addPoint = (team: "A" | "B") =>
        setMatchData((p) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], score: p[k].score + 1 },
            };
        });

    function doAddScore(team: "A" | "B", points: number) {
        setMatchData((p) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], score: p[k].score + points },
            };
        });
        // Après chaque panier, la possession est remise à 24 secondes
        setShotClockState(240); // 24.0s
        shotClockRunningRef.current = matchData.chrono.running;
    }

    /** Crée un événement de panier local */
    function createScoreEvent(team: "A" | "B", player: MatchPlayer | null, points: number) {
        const localId = ++pendingEventCounter.current;
        const timestamp = new Date().toISOString();
        // Temps écoulé = durée totale - temps restant
        const elapsedSeconds = HALF_TIME_DURATION - matchData.chrono.time;
        setPendingEvents(prev => [...prev, {
            localId,
            event_type: "basket" as const,
            team,
            player_id: player?.id ?? null,
            points,
            match_time_seconds: elapsedSeconds,
            timestamp,
            player: player
                ? { id: player.id, first_name: player.first_name ?? null, last_name: player.last_name ?? null, jersey_number: player.jersey_number ?? null }
                : null,
        }]);
        setLastGoalPayload({
            event_type: "goal",
            minute: null,
            playerNumber: player?.jersey_number ?? null,
            playerName: player
                ? [player.first_name, player.last_name].filter(Boolean).join(" ") || null
                : null,
            team,
            timestamp,
        });
    }

    /** addScore : incrémente directement sans modal de sélection joueur */
    const addScore = (team: "A" | "B", points: number) => {
        createScoreEvent(team, null, points);
        doAddScore(team, points);
    };

    const subScore = (team: "A" | "B", points: number) =>
        setMatchData((p) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], score: Math.max(0, p[k].score - points) },
            };
        });

    /** ---------- GAME PARAMETERS ---------- */
    // Remise à zéro du match (scores, chrono, période, shot clock)
    const resetGame = () => {
        // stop chrono
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (shotClockIntervalRef.current !== null) {
            window.clearInterval(shotClockIntervalRef.current);
            shotClockIntervalRef.current = null;
        }
        shotClockRunningRef.current = false;
        setShotClockState(240); // 24.0s
        setPeriod("MT1");
        setMatchData((p) => ({
            ...p,
            teamA: { ...p.teamA, score: 0, technicalFouls: 0 },
            teamB: { ...p.teamB, score: 0, technicalFouls: 0 },
            chrono: { ...p.chrono, time: HALF_TIME_DURATION, running: false },
        }));
    };

    // Shot clock: reset à 24s et démarre
    const resetShotClock = () => {
        setShotClockState(240); // 24.0s
        shotClockRunningRef.current = matchData.chrono.running;
    };

    // Shot clock: set à n secondes (pour la règle des 14s)
    const setShotClock = (seconds: number) => {
        const s = Math.max(0, Math.floor(seconds * 10)); // Convertir en dixièmes
        setShotClockState(s);
        shotClockRunningRef.current = matchData.chrono.running;
    };
    
    // Reset intelligent : 24s ou 14s selon la situation
    const resetShotClockSmart = () => {
        // Si < 14s, reset à 14s, sinon 24s
        const newValue = shotClock < 140 ? 140 : 240; // 14.0s ou 24.0s
        setShotClockState(newValue);
        shotClockRunningRef.current = matchData.chrono.running;
    };

    // Ajoute 1 seconde au chrono principal
    const addSecond = () => {
        setMatchData((p) => ({
            ...p,
            chrono: { ...p.chrono, time: p.chrono.time + 1 },
        }));
    };

    // Définir le chrono principal (minutes et secondes)
    const setChrono = (minutes: number, seconds: number) => {
        const totalSeconds = minutes * 60 + seconds;
        setMatchData((p) => ({
            ...p,
            chrono: { ...p.chrono, time: totalSeconds },
        }));
    };

    // Bascule période MT1 <-> MT2 et réinitialise le chrono à 6 minutes 30 secondes
    const togglePeriod = () => {
        setPeriod((prev) => (prev === "MT1" ? "MT2" : "MT1"));
        setMatchData((p) => ({
            ...p,
            chrono: { ...p.chrono, time: HALF_TIME_DURATION, running: false },
        }));
        // Arrêter les chronos
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (shotClockIntervalRef.current !== null) {
            window.clearInterval(shotClockIntervalRef.current);
            shotClockIntervalRef.current = null;
        }
        shotClockRunningRef.current = false;
        setShotClockState(240); // 24.0s
    };

    /** ---------- METADATA UPDATES ---------- */
    const setTeamName = (team: "A" | "B", name: string) =>
        setMatchData((p) => ({
            ...p,
            [`team${team}`]: {
                ...p[`team${team}`],
                name,
            },
        }));

    const setTeamLogo = (team: "A" | "B", logo_url: string) =>
        setMatchData((p) => ({
            ...p,
            [`team${team}`]: {
                ...p[`team${team}`],
                logo_url,
            },
        }));

    const setMatchType = (type: string) =>
        setMatchData((p) => ({
            ...p,
            matchType: type,
        }));
    
    const addTechnicalFoul = (team: "A" | "B") =>
        setMatchData((p) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], technicalFouls: p[k].technicalFouls + 1 },
            };
        });
    
    const subTechnicalFoul = (team: "A" | "B") =>
        setMatchData((p) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], technicalFouls: Math.max(0, p[k].technicalFouls - 1) },
            };
        });

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
                console.error('[Basketball Hook] ❌ Error:', error);
                alert('Erreur lors de la fin du match : ' + error);
            },
        });
    };

    /** ---------- END MATCH ---------- */
    const handleEnd = async () => {
        stopChrono();
        // Sauvegarder les événements de paniers en batch avant de terminer
        const snapshot = pendingEvents;
        if (snapshot.length > 0 && initialMatchId) {
            const matchNumId = matchData.numericId?.toString() || initialMatchId;
            try {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${matchNumId}/events/batch`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify(snapshot.map(e => ({
                        team: e.team,
                        player_id: e.player_id ?? null,
                        match_time_seconds: e.match_time_seconds ?? null,
                    }))),
                });
            } catch { /* silencieux */ }
        }
        await submitMatchResult();
    };

    /** ---------- SYNC SHOT CLOCK WITH GAME TIME ---------- */
    useEffect(() => {
        // Si le temps restant de la mi-temps est inférieur au temps de possession,
        // la possession prend la valeur du temps de la mi-temps
        const gameTimeInTenths = matchData.chrono.time * 10; // Convertir en dixièmes
        if (gameTimeInTenths < shotClock && matchData.chrono.running) {
            setShotClockState(gameTimeInTenths);
        }
    }, [matchData.chrono.time, shotClock, matchData.chrono.running]);
    
    /** ---------- KEYBOARD CONTROLS ---------- */
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Éviter les actions si on tape dans un input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
            
            switch(e.key) {
                case '0': // Buzzer
                    buzzer.play();
                    break;
                case '1': // +1 seconde
                    addSecond();
                    break;
                case '4': // Reset shot clock 24s
                    resetShotClock();
                    break;
                case '6': // Shot clock 14s
                    setShotClock(14);
                    break;
                case 'Enter': // Start/Stop
                    if (matchData.chrono.running) {
                        stopChrono();
                    } else {
                        startChrono();
                    }
                    break;
            }
        };
        
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [matchData.chrono.running]);
    
    // Formater le shot clock en secondes.dixièmes (doit être calculé AVANT le useEffect de sync)
    const gameTimeInTenths = matchData.chrono.time * 10;
    const displayShotClock = shotClock > gameTimeInTenths ? gameTimeInTenths : shotClock;
    const formattedShotClock = (displayShotClock / 10).toFixed(1);

    /** ---------- SYNC TO LOCAL STORAGE + BACKEND SSE ---------- */
    useEffect(() => {
        // Debug: log what we're sending
        console.log('[Basketball Sync] shotClock state:', shotClock, '| formatted:', formattedShotClock, '| chrono:', formattedTime);

        try {
            const payload = {
                team1: matchData.teamA.name || "ÉQUIPE A",
                team2: matchData.teamB.name || "ÉQUIPE B",
                logo1: matchData.teamA.logo_url || "",
                logo2: matchData.teamB.logo_url || "",
                matchType: matchData.matchType || "Match",
                matchGround: court || "Terrain",
                score1: matchData.teamA.score,
                score2: matchData.teamB.score,
                yellowCards1: Math.max(0, matchData.teamA.yellowCards),
                yellowCards2: Math.max(0, matchData.teamB.yellowCards),
                redCards1: Math.max(0, matchData.teamA.redCards),
                redCards2: Math.max(0, matchData.teamB.redCards),
                technicalFouls1: Math.max(0, matchData.teamA.technicalFouls),
                technicalFouls2: Math.max(0, matchData.teamB.technicalFouls),
                chrono: formattedTime,
                shotClock: formattedShotClock,
                chronoRunning: matchData.chrono.running,
                period,
                buzzerFiredAt,
                lastUpdate: new Date().toISOString(),
                recentEvents: pendingEvents.slice(-10).map(e => ({
                    team: e.team,
                    playerName: e.player
                        ? [e.player.first_name, e.player.last_name].filter(Boolean).join(" ") || null
                        : null,
                    jerseyNumber: e.player?.jersey_number ?? null,
                })),
                lastGoal: lastGoalPayload
                    ? {
                        ...lastGoalPayload,
                        teamName: lastGoalPayload.team === "A"
                            ? (matchData.teamA.name || "ÉQUIPE A")
                            : (matchData.teamB.name || "ÉQUIPE B"),
                    }
                    : null,
            };
            // Sync to localStorage (for same-device spectator)
            localStorage.setItem("liveBasketballMatch", JSON.stringify(payload));
            if (initialMatchId) {
                localStorage.setItem(`liveBasketballMatch_${initialMatchId}`, JSON.stringify(payload));
            }

            // Sync to backend SSE (for cross-device split-screen spectators)
            if (initialMatchId) {
                const sseMatchId = matchData.numericId?.toString() || initialMatchId;
                sendLiveScore({
                    matchId: sseMatchId,
                    sport: 'basketball' as any, // Extended sport type
                    payload,
                });
            }
        } catch (e) {
            // Ignore storage errors
        }
    }, [matchData, formattedTime, formattedShotClock, period, court, buzzerFiredAt, initialMatchId, sendLiveScore, pendingEvents, lastGoalPayload]);

    // Cleanup à l'unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (shotClockIntervalRef.current !== null) {
                window.clearInterval(shotClockIntervalRef.current);
                shotClockIntervalRef.current = null;
            }
            // Cleanup live score sync
            if (initialMatchId) {
                cleanupLiveScore(initialMatchId);
            }
        };
    }, [initialMatchId, cleanupLiveScore]);

    /** ---------- SWIPE / INVERSION DES ÉQUIPES ---------- */
    const swapSides = () =>
        setMatchData((p) => ({
            ...p,
            teamA: { ...p.teamB },
            teamB: { ...p.teamA },
        }));

    return {
        matchData,
        formattedTime,
        formattedShotClock,
        shotClock,
        startChrono,
        stopChrono,
        addScore,
        subScore,
        resetGame,
        resetShotClock,
        resetShotClockSmart,
        setShotClock,
        setChrono,
        addSecond,
        togglePeriod,
        period,
        buzzer,
        setTeamName,
        setTeamLogo,
        setMatchType,
        swapSides,
        addTechnicalFoul,
        subTechnicalFoul,
        court,
        updateMatchStatus,
        submitMatchResult,
        handleEnd,
        // Événements de paniers
        players,
        pendingEvents,
    };
}