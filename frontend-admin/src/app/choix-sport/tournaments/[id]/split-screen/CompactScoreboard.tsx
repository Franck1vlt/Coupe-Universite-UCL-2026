"use client";

import { useMemo, useState, useEffect, useRef } from "react";

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
    targetScore?: number;
    winner?: string;
    // Flechettes
    setsA?: number;
    setsB?: number;
    currentPlayer?: string;
    currentThrows?: number[];
    gameMode?: string;
    // Football/Basketball/Handball
    yellowCards1?: number;
    yellowCards2?: number;
    redCards1?: number;
    redCards2?: number;
    // Basketball specific
    technicalFouls1?: number;
    technicalFouls2?: number;
    shotClock?: string;
    chronoRunning?: boolean;
    period?: string;
    [key: string]: unknown;
}

interface CompactScoreboardProps {
    match: Match;
    liveData: LiveData | null;
    sport: string;
}

// Shared team info component
function TeamInfo({
    logo,
    name,
    indicator,
    indicatorType = "service"
}: {
    logo: string;
    name: string;
    indicator?: boolean;
    indicatorType?: "service" | "cochonnet";
}) {
    return (
        <div className="team-info">
            <img
                src={logo}
                onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "/img/no-logo.png"; }}
                alt=""
                className="team-logo"
            />
            <span className="team-name">{name}</span>
            {indicator && (
                <span className="service-indicator">
                    {indicatorType === "cochonnet" ? "🎯" : "●"}
                </span>
            )}
        </div>
    );
}

