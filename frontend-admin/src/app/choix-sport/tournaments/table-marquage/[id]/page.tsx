"use client";

import { use, useEffect, useState } from 'react';

import { getScoreboardComponent, getSportConfig, type SportCode } from '../registry';
import { notFound, useSearchParams } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

interface MatchData {
  data: {
    phase_id: number;
    // autres champs du match
  };
}

interface PhaseData {
  data: {
    tournament_id: number;
  };
}

interface TournamentData {
  data: {
    sport_id: number;
  };
}

interface SportData {
  data: {
    code: string;
  };
}

export default function TableMarquagePage({ params }: PageProps) {
  // Ajout d'un state pour stocker toutes les infos du match (doit être dans le composant !)
  const [matchData, setMatchData] = useState<any>(null);
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const matchIdFromUrl = searchParams.get('matchId');
  const [sportCode, setSportCode] = useState<SportCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Le paramètre id peut être soit le sport code directement, soit le matchId
  const isNumeric = /^\d+$/.test(resolvedParams.id);
  const matchId = isNumeric ? resolvedParams.id : matchIdFromUrl;

  useEffect(() => {
    if (!isNumeric || !matchId) {
      console.log("Pas de matchId ou pas numérique", { isNumeric, matchId });
      return;
    }
    fetch(`http://localhost:8000/matches/${matchId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Match not found');
        const match = await res.json();
        setMatchData(match.data); // Stocke toutes les infos du match
      })
      .catch((err) => {
        console.error("Erreur lors du chargement du match:", err);
      });
  }, [isNumeric, matchId]);
  
  useEffect(() => {
    async function fetchMatchSport() {
      if (!isNumeric) {
        // Si c'est un code de sport, on l'utilise directement
        const sportCodes = ['football', 'handball', 'basketball', 'volleyball', 'badminton', 'petanque', 'flechettes'];
        if (sportCodes.includes(resolvedParams.id)) {
          setSportCode(resolvedParams.id as SportCode);
          setLoading(false);
        } else {
          setError(true);
          setLoading(false);
        }
        return;
      }
      
      // Si c'est un ID numérique, on récupère le sport depuis l'API
      try {
        // 1. Récupérer le match pour obtenir phase_id
        const matchResponse = await fetch(`http://localhost:8000/matches/${matchId}`);
        if (!matchResponse.ok) throw new Error('Match not found');
        const matchData: MatchData = await matchResponse.json();
        
        // 2. Récupérer la phase pour obtenir tournament_id
        const phaseResponse = await fetch(`http://localhost:8000/tournament-phases/${matchData.data.phase_id}`);
        if (!phaseResponse.ok) throw new Error('Phase not found');
        const phaseData: PhaseData = await phaseResponse.json();
        
        // 3. Récupérer le tournoi pour obtenir sport_id
        const tournamentResponse = await fetch(`http://localhost:8000/tournaments/${phaseData.data.tournament_id}`);
        if (!tournamentResponse.ok) throw new Error('Tournament not found');
        const tournamentData: TournamentData = await tournamentResponse.json();
        
        // 4. Récupérer le sport pour obtenir le code
        const sportResponse = await fetch(`http://localhost:8000/sports/${tournamentData.data.sport_id}`);
        if (!sportResponse.ok) throw new Error('Sport not found');
        const sportData: SportData = await sportResponse.json();
        
        setSportCode(sportData.data.code as SportCode);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching match:', err);
        setError(true);
        setLoading(false);
      }
    }
    
    fetchMatchSport();
  }, [resolvedParams.id, matchId, isNumeric]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (error || !sportCode) {
    notFound();
  }

  const config = getSportConfig(sportCode);
  const ScoreboardComponent = getScoreboardComponent(sportCode);

  if (!config || !ScoreboardComponent) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Affichage des infos du match */}
      {matchData && (
        <div className="mb-4 p-4 bg-white rounded shadow">
          <div><b>Équipe A :</b> {matchData.team_a_source || matchData.team_sport_a_id || "?"}</div>
          <div><b>Équipe B :</b> {matchData.team_b_source || matchData.team_sport_b_id || "?"}</div>
          <div><b>Terrain :</b> {matchData.court || matchData.court_id || "?"}</div>
          <div><b>Horaire :</b> {matchData.scheduled_datetime ? new Date(matchData.scheduled_datetime).toLocaleString() : "?"}</div>
          <div><b>Durée estimée :</b> {matchData.estimated_duration_minutes ? matchData.estimated_duration_minutes + " min" : "?"}</div>
        </div>
      )}
      <ScoreboardComponent config={config} matchId={matchId || undefined} />
    </div>
  );
}