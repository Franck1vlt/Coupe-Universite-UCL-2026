import { useState, useRef, useEffect } from "react";
import { MatchData } from "./types";

// Ajout du type tournamentId si besoin
type MatchDataWithTournament = MatchData & { tournamentId?: string | number; court?: string };

export function useFootballMatch(initialMatchId: string | null) {
    const [matchData, setMatchData] = useState<MatchDataWithTournament>({
        matchId: initialMatchId || "",
        teamA: { name: "Team A", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        teamB: { name: "Team B", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        chrono: { time: 0, running: false, interval: null },
        hasPenalties: false,
        matchType: "",
        tournamentId: undefined
    });

    // (déjà déclarés ci-dessus)

    // --- Fonction utilitaire pour mettre à jour le statut du match ---
    const updateMatchStatus = async (status: 'en_cours' | 'termine') => {
        if (!initialMatchId) return;
        try {
            await fetch(`http://localhost:8000/matches/${initialMatchId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
        } catch (e) {
            console.error(`[Football Hook] Erreur lors de la mise à jour du statut du match (${status}) :`, e);
        }
    };

    const intervalRef = useRef<number | null>(null);
    const [court, setCourt] = useState<string>("");

    // Récupérer les données du match depuis l'API
    useEffect(() => {
        if (!initialMatchId) return;
        // Mettre le match en "en cours" à l'ouverture de la page
        updateMatchStatus('en_cours');
        async function fetchMatchData() {
            try {
                console.log('[Football Hook] Fetching match data for matchId:', initialMatchId);
                
                // 1. Récupérer les données du match
                const matchResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}`);
                if (!matchResponse.ok) {
                    console.error('[Football Hook] Match not found:', matchResponse.status);
                    throw new Error('Match not found');
                }
                const matchResult = await matchResponse.json();
                const match = matchResult.data;
                console.log('[Football Hook] Match data:', match);
                // Log détaillé pour debug
                if (match && typeof match === 'object') {
                    Object.keys(match).forEach(k => {
                        console.log(`[Football Hook] match[${k}]:`, match[k]);
                    });
                }

                // 2. Récupérer les informations des équipes
                let teamAName = "Team A";
                let teamALogo = "";
                let teamBName = "Team B";
                let teamBLogo = "";

                if (match.team_sport_a_id) {
                    console.log('[Football Hook] Fetching team_sport_a:', match.team_sport_a_id);
                    const teamSportAResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_a_id}`);
                    if (teamSportAResponse.ok) {
                        const teamSportAData = await teamSportAResponse.json();
                        console.log('[Football Hook] TeamSport A data:', teamSportAData.data);
                        const teamAResponse = await fetch(`http://localhost:8000/teams/${teamSportAData.data.team_id}`);
                        if (teamAResponse.ok) {
                            const teamAData = await teamAResponse.json();
                            teamAName = teamAData.data.name;
                            teamALogo = teamAData.data.logo_url || "";
                            console.log('[Football Hook] Team A:', teamAName);
                        } else {
                            console.error('[Football Hook] Failed to fetch team A:', teamAResponse.status);
                        }
                    } else {
                        console.error('[Football Hook] Failed to fetch teamSport A:', teamSportAResponse.status);
                    }
                } else {
                    console.log('[Football Hook] No team_sport_a_id in match');
                }

                if (match.team_sport_b_id) {
                    console.log('[Football Hook] Fetching team_sport_b:', match.team_sport_b_id);
                    const teamSportBResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_b_id}`);
                    if (teamSportBResponse.ok) {
                        const teamSportBData = await teamSportBResponse.json();
                        console.log('[Football Hook] TeamSport B data:', teamSportBData.data);
                        const teamBResponse = await fetch(`http://localhost:8000/teams/${teamSportBData.data.team_id}`);
                        if (teamBResponse.ok) {
                            const teamBData = await teamBResponse.json();
                            teamBName = teamBData.data.name;
                            teamBLogo = teamBData.data.logo_url || "";
                            console.log('[Football Hook] Team B:', teamBName);
                        } else {
                            console.error('[Football Hook] Failed to fetch team B:', teamBResponse.status);
                        }
                    } else {
                        console.error('[Football Hook] Failed to fetch teamSport B:', teamSportBResponse.status);
                    }
                } else {
                    console.log('[Football Hook] No team_sport_b_id in match');
                }

                // 3. Récupérer les informations de planification (terrain)
                console.log('[Football Hook] Fetching schedule for match:', initialMatchId);
                const scheduleResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}/schedule`);
                console.log('[Football Hook] Schedule response status:', scheduleResponse.status);
                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    console.log('[Football Hook] Schedule data:', scheduleData.data);
                    if (scheduleData.data?.court_id) {
                        const courtResponse = await fetch(`http://localhost:8000/courts/${scheduleData.data.court_id}`);
                        if (courtResponse.ok) {
                            const courtData = await courtResponse.json();
                            const courtName = courtData.data.name || "";
                            setCourt(courtName);
                            console.log('[Football Hook] Court name:', courtName);
                        } else {
                            console.error('[Football Hook] Failed to fetch court:', courtResponse.status);
                        }
                    } else {
                        console.log('[Football Hook] No court_id in schedule data');
                    }
                } else {
                    console.warn('[Football Hook] Schedule not found (404) - this is normal if no schedule exists yet');
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

                console.log('[Football Hook] Final values - TeamA:', teamAName, 'TeamB:', teamBName, 'MatchType:', matchType, 'Court:', court);

                // 5. Mettre à jour le state avec les données récupérées
                setMatchData(prev => ({
                    ...prev,
                    teamA: { ...prev.teamA, name: teamAName, logo_url: teamALogo },
                    teamB: { ...prev.teamB, name: teamBName, logo_url: teamBLogo },
                    matchType: matchType,
                    // Récupération robuste de l'id du tournoi
                    tournamentId: match.tournament_id || match.tournamentId || (match.tournament && (match.tournament.id || match.tournament.tournament_id)) || undefined
                }));

                console.log('[Football Hook] Match data updated successfully');

            } catch (error) {
                console.error('[Football Hook] Error fetching match data:', error);
            }
        }

        fetchMatchData();
    }, [initialMatchId]);

    useEffect(() => {
        if (!initialMatchId) return;
        // Mettre le match en "en cours" à l'ouverture de la page
        updateMatchStatus('en_cours');
        async function fetchMatchData() {
            try {
                console.log('[Football Hook] Fetching match data for matchId:', initialMatchId);
                
                // 1. Récupérer les données du match
                const matchResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}`);
                if (!matchResponse.ok) {
                    console.error('[Football Hook] Match not found:', matchResponse.status);
                    throw new Error('Match not found');
                }
                const matchResult = await matchResponse.json();
                const match = matchResult.data;
                console.log('[Football Hook] Match data:', match);
                // Log détaillé pour debug
                if (match && typeof match === 'object') {
                    Object.keys(match).forEach(k => {
                        console.log(`[Football Hook] match[${k}]:`, match[k]);
                    });
                }

                // 2. Récupérer les informations des équipes
                let teamAName = "Team A";
                let teamALogo = "";
                let teamBName = "Team B";
                let teamBLogo = "";

                if (match.team_sport_a_id) {
                    console.log('[Football Hook] Fetching team_sport_a:', match.team_sport_a_id);
                    const teamSportAResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_a_id}`);
                    if (teamSportAResponse.ok) {
                        const teamSportAData = await teamSportAResponse.json();
                        /* Lines 73-83 omitted */
                    } else {/* Lines 84-85 omitted */}
                } else {
                    console.log('[Football Hook] No team_sport_a_id in match');
                }

                if (match.team_sport_b_id) {
                    console.log('[Football Hook] Fetching team_sport_b:', match.team_sport_b_id);
                    const teamSportBResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_b_id}`);
                    if (teamSportBResponse.ok) {/* Lines 94-105 omitted */} else {/* Lines 106-107 omitted */}
                } else {
                    console.log('[Football Hook] No team_sport_b_id in match');
                }

                // 3. Récupérer les informations de planification (terrain)
                let courtName: string | undefined = undefined;
                console.log('[Football Hook] Fetching schedule for match:', initialMatchId);
                const scheduleResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}/schedule`);
                console.log('[Football Hook] Schedule response status:', scheduleResponse.status);
                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    console.log('[Football Hook] Schedule data:', scheduleData.data);
                    if (scheduleData.data?.court_name) {
                        courtName = scheduleData.data.court_name;
                    } else if (scheduleData.data?.court_id) {
                        // fallback: si court_id seulement, essaye de trouver le nom dans courts
                        courtName = scheduleData.data.court_id.toString();
                    }
                } else {
                    console.warn('[Football Hook] Schedule not found (404) - this is normal if no schedule exists yet');
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
                    // Récupération robuste de l'id du tournoi
                    tournamentId: match.tournament_id || match.tournamentId || (match.tournament && (match.tournament.id || match.tournament.tournament_id)) || undefined,
                    court: courtName
                }));

                console.log('[Football Hook] Match data updated successfully');

            } catch (error) {
                console.error('[Football Hook] Error fetching match data:', error);
            }
        }

        fetchMatchData();
    }, [initialMatchId]);

    // Helper to get the correct team key
    function teamKey(team: "A" | "B"): "teamA" | "teamB" {
        return team === "A" ? "teamA" : "teamB";
    }

    /** ---------- CHRONO ---------- */
    // Chrono logic
    const [formattedTime, setFormattedTime] = useState<string>("00:00");
    function formatChrono(time: number): string {
        const min = Math.floor(time / 60);
        const sec = time % 60;
        return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    }
    // Update formattedTime when chrono changes
    useEffect(() => {
        setFormattedTime(formatChrono(matchData.chrono.time));
    }, [matchData.chrono.time]);

    // Chrono handlers
    const startChrono = () => {
        if (matchData.chrono.running) return;
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

    const handleEnd = () => {
        stopChrono();
        updateMatchStatus('termine');
    };

    /** ---------- POINTS ---------- */
    const addPoint = (team: "A" | "B") =>
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], score: p[k].score + 1 },
            };
        });

    const subPoint = (team: "A" | "B") =>
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], score: Math.max(0, p[k].score - 1) },
            };
        });

    /** ---------- CARTONS ---------- */
    const addYellowCard = (team: "A" | "B") =>
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], yellowCards: p[k].yellowCards + 1 },
            };
        });

    const subYellowCard = (team: "A" | "B") =>
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], yellowCards: Math.max(0, p[k].yellowCards - 1) },
            };
        });

    const addRedCard = (team: "A" | "B") =>
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], redCards: p[k].redCards + 1 },
            };
        });

    const subRedCard = (team: "A" | "B") =>
        setMatchData((p: MatchDataWithTournament) => {
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], redCards: Math.max(0, p[k].redCards - 1) },
            };
        });

    /** ---------- METADATA UPDATES ---------- */
    const setTeamName = (team: "A" | "B", name: string) =>
        setMatchData((p: MatchDataWithTournament) => ({
            ...p,
            [`team${team}`]: {
                ...p[`team${team}` as "teamA" | "teamB"],
                name,
            },
        }));

    const setTeamLogo = (team: "A" | "B", logo_url: string) =>
        setMatchData((p: MatchDataWithTournament) => ({
            ...p,
            [`team${team}`]: {
                ...p[`team${team}` as "teamA" | "teamB"],
                logo_url,
            },
        }));

    const setMatchType = (type: string) =>
        setMatchData((p: MatchDataWithTournament) => ({
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
            localStorage.setItem("liveFootballMatch", JSON.stringify(payload));
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
        setMatchData((p: MatchDataWithTournament) => ({
            ...p,
            teamA: { ...p.teamB },
            teamB: { ...p.teamA },
        }));

    return { matchData, formattedTime, handleEnd, startChrono, stopChrono, addPoint, subPoint, addYellowCard, subYellowCard, addRedCard, subRedCard, setTeamName, setTeamLogo, setMatchType, swapSides, court };
}
