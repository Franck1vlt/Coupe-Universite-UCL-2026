"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
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
    period?: string;
    logo1?: string;
    logo2?: string;
}

export default function HandballTableSpectatorPage() {
    const searchParams = useSearchParams();
    const matchId = searchParams.get('matchId');

    const [logoA, setLogoA] = useState('/img/no-logo.png');
    const [logoB, setLogoB] = useState('/img/no-logo.png');
    const [animateScoreA, setAnimateScoreA] = useState(false);
    const [animateScoreB, setAnimateScoreB] = useState(false);
    const [matchData, setMatchData] = useState<MatchData>({});

    // Clé localStorage spécifique au match si matchId présent
    const storageKey = matchId ? `liveHandballMatch_${matchId}` : 'liveHandballMatch';

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
                setMatchData(prevData => {
                    if (prevData.score1 !== newData.score1) {
                        setAnimateScoreA(true);
                        setTimeout(() => setAnimateScoreA(false), 500);
                    }
                    if (prevData.score2 !== newData.score2) {
                        setAnimateScoreB(true);
                        setTimeout(() => setAnimateScoreB(false), 500);
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
                setMatchData(prevData => {
                    if (JSON.stringify(prevData) !== JSON.stringify(newData)) {
                        if (prevData.score1 !== newData.score1) {
                            setAnimateScoreA(true);
                            setTimeout(() => setAnimateScoreA(false), 500);
                        }
                        if (prevData.score2 !== newData.score2) {
                            setAnimateScoreB(true);
                            setTimeout(() => setAnimateScoreB(false), 500);
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

    useEffect(() => {
        if (matchData.logo1) {
            setLogoA(matchData.logo1);
        } else if (matchData.team1) {
            setLogoA(`/img/${matchData.team1.toLowerCase()}.png`);
        } else {
            setLogoA('/img/no-logo.png');
        }
        if (matchData.logo2) {
            setLogoB(matchData.logo2);
        } else if (matchData.team2) {
            setLogoB(`/img/${matchData.team2.toLowerCase()}.png`);
        } else {
            setLogoB('/img/no-logo.png');
        }
    }, [matchData.team1, matchData.team2, matchData.logo1, matchData.logo2]);

return (
        <main className="min-h-screen w-full bg-white flex items-center justify-center p-4 overflow-hidden">
            <section className="score-board-container gap-8">

                {/* Chrono */}
                <div className="flex justify-center mb-4 md:mb-8">
                    <span className="remaining-time">{matchData.chrono || '10:00'}</span>
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
                <div className="match-infos">
                    <div className="match-period">{matchData.period || "MT1"}</div>
                    <p>-</p>
                    <div className="match-type-label">{matchData.matchType || 'Match'}</div>
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
