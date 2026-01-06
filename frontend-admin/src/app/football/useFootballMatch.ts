import { useState } from "react";
import { MatchData } from "./types";

export function useFootballMatch(initialMatchId: string | null) {
    const [matchData, setMatchData] = useState<MatchData>({
        matchId: initialMatchId || "",
        teamA: { name: "Team A", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        teamB: { name: "Team B", score: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        chrono: { time: 0, running: false, interval: null },
        hasPenalties: false,
        matchType: ""
    });

    /** ---------- CHRONO ---------- */
    const startChrono = () => {
        setMatchData((prev) => {
            if (prev.chrono.running) return prev;

            const interval = setInterval(() => {
                setMatchData((p) => ({
                    ...p,
                    chrono: { ...p.chrono, time: p.chrono.time + 1 },
                }));
            }, 1000);

            return {
                ...prev,
                chrono: { ...prev.chrono, running: true, interval },
            };
        });
    };

    const stopChrono = () => {
        setMatchData((prev) => {
            if (prev.chrono.interval) clearInterval(prev.chrono.interval);
            return {
                ...prev,
                chrono: { ...prev.chrono, running: false, interval: null },
            };
        });
    };

    const formattedTime = `${String(
        Math.floor(matchData.chrono.time / 60)
    ).padStart(2, "0")}:${String(matchData.chrono.time % 60).padStart(2, "0")}`;

    /** ---------- SCORES ---------- */
    const addPoint = (team: "A" | "B") =>
        setMatchData((p) => ({
            ...p,
            [`team${team}`]: {
                ...p[`team${team}`],
                score: p[`team${team}`].score + 1,
            },
        }));

    const subPoint = (team: "A" | "B") =>
        setMatchData((p) => ({
            ...p,
            [`team${team}`]: {
                ...p[`team${team}`],
                score: Math.max(0, p[`team${team}`].score - 1),
            },
        }));

    /** ---------- CARTONS ---------- */
    const addYellow = (team: "A" | "B") =>
        setMatchData((p) => ({
            ...p,
            [`team${team}`]: {
                ...p[`team${team}`],
                yellowCards: p[`team${team}`].yellowCards + 1,
            },
        }));

    const addRed = (team: "A" | "B") =>
        setMatchData((p) => ({
            ...p,
            [`team${team}`]: {
                ...p[`team${team}`],
                redCards: p[`team${team}`].redCards + 1,
            },
        }));

    /** ---------- Équipes et type ---------- */
    const updateTeams = (teamAName?: string, teamBName?: string) => {
        setMatchData((prev) => ({
            ...prev,
            teamA: { ...prev.teamA, name: teamAName ?? prev.teamA.name },
            teamB: { ...prev.teamB, name: teamBName ?? prev.teamB.name },
        }));
    };

    const updateMatchType = (type: string) => {
        setMatchData((prev) => ({
            ...prev,
            matchType: type,
        }));
    };

    return {
        matchData,
        setMatchData,
        updateTeams,
        updateMatchType,
        formattedTime,
        startChrono,
        stopChrono,
        addPoint,
        subPoint,
        addYellow,
        addRed,
    };
}