// VOLLEYBALL / BADMINTON CompactScoreboard
function SetBasedScoreboard({
    displayData,
    liveData,
    sportIcon
}: {
    displayData: ReturnType<typeof useDisplayData>;
    liveData: LiveData | null;
    sportIcon: string;
}) {
    return (
        <div className="compact-scoreboard sport-setbased">
            {/* Header */}
            <div className="scoreboard-header volleyball-header">
                <span className="match-type">{displayData.matchType}</span>
                {displayData.court && <span className="court">{displayData.court}</span>}
            </div>

            {/* Content */}
            <div className="scoreboard-content gap-8">
                {/* Team A */}
                <div className={`team-row volleyball-row ${displayData.serviceTeam === "A" ? "serving" : ""}`}>
                    {/* Service zone - only show image when this team has service */}
                    <div className="service-zone">
                        {displayData.serviceTeam === "A" && (
                            <img src={sportIcon} alt="Service" className="service-icon" style={{ width: "36px", height: "36px" }} />
                        )}
                    </div>
                    <TeamInfo
                        logo={displayData.teamA.logo}
                        name={displayData.teamA.name}
                        // Retirer indicator={displayData.serviceTeam === "A"}
                    />
                    <div className="score-section">
                        <span className="sets">{displayData.teamA.sets}</span>
                        <span className="score">{displayData.teamA.score}</span>
                    </div>
                </div>

                {/* Team B */}
                <div className={`team-row volleyball-row ${displayData.serviceTeam === "B" ? "serving" : ""}`}>
                    {/* Service zone - only show image when this team has service */}
                    <div className="service-zone">
                        {displayData.serviceTeam === "B" && (
                            <img src={sportIcon} alt="Service" className="service-icon" style={{ width: "36px", height: "36px" }} />
                        )}
                    </div>
                    <TeamInfo
                        logo={displayData.teamB.logo}
                        name={displayData.teamB.name}
                        // Retirer indicator={displayData.serviceTeam === "B"}
                    />
                    <div className="score-section">
                        <span className="sets">{displayData.teamB.sets}</span>
                        <span className="score">{displayData.teamB .score}</span>
                    </div>
                </div>
            </div>

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

// FOOTBALL / HANDBALL CompactScoreboard
function FootballHandballScoreboard({
    displayData,
    liveData,
    sport
}: {
    displayData: ReturnType<typeof useDisplayData>;
    liveData: LiveData | null;
    sport: string;
}) {
    const yellowCards1 = liveData?.yellowCards1 ?? 0;
    const yellowCards2 = liveData?.yellowCards2 ?? 0;
    const redCards1 = liveData?.redCards1 ?? 0;
    const redCards2 = liveData?.redCards2 ?? 0;
    const period = liveData?.period;

    return (
        <div className={`compact-scoreboard sport-${sport}`}>
            {/* Header */}
            <div className="scoreboard-header football-header">
                <span className="match-type">{displayData.matchType}</span>
                {displayData.court && <span className="court">{displayData.court}</span>}
                {period && <span className="period-badge">{period}</span>}
            </div>

            {/* Content */}
            <div className="scoreboard-content">
                {/* Team A */}
                <div className="team-row">
                    <TeamInfo logo={displayData.teamA.logo} name={displayData.teamA.name} />
                    <div className="score-section">
                        <div className="cards-display">
                            {yellowCards1 > 0 && <span className="card yellow">🟨 {yellowCards1}</span>}
                            {redCards1 > 0 && <span className="card red">🟥 {redCards1}</span>}
                        </div>
                        <span className="score">{displayData.teamA.score}</span>
                    </div>
                </div>

                {/* Divider with period */}
                <div className="divider football-divider">
                    {displayData.chrono && <span className="chrono">{displayData.chrono}</span>}
                </div>

                {/* Team B */}
                <div className="team-row">
                    <TeamInfo logo={displayData.teamB.logo} name={displayData.teamB.name} />
                    <div className="score-section">
                        <div className="cards-display">
                            {yellowCards2 > 0 && <span className="card yellow">🟨 {yellowCards2}</span>}
                            {redCards2 > 0 && <span className="card red">🟥 {redCards2}</span>}
                        </div>
                        <span className="score">{displayData.teamB.score}</span>
                    </div>
                </div>
            </div>

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

// BASKETBALL CompactScoreboard
function BasketballScoreboard({
    displayData,
    liveData
}: {
    displayData: ReturnType<typeof useDisplayData>;
    liveData: LiveData | null;
}) {
    const sseShotClock = liveData?.shotClock;
    const sseChronoRunning = liveData?.chronoRunning;
    const period = liveData?.period;
    const technicalFouls1 = liveData?.technicalFouls1 ?? 0;
    const technicalFouls2 = liveData?.technicalFouls2 ?? 0;

    // Local shot clock state (in tenths for smooth counting)
    const [localShotClock, setLocalShotClock] = useState<number | null>(null);
    const [isClockRunning, setIsClockRunning] = useState(false);
    const lastSseShotClock = useRef<string | undefined>(undefined);

    // Ref to track local shot clock for drift calculation (avoids dependency issues)
    const localShotClockRef = useRef<number | null>(null);
    useEffect(() => {
        localShotClockRef.current = localShotClock;
    }, [localShotClock]);

    // Sync running state from SSE (when admin starts/stops chrono)
    useEffect(() => {
        if (sseChronoRunning !== undefined) {
            console.log('[Basketball ShotClock] chronoRunning from SSE:', sseChronoRunning);
            setIsClockRunning(sseChronoRunning);
        }
    }, [sseChronoRunning]);

    // Sync shot clock value from SSE
    useEffect(() => {
        console.log('[Basketball ShotClock] SSE received:', sseShotClock);

        if (sseShotClock) {
            const newTenths = Math.round(parseFloat(sseShotClock) * 10);
            const prevTenths = lastSseShotClock.current
                ? Math.round(parseFloat(lastSseShotClock.current) * 10)
                : null;

            console.log('[Basketball ShotClock] newTenths:', newTenths, '| prevTenths:', prevTenths);

            if (prevTenths !== null) {
                if (newTenths > prevTenths) {
                    // Value increased = reset occurred
                    console.log('[Basketball ShotClock] Detected RESET');
                    setLocalShotClock(newTenths);
                } else if (newTenths !== prevTenths) {
                    // Value decreased - check drift
                    const currentLocal = localShotClockRef.current ?? 0;
                    const drift = Math.abs(newTenths - currentLocal);
                    console.log('[Basketball ShotClock] Value decreased, drift:', drift, '| local:', currentLocal);
                    if (drift > 15) {
                        console.log('[Basketball ShotClock] Resyncing due to drift');
                        setLocalShotClock(newTenths);
                    }
                }
            } else {
                // Initial sync
                console.log('[Basketball ShotClock] Initial sync, setting to:', newTenths);
                setLocalShotClock(newTenths);
            }

            lastSseShotClock.current = sseShotClock;
        }
    }, [sseShotClock]);

    // Local countdown timer (runs every 100ms when clock is running)
    useEffect(() => {
        console.log('[Basketball ShotClock] Timer effect, isClockRunning:', isClockRunning);
        if (!isClockRunning) {
            console.log('[Basketball ShotClock] Timer NOT starting (clock not running)');
            return;
        }

        console.log('[Basketball ShotClock] Starting local timer');
        const interval = setInterval(() => {
            setLocalShotClock(prev => {
                if (prev === null || prev <= 1) {
                    return 0;
                }
                return prev - 1;
            });
        }, 100);

        return () => {
            console.log('[Basketball ShotClock] Stopping local timer');
            clearInterval(interval);
        };
    }, [isClockRunning]);

    // Stop timer when shot clock reaches 0
    useEffect(() => {
        if (localShotClock === 0) {
            setIsClockRunning(false);
        }
    }, [localShotClock]);

    // Format for display
    const displayShotClock = localShotClock !== null
        ? (localShotClock / 10).toFixed(1)
        : sseShotClock;

    // Debug: log display value
    console.log('[Basketball ShotClock] Display:', displayShotClock, '| localShotClock:', localShotClock);

    return (
        <div className="compact-scoreboard sport-basketball">
            {/* Header */}
            <div className="scoreboard-header basketball-header">
                <span className="match-type">{displayData.matchType}</span>
                {displayData.court && <span className="court">{displayData.court}</span>}
                {period && <span className="period-badge">{period}</span>}
            </div>

            {/* Content */}
            <div className="scoreboard-content">
                {/* Sets display */}
                <div className="sets-display-row">
                    <img src={displayData.teamA.logo} alt={displayData.teamA.name} className="team-logo" />
                    <span className="team-label">{displayData.teamA.name}</span>
                    <span className="sets-score">{displayData.teamA.score} - {displayData.teamB.score}</span>
                    <span className="team-label">{displayData.teamB.name}</span>
                    <img src={displayData.teamB.logo} alt={displayData.teamB.name} className="team-logo" />
                </div>

                <div className="timer-section justify-center gap-6">
                    {displayData.chrono && <span className="chrono main-timer">{displayData.chrono}</span>}
                    {displayShotClock && <span className="chrono shot-clock">{displayShotClock}</span>}
                </div>

            </div>


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

// PETANQUE CompactScoreboard
function PetanqueScoreboard({
    displayData,
    liveData
}: {
    displayData: ReturnType<typeof useDisplayData>;
    liveData: LiveData | null;
}) {
    // Debug: log what petanque scoreboard receives
    console.log('%c[PetanqueScoreboard] 🎱 Rendering', 'color: purple; font-weight: bold', {
        hasLiveData: !!liveData,
        cochonnetTeam: liveData?.cochonnetTeam,
        scoreA: liveData?.scoreA,
        scoreB: liveData?.scoreB,
        meneCount: liveData?.meneCount
    });

    const cochonnetTeam = liveData?.cochonnetTeam;
    const meneCount = liveData?.meneCount ?? 0;
    const targetScore = liveData?.targetScore ?? 13;
    const winner = liveData?.winner;

    // Use petanque-specific scores
    const scoreA = liveData?.scoreA ?? displayData.teamA.score;
    const scoreB = liveData?.scoreB ?? displayData.teamB.score;

    return (
        <div className="compact-scoreboard sport-petanque">
            {/* Header: match type, court, target score */}
            <div className="scoreboard-header petanque-header">
                <span className="match-type">{displayData.matchType}</span>
                {displayData.court && <span className="court">{displayData.court}</span>}
                <span className="target-score">Match en {targetScore} pts</span>
            </div>

            {/* Content */}
            <div className="scoreboard-content petanque-content">
                {/* Team A row */}
                <div className={`team-row petanque-row ${cochonnetTeam === "A" ? "has-cochonnet" : ""}`}>
                    {/* Cochonnet zone - only show image+label when this team has cochonnet */}
                    <div className="cochonnet-zone">
                        {cochonnetTeam === "A" && (
                            <>
                                <img src="/img/cochonet.png" alt="Cochonnet" className="cochonnet-icon" />
                            </>
                        )}
                    </div>
                    <TeamInfo
                        logo={displayData.teamA.logo}
                        name={displayData.teamA.name}
                    />
                    <div className="score-section">
                        <span className="score petanque-score">{scoreA}</span>
                    </div>
                </div>

                {/* Mène indicator */}
                <div className="divider petanque-divider">
                    <span className="mene-count">Mène {meneCount + 1}</span>
                </div>

                {/* Team B row */}
                <div className={`team-row petanque-row ${cochonnetTeam === "B" ? "has-cochonnet" : ""}`}>
                    {/* Cochonnet zone - only show image+label when this team has cochonnet */}
                    <div className="cochonnet-zone">
                        {cochonnetTeam === "B" && (
                            <>
                                <img src="/img/cochonet.png" alt="Cochonnet" className="cochonnet-icon" />
                            </>
                        )}
                    </div>
                    <TeamInfo
                        logo={displayData.teamB.logo}
                        name={displayData.teamB.name}
                    />
                    <div className="score-section">
                        <span className="score petanque-score">{scoreB}</span>
                    </div>
                </div>
            </div>

            {/* Winner banner */}
            {winner && (
                <div className="winner-banner">
                    🏆 Vainqueur : {winner} 🏆
                </div>
            )}

            {/* Live indicator */}
            {liveData && !winner && (
                <div className="live-indicator">
                    <span className="pulse"></span>
                    LIVE
                </div>
            )}
        </div>
    );
}

// FLECHETTES CompactScoreboard
function FlechettesScoreboard({
    displayData,
    liveData
}: {
    displayData: ReturnType<typeof useDisplayData>;
    liveData: LiveData | null;
}) {
    const setsA = liveData?.setsA ?? 0;
    const setsB = liveData?.setsB ?? 0;
    const currentPlayer = liveData?.currentPlayer;
    const currentThrows = liveData?.currentThrows ?? [];
    const gameMode = liveData?.gameMode ?? "BO3";
    const winner = liveData?.winner;

    // For flechettes, score represents remaining points (301 down to 0)
    const scoreA = liveData?.scoreA ?? 301;
    const scoreB = liveData?.scoreB ?? 301;

    return (
        <div className="compact-scoreboard sport-flechettes">
            {/* Header */}
            <div className="scoreboard-header flechettes-header">
                <span className="match-type">{displayData.matchType}</span>
                {displayData.court && <span className="court">{displayData.court}</span>}
                <span className="game-mode">{gameMode}</span>
            </div>

            {/* Content */}
            <div className="scoreboard-content">
                {/* Sets display */}
                <div className="sets-display-row">
                    <img src={displayData.teamA.logo} alt={displayData.teamA.name} className="team-logo" />
                    <span className="team-label">{displayData.teamA.name}</span>
                    <span className="sets-score">{setsA} - {setsB}</span>
                    <span className="team-label">{displayData.teamB.name}</span>
                    <img src={displayData.teamB.logo} alt={displayData.teamB.name} className="team-logo" />
                </div>

                {/* Points remaining */}
                <div className="points-remaining">
                    <div className="points-column">
                        <span className="remaining-label">Restant</span>
                        <span className="remaining-value">{scoreA}</span>
                    </div>
                    <div className="points-separator">-</div>
                    <div className="points-column">
                        <span className="remaining-label">Restant</span>
                        <span className="remaining-value">{scoreB}</span>
                    </div>
                </div>

                {/* Current player */}
                {currentPlayer && (
                    <div className="current-player-section">
                        <span className="current-player">🎯 À {currentPlayer} de jouer</span>
                    </div>
                )}

                {/* Current throws */}
                {currentThrows.length > 0 && (
                    <div className="throws-display">
                        {currentThrows.map((t, i) => (
                            <span key={i} className="throw">{t}</span>
                        ))}
                        <span className="throw-total">= {currentThrows.reduce((a, b) => a + b, 0)}</span>
                    </div>
                )}
            </div>

            {/* Winner banner */}
            {winner && (
                <div className="winner-banner">
                    🏆 Vainqueur : {winner} 🏆
                </div>
            )}

            {/* Live indicator */}
            {liveData && !winner && (
                <div className="live-indicator">
                    <span className="pulse"></span>
                    LIVE
                </div>
            )}
        </div>
    );
}

// Check if a team name is a generic placeholder
function isGenericTeamName(name: string | undefined): boolean {
    if (!name) return true;
    const genericNames = ["team a", "team b", "équipe a", "équipe b", "equipe a", "equipe b"];
    return genericNames.includes(name.toLowerCase().trim());
}

// Helper hook to compute display data
function useDisplayData(match: Match, liveData: LiveData | null) {
    return useMemo(() => {
        // Determine best team names - prefer match data over generic liveData names
        const teamAName = (liveData?.team1 && !isGenericTeamName(liveData.team1))
            ? liveData.team1
            : match.team_a_name || liveData?.team1 || "Équipe A";

        const teamBName = (liveData?.team2 && !isGenericTeamName(liveData.team2))
            ? liveData.team2
            : match.team_b_name || liveData?.team2 || "Équipe B";

        // Determine best logos - prefer actual URLs over generated paths
        const teamALogo = liveData?.logo1 && liveData.logo1.length > 0
            ? liveData.logo1
            : match.team_a_logo && match.team_a_logo.length > 0
                ? match.team_a_logo
                : teamAName && !isGenericTeamName(teamAName)
                    ? `/img/${encodeURIComponent(teamAName)}.png`
                    : "/img/no-logo.png";

        const teamBLogo = liveData?.logo2 && liveData.logo2.length > 0
            ? liveData.logo2
            : match.team_b_logo && match.team_b_logo.length > 0
                ? match.team_b_logo
                : teamBName && !isGenericTeamName(teamBName)
                    ? `/img/${encodeURIComponent(teamBName)}.png`
                    : "/img/no-logo.png";

        if (liveData) {
            return {
                teamA: {
                    name: teamAName,
                    logo: teamALogo,
                    score: liveData.score1 ?? liveData.scoreA ?? 0,
                    sets: liveData.sets1 ?? liveData.setsA ?? 0,
                },
                teamB: {
                    name: teamBName,
                    logo: teamBLogo,
                    score: liveData.score2 ?? liveData.scoreB ?? 0,
                    sets: liveData.sets2 ?? liveData.setsB ?? 0,
                },
                serviceTeam: liveData.serviceTeam || liveData.cochonnetTeam,
                matchType: liveData.matchType || match.label || match.match_type,
                court: liveData.matchGround || match.court,
                chrono: liveData.chrono,
            };
        }

        return {
            teamA: {
                name: teamAName,
                logo: teamALogo,
                score: match.score_a ?? 0,
                sets: 0,
            },
            teamB: {
                name: teamBName,
                logo: teamBLogo,
                score: match.score_b ?? 0,
                sets: 0,
            },
            serviceTeam: undefined as "A" | "B" | undefined,
            matchType: match.label || match.match_type,
            court: match.court,
            chrono: undefined as string | undefined,
        };
    }, [match, liveData]);
}

// Main CompactScoreboard component that routes to sport-specific scoreboard
export default function CompactScoreboard({ match, liveData, sport }: CompactScoreboardProps) {
    const displayData = useDisplayData(match, liveData);

    // Debug log to see what sport is being received
    console.log(`[CompactScoreboard] Sport: "${sport}", Match: ${match?.id}, HasLiveData: ${!!liveData}`);

    // Normalize sport for matching (handle variations)
    const normalizedSport = sport?.toLowerCase().trim() || "unknown";

    // Route to sport-specific scoreboard
    switch (normalizedSport) {
        case "volleyball":
            return (
                <SetBasedScoreboard
                    displayData={displayData}
                    liveData={liveData}
                    sportIcon="/img/volley-ball.png"
                />
            );
        case "badminton":
            return (
                <SetBasedScoreboard
                    displayData={displayData}
                    liveData={liveData}
                    sportIcon="/img/badminton.png"
                />
            );
        case "football":
            return (
                <FootballHandballScoreboard
                    displayData={displayData}
                    liveData={liveData}
                    sport="football"
                />
            );
        case "handball":
            return (
                <FootballHandballScoreboard
                    displayData={displayData}
                    liveData={liveData}
                    sport="handball"
                />
            );
        case "basketball":
            return (
                <BasketballScoreboard
                    displayData={displayData}
                    liveData={liveData}
                />
            );
        case "petanque":
            return (
                <PetanqueScoreboard
                    displayData={displayData}
                    liveData={liveData}
                />
            );
        case "flechettes":
            return (
                <FlechettesScoreboard
                    displayData={displayData}
                    liveData={liveData}
                />
            );
        default:
            // Generic fallback
            return (
                <div className={`compact-scoreboard sport-${sport}`}>
                    <div className="scoreboard-header">
                        <span className="match-type">{displayData.matchType}</span>
                        {displayData.court && <span className="court">{displayData.court}</span>}
                    </div>
                    <div className="scoreboard-content">
                        <div className="team-row">
                            <TeamInfo logo={displayData.teamA.logo} name={displayData.teamA.name} />
                            <div className="score-section">
                                <span className="score">{displayData.teamA.score}</span>
                            </div>
                        </div>
                        <div className="divider">VS</div>
                        <div className="team-row">
                            <TeamInfo logo={displayData.teamB.logo} name={displayData.teamB.name} />
                            <div className="score-section">
                                <span className="score">{displayData.teamB.score}</span>
                            </div>
                        </div>
                    </div>
                    {liveData && (
                        <div className="live-indicator">
                            <span className="pulse"></span>
                            LIVE
                        </div>
                    )}
                </div>
            );
    }
}
