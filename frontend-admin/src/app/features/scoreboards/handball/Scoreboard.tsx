"use client";

import { useState, useEffect } from "react";
import { getAvailableCourts } from "./courtUtils";
import "./handball.css";
import { useSearchParams } from "next/navigation";
import { useHandballMatch } from "./useHandballMatch";
import { useRouter } from "next/navigation";

type Team = {
  id: string;
  name: string;
  logo_url: string;
};

type Court = {
  id: string;
  name: string;
};

export default function HandballTableMarquagePage() {
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const params = useSearchParams();
  const matchId = params.get("matchId");
  console.log('[Handball Scoreboard] ========== COMPONENT LOADED ==========');
  console.log('[Handball Scoreboard] MatchId from URL:', matchId);
  const router = useRouter();

  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [matchType, setMatchType] = useState("Type de match");
  const [matchGround, setMatchGround] = useState("Terrain");

  const [courts, setCourts] = useState<Court[]>([]);
  const [courtSchedules, setCourtSchedules] = useState<any[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");

  const [chronoMinutes, setChronoMinutes] = useState(0);
  const [chronoSeconds, setChronoSeconds] = useState(0);

  // Charger les équipes au montage du composant
  useEffect(() => {
    fetchTeams();
    fetchCourts();
    fetchCourtSchedules();
  }, []);
  // Récupérer les plannings de tous les terrains (pour filtrer les dispos)
  const fetchCourtSchedules = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/match-schedules?skip=0&limit=200`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) throw new Error("Impossible de charger les plannings");
      const data = await res.json();
      setCourtSchedules(Array.isArray(data?.data?.items) ? data.data.items : []);
    } catch (error) {
      setCourtSchedules([]);
    }
  };

  const {
    matchData,
    formattedTime,
    startChrono,
    stopChrono,
    setChrono,
    addSecond,
    addPoint,
    subPoint,
    addYellowCard,
    subYellowCard,
    addRedCard,
    subRedCard,
    setTeamName,
    setTeamLogo,
    setMatchType: setMatchTypeMeta,
    swapSides,
    court,
    handleEnd,
    togglePeriod,
    periodSwitchChecked,
    period,
    updateMatchStatus
  } = useHandballMatch(matchId);

  const handleStart = () => {
    updateMatchStatus('in_progress');
    startChrono();
  };


  // Synchroniser les données du match avec les states locaux
  useEffect(() => {
    console.log('[Handball Scoreboard] Match data changed:', matchData);
    console.log('[Handball Scoreboard] Court:', court);
    
    if (matchData.teamA.name && matchData.teamA.name !== "Team A") {
      setTeamA(matchData.teamA.name);
      console.log('[Handball Scoreboard] Set Team A to:', matchData.teamA.name);
    }
    if (matchData.teamB.name && matchData.teamB.name !== "Team B") {
      setTeamB(matchData.teamB.name);
      console.log('[Handball Scoreboard] Set Team B to:', matchData.teamB.name);
    }
    if (matchData.matchType) {
      setMatchType(matchData.matchType);
      console.log('[Handball Scoreboard] Set Match Type to:', matchData.matchType);
    }
    if (court) {
      setMatchGround(court);
      console.log('[Handball Scoreboard] Set Court to:', court);
    }
  }, [matchData, court]);

  const handleTeamAChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTeamA(value);
    const t = teams.find((c: Team) => c.id === value);
    if (t) {
      setTeamName("A", t.name);
      if (t.logo_url) setTeamLogo("A", t.logo_url);
    }
  };

  const handleTeamBChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTeamB(value);
    const t = teams.find((c: Team) => c.id === value);
    if (t) {
      setTeamName("B", t.name);
      if (t.logo_url) setTeamLogo("B", t.logo_url);
    }
  };

  const handleMatchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setMatchType(value);
    setMatchTypeMeta(value);
  };

  // Récupérer les équipes depuis l'API
  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams?skip=0&limit=100`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) throw new Error("Impossible de charger les équipes");
      const data = await res.json();
      const teamsData = Array.isArray(data?.data?.items) ? data.data.items : [];
      setTeams(teamsData.map((team: any) => ({
        id: team.id.toString(),
        name: team.name,
        logo_url: team.logo_url
      })));
    } catch (error) {
      console.error("Erreur lors du chargement des équipes:", error);
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchCourts = async () => {
    setLoadingCourts(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courts?skip=0&limit=100`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) throw new Error("Impossible de charger les terrains");
      const data = await res.json();
      const courtsData = Array.isArray(data?.data?.items) ? data.data.items : [];
      setCourts(courtsData.map((court: any) => ({
        id: court.id.toString(),
        name: court.name
      })));
    } catch (error) {
      console.error("Erreur lors du chargement des terrains:", error);
      setCourts([]);
    } finally {
      setLoadingCourts(false);
    }
  };

  const handleSwipe = () => {
    const a = teamA;
    const b = teamB;
    setTeamA(b);
    setTeamB(a);
    swapSides();
  };

  return (
    <main className="handball-root">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-black mb-2">
          Handball - Table de marquage
        </h1>
      </header>

      <div className="gauche">
        <div className="parametres-match mb-6">
          <label htmlFor="teamA">Équipe A :</label>
            {matchId ? (
            <input
              type="text"
              value={matchData.teamA.name}
              disabled
              className="w-full text-center rounded-md border-none mb-2.5 bg-white text-black cursor-not-allowed p-2"
            />
            ) : (
            <select name="teamA" value={teamA} onChange={handleTeamAChange} disabled={loadingTeams}>
              <option value="">{loadingTeams ? "Chargement..." : "Sélectionner"}</option>
              {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
              ))}
            </select>
            )}

          <label htmlFor="teamB">Équipe B :</label>
          {matchId ? (
            <input
              type="text"
              value={matchData.teamB.name}
              disabled
              className="w-full text-center rounded-md border-none mb-2.5 bg-white text-black cursor-not-allowed p-2"
            />
          ) : (
            <select id="teamB" name="teamB" value={teamB} onChange={handleTeamBChange} disabled={loadingTeams}>
              <option value="">{loadingTeams ? "Chargement..." : "Sélectionner"}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}

          <label htmlFor="matchType">Type de match :</label>
          {matchId ? (
            <input
              type="text"
              value={matchData.matchType}
              disabled
              className="w-full text-center rounded-md border-none mb-2.5 bg-white text-black cursor-not-allowed p-2"
            />
          ) : (
            <select id="matchTypeSelector" value={matchType} onChange={handleMatchTypeChange}>
              <option value="">Sélectionner</option>
              <option value="Qualification">Qualification</option>
              <option value="Poule">Poule</option>
              <option value="Quart de finale">Quart de finale</option>
              <option value="Demi-finale">Demi-finale</option>
              <option value="Petite Finale">Petite Finale</option>
              <option value="Finale">Finale</option>
            </select>
          )}

          <label htmlFor="matchGround">Terrain :</label>
          {matchId ? (
            <input
              type="text"
              value={
                // Affiche toujours le nom du terrain si possible
                courts.find(c => c.id === matchData.court?.toString())?.name
                || courts.find(c => c.name === matchData.court)?.name
                || courts.find(c => c.id === court?.toString())?.name
                || courts.find(c => c.name === court)?.name
                || courts.find(c => c.id === matchGround)?.name
                || matchData.court
                || court
                || (matchGround !== "Terrain" ? courts.find(c => c.id === matchGround)?.name : "Terrain")
              }
              disabled
              className="w-full text-center rounded-md border-none mb-2.5 bg-white text-black cursor-not-allowed p-2"
            />
          ) : (
            <>
              {/* Sélection du terrain avec désactivation des terrains occupés */}
              <select
                id="matchGroundSelector"
                value={matchGround}
                onChange={(e) => setMatchGround(e.target.value)}
                disabled={loadingCourts}
              >
                <option value="">{loadingCourts ? "Chargement..." : "Sélectionner"}</option>
                {getAvailableCourts(courts, courtSchedules, selectedDateTime).map((court: any) => (
                  <option key={court.id} value={court.id} disabled={court.isOccupied}>
                    {court.name} {court.isOccupied ? "(occupé)" : ""}
                  </option>
                ))}
              </select>
              {/* Sélecteur de date/heure pour la planification (exemple simple) */}
              <input
                type="datetime-local"
                value={selectedDateTime}
                onChange={e => setSelectedDateTime(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 mt-2"
              />
            </>
          )}

          <label htmlFor="setChrono">Chrono :</label>
          <div className="flex justify-center gap-2 items-center">
            <input
              type="number"
              min={0}
              max={59}
              value={chronoMinutes}
              onChange={e => {
                const mins = Number(e.target.value);
                setChronoMinutes(mins);
                setChrono(mins, chronoSeconds);
              }}
              className="bg-white text-black border border-gray-300 rounded px-1 py-1 mt-2 text-center w-12"
              placeholder="min"
            />
            <span>:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={chronoSeconds}
              onChange={e => {
                const secs = Number(e.target.value);
                setChronoSeconds(secs);
                setChrono(chronoMinutes, secs);
              }}
              className="bg-white text-black border border-gray-300 rounded px-1 py-1 mt-2 text-center w-12"
              placeholder="sec"
            />
            </div>
        </div>

        <div className="bouton_pied_page">
          <div className="button-row1">
            <button onClick={() => router.back()}>Retour</button>
          </div>
            <div className="button-row2">
            <button onClick={() => window.open("./handball/spectators", "_blank")}>Spectateurs</button>
            </div>
        </div>
      </div>

      {/* Tableau de marquage */}
      <div className="droite">
        <div className="scoreboard">
          <div className="score-display">
            <div className="score-line">
              <span>{matchData.teamA.name !== "Team A" ? matchData.teamA.name : (teamA != "" ? teams.find((c: Team) => c.id === teamA)?.name : "Team A")} {matchData.teamA.score} - {matchData.teamB.score} {matchData.teamB.name !== "Team B" ? matchData.teamB.name : (teamB != "" ? teams.find((c: Team) => c.id === teamB)?.name : "Team B")}</span>
            </div>
            <div className="info-line">
              <p>{matchData.matchType || (matchType !== "Type de match" ? matchType : "Type de match")} - {period !== "MT1" ? period : "MT1"} - {
                // Affiche toujours le nom du terrain si possible
                courts.find(c => c.id === matchData.court?.toString())?.name
                || courts.find(c => c.name === matchData.court)?.name
                || courts.find(c => c.id === court?.toString())?.name
                || courts.find(c => c.name === court)?.name
                || courts.find(c => c.id === matchGround)?.name
                || matchData.court
                || court
                || (matchGround !== "Terrain" ? courts.find(c => c.id === matchGround)?.name : "Terrain")
              }</p>
            </div>
          </div>

          <div className="points-section">
            <div className="flex items-center gap-2">
              <p>Buts : {matchData.teamA.score}</p>
              <button onClick={() => subPoint("A")}>-</button>
              <button onClick={() => addPoint("A")}>+</button>
            </div>
            <div className="timer">{formattedTime}</div>
            <div className="flex items-center gap-2">
              <p>Buts : {matchData.teamB.score}</p>
              <button onClick={() => subPoint("B")}>-</button>
              <button onClick={() => addPoint("B")}>+</button>
            </div>
          </div>

          <div className="cards-section">
            {/* Cartons Équipe A */}
            <div className="flex flex-col items-center gap-4 space-x-4">
              <div className="flex items-center gap-2">
                <p>Cartons Jaunes : {matchData.teamA.yellowCards != 0 ? matchData.teamA.yellowCards : 0}</p>
                <button style={{ backgroundColor: 'var(--bg-yellow-900)' }} onClick={() => subYellowCard("A")}>-</button>
                <button style={{ backgroundColor: 'var(--bg-yellow-900)' }} onClick={() => addYellowCard("A")}>+</button>
              </div>
              <div className="flex items-center gap-2">
                <p>Cartons Rouges : {matchData.teamA.redCards != 0 ? matchData.teamA.redCards : 0}</p>
                <button style={{ backgroundColor: 'var(--bg-red-900)' }} onClick={() => subRedCard("A")}>-</button>
                <button style={{ backgroundColor: 'var(--bg-red-900)' }} onClick={() => addRedCard("A")}>+</button>
              </div>
            </div>
            <div className="period-switch text-lg">
              <span>MT1</span>
              <label className="switch">
                  <input 
                    type="checkbox" 
                    id="periodToggle" 
                    checked={periodSwitchChecked}  // 👈 Ajoutez cette ligne
                    onChange={togglePeriod} 
                  />
                  <span className="slider round"></span>
              </label>
              <span>MT2</span>
            </div>
            {/* Cartons Équipe B */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <p>Cartons Jaunes : {matchData.teamB.yellowCards != 0 ? matchData.teamB.yellowCards : 0}</p>
                <button style={{ backgroundColor: 'var(--bg-yellow-900)' }} onClick={() => subYellowCard("B")}>-</button>
                <button style={{ backgroundColor: 'var(--bg-yellow-900)' }} onClick={() => addYellowCard("B")}>+</button>
              </div>
              <div className="flex items-center gap-2">
                <p>Cartons Rouges : {matchData.teamB.redCards != 0 ? matchData.teamB.redCards : 0}</p>
                <button style={{ backgroundColor: 'var(--bg-red-900)' }} onClick={() => subRedCard("B")}>-</button>
                <button style={{ backgroundColor: 'var(--bg-red-900)' }} onClick={() => addRedCard("B")}>+</button>
              </div>
            </div>
          </div>

          <div className="bottom-controls">
            <button onClick={handleStart}>Start</button>
            <button onClick={stopChrono}>Stop</button>
            <button onClick={addSecond}>+1s</button>
            <button onClick={handleSwipe}>Swipe</button>
            <button
              onClick={async () => {
                try {
                  await handleEnd();
                  const tournamentId = matchData.tournamentId;
                  console.log('[Handball] MatchData complet:', matchData);
                  console.log('[Handball] TournamentId from matchData:', tournamentId);
                  console.log('[Handball] MatchId:', matchId);
                  if (!tournamentId) {
                    alert("Impossible de retrouver l'ID du tournoi pour la redirection.");
                    return;
                  }
                  console.log('[Handball] Redirecting to tournament:', tournamentId);
                  window.location.href = `/choix-sport/tournaments/${tournamentId}`;
                } catch (error) {
                  console.error('[Handball] Error ending match:', error);
                }
              }}
            >
              END
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
