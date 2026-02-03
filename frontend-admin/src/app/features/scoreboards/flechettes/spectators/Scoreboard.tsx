"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import "./spectators.css";

interface MatchData {
    team1?: string;
    team2?: string;
    matchType?: string;
    matchGround?: string;
    scoreA?: number;
    scoreB?: number;
    setsA?: number;
    setsB?: number;
    gameMode?: string;
    currentPlayer?: string;
    currentThrows?: number[];
    lastUpdate?: string;
    winner?: string;
}

export default function FlechettesTableSpectatorPage() {
    const searchParams = useSearchParams();
    const matchId = searchParams.get('matchId');

    const [animateScoreA, setAnimateScoreA] = useState(false);
    const [animateScoreB, setAnimateScoreB] = useState(false);
    const [animateSetA, setAnimateSetA] = useState(false);
    const [animateSetB, setAnimateSetB] = useState(false);
    const [matchData, setMatchData] = useState<MatchData>({});

    // Clé localStorage spécifique au match si matchId présent
    const storageKey = matchId ? `liveFlechettesMatch_${matchId}` : 'liveFlechettesMatch';

    useEffect(() => {
        // Charger les données initiales
        try {
            const liveData = localStorage.getItem(storageKey);
            if (liveData) {
                setMatchData(JSON.parse(liveData));
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données initiales:', error);
        }

        // Écouter les mises à jour de localStorage provenant d'un autre onglet
        const onStorage = (e: StorageEvent) => {
            if (e.key !== storageKey || !e.newValue) return;
            try {
                const newData: MatchData = JSON.parse(e.newValue);
                setMatchData((prevData) => {
                    // Animation si le score change
                    if (prevData.scoreA !== newData.scoreA) {
                        setAnimateScoreA(true);
                        setTimeout(() => setAnimateScoreA(false), 400);
                    }
                    if (prevData.scoreB !== newData.scoreB) {
                        setAnimateScoreB(true);
                        setTimeout(() => setAnimateScoreB(false), 400);
                    }
                    // Animation si les sets changent
                    if (prevData.setsA !== newData.setsA) {
                        setAnimateSetA(true);
                        setTimeout(() => setAnimateSetA(false), 500);
                    }
                    if (prevData.setsB !== newData.setsB) {
                        setAnimateSetB(true);
                        setTimeout(() => setAnimateSetB(false), 500);
                    }
                    return newData;
                });
            } catch (err) {
                console.error('Erreur de parsing localStorage:', err);
            }
        };

        window.addEventListener('storage', onStorage);

        // Fallback polling toutes les 2s si l'événement storage n'arrive pas
        const poll = setInterval(() => {
            try {
                const raw = localStorage.getItem(storageKey);
                if (!raw) return;
                const newData: MatchData = JSON.parse(raw);
                setMatchData((prevData) => {
                    if (JSON.stringify(prevData) !== JSON.stringify(newData)) {
                        if (prevData.scoreA !== newData.scoreA) {
                            setAnimateScoreA(true);
                            setTimeout(() => setAnimateScoreA(false), 400);
                        }
                        if (prevData.scoreB !== newData.scoreB) {
                            setAnimateScoreB(true);
                            setTimeout(() => setAnimateScoreB(false), 400);
                        }
                        if (prevData.setsA !== newData.setsA) {
                            setAnimateSetA(true);
                            setTimeout(() => setAnimateSetA(false), 500);
                        }
                        if (prevData.setsB !== newData.setsB) {
                            setAnimateSetB(true);
                            setTimeout(() => setAnimateSetB(false), 500);
                        }
                        return newData;
                    }
                    return prevData;
                });
            } catch {}
        }, 2000);

        return () => {
            window.removeEventListener('storage', onStorage);
            clearInterval(poll);
        };
    }, [storageKey]);

    const winnerName = matchData.winner;

    return (
        <>
            {winnerName && (
                <div className="vainqueur-overlay">
                    <div className="vainqueur-banner animate-vainqueur">
                        🏆 Vainqueur : {winnerName} 🏆
                    </div>
                </div>
            )}
            <main className="min-h-screen w-full bg-white flex items-center justify-center p-4 overflow-hidden">
                <section className="score-board-container gap-8">

                    {/* Score central */}
                    <div className="flex flex-col items-center gap-6 w-full">
                        {/* Sets gagnés - EN GROS */}
                        <div className="sets-score">
                            <span className="team-label">{matchData.team2 || 'Team B'}</span>
                            <span className={`sets-number ${animateSetB ? 'set-change' : ''}`}>{matchData.setsB || 0}</span>
                            <span className="sets-separator">-</span>
                            <span className={`sets-number ${animateSetA ? 'set-change' : ''}`}>{matchData.setsA || 0}</span>
                            <span className="team-label">{matchData.team1 || 'Team A'}</span>
                        </div>

                        {/* Points restants - EN TRÈS GROS */}
                        <div className="remaining-points">
                            <span className={`points-value ${animateScoreB ? 'score-change' : ''}`}>
                                {matchData.scoreB ?? 301}
                            </span>
                            <span className="points-separator">-</span>
                            <span className={`points-value ${animateScoreA ? 'score-change' : ''}`}>
                                {matchData.scoreA ?? 301}
                            </span>
                        </div>
                    </div>

                    {/* Joueur actuel - CLAIREMENT VISIBLE */}
                    <div className="current-player-section">
                        <div className="current-player-text">
                            🎯 À {matchData.currentPlayer || 'Joueur 1A'} de jouer
                        </div>
                        {matchData.currentThrows && matchData.currentThrows.length > 0 && (
                            <div className="current-throw-info">
                                Volée en cours: {matchData.currentThrows.join(' + ')} = {matchData.currentThrows.reduce((a, b) => a + b, 0)}
                            </div>
                        )}
                    </div>

                    {/* Mode de jeu, terrain et type de match */}
                    <div className="match-info-section">
                        <span className="match-mode">{matchData.gameMode || 'BO3'}</span>
                        <span className="match-separator"> - </span>
                        <span className="match-type">{matchData.matchGround || 'Terrain'}</span>
                        <span className="match-separator"> - </span>
                        <span className="match-type">{matchData.matchType || 'Match'}</span>
                    </div>

                </section>
            </main>
        </>
    );
}