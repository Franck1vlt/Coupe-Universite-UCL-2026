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
    sets1?: number;
    sets2?: number;
    lastUpdate?: string;
    matchGround?: string;
    serviceTeam?: "A" | "B";
    logo1?: string;
    logo2?: string;
}

export default function BadmintonTableSpectatorPage() {
    const searchParams = useSearchParams();
    const matchId = searchParams.get('matchId');

    const [matchData, setMatchData] = useState<MatchData>({});
    const [logoA, setLogoA] = useState('/img/no-logo.png');
    const [logoB, setLogoB] = useState('/img/no-logo.png');
    const [animateScoreA, setAnimateScoreA] = useState(false);
    const [animateScoreB, setAnimateScoreB] = useState(false);
    const [animateSetA, setAnimateSetA] = useState(false);
    const [animateSetB, setAnimateSetB] = useState(false);
    const logoService = "/img/badminton.png";
    const CONST_SIZE = 75;

    // Clé localStorage spécifique au match si matchId présent
    const storageKey = matchId ? `liveBadmintonMatch_${matchId}` : 'liveBadmintonMatch';

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
                        if (prevData.sets1 !== newData.sets1) {
                            setAnimateSetA(true);
                            setTimeout(() => setAnimateSetA(false), 500);
                        }
                        if (prevData.sets2 !== newData.sets2) {
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
                <div className="flex items-center justify-between w-full gap-4 md:gap-12">
                    {/* Team B */}
                    <div className="team-column">
                        <div className="logo-wrapper">
                            <Image src={logoB} alt="Logo Team B" width={180} height={180} className="team-logo" onError={() => setLogoB('/img/no-logo.png')} priority />
                        </div>
                        <div className="team-name">{matchData.team2 || 'ÉQUIPE B'}</div>
                    </div>
                    {/* Score (Élément central stable) */}
                    <div className="set-display flex items-center text-4xl md:text-6xl font-bold gap-8">
                        <span className={animateSetB ? 'set-change' : ''}>{matchData.sets2 || 0}</span>
                        <span className="mx-4 md:mx-8"> - </span>
                        <span className={animateSetA ? 'set-change' : ''}>{matchData.sets1 || 0}</span>
                    </div>
                    {/* Team A */}
                    <div className="team-column">
                        <div className="logo-wrapper">
                            <Image src={logoA} alt="Logo Team A" width={180} height={180} className="team-logo" onError={() => setLogoA('/img/no-logo.png')} priority />
                        </div>
                        <div className="team-name">{matchData.team1 || 'ÉQUIPE A'}</div>
                    </div>
                </div>

                {/* Bloc central : Logo Service + Scores */}
                <div className="flex flex-row justify-center items-center gap-8 mb-6">

                    {/* Côté Gauche (Team B) */}
                    <div className="w-10 md:w-16 flex justify-end">
                        {matchData.serviceTeam === "B" && (
                            <Image src={logoService} alt="Logo Service" width={CONST_SIZE} height={CONST_SIZE} className="service-logo" />
                        )}
                    </div>

                    {/* Score (Élément central stable) */}
                    <div className="score-display flex items-center text-4xl md:text-6xl font-bold gap-8">
                        <span className={animateScoreB ? 'score-change' : ''}>{matchData.score2 || 0}</span>
                        <span className="mx-4 md:mx-8"> - </span>
                        <span className={animateScoreA ? 'score-change' : ''}>{matchData.score1 || 0}</span>
                    </div>

                    {/* Côté Droit (Team A) */}
                    <div className="w-10 md:w-16 flex justify-start">
                        {matchData.serviceTeam === "A" && (
                            <Image src={logoService} alt="Logo Service" width={CONST_SIZE} height={CONST_SIZE} className="service-logo" />
                        )}
                    </div>

                </div>

                {/* Infos Match */}
                <div className="match-type-label">
                    {matchData.matchGround || 'Terrain'} - {matchData.matchType || 'Match'}
                </div>
            </section>
        </main>
    );
}
