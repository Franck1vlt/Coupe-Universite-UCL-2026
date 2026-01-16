import { useState, useRef, useEffect } from "react";
import { MatchData } from "./types";

// Ajout du type tournamentId si besoin
type MatchDataWithTournament = MatchData & { 
  tournamentId?: string | number; 
  court?: string;
  serviceTeam?: "A" | "B";
};

export function useVolleyballMatch(initialMatchId: string | null) {
    console.log('[Volleyball Hook] ========== VERSION 2.0 - With phase_id support ==========');
    const [matchData, setMatchData] = useState<MatchDataWithTournament>({
        matchId: initialMatchId,
        currentSet: 1,
        numberOfSets: 3,
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

    // UN SEUL useEffect pour récupérer les données du match
    useEffect(() => {
        if (!initialMatchId) return;

        async function fetchMatchData() {
            try {
                console.log('[Volleyball Hook] ========== STARTING FETCH ==========');
                console.log('[Volleyball Hook] Fetching match data for matchId:', initialMatchId);

                // 1. Récupérer les données du match
                const matchResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}`);
                if (!matchResponse.ok) {
                    console.error('[Volleyball Hook] Match not found:', matchResponse.status);
                    throw new Error('Match not found');
                }
                const matchResult = await matchResponse.json();
                const match = matchResult.data;
                console.log('[Volleyball Hook] Match data:', match);

                // 2. Récupérer le tournament_id depuis la phase
                let tournamentId: number | undefined = undefined;
                if (match.phase_id) {
                    console.log('[Volleyball Hook] Fetching tournament phase:', match.phase_id);
                    const phaseResponse = await fetch(`http://localhost:8000/tournament-phases/${match.phase_id}`);
                    if (phaseResponse.ok) {
                        const phaseData = await phaseResponse.json();
                        tournamentId = phaseData.data.tournament_id;
                        console.log('[Volleyball Hook] TournamentId from phase:', tournamentId);
                    }
                }

                // 3. Récupérer les informations des équipes
                let teamAName = "Team A";
                let teamALogo = "";
                let teamBName = "Team B";
                let teamBLogo = "";

                // Équipe A
                if (match.team_sport_a_id) {
                    console.log('[Volleyball Hook] Fetching team_sport_a:', match.team_sport_a_id);
                    const teamSportAResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_a_id}`);
                    if (teamSportAResponse.ok) {
                        const teamSportAData = await teamSportAResponse.json();
                        console.log('[Volleyball Hook] TeamSport A data:', teamSportAData.data);
                        const teamAResponse = await fetch(`http://localhost:8000/teams/${teamSportAData.data.team_id}`);
                        if (teamAResponse.ok) {
                            const teamAData = await teamAResponse.json();
                            teamAName = teamAData.data.name;
                            teamALogo = teamAData.data.logo_url || "";
                            console.log('[Volleyball Hook] Team A:', teamAName);
                        }
                    }
                } else if (match.team_a_source) {
                    // Fallback: afficher la source si l'équipe n'est pas encore résolue
                    teamAName = match.team_a_source;
                    console.log('[Volleyball Hook] Team A (source fallback):', teamAName);
                }

                // Équipe B
                if (match.team_sport_b_id) {
                    console.log('[Volleyball Hook] Fetching team_sport_b:', match.team_sport_b_id);
                    const teamSportBResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_b_id}`);
                    if (teamSportBResponse.ok) {
                        const teamSportBData = await teamSportBResponse.json();
                        console.log('[Volleyball Hook] TeamSport B data:', teamSportBData.data);
                        const teamBResponse = await fetch(`http://localhost:8000/teams/${teamSportBData.data.team_id}`);
                        if (teamBResponse.ok) {
                            const teamBData = await teamBResponse.json();
                            teamBName = teamBData.data.name;
                            teamBLogo = teamBData.data.logo_url || "";
                            console.log('[Volleyball Hook] Team B:', teamBName);
                        }
                    }
                } else if (match.team_b_source) {
                    // Fallback: afficher la source si l'équipe n'est pas encore résolue
                    teamBName = match.team_b_source;
                    console.log('[Volleyball Hook] Team B (source fallback):', teamBName);
                }

                // 3. Récupérer les informations de planification (terrain)
                let courtName: string | undefined = undefined;
                console.log('[Volleyball Hook] Fetching schedule for match:', initialMatchId);
                const scheduleResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}/schedule`);
                console.log('[Volleyball Hook] Schedule response status:', scheduleResponse.status);
                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    console.log('[Volleyball Hook] Schedule data:', scheduleData.data);
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

                console.log('[Volleyball Hook] Final values - TeamA:', teamAName, 'TeamB:', teamBName, 'MatchType:', matchType, 'Court:', courtName);
                console.log('[Volleyball Hook] TournamentId:', tournamentId);

                // 5. Mettre à jour le state avec les données récupérées
                setMatchData(prev => ({
                    ...prev,
                    teamA: { ...prev.teamA, name: teamAName, logo_url: teamALogo },
                    teamB: { ...prev.teamB, name: teamBName, logo_url: teamBLogo },
                    matchType: matchType,
                    tournamentId: tournamentId,
                    court: courtName
                }));

                console.log('[Volleyball Hook] Match data updated with tournamentId:', tournamentId);

            } catch (error) {
                console.error('[Volleyball Hook] Error fetching match data:', error);
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
        const pointsToWin = 25;
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

            // 4. Vérifier si le set est fini (toujours à 25 points)
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
        try {
            await fetch(`http://localhost:8000/matches/${initialMatchId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            console.log(`[Football Hook] Statut du match mis à jour: ${status}`);
        } catch (e) {
            console.error(`[Football Hook] Erreur lors de la mise à jour du statut du match (${status}) :`, e);
        }
    };

    /** ---------- SUBMIT RESULT ---------- */
    const submitMatchResult = async () => {
        if (!initialMatchId) return;
        try {
            const matchResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}`);
            if (!matchResponse.ok) throw new Error('Impossible de récupérer les données du match');
            const matchDataApi = await matchResponse.json();
            const match = matchDataApi.data;

            // --- MODIFICATION ICI ---
            // On prépare le payload avec les IDs s'ils existent
            const payload: any = {
                score_a: matchData.teamA.sets,
                score_b: matchData.teamB.sets,
                status: 'completed',
            };

            // On n'ajoute les IDs que s'ils sont présents dans le match d'origine
            if (match.team_sport_a_id) payload.team_sport_a_id = match.team_sport_a_id;
            if (match.team_sport_b_id) payload.team_sport_b_id = match.team_sport_b_id;
            
            // Optionnel : Retirer ou transformer l'alerte bloquante
            if (!match.team_sport_a_id || !match.team_sport_b_id) {
                console.warn('[Basketball Hook] ⚠️ Attention: Pas de team_sport_id. La propagation automatique pourrait échouer.');
                // Vous pouvez choisir de continuer quand même ou de bloquer ici
            }
            // -------------------------

            const response = await fetch(`http://localhost:8000/matches/${initialMatchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Basketball Hook] ❌ Error response:', errorText);
                throw new Error('Erreur lors de la soumission du résultat');
            }

            console.log('[Basketball Hook] ✅ Match result submitted successfully');

            // ⭐ MODIFICATION: Utiliser matchData.tournamentId au lieu de match.tournament_id
            if (matchData.tournamentId) {
                console.log('[Basketball Hook] 📝 Starting propagation for tournament:', matchData.tournamentId);
                
                const propagateResponse = await fetch(`http://localhost:8000/tournaments/${matchData.tournamentId}/propagate-results`, {
                    method: 'POST'
                });
                
                if (propagateResponse.ok) {
                    const propagateData = await propagateResponse.json();
                    console.log('[Basketball Hook] ✅ Propagation response:', propagateData);
                    
                    const propagatedCount = propagateData.data?.propagated_matches || 0;
                    if (propagatedCount > 0) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        alert(`Match terminé !\n${propagatedCount} match(s) propagé(s).`);
                    } else {
                        alert('Match terminé ! (Aucune propagation nécessaire)');
                    }
                } else {
                    const errorText = await propagateResponse.text();
                    console.error('[Basketball Hook] ❌ Propagation failed:', errorText);
                    alert('Match terminé, mais la propagation a échoué.');
                }
            } else {
                console.log('[Basketball Hook] ℹ️ No tournament ID, skipping propagation');
                alert('Match terminé !');
            }
        } catch (e) {
            console.error('[Basketball Hook] ❌ Error in submitMatchResult:', e);
            alert('Erreur lors de la fin du match : ' + String(e));
        }
    };
    

    /** ---------- SYNC TO LOCAL STORAGE ---------- */
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
                matchGround: court || "Terrain",    
                lastUpdate: new Date().toISOString(),
            };
            localStorage.setItem("liveVolleyballMatch", JSON.stringify(payload));
        } catch (e) {
            // Ignore storage errors
        }
    }, [matchData, formattedTime, court]);

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