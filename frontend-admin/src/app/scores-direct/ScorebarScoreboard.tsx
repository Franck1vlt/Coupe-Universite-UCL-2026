"use client";

import { useMemo } from "react";

// --- TYPES ---
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
    score1?: number;
    score2?: number;
    sets1?: number;
    sets2?: number;
    serviceTeam?: "A" | "B";
    chrono?: string;
    scoreA?: number;
    scoreB?: number;
    cochonnetTeam?: "A" | "B";
    meneCount?: number;
    targetScore?: number;
    winner?: string;
    setsA?: number;
    setsB?: number;
    currentPlayer?: string;
    gameMode?: string;
    yellowCards1?: number;
    yellowCards2?: number;
    redCards1?: number;
    redCards2?: number;
    period?: string;
    [key: string]: unknown;
}

interface ScorebarScoreboardProps {
    match: Match;
    liveData: LiveData | null;
    sport: string;
}

// --- HELPERS ---

function isGenericTeamName(name: string | undefined): boolean {
    if (!name) return true;
    const genericNames = ["team a", "team b", "équipe a", "équipe b", "equipe a", "equipe b"];
    return genericNames.includes(name.toLowerCase().trim());
}

function useDisplayData(match: Match, liveData: LiveData | null) {
    return useMemo(() => {
        const teamAName = (liveData?.team1 && !isGenericTeamName(liveData.team1))
            ? liveData.team1
            : match.team_a_name || liveData?.team1 || "Équipe A";

        const teamBName = (liveData?.team2 && !isGenericTeamName(liveData.team2))
            ? liveData.team2
            : match.team_b_name || liveData?.team2 || "Équipe B";

        const teamALogo = liveData?.logo1 || match.team_a_logo || null;
        const teamBLogo = liveData?.logo2 || match.team_b_logo || null;

        const scoreA = liveData ? (liveData.score1 ?? liveData.scoreA ?? 0) : (match.score_a ?? 0);
        const scoreB = liveData ? (liveData.score2 ?? liveData.scoreB ?? 0) : (match.score_b ?? 0);
        const setsA = liveData?.sets1 ?? liveData?.setsA ?? 0;
        const setsB = liveData?.sets2 ?? liveData?.setsB ?? 0;

        return {
            teamA: { name: teamAName, logo: teamALogo, score: scoreA, sets: setsA },
            teamB: { name: teamBName, logo: teamBLogo, score: scoreB, sets: setsB },
            serviceTeam: liveData?.serviceTeam || liveData?.cochonnetTeam,
            matchType: liveData?.matchType || match.label || match.match_type,
            court: liveData?.matchGround || match.court || "Terrain Principal", // Fallback court
            chrono: liveData?.chrono,
        };
    }, [match, liveData]);
}

// --- COMPOSANT INFO (SPORT & TERRAIN) ---
function MatchMetadata({ sport, court, matchType }: { sport: string, court: string, matchType?: string }) {
    return (
        <div className="absolute -top-8 left-0 w-full flex justify-center items-center gap-3 z-10">
            {/* Pill Sport */}
            <div className="bg-gray-900/80 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 shadow-sm">
                {sport}
            </div>
            {/* Pill Terrain / Info */}
            <div className="bg-gray-200/90 text-gray-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-gray-400 shadow-sm">
                {court} {matchType ? `• ${matchType}` : ''}
            </div>
        </div>
    );
}

// --- VARIANTES DE SCOREBAR ---

