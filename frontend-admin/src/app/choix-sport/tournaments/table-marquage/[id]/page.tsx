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
        const currentStatus = match?.data?.status;
        console.log("Status actuel du match:", currentStatus);
        if (currentStatus === 'in_progress' || currentStatus === 'completed') {
          console.log("Déjà en cours ou terminé, pas de PATCH");
          return;
        }
        // PATCH pour passer le match en "in_progress"
        console.log("Envoi PATCH pour passer en in_progress");
        return fetch(`http://localhost:8000/matches/${matchId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ status: "in_progress" })
        });
      })
      .then((patchRes) => {
        if (patchRes) {
          console.log("Réponse PATCH:", patchRes.status);
        }
      })
      .catch((err) => {
        console.error("Erreur lors du passage en 'en-cours':", err);
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
      <ScoreboardComponent config={config} matchId={matchId || undefined} />
    </div>
  );
}