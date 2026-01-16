import { useState, useRef, useEffect } from "react";
import { MatchData } from "./types";

type MatchDataWithTournament = MatchData & { tournamentId?: string | number; court?: string };

export function useFlechettesMatch(initialMatchId: string | null) {
    const [matchData, setMatchData] = useState<MatchDataWithTournament>({
        matchId: initialMatchId || "",
        teamA: {
            name: "Team A",
            logo_url: "",
            score: 301,  // Commence à 301
            sets: 0,
            players: ["Joueur 1A", "Joueur 2A"]
        },
        teamB: {
            name: "Team B",
            logo_url: "",
            score: 301,  // Commence à 301
            sets: 0,
            players: ["Joueur 1B", "Joueur 2B"]
        },
        matchType: "",
        gameMode: "BO3",
        currentPlayerIndex: 0,  // Commence avec joueur 1A
        currentThrows: [],      // Volée vide au départ
        previousScoreA: 301,
        previousScoreB: 301,
        lastThrowWasDouble: false,
        tournamentId: undefined
    });

    const intervalRef = useRef<number | null>(null);
    const [court, setCourt] = useState<string>("");

    // Récupérer les données du match depuis l'API
    useEffect(() => {
        if (!initialMatchId) return;

        async function fetchMatchData() {
            try {
                console.log('[Flechettes Hook] Fetching match data for matchId:', initialMatchId);

                // 1. Récupérer les données du match
                const matchResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}`);
                if (!matchResponse.ok) {
                    console.error('[Flechettes Hook] Match not found:', matchResponse.status);
                    throw new Error('Match not found');
                }
                const matchResult = await matchResponse.json();
                const match = matchResult.data;
                console.log('[Flechettes Hook] Match data:', match);

                // 2. Récupérer les informations des équipes
                let teamAName = "Team A";
                let teamALogo = "";
                let teamBName = "Team B";
                let teamBLogo = "";

                // Équipe A
                if (match.team_sport_a_id) {
                    console.log('[Flechettes Hook] Fetching team_sport_a:', match.team_sport_a_id);
                    const teamSportAResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_a_id}`);
                    if (teamSportAResponse.ok) {
                        const teamSportAData = await teamSportAResponse.json();
                        console.log('[Flechettes Hook] TeamSport A data:', teamSportAData.data);
                        const teamAResponse = await fetch(`http://localhost:8000/teams/${teamSportAData.data.team_id}`);
                        if (teamAResponse.ok) {
                            const teamAData = await teamAResponse.json();
                            teamAName = teamAData.data.name;
                            teamALogo = teamAData.data.logo_url || "";
                            console.log('[Flechettes Hook] Team A:', teamAName);
                        }
                    }
                } else if (match.team_a_source) {
                    // Fallback: afficher la source si l'équipe n'est pas encore résolue
                    teamAName = match.team_a_source;
                    console.log('[Flechettes Hook] Team A (source):', teamAName);
                }

                // Équipe B
                if (match.team_sport_b_id) {
                    console.log('[Flechettes Hook] Fetching team_sport_b:', match.team_sport_b_id);
                    const teamSportBResponse = await fetch(`http://localhost:8000/team-sports/${match.team_sport_b_id}`);
                    if (teamSportBResponse.ok) {
                        const teamSportBData = await teamSportBResponse.json();
                        console.log('[Flechettes Hook] TeamSport B data:', teamSportBData.data);
                        const teamBResponse = await fetch(`http://localhost:8000/teams/${teamSportBData.data.team_id}`);
                        if (teamBResponse.ok) {
                            const teamBData = await teamBResponse.json();
                            teamBName = teamBData.data.name;
                            teamBLogo = teamBData.data.logo_url || "";
                            console.log('[Flechettes Hook] Team B:', teamBName);
                        }
                    }
                } else if (match.team_b_source) {
                    // Fallback: afficher la source si l'équipe n'est pas encore résolue
                    teamBName = match.team_b_source;
                    console.log('[Flechettes Hook] Team B (source):', teamBName);
                }

                // 3. Récupérer les informations de planification (terrain)
                let courtName: string | undefined = undefined;
                console.log('[Flechettes Hook] Fetching schedule for match:', initialMatchId);
                const scheduleResponse = await fetch(`http://localhost:8000/matches/${initialMatchId}/schedule`);
                console.log('[Flechettes Hook] Schedule response status:', scheduleResponse.status);
                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    console.log('[Flechettes Hook] Schedule data:', scheduleData.data);
                    if (scheduleData.data?.court_name) {
                        courtName = scheduleData.data.court_name;
                    } else if (scheduleData.data?.court_id) {
                        courtName = scheduleData.data.court_id.toString();
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

                console.log('[Flechettes Hook] Final values - TeamA:', teamAName, 'TeamB:', teamBName, 'MatchType:', matchType, 'Court:', courtName);

                // 5. Mettre à jour le state avec les données récupérées
                setMatchData(prev => ({
                    ...prev,
                    teamA: { ...prev.teamA, name: teamAName, logo_url: teamALogo },
                    teamB: { ...prev.teamB, name: teamBName, logo_url: teamBLogo },
                    matchType: matchType,
                    tournamentId: match.tournament_id || match.tournamentId || (match.tournament && (match.tournament.id || match.tournament.tournament_id)) || undefined,
                    court: courtName
                }));

                console.log('[Flechettes Hook] Match data updated successfully');

            } catch (error) {
                console.error('[Flechettes Hook] Error fetching match data:', error);
            }
        }

        fetchMatchData();
    }, [initialMatchId]);

    /** ---------- GESTION DES JOUEURS ---------- */
    // Retourne le nom du joueur actuel
    const getCurrentPlayer = (): string => {
        const idx = matchData.currentPlayerIndex || 0;
        const playerNames = [
            matchData.teamA.players[0], // 1A
            matchData.teamB.players[0], // 1B
            matchData.teamA.players[1], // 2A
            matchData.teamB.players[1], // 2B
        ];
        return playerNames[idx];
    };

    // Retourne l'équipe du joueur actuel
    const getCurrentTeam = (): "A" | "B" => {
        const idx = matchData.currentPlayerIndex || 0;
        return (idx === 0 || idx === 2) ? "A" : "B";
    };

    /** ---------- GESTION DES FLÉCHETTES ---------- */
    // Ajoute une fléchette à la volée en cours
    const addThrow = (value: number, isDouble: boolean = false) => {
        setMatchData(p => {
            const currentThrows = p.currentThrows || [];

            // Maximum 3 fléchettes
            if (currentThrows.length >= 3) {
                console.warn('[Flechettes] Volée déjà complète (3 fléchettes)');
                return p;
            }

            const actualValue = isDouble ? value * 2 : value;
            const newThrows = [...currentThrows, actualValue];

            return {
                ...p,
                currentThrows: newThrows,
                lastThrowWasDouble: isDouble
            };
        });
    };

    // Multiplie la dernière fléchette lancée
    const multiplyLastThrow = (factor: number) => {
        setMatchData(p => {
            const currentThrows = p.currentThrows || [];

            if (currentThrows.length === 0) {
                console.warn('[Flechettes] Aucune fléchette à multiplier');
                return p;
            }

            const newThrows = [...currentThrows];
            const lastIndex = newThrows.length - 1;
            const baseValue = newThrows[lastIndex];

            // Si factor = 2, c'est un double
            // Si factor = 3, c'est un triple
            newThrows[lastIndex] = baseValue * factor;

            return {
                ...p,
                currentThrows: newThrows,
                lastThrowWasDouble: factor === 2
            };
        });
    };

    // Annule la dernière fléchette de la volée
    const cancelLastThrow = () => {
        setMatchData(p => {
            const currentThrows = p.currentThrows || [];

            if (currentThrows.length === 0) {
                console.warn('[Flechettes] Aucune fléchette à annuler');
                return p;
            }

            const newThrows = currentThrows.slice(0, -1);

            return {
                ...p,
                currentThrows: newThrows,
                lastThrowWasDouble: false
            };
        });
    };

    /** ---------- VALIDATION DE LA VOLÉE ---------- */
    const validateThrow = () => {
        setMatchData(p => {
            const currentThrows = p.currentThrows || [];
            const team = getCurrentTeam();
            const currentScore = team === "A" ? p.teamA.score : p.teamB.score;

            // Calculer le total de la volée
            const throwTotal = currentThrows.reduce((sum, val) => sum + val, 0);
            const newScore = currentScore - throwTotal;

            console.log(`[Flechettes] Validation - Score actuel: ${currentScore}, Volée: ${throwTotal}, Nouveau: ${newScore}`);

            // Sauvegarder les scores précédents avant modification
            const prevScoreA = p.teamA.score;
            const prevScoreB = p.teamB.score;

            // RÈGLE 1: BUST si score devient négatif
            if (newScore < 0) {
                console.warn('[Flechettes] BUST - Score négatif');
                alert(`BUST ! Le total (${throwTotal}) dépasse le score restant (${currentScore})`);
                return {
                    ...p,
                    currentThrows: [],
                    currentPlayerIndex: ((p.currentPlayerIndex || 0) + 1) % 4,
                    lastThrowWasDouble: false,
                    previousScoreA: prevScoreA,
                    previousScoreB: prevScoreB
                };
            }

            // RÈGLE 2: BUST si score devient 1 (impossible de finir)
            // COMMENTÉE: On autorise maintenant de finir sur 1 point exactement
            // if (newScore === 1) {
            //     console.warn('[Flechettes] BUST - Score à 1 (impossible)');
            //     alert('BUST ! Impossible de finir sur 1 point');
            //     return {
            //         ...p,
            //         currentThrows: [],
            //         currentPlayerIndex: ((p.currentPlayerIndex || 0) + 1) % 4,
            //         lastThrowWasDouble: false,
            //         previousScoreA: prevScoreA,
            //         previousScoreB: prevScoreB
            //     };
            // }

            // RÈGLE 3: Finish - Score à 0
            if (newScore === 0) {
                // Vérifier le double-out
                // COMMENTÉ: On n'exige plus le double pour finir
                // if (!p.lastThrowWasDouble) {
                //     console.warn('[Flechettes] BUST - Finish sans double');
                //     alert('BUST ! Pour finir, la dernière fléchette doit être un double');
                //     return {
                //         ...p,
                //         currentThrows: [],
                //         currentPlayerIndex: ((p.currentPlayerIndex || 0) + 1) % 4,
                //         lastThrowWasDouble: false,
                //         previousScoreA: prevScoreA,
                //         previousScoreB: prevScoreB
                //     };
                // }

                // FINISH VALIDE !
                console.log(`[Flechettes] FINISH VALIDE pour l'équipe ${team}`);

                // Incrémenter les sets de l'équipe gagnante
                const newTeamA = team === "A"
                    ? { ...p.teamA, score: 0, sets: p.teamA.sets + 1 }
                    : p.teamA;
                const newTeamB = team === "B"
                    ? { ...p.teamB, score: 0, sets: p.teamB.sets + 1 }
                    : p.teamB;

                // Vérifier si le match est terminé
                const setsToWin = p.gameMode === "BO5" ? 3 : 2;
                if (newTeamA.sets === setsToWin || newTeamB.sets === setsToWin) {
                    const winner = newTeamA.sets === setsToWin ? newTeamA.name : newTeamB.name;
                    alert(`🎯 VICTOIRE pour ${winner} !`);
                    return {
                        ...p,
                        teamA: newTeamA,
                        teamB: newTeamB,
                        currentThrows: [],
                        lastThrowWasDouble: false
                    };
                }

                // Sinon, reset pour le prochain set
                alert(`🎯 Set gagné par l'équipe ${team} ! Nouveau set à 301 points`);
                return {
                    ...p,
                    teamA: { ...newTeamA, score: 301 },
                    teamB: { ...newTeamB, score: 301 },
                    currentThrows: [],
                    currentPlayerIndex: 0,  // Recommence avec joueur 1A
                    lastThrowWasDouble: false,
                    previousScoreA: 301,
                    previousScoreB: 301
                };
            }

            // RÈGLE 4: Volée normale valide
            console.log('[Flechettes] Volée valide');
            const updatedTeamA = team === "A"
                ? { ...p.teamA, score: newScore }
                : p.teamA;
            const updatedTeamB = team === "B"
                ? { ...p.teamB, score: newScore }
                : p.teamB;

            return {
                ...p,
                teamA: updatedTeamA,
                teamB: updatedTeamB,
                currentThrows: [],
                currentPlayerIndex: ((p.currentPlayerIndex || 0) + 1) % 4,
                lastThrowWasDouble: false,
                previousScoreA: updatedTeamA.score,
                previousScoreB: updatedTeamB.score
            };
        });
    };

    /** ---------- BUST MANUEL ---------- */
    const declareBust = () => {
        setMatchData(p => {
            console.log('[Flechettes] BUST déclaré manuellement');
            return {
                ...p,
                currentThrows: [],
                currentPlayerIndex: ((p.currentPlayerIndex || 0) + 1) % 4,
                lastThrowWasDouble: false
            };
        });
    };

    /** ---------- RESET D'UN SET ---------- */
    const resetSet = () => {
        setMatchData(p => ({
            ...p,
            teamA: { ...p.teamA, score: 301 },
            teamB: { ...p.teamB, score: 301 },
            currentThrows: [],
            currentPlayerIndex: 0,
            lastThrowWasDouble: false,
            previousScoreA: 301,
            previousScoreB: 301
        }));
    };

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
                score_a: matchData.teamA.sets, // Le score principal devient le nombre de sets
                
                score_b: matchData.teamB.sets,
                sets_a: matchData.teamA.sets,
                sets_b: matchData.teamB.sets,
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
                        alert('Match terminé !');
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


    /** ---------- END MATCH ---------- */
    const handleEnd = async () => {
        await submitMatchResult();
    };
    /** ---------- GAME MODE ---------- */
    const [gameMode, setGameMode] = useState<"BO3" | "BO5">(matchData.gameMode || "BO3");

    useEffect(() => {
        setMatchData(p => ({
            ...p,
            gameMode: gameMode
        }));
    }, [gameMode]);

    /** ---------- SWIPE GAME MODE ---------- */
    const swipeGameMode = () => {
        setGameMode(prev => (prev === "BO3" ? "BO5" : "BO3"));
    };

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

    const setPlayerName = (team: "A" | "B", playerIndex: 0 | 1, name: string) => {
        setMatchData(p => {
            const teamKey = team === "A" ? "teamA" : "teamB";
            const newPlayers = [...p[teamKey].players];
            newPlayers[playerIndex] = name;
            return {
                ...p,
                [teamKey]: {
                    ...p[teamKey],
                    players: newPlayers
                }
            };
        });
    };

    /** ---------- SYNC TO LOCAL STORAGE ---------- */
    useEffect(() => {
        try {
            const payload = {
                team1: matchData.teamA.name || "ÉQUIPE A",
                team2: matchData.teamB.name || "ÉQUIPE B",
                matchType: matchData.matchType || "Match",
                scoreA: matchData.teamA.score,
                scoreB: matchData.teamB.score,
                setsA: matchData.teamA.sets,
                setsB: matchData.teamB.sets,
                gameMode: matchData.gameMode || "BO3",
                currentPlayer: getCurrentPlayer(),
                currentThrows: matchData.currentThrows || [],
                lastUpdate: new Date().toISOString(),
            };
            localStorage.setItem("liveFlechettesMatch", JSON.stringify(payload));
        } catch (e) {
            // Ignore storage errors
        }
    }, [matchData]);

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

    return {
        matchData,
        swipeGameMode,
        handleEnd,
        addThrow,
        multiplyLastThrow,
        cancelLastThrow,
        validateThrow,
        declareBust,
        resetSet,
        getCurrentPlayer,
        getCurrentTeam,
        gameMode,
        setGameMode,
        setTeamName,
        setTeamLogo,
        setMatchType,
        setPlayerName,
        swapSides,
        court,
        updateMatchStatus
    };
}
