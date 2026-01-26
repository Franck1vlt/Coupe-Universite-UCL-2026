"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMatchSSE } from "@/src/app/features/scoreboards/common/useMatchSSE";
import MatchSelector from "./MatchSelector";
import CompactScoreboard from "./CompactScoreboard";
import "./split-screen.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Match {
    id: number;
    uuid: string;
    team_a_name: string;
    team_b_name: string;
    team_a_logo?: string;
    team_b_logo?: string;
    score_a: number | null;
    score_b: number | null;
    status: "upcoming" | "in_progress" | "completed" | "cancelled";
    match_type: string;
    label?: string;
    court?: string;
    tournament_name?: string; // Pour afficher quel tournoi
}

interface Tournament {
    id: number;
    name: string;
    sport_id: number;
    sport_code: string;
    sport_name: string;
}

interface SplitScreenClientProps {
    tournamentId: string;
}

export default function SplitScreenClient({ tournamentId }: SplitScreenClientProps) {
    const router = useRouter();

    // Sport and tournaments data
    const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
    const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
    const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Selected matches for split-screen (2-4 matches)
    const [selectedMatchIds, setSelectedMatchIds] = useState<number[]>([]);

    // Layout mode: 2 or 4 matches
    const [layoutMode, setLayoutMode] = useState<2 | 4>(2);

    // Show match selector modal
    const [showSelector, setShowSelector] = useState(false);

    // Fullscreen mode
    const [isFullscreen, setIsFullscreen] = useState(false);

    // SSE connection for live scores
    const { scores, connectionState } = useMatchSSE({
        matchIds: selectedMatchIds,
        enabled: selectedMatchIds.length > 0,
    });

    // Fetch sport info and ALL tournaments of the same sport
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);

                // 1. Fetch current tournament info to get sport_id
                const tournamentRes = await fetch(`${API_URL}/tournaments/${tournamentId}`);
                if (!tournamentRes.ok) throw new Error("Tournament not found");
                const tournamentData = await tournamentRes.json();
                const sportId = tournamentData.data.sport_id;

                // 2. Fetch sport info
                const sportRes = await fetch(`${API_URL}/sports/${sportId}`);
                const sportData = await sportRes.json();
                const sportCode = sportData.data?.code || "unknown";
                const sportName = sportData.data?.name || "Sport";

                setCurrentTournament({
                    id: tournamentData.data.id,
                    name: tournamentData.data.name,
                    sport_id: sportId,
                    sport_code: sportCode,
                    sport_name: sportName,
                });

                // 3. Fetch ALL tournaments of the same sport
                const allTournamentsRes = await fetch(`${API_URL}/tournaments?sport_id=${sportId}`);
                if (!allTournamentsRes.ok) throw new Error("Failed to fetch tournaments");
                const allTournamentsData = await allTournamentsRes.json();

                // Handle both array format and {items: [...]} format
                const tournamentsArray = Array.isArray(allTournamentsData.data)
                    ? allTournamentsData.data
                    : (allTournamentsData.data?.items || []);

                const tournaments: Tournament[] = tournamentsArray.map((t: { id: number; name: string }) => ({
                    id: t.id,
                    name: t.name,
                    sport_id: sportId,
                    sport_code: sportCode,
                    sport_name: sportName,
                }));
                setAllTournaments(tournaments);

                // 4. Fetch matches from ALL tournaments of the same sport
                const allMatches: Match[] = [];
                for (const t of tournaments) {
                    const matchesRes = await fetch(`${API_URL}/tournaments/${t.id}/matches`);
                    if (matchesRes.ok) {
                        const matchesData = await matchesRes.json();
                        // DEBUG: loggue la structure brute des matchs reçus
                        if (Array.isArray(matchesData.data) && matchesData.data.length > 0) {
                            console.log(`[DEBUG] Matches bruts pour tournoi ${t.name}:`, matchesData.data.slice(0, 3));
                        }
                        const matches = (matchesData.data || [])
                            .filter((m: any) => m.status === "in_progress")
                            .map((m: any) => ({
                                id: m.id,
                                uuid: m.uuid,
                                team_a_name: m.team_a_name || m.teamA || m.team_a || m.team_a_source || "",
                                team_b_name: m.team_b_name || m.teamB || m.team_b || m.team_b_source || "",
                                team_a_logo: m.team_a_logo || m.logoA || m.logo_a || "",
                                team_b_logo: m.team_b_logo || m.logoB || m.logo_b || "",
                                score_a: m.score_a ?? m.scoreA ?? null,
                                score_b: m.score_b ?? m.scoreB ?? null,
                                status: m.status,
                                match_type: m.match_type || m.type || "",
                                label: m.label,
                                court: m.court,
                                tournament_name: t.name,
                            }));
                        allMatches.push(...matches);
                    }
                }

                setAvailableMatches(allMatches);

                // Auto-select first matches if available
                if (allMatches.length > 0 && selectedMatchIds.length === 0) {
                    const autoSelect = allMatches.slice(0, 2).map((m: Match) => m.id);
                    setSelectedMatchIds(autoSelect);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [tournamentId]);

    // Refresh matches periodically (every 30s)
    useEffect(() => {
        if (allTournaments.length === 0) return;

        const interval = setInterval(async () => {
            try {
                const allMatches: Match[] = [];
                for (const t of allTournaments) {
                    const matchesRes = await fetch(`${API_URL}/tournaments/${t.id}/matches`);
                    if (matchesRes.ok) {
                        const matchesData = await matchesRes.json();
                        const matches = (matchesData.data || [])
                            .filter((m: Match) => m.status === "in_progress")
                            .map((m: Match) => ({
                                ...m,
                                tournament_name: t.name,
                            }));
                        allMatches.push(...matches);
                    }
                }
                setAvailableMatches(allMatches);
            } catch {
                // Ignore refresh errors
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [allTournaments]);

    // Toggle fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Handle match selection
    const handleSelectMatches = (matchIds: number[]) => {
        setSelectedMatchIds(matchIds);
        setShowSelector(false);
    };

    // Merge SSE scores with match data
    const matchesWithScores = useMemo(() => {
        return selectedMatchIds.map(matchId => {
            const match = availableMatches.find(m => m.id === matchId);
            const liveScore = scores.get(matchId);

            if (liveScore) {
                return {
                    matchId,
                    match,
                    liveData: liveScore.data,
                    sport: liveScore.sport,
                    lastUpdate: liveScore.timestamp,
                };
            }

            return {
                matchId,
                match,
                liveData: null,
                sport: currentTournament?.sport_code || "unknown",
                lastUpdate: null,
            };
        });
    }, [selectedMatchIds, availableMatches, scores, currentTournament]);

    // Loading state
    if (loading) {
        return (
            <div className="split-screen-loading">
                <div className="loading-spinner"></div>
                <p>Chargement des matchs...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="split-screen-error">
                <h2>Erreur</h2>
                <p>{error}</p>
                <button onClick={() => router.back()}>Retour</button>
            </div>
        );
    }

    // No matches in progress
    if (availableMatches.length === 0) {
        return (
            <div className="split-screen-empty">
                <h2>Aucun match en cours</h2>
                <p>Il n&apos;y a actuellement aucun match en cours pour {currentTournament?.sport_name}.</p>
                <p className="hint">
                    {allTournaments.length > 1
                        ? `Tournois surveillés : ${allTournaments.map(t => t.name).join(", ")}`
                        : "Les matchs apparaîtront ici dès qu'ils seront démarrés."
                    }
                </p>
                <button onClick={() => router.back()} className="back-button">
                    Retour au tournoi
                </button>
            </div>
        );
    }

    return (
        <div className={`split-screen-container ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Header */}
            <header className="split-screen-header">
                <div className="header-left">
                    <button onClick={() => router.back()} className="back-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="header-title">
                        <h1>{currentTournament?.sport_name}</h1>
                        <span className="tournament-name">
                            {allTournaments.length > 1
                                ? `${allTournaments.length} tournois`
                                : currentTournament?.name
                            }
                        </span>
                    </div>
                </div>

                <div className="header-center">
                    {/* Connection status */}
                    <div className={`connection-status ${connectionState.isConnected ? 'connected' : 'disconnected'}`}>
                        <span className="status-dot"></span>
                        {connectionState.isConnected ? 'En direct' : 'Connexion...'}
                    </div>
                </div>

                <div className="header-right">
                    {/* Layout toggle */}
                    <div className="layout-toggle">
                        <button
                            className={layoutMode === 2 ? 'active' : ''}
                            onClick={() => setLayoutMode(2)}
                            title="2 matchs"
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <rect x="1" y="1" width="8" height="18" rx="1" />
                                <rect x="11" y="1" width="8" height="18" rx="1" />
                            </svg>
                        </button>
                        <button
                            className={layoutMode === 4 ? 'active' : ''}
                            onClick={() => setLayoutMode(4)}
                            title="4 matchs"
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <rect x="1" y="1" width="8" height="8" rx="1" />
                                <rect x="11" y="1" width="8" height="8" rx="1" />
                                <rect x="1" y="11" width="8" height="8" rx="1" />
                                <rect x="11" y="11" width="8" height="8" rx="1" />
                            </svg>
                        </button>
                    </div>

                    {/* Select matches button */}
                    <button onClick={() => setShowSelector(true)} className="select-matches-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                        </svg>
                        Sélectionner
                    </button>

                    {/* Fullscreen button */}
                    <button onClick={toggleFullscreen} className="fullscreen-btn">
                        {isFullscreen ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                            </svg>
                        )}
                    </button>
                </div>
            </header>

            {/* Grid of scoreboards */}
            <main className={`split-screen-grid layout-${layoutMode}`}>
                {matchesWithScores.slice(0, layoutMode).map((item, index) => (
                    <div key={item.matchId || index} className="scoreboard-cell">
                        {item.match ? (
                            <CompactScoreboard
                                match={item.match}
                                liveData={item.liveData}
                                sport={item.sport}
                            />
                        ) : (
                            <div className="empty-cell">
                                <p>Match non trouvé</p>
                            </div>
                        )}
                    </div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: Math.max(0, layoutMode - matchesWithScores.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="scoreboard-cell empty-cell">
                        <button onClick={() => setShowSelector(true)} className="add-match-btn">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v8M8 12h8" />
                            </svg>
                            <span>Ajouter un match</span>
                        </button>
                    </div>
                ))}
            </main>

            {/* Match selector modal */}
            {showSelector && (
                <MatchSelector
                    availableMatches={availableMatches}
                    selectedMatchIds={selectedMatchIds}
                    maxSelection={layoutMode}
                    onSelect={handleSelectMatches}
                    onClose={() => setShowSelector(false)}
                />
            )}
        </div>
    );
}
