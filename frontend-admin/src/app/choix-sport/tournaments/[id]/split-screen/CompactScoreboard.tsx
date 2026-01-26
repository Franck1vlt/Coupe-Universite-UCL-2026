"use client";

import { useMemo } from "react";

interface Match {
    id: number;
    uuid: string;
    team_a_name: string;
    team_b_name: string;
    team_a_logo?: string;
    team_b_logo?: string;
    score_a: number | null;
    score_b: number | null;
    status: string;
    match_type: string;
    label?: string;
    court?: string;
    tournament_name?: string;
}

interface LiveData {
    team1: string;
    team2: string;
    matchType?: string;
    matchGround?: string;
    logo1?: string;
    logo2?: string;
    // Volleyball/Badminton
    score1?: number;
    score2?: number;
    sets1?: number;
    sets2?: number;
    serviceTeam?: "A" | "B";
    chrono?: string;
    // Petanque
    scoreA?: number;
    scoreB?: number;
    cochonnetTeam?: "A" | "B";
    meneCount?: number;
    // Flechettes
    currentPlayer?: string;
    currentThrows?: number[];
    gameMode?: string;
    [key: string]: unknown;
}

interface CompactScoreboardProps {
    match: Match;
    liveData: LiveData | null;
    sport: string;
}

export default function CompactScoreboard({ match, liveData, sport }: CompactScoreboardProps) {
    // Determine which data to display (live data takes priority)
    const displayData = useMemo(() => {
        if (liveData) {
            // Use live data from SSE
            return {
                teamA: {
                    name: liveData.team1 || match.team_a_name || "Équipe A",
                    logo:
                        liveData.logo1
                        || match.team_a_logo
                        || (liveData.team1 || match.team_a_name
                            ? `/img/${encodeURIComponent(liveData.team1 || match.team_a_name)}.png`
                            : "/img/no-logo.png"),
                    score: liveData.score1 ?? liveData.scoreA ?? 0,
                    sets: liveData.sets1 ?? 0,
                },
                teamB: {
                    name: liveData.team2 || match.team_b_name || "Équipe B",
                    logo:
                        liveData.logo2
                        || match.team_b_logo
                        || (liveData.team2 || match.team_b_name
                            ? `/img/${encodeURIComponent(liveData.team2 || match.team_b_name)}.png`
                            : "/img/no-logo.png"),
                    score: liveData.score2 ?? liveData.scoreB ?? 0,
                    sets: liveData.sets2 ?? 0,
                },
                serviceTeam: liveData.serviceTeam || liveData.cochonnetTeam,
                matchType: liveData.matchType || match.label || match.match_type,
                court: liveData.matchGround || match.court,
                chrono: liveData.chrono,
                // Flechettes specific
                currentPlayer: liveData.currentPlayer,
                currentThrows: liveData.currentThrows,
                meneCount: liveData.meneCount,
            };
        }

        // Fallback to match data
        return {
            teamA: {
                name: match.team_a_name || "Équipe A",
                logo:
                    match.team_a_logo
                    || (match.team_a_name
                        ? `/img/${encodeURIComponent(match.team_a_name)}.png`
                        : "/img/no-logo.png"),
                score: match.score_a ?? 0,
                sets: 0,
            },
            teamB: {
                name: match.team_b_name || "Équipe B",
                logo:
                    match.team_b_logo
                    || (match.team_b_name
                        ? `/img/${encodeURIComponent(match.team_b_name)}.png`
                        : "/img/no-logo.png"),
                score: match.score_b ?? 0,
                sets: 0,
            },
            serviceTeam: undefined,
            matchType: match.label || match.match_type,
            court: match.court,
            chrono: undefined,
            currentPlayer: undefined,
            currentThrows: undefined,
            meneCount: undefined,
        };
    }, [match, liveData]);

    const isSetBased = sport === "volleyball" || sport === "badminton";
    const isPetanque = sport === "petanque";
    const isFlechettes = sport === "flechettes";

    return (
        <div className={`compact-scoreboard sport-${sport}`}>
            {/* Header with match info */}
            <div className="scoreboard-header">
                {match.tournament_name && (
                    <span className="tournament-label">{match.tournament_name}</span>
                )}
                <span className="match-type">{displayData.matchType}</span>
                {displayData.court && <span className="court">{displayData.court}</span>}
                {displayData.chrono && <span className="chrono">{displayData.chrono}</span>}
            </div>
            
            {/* Scores */}
            <div className="scoreboard-content">
                {/* Team A */}
                <div className={`team-row ${displayData.serviceTeam === "A" ? "serving" : ""}`}>
                    <div className="team-info">
                        <img
                            src={displayData.teamA.logo}
                            onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "/img/no-logo.png"; }}
                            alt=""
                            className="team-logo"
                        />
                        <span className="team-name">{displayData.teamA.name}</span>
                        {displayData.serviceTeam === "A" && (
                            <span className="service-indicator">
                                {isPetanque ? "🎯" : "●"}
                            </span>
                        )}
                    </div>
                    <div className="score-section">
                        {isSetBased && (
                            <span className="sets">{displayData.teamA.sets}</span>
                        )}
                        <span className="score">{displayData.teamA.score}</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="divider">
                    {isPetanque && displayData.meneCount !== undefined && (
                        <span className="mene-count">Mène {displayData.meneCount}</span>
                    )}
                    {isFlechettes && displayData.currentPlayer && (
                        <span className="current-player">Tour: {displayData.currentPlayer}</span>
                    )}
                </div>

                {/* Team B */}
                <div className={`team-row ${displayData.serviceTeam === "B" ? "serving" : ""}`}>
                    <div className="team-info">
                        <img
                            src={displayData.teamB.logo}
                            onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "/img/no-logo.png"; }}
                            alt=""
                            className="team-logo"
                        />
                        <span className="team-name">{displayData.teamB.name}</span>
                        {displayData.serviceTeam === "B" && (
                            <span className="service-indicator">
                                {isPetanque ? "🎯" : "●"}
                            </span>
                        )}
                    </div>
                    <div className="score-section">
                        {isSetBased && (
                            <span className="sets">{displayData.teamB.sets}</span>
                        )}
                        <span className="score">{displayData.teamB.score}</span>
                    </div>
                </div>
            </div>

            {/* Flechettes: Current throws */}
            {isFlechettes && displayData.currentThrows && displayData.currentThrows.length > 0 && (
                <div className="throws-display">
                    {displayData.currentThrows.map((t, i) => (
                        <span key={i} className="throw">{t}</span>
                    ))}
                </div>
            )}

            {/* Live indicator */}
            {liveData && (
                <div className="live-indicator">
                    <span className="pulse"></span>
                    LIVE
                </div>
            )}
        </div>
    );
}
