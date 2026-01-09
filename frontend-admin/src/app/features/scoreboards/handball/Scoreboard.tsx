"use client";

import { useState, useEffect } from "react";
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
  const router = useRouter();

  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [matchType, setMatchType] = useState("Type de match");
  const [matchGround, setMatchGround] = useState("Terrain");

  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);

  // Charger les équipes au montage du composant
  useEffect(() => {
    fetchTeams();
    fetchCourts();
  }, []);

  const {
    matchData,
    formattedTime,
    startChrono,
    stopChrono,
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
  } = useHandballMatch(matchId);

  // Synchroniser les données du match avec les states locaux
  useEffect(() => {
    if (matchData.teamA.name && matchData.teamA.name !== "Team A") {
      setTeamA(matchData.teamA.name);
    }
    if (matchData.teamB.name && matchData.teamB.name !== "Team B") {
      setTeamB(matchData.teamB.name);
    }
    if (matchData.matchType) {
      setMatchType(matchData.matchType);
    }
    if (court) {
      setMatchGround(court);
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
      const res = await fetch("http://localhost:8000/teams?skip=0&limit=100", {
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
      const res = await fetch("http://localhost:8000/courts?skip=0&limit=100", {
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
    <main>
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-black mb-2">
          Handball - Table de marquage
        </h1>
      </header>

      <div className="gauche">
        <div className="parametres-match mb-6">
          <label htmlFor="teamA">Équipe A :</label>
          <select name="teamA" value={teamA} onChange={handleTeamAChange} disabled={loadingTeams || !!matchId}>
            <option value="">{loadingTeams ? "Chargement..." : "Sélectionner"}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <label htmlFor="teamB">Équipe B :</label>
          <select id="teamB" name="teamB" value={teamB} onChange={handleTeamBChange} disabled={loadingTeams || !!matchId}>
            <option value="">{loadingTeams ? "Chargement..." : "Sélectionner"}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <label htmlFor="matchType">Type de match :</label>
          <select id="matchTypeSelector" value={matchType} onChange={handleMatchTypeChange} disabled={!!matchId}>
            <option value="">Sélectionner</option>
            <option value="Qualification">Qualification</option>
            <option value="Poule">Poule</option>
            <option value="Quart de finale">Quart de finale</option>
            <option value="Demi-finale">Demi-finale</option>
            <option value="Petite Finale">Petite Finale</option>
            <option value="Finale">Finale</option>
          </select>

          <label htmlFor="matchGround">Terrain :</label>
          <select id="matchGroundSelector" value={matchGround} onChange={(e) => setMatchGround(e.target.value)} disabled={loadingCourts || !!matchId}>
            <option value="">{loadingCourts ? "Chargement..." : "Sélectionner"}</option>
            {courts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bouton_pied_page">
          <div className="button-row1">
            <button onClick={() => router.back()}>Retour</button>
          </div>
            <div className="button-row2">
            <button onClick={() => window.open("/handball/spectators", "_blank")}>Spectateurs</button>
            </div>
        </div>
      </div>

      {/* Tableau de marquage */}
      <div className="droite">
        <div className="scoreboard">
          <div className="score-display">
            <div className="score-line">
              <span>{teamA != "" ? teams.find((c: Team) => c.id === teamA)?.name : "Team A"} {matchData.teamA.score} - {matchData.teamB.score} {teamB != "" ? teams.find((c: Team) => c.id === teamB)?.name : "Team B"}</span>
            </div>
            <div className="info-line">
              <p>{matchType !== "Type de match" ? matchType : "Type de match"} - {matchGround !== "Terrain" ? courts.find(c => c.id === matchGround)?.name : "Terrain"}</p>
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

          <div className="cards-section grid grid-cols-2 gap-4 mb-4">
            {/* Cartons Équipe A */}
            <div className="flex flex-col items-center gap-4">
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
            <button onClick={startChrono}>Start</button>
            <button onClick={stopChrono}>Stop</button>
            <button onClick={handleSwipe}>Swipe</button>
            <button>End</button>
          </div>
        </div>
      </div>
    </main>
  );
}
