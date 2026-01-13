import { useState, useRef, useEffect } from "react";
import { MatchData } from "./types";

// Ajout du type tournamentId si besoin
type MatchDataWithTournament = MatchData & { 
  tournamentId?: string | number; 
  court?: string;
  serviceTeam?: "A" | "B";
};

export function useBadmintonMatch(initialMatchId: string | null) {
    console.log('[Badminton Hook] ========== VERSION 2.0 - With phase_id support ==========');
    const [matchData, setMatchData] = useState<MatchDataWithTournament>({
        matchId: initialMatchId || "",
        teamA: { name: "Team A", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        teamB: { name: "Team B", logo_url: "", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        chrono: { time: 0, running: false, interval: null },
        hasPenalties: false,
        matchType: "",
        tournamentId: undefined
    });

    const updateMatchStatus = async (status: 'en_cours' | 'termine') => {
        if (!initialMatchId) return;
        try {
            await fetch(`http://localhost:8000/matches/${initialMatchId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
        } catch (e) {
            console.error(`[Badminton Hook] Erreur lors de la mise à jour du statut du match (${status}) :`, e);
        }
    };

    const intervalRef = useRef<number | null>(null);
    const [court, setCourt] = useState<string>("");

    // UN SEUL useEffect pour récupérer les données du match
    useEffect(() => {
        if (!initialMatchId) return;
        updateMatchStatus('en_cours');

        async function fetchMatchData() {
            try {
                console.log('[Badminton Hook] ========== STARTING FETCH ==========');
                console.log('[Badminton Hook] Fetching match data for matchId:', initialMatchId);

                // 1. Récupérer les données du match
                const matchResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}`);
                if (!matchResponse.ok) {
                    console.error('[Badminton Hook] Match not found:', matchResponse.status);
                    throw new Error('Match not found');
                }
                const matchResult = await matchResponse.json();
                const match = matchResult.data;
                console.log('[Badminton Hook] Match data:', match);

                // 2. Récupérer le tournament_id depuis la phase
                let tournamentId: number | undefined = undefined;
                if (match.phase_id) {
                    console.log('[Badminton Hook] Fetching tournament phase:', match.phase_id);
                    const phaseResponse = await fetch(`http://localhost:8000/tournament-phases/${match.phase_id}`);
                    if (phaseResponse.ok) {
                        const phaseData = await phaseResponse.json();
                        tournamentId = phaseData.data.tournament_id;
                        console.log('[Badminton Hook] TournamentId from phase:', tournamentId);
                    }
                }

                // 3. Récupérer les informations des équipes
                let teamAName = "Team A";
                let teamALogo = "";
                let teamBName = "Team B";
                let teamBLogo = "";

                // Équipe A
                if (match.team_sport_a_id) {
                    console.log('[Badminton Hook] Fetching team_sport_a:', match.team_sport_a_id);
                    const teamSportAResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_a_id}`);
                    if (teamSportAResponse.ok) {
                        const teamSportAData = await teamSportAResponse.json();
                        console.log('[Badminton Hook] TeamSport A data:', teamSportAData.data);
                        const teamAResponse = await fetch(`http://localhost:8000/teams/${teamSportAData.data.team_id}`);
                        if (teamAResponse.ok) {
                            const teamAData = await teamAResponse.json();
                            teamAName = teamAData.data.name;
                            teamALogo = teamAData.data.logo_url || "";
                            console.log('[Badminton Hook] Team A:', teamAName);
                        }
                    }
                } else if (match.team_a_source) {
                    // Fallback: afficher la source si l'équipe n'est pas encore résolue
                    teamAName = match.team_a_source;
                    console.log('[Badminton Hook] Team A (source fallback):', teamAName);
                }

                // Équipe B
                if (match.team_sport_b_id) {
                    console.log('[Badminton Hook] Fetching team_sport_b:', match.team_sport_b_id);
                    const teamSportBResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_b_id}`);
                    if (teamSportBResponse.ok) {
                        const teamSportBData = await teamSportBResponse.json();
                        console.log('[Badminton Hook] TeamSport B data:', teamSportBData.data);
                        const teamBResponse = await fetch(`http://localhost:8000/teams/${teamSportBData.data.team_id}`);
                        if (teamBResponse.ok) {
                            const teamBData = await teamBResponse.json();
                            teamBName = teamBData.data.name;
                            teamBLogo = teamBData.data.logo_url || "";
                            console.log('[Badminton Hook] Team B:', teamBName);
                        }
                    }
                } else if (match.team_b_source) {
                    // Fallback: afficher la source si l'équipe n'est pas encore résolue
                    teamBName = match.team_b_source;
                    console.log('[Badminton Hook] Team B (source fallback):', teamBName);
                }

                // 3. Récupérer les informations de planification (terrain)
                let courtName: string | undefined = undefined;
                console.log('[Badminton Hook] Fetching schedule for match:', initialMatchId);
                const scheduleResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}/schedule`);
                console.log('[Badminton Hook] Schedule response status:', scheduleResponse.status);
                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    console.log('[Badminton Hook] Schedule data:', scheduleData.data);
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

                console.log('[Badminton Hook] Final values - TeamA:', teamAName, 'TeamB:', teamBName, 'MatchType:', matchType, 'Court:', courtName);
                console.log('[Badminton Hook] TournamentId:', tournamentId);

                // 5. Mettre à jour le state avec les données récupérées
                setMatchData(prev => ({
                    ...prev,
                    teamA: { ...prev.teamA, name: teamAName, logo_url: teamALogo },
                    teamB: { ...prev.teamB, name: teamBName, logo_url: teamBLogo },
                    matchType: matchType,
                    tournamentId: tournamentId,
                    court: courtName
                }));

                console.log('[Badminton Hook] Match data updated with tournamentId:', tournamentId);

            } catch (error) {
                console.error('[Badminton Hook] Error fetching match data:', error);
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
                serviceTeam: team, // L'équipe qui marque obtient le service
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

    const changeService = () =>
        setMatchData((p: MatchDataWithTournament) => ({
            ...p,
            serviceTeam: p.serviceTeam === "A" ? "B" : "A",
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
                serviceTeam: matchData.serviceTeam || "A",
                lastUpdate: new Date().toISOString(),
            };
            localStorage.setItem("liveBadmintonMatch", JSON.stringify(payload));
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
            serviceTeam: p.serviceTeam === "A" ? "B" : "A", // Inverser le service aussi
        }));

    return { matchData, formattedTime, handleEnd, startChrono, stopChrono, addPoint, subPoint, addYellowCard, subYellowCard, addRedCard, subRedCard, setTeamName, setTeamLogo, setMatchType, swapSides, court, changeService };
}