// 1. ScorebarSets (Volley, Badminton, Tennis)
function ScorebarSets({ displayData, sport, liveData }: { displayData: ReturnType<typeof useDisplayData>; sport: string; liveData: LiveData | null }) {
    return (
        <div className="relative mx-auto mt-8" style={{ width: "700px", height: "120px" }}>
            <MatchMetadata sport={sport} court={displayData.court} matchType={displayData.matchType} />
            
            <img src="/img/scorebar.png" alt="Scoreboard" className="absolute inset-0 w-full h-full object-contain" />

            {/* SETS (HAUT) */}
            <div className="absolute left-0 top-0 w-[120px] h-[50px] flex items-center justify-center">
                <span className="text-gray-900 font-black text-4xl pt-1">{displayData.teamA.sets}</span>
            </div>
            <div className="absolute right-0 top-0 w-[120px] h-[50px] flex items-center justify-center">
                <span className="text-white font-black text-4xl pt-1">{displayData.teamB.sets}</span>
            </div>

            {/* NOMS */}
            <div className="absolute left-[120px] top-0 w-[200px] h-[50px] flex items-center justify-end pr-6">
                <span className="text-gray-900 font-bold text-xl truncate uppercase tracking-tight">{displayData.teamA.name}</span>
            </div>
            <div className="absolute right-[120px] top-0 w-[200px] h-[50px] flex items-center justify-start pl-6">
                <span className="text-gray-900 font-bold text-xl truncate uppercase tracking-tight">{displayData.teamB.name}</span>
            </div>

            {/* POINTS (BAS) */}
            <div className="absolute left-[200px] bottom-[15px] w-[80px] h-[40px] flex items-center justify-center">
                 <span className="text-gray-900 font-bold text-2xl">{displayData.teamA.score}</span>
            </div>
            <div className="absolute right-[200px] bottom-[15px] w-[80px] h-[40px] flex items-center justify-center">
                <span className="text-white font-bold text-2xl">{displayData.teamB.score}</span>
            </div>
        </div>
    );
}

// 2. ScorebarSimple (Football, Handball)
function ScorebarSimple({ displayData, liveData, sport }: { displayData: ReturnType<typeof useDisplayData>; liveData: LiveData | null; sport: string }) {
    return (
        <div className="relative mx-auto mt-8" style={{ width: "700px", height: "60px" }}>
            <MatchMetadata sport={sport} court={displayData.court} matchType={displayData.matchType} />

            <img src="/img/scorebar2.png" alt="Scoreboard" className="absolute inset-0 w-full h-full object-contain" />

            <div className="absolute left-0 top-0 w-[120px] h-full flex items-center justify-center">
                <span className="text-gray-900 font-black text-4xl pt-1">{displayData.teamA.score}</span>
            </div>
            <div className="absolute left-[120px] top-0 w-[210px] h-full flex items-center justify-end pr-4">
                <span className="text-gray-900 font-bold text-xl truncate uppercase tracking-tight">{displayData.teamA.name}</span>
            </div>
            <div className="absolute right-[120px] top-0 w-[210px] h-full flex items-center justify-start pl-4">
                <span className="text-gray-900 font-bold text-xl truncate uppercase tracking-tight">{displayData.teamB.name}</span>
            </div>
            <div className="absolute right-0 top-0 w-[120px] h-full flex items-center justify-center">
                <span className="text-white font-black text-4xl pt-1">{displayData.teamB.score}</span>
            </div>
        </div>
    );
}

// 3. ScorebarExtended (Basketball, Rugby - avec Chrono)
function ScorebarExtended({ displayData, liveData, sport }: { displayData: ReturnType<typeof useDisplayData>; liveData: LiveData | null; sport: string }) {
    return (
        <div className="relative mx-auto mt-8" style={{ width: "700px", height: "100px" }}>
            <MatchMetadata sport={sport} court={displayData.court} matchType={displayData.matchType} />

            <img src="/img/scorebar3.png" alt="Scoreboard" className="absolute inset-0 w-full h-full object-contain" />

            <div className="absolute left-0 top-0 w-[120px] h-[55px] flex items-center justify-center">
                <span className="text-gray-900 font-black text-4xl pt-1">{displayData.teamA.score}</span>
            </div>
            <div className="absolute left-[120px] top-0 w-[210px] h-[55px] flex items-center justify-end pr-8">
                <span className="text-gray-900 font-bold text-xl truncate uppercase tracking-tight">{displayData.teamA.name}</span>
            </div>
            <div className="absolute right-[120px] top-0 w-[210px] h-[55px] flex items-center justify-start pl-8">
                <span className="text-gray-900 font-bold text-xl truncate uppercase tracking-tight">{displayData.teamB.name}</span>
            </div>
            <div className="absolute right-0 top-0 w-[120px] h-[55px] flex items-center justify-center">
                <span className="text-white font-black text-4xl pt-1">{displayData.teamB.score}</span>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[2px] w-[120px] h-[35px] flex items-center justify-center">
                <span className="text-gray-900 font-mono text-xl font-bold tracking-widest">
                    {displayData.chrono || "00:00"}
                </span>
            </div>
        </div>
    );
}

