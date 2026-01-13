"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import "./spectators.css";

interface MatchData {
    team1?: string;
    team2?: string;
    matchType?: string;
    score1?: number;
    score2?: number;
    yellowCards1?: number;
    yellowCards2?: number;
    redCards1?: number;
    redCards2?: number;
    chrono?: string;
    lastUpdate?: string;
}

export default function FootballTableSpectatorPage() {
    const [matchData, setMatchData] = useState<MatchData>({});
    const [logoA, setLogoA] = useState('/img/default.png');
    const [logoB, setLogoB] = useState('/img/default.png');
    const [animateScoreA, setAnimateScoreA] = useState(false);
    const [animateScoreB, setAnimateScoreB] = useState(false);

    useEffect(() => {
        // Charger les données initiales
        loadInitialData();

        // Écouter les mises à jour de localStorage provenant d'un autre onglet
        const onStorage = (e: StorageEvent) => {
            if (e.key !== 'liveFootballMatch' || !e.newValue) return;
            try {
                const newData: MatchData = JSON.parse(e.newValue);
                // Animation si le score change
                if (matchData.score1 !== newData.score1) {
                    setAnimateScoreA(true);
                    setTimeout(() => setAnimateScoreA(false), 500);
                }
                if (matchData.score2 !== newData.score2) {
                    setAnimateScoreB(true);
                    setTimeout(() => setAnimateScoreB(false), 500);
                }
                setMatchData(newData);
            } catch (err) {
                console.error('Erreur de parsing localStorage:', err);
            }
        };

        window.addEventListener('storage', onStorage);

        // Fallback polling toutes les 2s si l'événement storage n'arrive pas
        const poll = setInterval(() => {
            try {
                const raw = localStorage.getItem('liveFootballMatch');
                if (!raw) return;
                const newData: MatchData = JSON.parse(raw);
                if (JSON.stringify(matchData) !== JSON.stringify(newData)) {
                    if (matchData.score1 !== newData.score1) {
                        setAnimateScoreA(true);
                        setTimeout(() => setAnimateScoreA(false), 500);
                    }
                    if (matchData.score2 !== newData.score2) {
                        setAnimateScoreB(true);
                        setTimeout(() => setAnimateScoreB(false), 500);
                    }
                    setMatchData(newData);
                }
            } catch {}
        }, 2000);

        return () => {
            window.removeEventListener('storage', onStorage);
            clearInterval(poll);
        };
    }, []);

    useEffect(() => {
        if (matchData.team1) {
            setLogoA(`/img/${matchData.team1}.png`);
        } else {
            setLogoA('/img/default.png');
        }
        if (matchData.team2) {
            setLogoB(`/img/${matchData.team2}.png`);
        } else {
            setLogoB('/img/default.png');
        }
    }, [matchData.team1, matchData.team2]);

    // Charger les données initiales depuis localStorage
    function loadInitialData() {
        try {
            const liveData = localStorage.getItem('liveMatchData');
            if (liveData) {
                setMatchData(JSON.parse(liveData));
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données initiales:', error);
        }
    }

return (
        // bg-[#E0E0E0] et centrage total
        <main className="min-h-screen w-full bg-white flex items-center justify-center p-4 overflow-hidden">
            <section className="score-board-container gap-8">
                
                {/* Chrono */}
                <div className="flex justify-center mb-4 md:mb-8">
                    <span className="remaining-time">{matchData.chrono || '00:00'}</span>
                </div>

                {/* Bloc central : Équipes + Scores */}
                <div className="flex items-center justify-between w-full gap-4 md:gap-12">
                    
                    {/* Team B */}
                    <div className="team-column">
                        <div className="logo-wrapper">
                            <Image src={logoB} alt="Logo Team B" width={180} height={180} className="team-logo" onError={() => setLogoB('/img/no-logo.png')} priority />
                        </div>
                        <div className="team-name">{matchData.team2 || 'ÉQUIPE B'}</div>
                    </div>

                    {/* Score */}
                    <div className="score-display">
                        <span className={animateScoreB ? 'score-change' : ''}>{matchData.score2 || 0}</span>
                        <span className="mx-2 md:mx-4">-</span>
                        <span className={animateScoreA ? 'score-change' : ''}>{matchData.score1 || 0}</span>
                    </div>

                    {/* Team A */}
                    <div className="team-column">
                        <div className="logo-wrapper">
                            <Image src={logoA} alt="Logo Team A" width={180} height={180} className="team-logo" onError={() => setLogoA('/img/no-logo.png')} priority />
                        </div>
                        <div className="team-name">{matchData.team1 || 'ÉQUIPE A'}</div>
                    </div>
                </div>

                {/* Infos Match */}
                <div className="match-type-label">
                    {matchData.matchType || 'Match'}
                </div>

                {/* Cartons */}
                <div className="cards-row">
                    <div className="card-group">
                        <span className="card-icon">🟨</span> {matchData.yellowCards2 || 0}
                        <span className="card-icon ml-2">🟥</span> {matchData.redCards2 || 0}
                    </div>
                    <div className="card-group">
                        <span className="card-icon">🟨</span> {matchData.yellowCards1 || 0}
                        <span className="card-icon ml-2">🟥</span> {matchData.redCards1 || 0}
                    </div>
                </div>

            </section>
        </main>
    );
}