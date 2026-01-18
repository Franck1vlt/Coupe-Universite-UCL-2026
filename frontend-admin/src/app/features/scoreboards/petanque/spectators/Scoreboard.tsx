"use client";

import { useState, useEffect } from "react";
import "./spectators.css";

interface MatchData {
    team1?: string;
    team2?: string;
    logoA?: string;
    logoB?: string;
    matchType?: string;
    matchGround?: string;
    scoreA?: number;
    scoreB?: number;
    setsA?: number;
    setsB?: number;
    gameMode?: string;
    cochonnetTeam?: "A" | "B";
    pendingWinner?: "A" | "B" | null;
    pendingPoints?: number;
    targetScore?: number;
    meneCount?: number;
    lastUpdate?: string;
}

export default function PetanqueTableSpectatorPage() {
    const [animateScoreA, setAnimateScoreA] = useState(false);
    const [animateScoreB, setAnimateScoreB] = useState(false);
    const [matchData, setMatchData] = useState<MatchData>({});


    useEffect(() => {
        // Charger les données initiales
        loadInitialData();

        // Écouter les mises à jour de localStorage provenant d'un autre onglet
        const onStorage = (e: StorageEvent) => {
            if (e.key !== 'livePetanqueMatch' || !e.newValue) return;
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
                const raw = localStorage.getItem('livePetanqueMatch');
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
    }, []);

    // Charger les données initiales depuis localStorage
    function loadInitialData() {
        try {
            const liveData = localStorage.getItem('livePetanqueMatch');
            if (liveData) {
                setMatchData(JSON.parse(liveData));
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données initiales:', error);
        }
    }

return (
        <main className="min-h-screen w-full bg-white flex items-center justify-center p-4 overflow-hidden">
            <section className="score-board-container gap-8">

                {/* Score central avec logos au-dessus des noms */}
                <div className="flex flex-col items-center gap-4 w-full">

                    <div className="flex items-center justify-center w-full gap-4">
                        
                        {/* ZONE COCHONNET GAUCHE (Place réservée) */}
                        <div className="flex justify-end" style={{ width: '60px' }}>
                            {matchData.cochonnetTeam === "A" && (
                                <img src="/img/cochonet.png" alt="Cochonnet" className="w-12 h-12 object-contain" />
                            )}
                        </div>

                        {/* BLOC CENTRAL (Équipes et Score) */}
                        <div className="flex items-center justify-between" style={{ width: '700px' }}>
                            
                            {/* Équipe A */}
                            <div className="flex flex-col items-center">
                                {matchData.logoA && (
                                    <img src={matchData.logoA} alt={matchData.team1} className="w-24 h-24 object-contain mb-2" />
                                )}
                                <span className="team-label text-xl font-bold">{matchData.team1 || 'FLD'}</span>
                            </div>

                            {/* Score */}
                            <div className="flex items-center gap-6 mx-8">
                                <span className={`points-value text-7xl font-black ${animateScoreA ? 'score-change' : ''}`}>
                                    {matchData.scoreA ?? 0}
                                </span>
                                <span className="sets-separator text-5xl">-</span>
                                <span className={`points-value text-7xl font-black ${animateScoreB ? 'score-change' : ''}`}>
                                    {matchData.scoreB ?? 0}
                                </span>
                            </div>

                            {/* Équipe B */}
                            <div className="flex flex-col items-center">
                                {matchData.logoB && (
                                    <img src={matchData.logoB} alt={matchData.team2} className="w-24 h-24 object-contain mb-2" />
                                )}
                                <span className="team-label text-xl font-bold">{matchData.team2 || 'FMMS'}</span>
                            </div>
                        </div>

                        {/* ZONE COCHONNET DROITE (Place réservée) */}
                        <div className="flex justify-start" style={{ width: '60px' }}>
                            {matchData.cochonnetTeam === "B" && (
                                <img src="/img/cochonet.png" alt="Cochonnet" className="w-12 h-12 object-contain" />
                            )}
                        </div>

                    </div>

                    {/* Indicateur de mène */}
                    <div className="mene-indicator" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '1rem' }}>
                        Mène {(matchData.meneCount || 0) + 1}
                    </div>

                    {/* Indicateur cochonnet */}
                    {matchData.cochonnetTeam && (
                        <div className="current-player-section">
                            <div className="current-player-text">
                                🎯 A {matchData.cochonnetTeam === "A" ? matchData.team1 : matchData.team2} de lancer le cochonnet
                            </div>
                        </div>
                    )}
                </div>

                {/* Mode de jeu, terrain et type de match */}
                <div className="match-info-section">
                    <span className="match-mode">Match en {matchData.targetScore || 13} points</span>
                    <span className="match-separator"> - </span>
                    <span className="match-type">{matchData.matchGround || 'Terrain'}</span>
                    <span className="match-separator"> - </span>
                    <span className="match-type">{matchData.matchType || 'Match'}</span>
                </div>

            </section>
        </main>
    );
}