// 4. Darts
function ScorebarDarts({ displayData, liveData, sport }: { displayData: ReturnType<typeof useDisplayData>; liveData: LiveData | null, sport: string }) {
    const scoreRemainingLeft = liveData?.scoreA ?? 301;
    const scoreRemainingRight = liveData?.scoreB ?? 301;
    const setsLeft = liveData?.setsA ?? 0;
    const setsRight = liveData?.setsB ?? 0;

    return (
        <div className="relative mx-auto mt-8" style={{ width: "700px", height: "120px" }}>
            <MatchMetadata sport={sport} court={displayData.court} matchType={displayData.matchType} />

            <img src="/img/scorebar.png" alt="Scoreboard" className="absolute inset-0 w-full h-full object-contain" />
            
            <div className="absolute left-0 top-0 w-[120px] h-[50px] flex items-center justify-center">
                 <span className="text-gray-900 font-black text-4xl pt-1">{setsLeft}</span>
            </div>
            <div className="absolute left-[120px] top-0 w-[200px] h-[50px] flex items-center justify-end pr-6">
                <span className={`text-gray-900 font-bold text-xl truncate uppercase ${liveData?.currentPlayer === displayData.teamA.name ? 'underline decoration-2 underline-offset-4' : ''}`}>
                    {displayData.teamA.name}
                </span>
            </div>
            <div className="absolute right-[120px] top-0 w-[200px] h-[50px] flex items-center justify-start pl-6">
                <span className={`text-gray-900 font-bold text-xl truncate uppercase ${liveData?.currentPlayer === displayData.teamB.name ? 'underline decoration-2 underline-offset-4' : ''}`}>
                    {displayData.teamB.name}
                </span>
            </div>
            <div className="absolute right-0 top-0 w-[120px] h-[50px] flex items-center justify-center">
                 <span className="text-white font-black text-4xl pt-1">{setsRight}</span>
            </div>
            <div className="absolute left-[200px] bottom-[15px] w-[80px] h-[40px] flex items-center justify-center">
                 <span className="text-gray-900 font-bold text-2xl">{scoreRemainingLeft}</span>
            </div>
            <div className="absolute right-[200px] bottom-[15px] w-[80px] h-[40px] flex items-center justify-center">
                <span className="text-white font-bold text-2xl">{scoreRemainingRight}</span>
            </div>
        </div>
    );
}

// --- MAIN ROUTER ---
export default function ScorebarScoreboard({ match, liveData, sport }: ScorebarScoreboardProps) {
    const displayData = useDisplayData(match, liveData);
    const normalizedSport = sport?.toLowerCase().trim() || "unknown";

    switch (normalizedSport) {
        case "volleyball":
        case "badminton":
        case "tennis":
        case "padel":
            return <ScorebarSets displayData={displayData} liveData={liveData} sport={normalizedSport} />;

        case "football":
        case "handball":
        case "basketball": 
        case "rugby":
        case "hockey":
            return <ScorebarExtended displayData={displayData} liveData={liveData} sport={normalizedSport} />;

        case "flechettes":
        case "darts":
            return <ScorebarDarts displayData={displayData} liveData={liveData} sport={normalizedSport} />;

        default:
            return <ScorebarSimple displayData={displayData} liveData={liveData} sport={normalizedSport} />;
    }
}