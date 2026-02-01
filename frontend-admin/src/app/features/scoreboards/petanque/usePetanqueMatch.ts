import { useState, useRef, useEffect } from "react";
import { MatchData, MeneHistory } from "./types";
import { submitMatchResultWithPropagation, updateMatchStatus as updateStatus } from "../common/useMatchPropagation";
import { useLiveScoreSync } from "../common/useLiveScoreSync";

type MatchDataWithTournament = MatchData & { tournamentId?: string | number; court?: string; numericId?: number };

export function usePetanqueMatch(initialMatchId: string | null) {
    const [matchData, setMatchData] = useState<MatchDataWithTournament>({
        matchId: initialMatchId || "",
        teamA: {
            name: "Team A",
            logo_url: "",
            score: 0,  // Commence à 0, monte vers 13
            sets: 0
        },
        teamB: {
            name: "Team B",
            logo_url: "",
            score: 0,  // Commence à 0, monte vers 13
            sets: 0
        },
        matchType: "",
        matchGround: "",
        gameMode: "BO3",
        cochonnetTeam: "A",      // Équipe A lance le cochonnet au début
        pendingPoints: 0,        // Pas de points en attente
        pendingWinner: null,     // Pas de gagnant en attente
        meneHistory: [],         // Historique vide
        targetScore: 13,         // Match en 13 points
        tournamentId: undefined,
        numericId: undefined     // ID numérique pour SSE
    });

    const intervalRef = useRef<number | null>(null);
    const [court, setCourt] = useState<string>("");
    const [isMatchWon, setIsMatchWon] = useState<boolean>(false);
    const [matchWinner, setMatchWinner] = useState<"A" | "B" | null>(null);

    // Hook pour synchronisation live vers backend SSE
    const { sendLiveScore, sendLiveScoreImmediate, cleanup: cleanupLiveScore } = useLiveScoreSync();

    // Helper to build and send score payload IMMEDIATELY (no debounce)
    const sendImmediateUpdate = async (updatedData: Partial<typeof matchData>, newMatchWinner?: "A" | "B" | null) => {
        const sseMatchId = updatedData.numericId?.toString() || matchData.numericId?.toString() || initialMatchId;
        if (!sseMatchId) return;

        const currentData = { ...matchData, ...updatedData };
        const winner = newMatchWinner !== undefined ? newMatchWinner : matchWinner;

        const payload = {
            team1: currentData.teamA.name || "ÉQUIPE A",
            team2: currentData.teamB.name || "ÉQUIPE B",
            logo1: currentData.teamA.logo_url || "",
            logo2: currentData.teamB.logo_url || "",
            matchType: currentData.matchType || "Match",
            matchGround: currentData.matchGround || currentData.court || court || "Terrain",
            scoreA: currentData.teamA.score,
            scoreB: currentData.teamB.score,
            setsA: currentData.teamA.sets,
            setsB: currentData.teamB.sets,
            gameMode: currentData.gameMode || "BO3",
            cochonnetTeam: currentData.cochonnetTeam,
            pendingWinner: currentData.pendingWinner,
            pendingPoints: currentData.pendingPoints,
            targetScore: currentData.targetScore,
            meneCount: currentData.meneHistory?.length || 0,
            lastUpdate: new Date().toISOString(),
            winner: winner ? (winner === "A" ? currentData.teamA.name : currentData.teamB.name) : null,
        };

        console.log('[Petanque Hook] 🚀 IMMEDIATE SSE update:', { matchId: sseMatchId, scoreA: payload.scoreA, scoreB: payload.scoreB, cochonnetTeam: payload.cochonnetTeam });

        await sendLiveScoreImmediate({
            matchId: sseMatchId,
            sport: 'petanque',
            payload,
        });
    };

    // Récupérer les données du match depuis l'API
    useEffect(() => {
        if (!initialMatchId) return;

        async function fetchMatchData() {
            try {
                console.log('[Petanque Hook] Fetching match data for matchId:', initialMatchId);

                // 1. Récupérer les données du match
                const matchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}`);
                if (!matchResponse.ok) {
                    console.error('[Petanque Hook] Match not found:', matchResponse.status);
                    throw new Error('Match not found');
                }
                const matchResult = await matchResponse.json();
                const match = matchResult.data;
                console.log('[Petanque Hook] Match data:', match);

                // 2. Récupérer les informations des équipes
                let teamAName = "Team A";
                let teamALogo = "";
                let teamBName = "Team B";
                let teamBLogo = "";

                // Équipe A
                if (match.team_sport_a_id) {
                    console.log('[Petanque Hook] Fetching team_sport_a:', match.team_sport_a_id);
                    const teamSportAResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team-sports/${match.team_sport_a_id}`);
                    if (teamSportAResponse.ok) {
                        const teamSportAData = await teamSportAResponse.json();
                        console.log('[Petanque Hook] TeamSport A data:', teamSportAData.data);
                        const teamAResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSportAData.data.team_id}`);
                        if (teamAResponse.ok) {
                            const teamAData = await teamAResponse.json();
                            teamAName = teamAData.data.name;
                            teamALogo = teamAData.data.logo_url || "";
                            console.log('[Petanque Hook] Team A:', teamAName);
                        }
                    }
                } else if (match.team_a_source) {
                    // Fallback: afficher la source si l'équipe n'est pas encore résolue
                    teamAName = match.team_a_source;
                    console.log('[Petanque Hook] Team A (source):', teamAName);
                }

                // Équipe B
                if (match.team_sport_b_id) {
                    console.log('[Petanque Hook] Fetching team_sport_b:', match.team_sport_b_id);
                    const teamSportBResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team-sports/${match.team_sport_b_id}`);
                    if (teamSportBResponse.ok) {
                        const teamSportBData = await teamSportBResponse.json();
                        console.log('[Petanque Hook] TeamSport B data:', teamSportBData.data);
                        const teamBResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSportBData.data.team_id}`);
                        if (teamBResponse.ok) {
                            const teamBData = await teamBResponse.json();
                            teamBName = teamBData.data.name;
                            teamBLogo = teamBData.data.logo_url || "";
                            console.log('[Petanque Hook] Team B:', teamBName);
                        }
                    }
                } else if (match.team_b_source) {
                    // Fallback: afficher la source si l'équipe n'est pas encore résolue
                    teamBName = match.team_b_source;
                    console.log('[Petanque Hook] Team B (source):', teamBName);
                }

                // 3. Récupérer les informations de planification (terrain)
                let courtName: string | undefined = undefined;
                console.log('[Petanque Hook] Fetching schedule for match:', initialMatchId);
                const scheduleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}/schedule`);
                console.log('[Petanque Hook] Schedule response status:', scheduleResponse.status);
                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    console.log('[Petanque Hook] Schedule data:', scheduleData.data);
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

                console.log('[Petanque Hook] Final values - TeamA:', teamAName, 'TeamB:', teamBName, 'MatchType:', matchType, 'Court:', courtName);

                // 5. Mettre à jour le state avec les données récupérées
                setMatchData(prev => ({
                    ...prev,
                    teamA: { ...prev.teamA, name: teamAName, logo_url: teamALogo },
                    teamB: { ...prev.teamB, name: teamBName, logo_url: teamBLogo },
                    matchType: matchType,
                    matchGround: courtName || "",
                    tournamentId: match.tournament_id || match.tournamentId || (match.tournament && (match.tournament.id || match.tournament.tournament_id)) || undefined,
                    court: courtName,
                    numericId: match.id  // Store numeric ID for SSE broadcast
                }));
                console.log('[Petanque Hook] Stored numeric match ID for SSE:', match.id);

                // Mettre à jour aussi le state court séparé
                if (courtName) {
                    setCourt(courtName);
                }

                console.log('[Petanque Hook] Match data updated successfully');

            } catch (error) {
                console.error('[Petanque Hook] Error fetching match data:', error);
            }
        }

        fetchMatchData();
    }, [initialMatchId]);

    /** ---------- GESTION DU COCHONNET ---------- */
    // Retourne l'équipe qui doit lancer le cochonnet
    const getCochonnetTeam = (): "A" | "B" => {
        return matchData.cochonnetTeam;
    };

    // Retourne le texte à afficher pour le cochonnet
    const getCurrentPlayer = (): string => {
        const team = matchData.cochonnetTeam;
        const teamName = team === "A" ? matchData.teamA.name : matchData.teamB.name;
        return `${teamName} de lancer le cochonnet`;
    };

    // Change manuellement l'équipe qui a le cochonnet (bouton Service)
    const changeService = () => {
        setMatchData(p => {
            const newCochonnetTeam: "A" | "B" = p.cochonnetTeam === "A" ? "B" : "A";
            const newState = {
                ...p,
                cochonnetTeam: newCochonnetTeam
            };
            // Send IMMEDIATE update for cochonnet change
            sendImmediateUpdate(newState, null);
            return newState;
        });
    };

    /** ---------- GESTION DES MÈNES ---------- */
    // Sélectionne l'équipe gagnante de la mène (étape 1)
    const selectMeneWinner = (team: "A" | "B") => {
        setMatchData(p => ({
            ...p,
            pendingWinner: team,
            pendingPoints: p.pendingPoints || 1 // Par défaut 1 point si pas encore sélectionné
        }));
    };

    // Ajoute des points pour la mène en cours (étape 2)
    const addThrow = (points: number) => {
        setMatchData(p => ({
            ...p,
            pendingPoints: points,
            currentThrows: [points] // Pour compatibilité avec l'affichage existant
        }));
    };

    // Valide la mène et attribue les points (étape 3)
    const validateThrow = () => {
        // 1. Empêcher la validation si le match est déjà terminé
        if (isMatchWon) {
            console.warn('[Petanque] Le match est déjà terminé.');
            return;
        }

        // Use functional update but also capture the new state for immediate send
        setMatchData(p => {
            if (!p.pendingWinner || p.pendingPoints <= 0) {
                console.warn('[Petanque] Sélectionnez d\'abord une équipe gagnante et les points');
                return p;
            }

            const points = p.pendingPoints;
            const winner = p.pendingWinner;

            // 2. Calculer le nouveau score en plafonnant au targetScore
            const newScoreA = winner === "A"
                ? Math.min(p.teamA.score + points, p.targetScore)
                : p.teamA.score;
            const newScoreB = winner === "B"
                ? Math.min(p.teamB.score + points, p.targetScore)
                : p.teamB.score;

            const meneRecord: MeneHistory = {
                winner: winner,
                points: points,
                scoreABefore: p.teamA.score,
                scoreBBefore: p.teamB.score,
                cochonnetBefore: p.cochonnetTeam
            };

            // 3. Vérifier la condition de victoire
            const isMatchOver = newScoreA >= p.targetScore || newScoreB >= p.targetScore;
            const winningTeam = isMatchOver ? (newScoreA >= p.targetScore ? "A" : "B") : null;

            if (isMatchOver && winningTeam) {
                setIsMatchWon(true);
                setMatchWinner(winningTeam);

                const newSetsA = winningTeam === "A" ? p.teamA.sets + 1 : p.teamA.sets;
                const newSetsB = winningTeam === "B" ? p.teamB.sets + 1 : p.teamB.sets;

                const newState = {
                    ...p,
                    teamA: { ...p.teamA, score: newScoreA, sets: newSetsA },
                    teamB: { ...p.teamB, score: newScoreB, sets: newSetsB },
                    pendingWinner: null,
                    pendingPoints: 0,
                    meneHistory: [...p.meneHistory, meneRecord],
                    cochonnetTeam: winner
                };

                // Send IMMEDIATE update (winner of mène gets cochonnet)
                sendImmediateUpdate(newState, winningTeam);

                return newState;
            }

            // Mène normale - winner gets cochonnet
            const newState = {
                ...p,
                teamA: { ...p.teamA, score: newScoreA },
                teamB: { ...p.teamB, score: newScoreB },
                pendingWinner: null,
                pendingPoints: 0,
                meneHistory: [...p.meneHistory, meneRecord],
                cochonnetTeam: winner  // Winner of mène gets the cochonnet!
            };

            // Send IMMEDIATE update (winner of mène gets cochonnet)
            sendImmediateUpdate(newState, null);

            return newState;
        });
    };

    // Annule la dernière mène validée
    const cancelLastThrow = () => {
        setMatchData(p => {
            // Si des points sont en attente, les annuler d'abord
            if (p.pendingWinner || p.pendingPoints > 0) {
                return {
                    ...p,
                    pendingWinner: null,
                    pendingPoints: 0,
                    currentThrows: []
                };
            }

            // Sinon, annuler la dernière mène de l'historique
            if (p.meneHistory.length === 0) {
                console.warn('[Petanque] Aucune mène à annuler');
                return p;
            }

            const lastMene = p.meneHistory[p.meneHistory.length - 1];
            const newHistory = p.meneHistory.slice(0, -1);

            // Nouveau score après annulation
            const newScoreA = lastMene.scoreABefore;
            const newScoreB = lastMene.scoreBBefore;

            // Si le score repasse sous le targetScore, enlever la victoire
            if ((isMatchWon && (newScoreA < p.targetScore && newScoreB < p.targetScore))) {
                setIsMatchWon(false);
                setMatchWinner(null);
            }

            console.log(`[Petanque] Annulation de la dernière mène - Retour au score ${newScoreA}-${newScoreB}`);

            const newState = {
                ...p,
                teamA: { ...p.teamA, score: newScoreA },
                teamB: { ...p.teamB, score: newScoreB },
                cochonnetTeam: lastMene.cochonnetBefore,
                meneHistory: newHistory,
                pendingWinner: null,
                pendingPoints: 0,
                currentThrows: []
            };

            // Send IMMEDIATE update after cancel
            sendImmediateUpdate(newState, null);

            return newState;
        });
    };

    /** ---------- RESET D'UN SET ---------- */
    const resetSet = () => {
        setIsMatchWon(false);
        setMatchWinner(null);
        setMatchData(p => {
            const newState = {
                ...p,
                teamA: { ...p.teamA, score: 0 },
                teamB: { ...p.teamB, score: 0 },
                cochonnetTeam: "A" as const,
                pendingWinner: null,
                pendingPoints: 0,
                currentThrows: [],
                meneHistory: []
            };
            // Send IMMEDIATE update for reset
            sendImmediateUpdate(newState, null);
            return newState;
        });
    };

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
                console.error('[Petanque Hook] ❌ Error:', error);
                alert('Erreur lors de la fin du match : ' + error);
            },
        });

        console.log('[Petanque Hook] Submit result:', result);
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

    const setTargetScore = (score: number) =>
        setMatchData((p: MatchDataWithTournament) => ({
            ...p,
            targetScore: score,
        }));

    /** ---------- SYNC TO LOCAL STORAGE + BACKEND SSE + PERSISTANCE BDD ---------- */
    // Fonction pour persister le score en direct dans la BDD
    const persistLiveScore = async () => {
        if (!initialMatchId) return;
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${initialMatchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score_a: matchData.teamA.score,
                    score_b: matchData.teamB.score,
                    sets_a: matchData.teamA.sets,
                    sets_b: matchData.teamB.sets,
                    // Ajoute d'autres champs si besoin (ex: meneHistory, status, etc)
                }),
            });
        } catch (e) {
            console.error('[Petanque Hook] Erreur persistance score live:', e);
        }
    };

    useEffect(() => {
        try {
            const payload = {
                team1: matchData.teamA.name || "ÉQUIPE A",
                team2: matchData.teamB.name || "ÉQUIPE B",
                logo1: matchData.teamA.logo_url || "",
                logo2: matchData.teamB.logo_url || "",
                matchType: matchData.matchType || "Match",
                matchGround: matchData.matchGround || matchData.court || court || "Terrain",
                scoreA: matchData.teamA.score,
                scoreB: matchData.teamB.score,
                setsA: matchData.teamA.sets,
                setsB: matchData.teamB.sets,
                gameMode: matchData.gameMode || "BO3",
                cochonnetTeam: matchData.cochonnetTeam,
                pendingWinner: matchData.pendingWinner,
                pendingPoints: matchData.pendingPoints,
                targetScore: matchData.targetScore,
                meneCount: matchData.meneHistory.length,
                lastUpdate: new Date().toISOString(),
                winner: matchWinner ? (matchWinner === "A" ? matchData.teamA.name : matchData.teamB.name) : null,
            };
            // Sync to localStorage (for same-device spectator)
            localStorage.setItem("livePetanqueMatch", JSON.stringify(payload));

            // Sync to backend SSE (for cross-device split-screen spectators)
            // Use numeric ID for SSE so split-screen can match subscriptions
            const sseMatchId = matchData.numericId?.toString() || initialMatchId;
            if (sseMatchId) {
                console.log('[Petanque Hook] Sending SSE with numeric ID:', sseMatchId);
                sendLiveScore({
                    matchId: sseMatchId,
                    sport: 'petanque',
                    payload,
                });
            }

            // Persistance en BDD à chaque changement de score/sets/buts
            persistLiveScore();
        } catch (e) {
            // Ignore storage errors
        }
    }, [matchData, court, matchWinner, initialMatchId, sendLiveScore]);

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
            // Inverser aussi le cochonnet si nécessaire
            cochonnetTeam: p.cochonnetTeam === "A" ? "B" : "A"
        }));

    return {
        matchData,
        handleEnd,
        addThrow,
        cancelLastThrow,
        validateThrow,
        resetSet,
        getCurrentPlayer,
        getCochonnetTeam,
        selectMeneWinner,
        gameMode,
        setGameMode,
        setTeamName,
        setTeamLogo,
        setMatchType,
        setTargetScore,
        swapSides,
        court,
        updateMatchStatus,
        changeService,
        isMatchWon,
        matchWinner
    };
}
