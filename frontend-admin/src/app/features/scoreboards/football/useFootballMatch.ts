import { useState, useRef, useEffect } from "react";
import { MatchData } from "./types";

// Ajout du type tournamentId si besoin
type MatchDataWithTournament = MatchData & { tournamentId?: string | number; court?: string };
type TournamentMatchStatus = "planifié" | "en-cours" | "terminé" | "annulé";

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

    // Fonction pour rafraîchir les données du match après propagation
    const refreshMatchData = async () => {
        if (!initialMatchId) return;
        
        try {
            console.log('[Football Hook] Rafraîchissement des données du match après propagation...');
            
            // Récupérer les données mises à jour du match
            const matchResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}`);
            if (!matchResponse.ok) {
                console.error('[Football Hook] Erreur lors du rafraîchissement:', matchResponse.status);
                return;
            }
            
            const matchResult = await matchResponse.json();
            const match = matchResult.data;
            
            // Récupérer les noms des équipes mises à jour
            let teamAName = "Team A";
            let teamALogo = "";
            let teamBName = "Team B";
            let teamBLogo = "";

            // Équipe A
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
            } else if (match.team_a_source) {
                teamAName = match.team_a_source;
            }

            // Équipe B
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
            } else if (match.team_b_source) {
                teamBName = match.team_b_source;
            }

            console.log('[Football Hook] Données rafraîchies - TeamA:', teamAName, 'TeamB:', teamBName);
            
            // Mettre à jour uniquement les noms des équipes sans toucher aux scores
            setMatchData(prev => ({
                ...prev,
                teamA: { ...prev.teamA, name: teamAName, logo_url: teamALogo },
                teamB: { ...prev.teamB, name: teamBName, logo_url: teamBLogo },
            }));
            
        } catch (error) {
            console.error('[Football Hook] Erreur lors du rafraîchissement:', error);
        }
    };

    const submitMatchResult = async () => {
        if (!initialMatchId) return;
        try {
            // ⚠️ IMPORTANT : Récupérer d'abord les données complètes du match
            // pour obtenir les team_sport_id
            console.log('[Football Hook] Récupération des données du match avant soumission...');
            const matchResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}`);

            if (!matchResponse.ok) {
                console.error('[Football Hook] Impossible de récupérer le match');
                throw new Error('Impossible de récupérer les données du match');
            }

            const backendMatchData = await matchResponse.json();
            const match = backendMatchData.data;

            console.log('[Football Hook] Données du match:', match);
            console.log('[Football Hook] team_sport_a_id:', match.team_sport_a_id);
            console.log('[Football Hook] team_sport_b_id:', match.team_sport_b_id);
            console.log('[Football Hook] team_a_source:', match.team_a_source);
            console.log('[Football Hook] team_b_source:', match.team_b_source);

            // ✅ FIX: Vérifier que les équipes sont bien assignées (soit via ID, soit via source)
            const hasTeamIds = match.team_sport_a_id && match.team_sport_b_id;
            const hasTeamSources = match.team_a_source && match.team_b_source;

            if (!hasTeamIds && !hasTeamSources) {
                console.error('[Football Hook] ❌ ERREUR : Les équipes ne sont pas assignées au match !');
                alert('Erreur : Les équipes ne sont pas assignées à ce match. Impossible de terminer le match.');
                return;
            }

            // ✅ FIX: Construire le payload avec les données disponibles
            const payload: any = {
                score_a: matchData.teamA.score,
                score_b: matchData.teamB.score,
                status: 'completed'
            };

            // Inclure les team_sport_id seulement s'ils existent
            if (match.team_sport_a_id) payload.team_sport_a_id = match.team_sport_a_id;
            if (match.team_sport_b_id) payload.team_sport_b_id = match.team_sport_b_id;

            console.log('[Football Hook] Payload de soumission:', payload);

            const response = await fetch(`http://localhost:8000/matches/${initialMatchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error('[Football Hook] Erreur lors de la soumission');
                throw new Error('Erreur lors de la soumission du résultat');
            }

            console.log('[Football Hook] Résultat du match soumis avec succès');

            // ✅ FIX: Récupérer le tournamentId depuis le match ou le state local
            const tournamentId = match.tournament_id || matchData.tournamentId;

            if (tournamentId) {
                console.log('[Football Hook] Lancement de la propagation pour le tournoi:', tournamentId);

                const propagateResponse = await fetch(`http://localhost:8000/tournaments/${tournamentId}/propagate-results`, {
                    method: 'POST'
                });

                if (propagateResponse.ok) {
                    const propagateData = await propagateResponse.json();
                    console.log('[Football Hook] Propagation réussie:', propagateData);

                    const propagatedCount = propagateData.data?.propagated_matches || 0;

                    if (propagatedCount > 0) {
                        console.log(`[Football Hook] ${propagatedCount} match(s) propagé(s)`);

                        // Attendre un peu pour que le backend finalise
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Rafraîchir les données
                        await refreshMatchData();

                        alert(`Match terminé !\n${propagatedCount} match(s) propagé(s) avec les équipes gagnantes/perdantes.`);
                    } else {
                        alert('Match terminé !');
                    }
                } else {
                    console.warn('[Football Hook] La propagation a échoué');
                    alert('Match terminé, mais la propagation a échoué. Utilisez le bouton "Propager les résultats" dans le menu.');
                }

                // ✅ FIX: Recalculer les classements de poule si le match est un match de poule
                if (match.pool_id) {
                    console.log('[Football Hook] Recalcul du classement de la poule:', match.pool_id);
                    try {
                        const recalcResponse = await fetch(`http://localhost:8000/pools/${match.pool_id}/recalculate-standings`, {
                            method: 'POST'
                        });
                        if (recalcResponse.ok) {
                            console.log('[Football Hook] Classement de poule recalculé avec succès');
                        } else {
                            console.warn('[Football Hook] Échec du recalcul du classement de poule');
                        }
                    } catch (err) {
                        console.error('[Football Hook] Erreur lors du recalcul du classement:', err);
                    }
                }
            }
        } catch (e) {
            console.error('[Football Hook] Erreur:', e);
            if (e instanceof Error) {
                alert('Erreur lors de la fin du match : ' + e.message);
            } else {
                alert('Erreur lors de la fin du match : ' + String(e));
            }
        }
    };

    const intervalRef = useRef<number | null>(null);
    const [court, setCourt] = useState<string>("");

    // UN SEUL useEffect pour récupérer les données du match
    useEffect(() => {
        if (!initialMatchId) return;

        async function fetchMatchData() {
            // Récupérer d'abord le statut du match
            try {
                const statusResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}/status`);
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
                const matchResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}`);
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
                        }
                    }
                } else if (match.team_a_source) {
                    // Fallback: afficher la source si l'équipe n'est pas encore résolue
                    teamAName = match.team_a_source;
                    console.log('[Football Hook] Team A (source fallback):', teamAName);
                }

                // Équipe B
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
                        }
                    }
                } else if (match.team_b_source) {
                    // Fallback: afficher la source si l'équipe n'est pas encore résolue
                    teamBName = match.team_b_source;
                    console.log('[Football Hook] Team B (source fallback):', teamBName);
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

        // Mettre à jour le statut du match à "in_progress"
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

        // Soumettre les résultats du match (scores + status completed en une seule requête)
        // Cela déclenche automatiquement la propagation des équipes vers les matchs suivants
        await submitMatchResult();
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
                court: matchData.court || court || "Terrain",
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