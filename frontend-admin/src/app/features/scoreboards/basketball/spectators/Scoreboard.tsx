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

    // Refs pour éviter les stale closures dans le polling
    const oldScoreARef = useRef(0);
    const oldScoreBRef = useRef(0);
    const teamANameRef = useRef("");
    const teamBNameRef = useRef("");
    const oldShotClockRef = useRef(24);
    const oldPeriodRef = useRef("");
    const oldBuzzerFiredAtRef = useRef<number>(0);

    // Clé localStorage spécifique au match si matchId présent
    const storageKey = matchId ? `liveBasketballMatch_${matchId}` : 'liveBasketballMatch';

    useEffect(() => {
        // Charger les données initiales
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

        // Polling rapide toutes les 50ms pour une meilleure fluidité
        const poll = setInterval(() => {
            try {
                const raw = localStorage.getItem(storageKey);
                if (!raw) return;
                const newData: MatchData = JSON.parse(raw);

                // Animation si le score change
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

                // Mettre à jour les noms d'équipe
                if (newData.team1 && teamANameRef.current !== newData.team1) {
                    teamANameRef.current = newData.team1;
                }
                if (newData.team2 && teamBNameRef.current !== newData.team2) {
                    teamBNameRef.current = newData.team2;
                }

                // Animation buzzer : détection via buzzerFiredAt (buzzer manuel ou shot clock à 0)
                if (newData.buzzerFiredAt && newData.buzzerFiredAt !== oldBuzzerFiredAtRef.current) {
                    setBuzzerFlash(true);
                    setTimeout(() => setBuzzerFlash(false), 500);
                    oldBuzzerFiredAtRef.current = newData.buzzerFiredAt;
                }
                // Fallback : détection via shot clock (>= 0.1 pour capturer la transition 0.1→0.0)
                const newShotClock = parseFloat(newData.shotClock || "24") || 0;
                if (oldShotClockRef.current >= 0.1 && newShotClock <= 0) {
                    setBuzzerFlash(true);
                    setTimeout(() => setBuzzerFlash(false), 500);
                }
                oldShotClockRef.current = newShotClock;

                // Animation changement de mi-temps
                if (oldPeriodRef.current && newData.period && oldPeriodRef.current !== newData.period) {
                    setPeriodChanging(true);
                    setTimeout(() => setPeriodChanging(false), 2000);
                }
                oldPeriodRef.current = newData.period || "";

                setMatchData(newData);
            } catch {}
        }, 50);

        // Écouter les changements de localStorage provenant d'un autre onglet
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

    // Calculer si le shot clock doit être visible
    const gameTimerStr = matchData.chrono || '09:00';
    const shotClockStr = matchData.shotClock || '24.0';

    // Convertir en secondes pour la comparaison
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
                    {/* Équipes et score en premier */}
                    <div className="teams">
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

                        <div className="score-container">
                            <span id="teamAScore" className={`score ${animateScoreA ? 'score-change' : ''}`}>
                                {matchData.score1 || 0}
                            </span>
                            <span className="score-divider">-</span>
                            <span id="teamBScore" className={`score ${animateScoreB ? 'score-change' : ''}`}>
                                {matchData.score2 || 0}
                            </span>
                        </div>

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
                    </div>

                    {/* Timers au milieu */}
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

                    {/* Match info ensuite */}
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
