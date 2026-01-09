import { useState, useRef, useEffect } from "react";
import { MatchData } from "./types";

export function useHandballMatch(initialMatchId: string | null) {
    const [matchData, setMatchData] = useState<MatchData>({
        matchId: initialMatchId || "",
        teamA: { name: "Team A", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        teamB: { name: "Team B", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        chrono: { time: 0, running: false, interval: null },
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

    /** ---------- CHRONO ---------- */
    const startChrono = () => {
        // évite les doublons d'interval
        if (intervalRef.current !== null) return;

        intervalRef.current = window.setInterval(() => {
            setMatchData((p) => ({
                ...p,
                chrono: { ...p.chrono, time: p.chrono.time + 1 },
            }));
        }, 1000);

        // met juste le flag running à true (ne stocke pas le handle dans le state)
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

    const subPoint = (team: "A" | "B") =>
        setMatchData((p) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], score: Math.max(0, p[k].score - 1) },
            };
        });

    /** ---------- CARTONS ---------- */
    const addYellowCard = (team: "A" | "B") =>
        setMatchData((p) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], yellowCards: p[k].yellowCards + 1 },
            };
        });

    const subYellowCard = (team: "A" | "B") =>
        setMatchData((p) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], yellowCards: Math.max(0, p[k].yellowCards - 1) },
            };
        });

    const addRedCard = (team: "A" | "B") =>
        setMatchData((p) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], redCards: p[k].redCards + 1 },
            };
        });

    const subRedCard = (team: "A" | "B") =>
        setMatchData((p) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], redCards: Math.max(0, p[k].redCards - 1) },
            };
        });

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
                chrono: formattedTime,
                lastUpdate: new Date().toISOString(),
            };
            localStorage.setItem("liveHandballMatch", JSON.stringify(payload));
        } catch (e) {
            // Ignore storage errors
        }
    }, [matchData, formattedTime]);

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

    return { matchData, formattedTime, startChrono, stopChrono, addPoint, subPoint, addYellowCard, subYellowCard, addRedCard, subRedCard, setTeamName, setTeamLogo, setMatchType, swapSides, court };
}
