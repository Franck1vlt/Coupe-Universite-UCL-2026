import { useState, useRef, useEffect } from "react";
import { MatchData } from "./types";

export function useBasketballMatch(initialMatchId: string | null) {
    const HALF_TIME_DURATION = 9 * 60; // 9 minutes en secondes
    
    const [matchData, setMatchData] = useState<MatchData>({
        matchId: initialMatchId || "",
        teamA: { name: "Team A", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0, technicalFouls: 0 },
        teamB: { name: "Team B", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0, technicalFouls: 0 },
        chrono: { time: HALF_TIME_DURATION, running: false, interval: null },
        hasPenalties: false,
        matchType: ""
    });

    const intervalRef = useRef<number | null>(null);
    const [court, setCourt] = useState<string>("");

    // Récupérer les données du match depuis l'API
    useEffect(() => {
        if (!initialMatchId) return;
        
        async function fetchMatchData() {
            try {
                const matchResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}`);
                if (!matchResponse.ok) throw new Error('Match not found');
                const matchResult = await matchResponse.json();
                const match = matchResult.data;

                let teamAName = "Team A";
                let teamALogo = "";
                let teamBName = "Team B";
                let teamBLogo = "";

                if (match.team_sport_a_id) {
                    const teamSportAResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_a_id}`);
                    if (teamSportAResponse.ok) {
                        const teamSportAData = await teamSportAResponse.json();
                        const teamAResponse = await fetch(`http://localhost:8000/teams/${teamSportAData.data.team_id}`);
                        if (teamAResponse.ok) {
                            const teamAData = await teamAResponse.json();
                            teamAName = teamAData.data.name;
                            teamALogo = teamAData.data.logo_url || "";
                        }
                    }
                }

                if (match.team_sport_b_id) {
                    const teamSportBResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_b_id}`);
                    if (teamSportBResponse.ok) {
                        const teamSportBData = await teamSportBResponse.json();
                        const teamBResponse = await fetch(`http://localhost:8000/teams/${teamSportBData.data.team_id}`);
                        if (teamBResponse.ok) {
                            const teamBData = await teamBResponse.json();
                            teamBName = teamBData.data.name;
                            teamBLogo = teamBData.data.logo_url || "";
                        }
                    }
                }

                const scheduleResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}/schedule`);
                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    if (scheduleData.data?.court_id) {
                        const courtResponse = await fetch(`http://localhost:8000/courts/${scheduleData.data.court_id}`);
                        if (courtResponse.ok) {
                            const courtData = await courtResponse.json();
                            setCourt(courtData.data.name || "");
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

                setMatchData(prev => ({
                    ...prev,
                    teamA: { ...prev.teamA, name: teamAName, logo_url: teamALogo },
                    teamB: { ...prev.teamB, name: teamBName, logo_url: teamBLogo },
                    matchType: matchType
                }));

            } catch (error) {
                console.error('Error fetching match data:', error);
            }
        }

        fetchMatchData();
    }, [initialMatchId]);

    // Shot clock (14s / 24s) géré séparément du chrono principal - en dixièmes de seconde
    const [shotClock, setShotClockState] = useState<number>(240); // 24.0 secondes
    const shotClockRunningRef = useRef<boolean>(false);
    const shotClockIntervalRef = useRef<number | null>(null);

    // Période (MT1 / MT2)
    const [period, setPeriod] = useState<"MT1" | "MT2">("MT1");

    // Buzzer simple via WebAudio API
    const audioCtxRef = useRef<AudioContext | null>(null);
    const buzzer: { play: () => void } = {
        play: () => {
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

            // Décrément du shot clock si actif - toutes les 100ms (dixièmes de seconde)
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

    const addScore = (team: "A" | "B", points: number) => {
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

    // Bascule période MT1 <-> MT2 et réinitialise le chrono à 9 minutes
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
    
    /** ---------- SYNC TO LOCAL STORAGE ---------- */
    useEffect(() => {
        try {
            const payload = {
                team1: matchData.teamA.name || "ÉQUIPE A",
                team2: matchData.teamB.name || "ÉQUIPE B",
                matchType: matchData.matchType || "Match",
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
                period,
                lastUpdate: new Date().toISOString(),
            };
            localStorage.setItem("liveBasketballMatch", JSON.stringify(payload));
        } catch (e) {
            // Ignore storage errors
        }
    }, [matchData, formattedTime, shotClock, period]);

    // Cleanup à l'unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []);

    /** ---------- SWIPE / INVERSION DES ÉQUIPES ---------- */
    const swapSides = () =>
        setMatchData((p) => ({
            ...p,
            teamA: { ...p.teamB },
            teamB: { ...p.teamA },
        }));

    // Formater le shot clock en secondes.dixièmes
    const shotClockInSeconds = shotClock / 10;
    const gameTimeInTenths = matchData.chrono.time * 10;
    
    // Si le shot clock est > au chrono global, afficher le chrono global
    const displayShotClock = shotClock > gameTimeInTenths ? gameTimeInTenths : shotClock;
    const formattedShotClock = (displayShotClock / 10).toFixed(1);
    
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
        court
    };
}