import { useState, useRef, useEffect } from "react";
import { MatchData } from "./types";
import { submitMatchResultWithPropagation, updateMatchStatus as updateStatus } from "../common/useMatchPropagation";
import { useLiveScoreSync } from "../common/useLiveScoreSync";

// Ajout du type tournamentId si besoin
type MatchDataWithTournament = MatchData & {
  tournamentId?: string | number;
  court?: string;
  serviceTeam?: "A" | "B";
  numericId?: number;  // ID numérique pour SSE
};

export function useBadmintonMatch(initialMatchId: string | null) {
    console.log('[Badminton Hook] ========== VERSION 2.0 - With phase_id support ==========');
    const [matchData, setMatchData] = useState<MatchDataWithTournament>({
        matchId: initialMatchId,
        currentSet: 1,
        numberOfSets: 1,
        teamA: {
            name: "Team A",
            score: 0,
            sets: 0,
            logo_url: "", // Correction ici
        },
        teamB: {
            name: "Team B",
            score: 0,
            sets: 0,
            logo_url: "", // Correction ici
        },
        serviceTeam: "A",
        chrono: { time: 0, running: false, interval: null },
        matchType: "",
        tournamentId: undefined    
    });


    const intervalRef = useRef<number | null>(null);
    const [court, setCourt] = useState<string>("");

    // Hook pour synchronisation live vers backend SSE
    const { sendLiveScore, cleanup: cleanupLiveScore } = useLiveScoreSync();

    // UN SEUL useEffect pour récupérer les données du match
    useEffect(() => {
        if (!initialMatchId) return;

        async function fetchMatchData() {
            try {
                console.log('[Badminton Hook] ========== STARTING FETCH ==========');
                console.log('[Badminton Hook] Fetching match data for matchId:', initialMatchId);

                // 1. Récupérer les données du match
                const matchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}`);
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
                    const phaseResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament-phases/${match.phase_id}`);
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
                    const teamSportAResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team-sports/${match.team_sport_a_id}`);
                    if (teamSportAResponse.ok) {
                        const teamSportAData = await teamSportAResponse.json();
                        console.log('[Badminton Hook] TeamSport A data:', teamSportAData.data);
                        const teamAResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSportAData.data.team_id}`);
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
                    const teamSportBResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team-sports/${match.team_sport_b_id}`);
                    if (teamSportBResponse.ok) {
                        const teamSportBData = await teamSportBResponse.json();
                        console.log('[Badminton Hook] TeamSport B data:', teamSportBData.data);
                        const teamBResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSportBData.data.team_id}`);
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
                const scheduleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}/schedule`);
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
                    court: courtName,
                    numericId: match.id  // Store numeric ID for SSE
                }));

                console.log('[Badminton Hook] Match data updated with tournamentId:', tournamentId, 'numericId:', match.id);

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

    const resetChrono = () => {
        setMatchData((prev) => ({
            ...prev,
            chrono: { ...prev.chrono, time: 0 }
        }));
    };

    const handleEnd = async () => {
        stopChrono();
        await submitMatchResult();
    };

    /** Sets */
    const setNumSets = (num: number) =>
    setMatchData((p: MatchDataWithTournament) => ({
        ...p,
        numberOfSets: num,
    }));

    function isSetFinished(scoreA: number, scoreB: number) {
        const pointsToWin = 21;
        if (scoreA >= pointsToWin || scoreB >= pointsToWin) {
            return Math.abs(scoreA - scoreB) >= 2;
        }
        return false;
    }

    /** ---------- POINTS ---------- */
    function addPoint(team: "A" | "B") {
        setMatchData(prev => {
            // 1. Bloquer si le match est déjà terminé
            if (prev.teamA.sets >= prev.numberOfSets || prev.teamB.sets >= prev.numberOfSets) {
                return prev; 
            }

            const next = structuredClone(prev) as MatchDataWithTournament;
            const key = team === "A" ? "teamA" : "teamB";
            
            // 2. Ajouter le point
            next[key].score += 1;

            // 3. TRANSFERT DU SERVICE : l'équipe qui marque prend le service
            next.serviceTeam = team;

            // 4. Vérifier si le set est fini (toujours à 21 points)
            if (isSetFinished(next.teamA.score, next.teamB.score)) {
                const winner = next.teamA.score > next.teamB.score ? "A" : "B";
                const winnerKey = winner === "A" ? "teamA" : "teamB";
                
                // Incrémenter le set gagné
                next[winnerKey].sets += 1;

                // 5. Vérifier la victoire finale
                if (next[winnerKey].sets >= next.numberOfSets) {
                    alert(`MATCH TERMINÉ ! Victoire de ${next[winnerKey].name}`);
                    // On garde les scores affichés mais on arrête la logique
                } else {
                    // Nouveau set : remise à zéro et le gagnant du set garde le service
                    next.teamA.score = 0;
                    next.teamB.score = 0;
                    next.currentSet += 1;
                    next.serviceTeam = winner; 
                }
            }
            return next;
        });
    }

    const subPoint = (team: "A" | "B") =>
        setMatchData((p: MatchDataWithTournament) => {
            // Empêcher la modification si le match est fini
            if (p.teamA.sets >= p.numberOfSets || p.teamB.sets >= p.numberOfSets) {
                return p;
            }
            const k = teamKey(team);
            return {
                ...p,
                [k]: { ...p[k], score: Math.max(0, p[k].score - 1) },
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

    /** ---------- STATUS ---------- */
    const updateMatchStatus = async (status: 'scheduled' | 'in_progress' | 'completed') => {
        if (!initialMatchId) return;
        await updateStatus(initialMatchId, status);
    };

    /** ---------- SUBMIT RESULT ---------- */
    const submitMatchResult = async () => {
        if (!initialMatchId) return;

        const result = await submitMatchResultWithPropagation({
            matchId: initialMatchId,
            tournamentId: matchData.tournamentId,
            payload: {
                score_a: matchData.teamA.sets,
                score_b: matchData.teamB.sets,
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
                console.error('[Badminton Hook] ❌ Error:', error);
                alert('Erreur lors de la fin du match : ' + error);
            },
        });

        console.log('[Badminton Hook] Submit result:', result);
    };
    

    /** ---------- SYNC TO LOCAL STORAGE + BACKEND SSE ---------- */
    useEffect(() => {
        try {
            const payload = {
                team1: matchData.teamA.name || "ÉQUIPE A",
                team2: matchData.teamB.name || "ÉQUIPE B",
                matchType: matchData.matchType || "Match",
                score1: matchData.teamA.score,
                score2: matchData.teamB.score,
                sets1: matchData.teamA.sets,
                sets2: matchData.teamB.sets,
                chrono: formattedTime,
                serviceTeam: matchData.serviceTeam,
                matchGround: court || matchData.court || "Terrain",
                logo1: matchData.teamA.logo_url || "",
                logo2: matchData.teamB.logo_url || "",
                lastUpdate: new Date().toISOString(),
            };
            // Sync to localStorage (for same-device spectator)
            localStorage.setItem("liveBadmintonMatch", JSON.stringify(payload));

            // Sync to backend SSE (for cross-device split-screen spectators)
            // Use numeric ID for SSE so split-screen can match subscriptions
            const sseMatchId = matchData.numericId?.toString() || initialMatchId;
            if (sseMatchId) {
                sendLiveScore({
                    matchId: sseMatchId,
                    sport: 'badminton',
                    payload,
                });
            }
        } catch (e) {
            // Ignore storage errors
        }
    }, [matchData, formattedTime, court, initialMatchId, sendLiveScore]);

    // Cleanup à l'unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            // Cleanup live score sync
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
            serviceTeam: p.serviceTeam === "A" ? "B" : "A", // Inverser le service aussi
        }));

    return { 
        matchData, 
        formattedTime, 
        handleEnd, 
        submitMatchResult, 
        startChrono, 
        stopChrono, 
        addPoint, 
        subPoint, 
        setTeamName, 
        setTeamLogo, 
        setMatchType, 
        swapSides, 
        court, 
        changeService,
        updateMatchStatus,
        setNumSets,
        resetChrono
    };
}