"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import "./spectators.css";

interface MatchData {
    team1?: string;
    team2?: string;
    matchType?: string;
    matchGround?: string;
    score1?: number;
    score2?: number;
    yellowCards1?: number;
    yellowCards2?: number;
    redCards1?: number;
    redCards2?: number;
    technicalFouls1?: number;
    technicalFouls2?: number;
    fouls1?: number;
    fouls2?: number;
    possession?: "A" | "B" | null;
    chrono?: string;
    shotClock?: string;
    period?: string;
    buzzerFiredAt?: number;
    lastUpdate?: string;
    logo1?: string;
    logo2?: string;
}

export default function BasketballTableSpectatorPage() {
    const searchParams = useSearchParams();
    const matchId = searchParams.get('matchId');

    const [matchData, setMatchData] = useState<MatchData>({});
    const [logoA, setLogoA] = useState<string | null>(null);
    const [logoB, setLogoB] = useState<string | null>(null);
    const [animateScoreA, setAnimateScoreA] = useState(false);
    const [animateScoreB, setAnimateScoreB] = useState(false);
    const [buzzerFlash, setBuzzerFlash] = useState(false);
    const [periodChanging, setPeriodChanging] = useState(false);

    const oldScoreARef = useRef(0);
    const oldScoreBRef = useRef(0);
    const teamANameRef = useRef("");
    const teamBNameRef = useRef("");
    const oldShotClockRef = useRef(24);
    const oldPeriodRef = useRef("");
    const oldBuzzerFiredAtRef = useRef<number>(0);

    const storageKey = matchId ? `liveBasketballMatch_${matchId}` : 'liveBasketballMatch';

    useEffect(() => {
        try {
            const liveData = localStorage.getItem(storageKey);
            if (liveData) {
                const data = JSON.parse(liveData);
                setMatchData(data);
                oldScoreARef.current = data.score1 || 0;
                oldScoreBRef.current = data.score2 || 0;
                teamANameRef.current = data.team1 || "";
                teamBNameRef.current = data.team2 || "";
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données initiales:', error);
        }

        const poll = setInterval(() => {
            try {
                const raw = localStorage.getItem(storageKey);
                if (!raw) return;
                const newData: MatchData = JSON.parse(raw);

                if (oldScoreARef.current !== (newData.score1 || 0)) {
                    setAnimateScoreA(true);
                    setTimeout(() => setAnimateScoreA(false), 800);
                    oldScoreARef.current = newData.score1 || 0;
                }
                if (oldScoreBRef.current !== (newData.score2 || 0)) {
                    setAnimateScoreB(true);
                    setTimeout(() => setAnimateScoreB(false), 800);
                    oldScoreBRef.current = newData.score2 || 0;
                }

                if (newData.team1 && teamANameRef.current !== newData.team1) {
                    teamANameRef.current = newData.team1;
                }
                if (newData.team2 && teamBNameRef.current !== newData.team2) {
                    teamBNameRef.current = newData.team2;
                }

                if (newData.buzzerFiredAt && newData.buzzerFiredAt !== oldBuzzerFiredAtRef.current) {
                    setBuzzerFlash(true);
                    setTimeout(() => setBuzzerFlash(false), 500);
                    oldBuzzerFiredAtRef.current = newData.buzzerFiredAt;
                }
                const newShotClock = parseFloat(newData.shotClock || "24") || 0;
                if (oldShotClockRef.current >= 0.1 && newShotClock <= 0) {
                    setBuzzerFlash(true);
                    setTimeout(() => setBuzzerFlash(false), 500);
                }
                oldShotClockRef.current = newShotClock;

                if (oldPeriodRef.current && newData.period && oldPeriodRef.current !== newData.period) {
                    setPeriodChanging(true);
                    setTimeout(() => setPeriodChanging(false), 2000);
                }
                oldPeriodRef.current = newData.period || "";

                setMatchData(newData);
            } catch {}
        }, 50);

        const onStorage = (e: StorageEvent) => {
            if (e.key !== storageKey || !e.newValue) return;
            try {
                const newData: MatchData = JSON.parse(e.newValue);
                setMatchData(newData);
            } catch (err) {
                console.error('Erreur de parsing localStorage:', err);
            }
        };

        window.addEventListener('storage', onStorage);

        return () => {
            window.removeEventListener('storage', onStorage);
            clearInterval(poll);
        };
    }, [storageKey]);

    useEffect(() => {
        if (matchData.logo1) {
            setLogoA(matchData.logo1);
        } else if (matchData.team1) {
            setLogoA(`/img/${matchData.team1.toLowerCase()}.png`);
        } else {
            setLogoA(null);
        }
    }, [matchData.team1, matchData.logo1]);

    useEffect(() => {
        if (matchData.logo2) {
            setLogoB(matchData.logo2);
        } else if (matchData.team2) {
            setLogoB(`/img/${matchData.team2.toLowerCase()}.png`);
        } else {
            setLogoB(null);
        }
    }, [matchData.team2, matchData.logo2]);

    const gameTimerStr = matchData.chrono || '09:00';
    const shotClockStr = matchData.shotClock || '24.0';

    let gameTimerSeconds = 0;
    if (gameTimerStr.includes(':')) {
        const parts = gameTimerStr.split(':');
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseFloat(parts[1]) || 0;
        gameTimerSeconds = minutes * 60 + seconds;
    } else {
        gameTimerSeconds = parseFloat(gameTimerStr) || 0;
    }

    const shotClockSeconds = parseFloat(shotClockStr) || 0;
    const shouldShowShotClock = gameTimerSeconds > shotClockSeconds;

    const displayGameTimer = gameTimerStr;

    return (
        <main>
            <div className="score-board">
                <div className="content-wrapper">
                    {/* Équipes et score — Team B à gauche, Team A à droite (comme football) */}
                    <div className="teams">
                        <div className="team">
                            {logoB ? (
                                <Image
                                    src={logoB}
                                    alt="Logo Team B"
                                    width={300}
                                    height={100}
                                    className="team-logo"
                                    onError={() => setLogoB(null)}
                                    loading="eager"
                                />
                            ) : (
                                <div className="team-logo-placeholder">B</div>
                            )}
                            <div className="team-name" id="teamBName">{matchData.team2 || 'ÉQUIPE B'}</div>
                        </div>

                        <div className="score-container">
                            <span id="teamBScore" className={`score ${animateScoreB ? 'score-change' : ''}`}>
                                {matchData.score2 || 0}
                            </span>
                            <span className="score-divider">-</span>
                            <span id="teamAScore" className={`score ${animateScoreA ? 'score-change' : ''}`}>
                                {matchData.score1 || 0}
                            </span>
                        </div>

                        <div className="team">
                            {logoA ? (
                                <Image
                                    src={logoA}
                                    alt="Logo Team A"
                                    width={300}
                                    height={100}
                                    className="team-logo"
                                    onError={() => setLogoA(null)}
                                    loading="eager"
                                />
                            ) : (
                                <div className="team-logo-placeholder">A</div>
                            )}
                            <div className="team-name" id="teamAName">{matchData.team1 || 'ÉQUIPE A'}</div>
                        </div>
                    </div>

                    {/* Fautes — Team B à gauche, Team A à droite */}
                    <div style={{ textAlign: "center", fontSize: "3vw", margin: "0.5vh 0", order: 2, width: "100%" }}>
                        <span style={{ color: (matchData.fouls2 ?? 0) >= 5 ? "red" : "inherit", fontWeight: "bold" }}>
                            {matchData.fouls2 ?? 0}
                        </span>
                        {" Fautes "}
                        <span style={{ color: (matchData.fouls1 ?? 0) >= 5 ? "red" : "inherit", fontWeight: "bold" }}>
                            {matchData.fouls1 ?? 0}
                        </span>
                    </div>

                    {/* Timers — order:3 (défini dans le CSS) */}
                    <div className="timers">
                        <div className="timer-block">
                            <div className="timer" id="gameTimer">{displayGameTimer}</div>
                            <span className="timer-label">Chrono</span>
                        </div>
                        {shouldShowShotClock && (
                            <div className="timer-block">
                                <div className="timer shot-clock" id="shotClock">{shotClockStr}</div>
                                <span className="timer-label">Possession</span>
                            </div>
                        )}
                    </div>

                    {/* Flèche de possession — order:4 pour apparaître après timers(3) */}
                    {matchData.possession && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "1.5vh 0", padding: "0 8vw", order: 4, width: "100%" }}>
                            {matchData.possession === "A" ? (
                                <div style={{ display: "flex", alignItems: "center", width: "50%" }}>
                                    <div style={{ width: 0, height: 0, borderTop: "2vh solid transparent", borderBottom: "2vh solid transparent", borderRight: "3vw solid red", flexShrink: 0 }} />
                                    <div style={{ flex: 1, height: "0.5vh", background: "red" }} />
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", width: "50%" }}>
                                    <div style={{ flex: 1, height: "0.5vh", background: "red" }} />
                                    <div style={{ width: 0, height: 0, borderTop: "2vh solid transparent", borderBottom: "2vh solid transparent", borderLeft: "3vw solid red", flexShrink: 0 }} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Match info — order:5 (défini dans le CSS) */}
                    <div className="match-info-section">
                        <span className="info-pill">{matchData.matchType || 'Match'}</span>
                        <span className="info-pill">{matchData.matchGround || 'Terrain'}</span>
                        <span className="info-pill info-pill-blue">{matchData.period || 'MT1'}</span>
                    </div>
                </div>
            </div>

            {/* Overlay animation changement de mi-temps */}
            {periodChanging && (
                <div className="period-change-overlay">
                    <div className="period-change-text">{matchData.period}</div>
                </div>
            )}
        </main>
    );
}
