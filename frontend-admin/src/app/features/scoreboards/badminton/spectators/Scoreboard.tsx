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

export default function BadmintonTableSpectatorPage() {
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
            if (e.key !== 'liveBadmintonMatch' || !e.newValue) return;
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
                const raw = localStorage.getItem('liveBadmintonMatch');
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

    // Ancienne logique hors ligne supprimée au profit de l'événement storage + polling

    return (
        <main>
            <div className="score-board">
                <div className="teams">
                    <div className="team">
                        <Image src={logoB} alt="Logo Team B" width={100} height={100} className="team-logo" onError={() => setLogoB('/img/no-logo.png')} loading="eager" />
                        <div id="teamBName">{matchData.team2 || 'ÉQUIPE B'}</div>
                    </div>
                    <div className="team">
                        <Image src={logoA} alt="Logo Team A" width={100} height={100} className="team-logo" onError={() => setLogoA('/img/no-logo.png')} loading="eager" />
                        <div id="teamAName">{matchData.team1 || 'ÉQUIPE A'}</div>
                    </div>
                </div>

                <div className="score-container">
                    <span id="teamBScore" className={animateScoreB ? 'score-change' : ''}>{matchData.score2 || 0}</span>
                    <span className="score-divider">-</span>
                    <span id="teamAScore" className={animateScoreA ? 'score-change' : ''}>{matchData.score1 || 0}</span>
                </div>

                <div className="match-info">
                    <span className="remaining-time" id="gameChrono">{matchData.chrono || '00:00'}</span>
                    <span className="match-type" id="matchType">{matchData.matchType || 'Match'}</span>
                </div>

                <div className="cards">
                    <div className="team-cards">
                        <span>🟨</span><span id="teamBYellowCard">{matchData.yellowCards2 || 0}</span>
                        <span>🟥</span><span id="teamBRedCard">{matchData.redCards2 || 0}</span>
                    </div>
                    <div className="team-cards">
                        <span>🟨</span><span id="teamAYellowCard">{matchData.yellowCards1 || 0}</span>
                        <span>🟥</span><span id="teamARedCard">{matchData.redCards1 || 0}</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
