"use client";

import { useState, useEffect } from "react";
import "./football.css";
import { useSearchParams } from "next/navigation";
import { useFootballMatch } from "./useFootballMatch";
import { useRouter } from "next/navigation";

type Team = {
  id: string;
  name: string;
};

export default function FootballPage() {
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const params = useSearchParams();
  const matchId = params.get("matchId");
  const router = useRouter();

  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [matchType, setMatchType] = useState("Type de match");
  const [matchGround, setMatchGround] = useState("Terrain");

  // Charger les équipes au montage du composant
  useEffect(() => {
    fetchTeams();
  }, []);

  const {
    matchData,
    formattedTime,
    startChrono,
    stopChrono,
    addPoint,
    subPoint,
    addYellow,
    addRed,
  } = useFootballMatch(matchId);

  const handleTeamAChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTeamA(e.target.value);
  };

  const handleTeamBChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTeamB(e.target.value);
  };

  const handleMatchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMatchType(e.target.value);
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
        name: team.name
      })));
    } catch (error) {
      console.error("Erreur lors du chargement des équipes:", error);
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  return (
    <main>
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Football - Table de marquage
        </h1>
      </header>

      <div className="gauche">
        <div className="parametres-match">
          <label htmlFor="teamA">Équipe A :</label>
          <select id="teamA" name="teamA" value={teamA} onChange={handleTeamAChange} disabled={loadingTeams}>
            <option value="">{loadingTeams ? "Chargement..." : "Sélectionner une équipe"}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <label htmlFor="teamB">Équipe B :</label>
          <select id="teamB" name="teamB" value={teamB} onChange={handleTeamBChange} disabled={loadingTeams}>
            <option value="">{loadingTeams ? "Chargement..." : "Sélectionner une équipe"}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <label htmlFor="matchType">Type de match :</label>
          <select id="matchTypeSelector" value={matchType} onChange={handleMatchTypeChange}>
            <option>Type de match</option>
            <option value="Barrages">Barrages</option>
            <option value="Quart de finale">Quart de finale</option>
            <option value="Demi-finale">Demi-finale</option>
            <option value="Petite Finale">Petite Finale</option>
            <option value="Finale">Finale</option>
          </select>

          <label htmlFor="matchGround">Terrain :</label>
          <select id="matchGroundSelector" value={matchGround} onChange={(e) => setMatchGround(e.target.value)}>
            <option>Terrain</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>

        <div className="bouton_pied_page">
          <div className="button-row1">
            <button onClick={() => router.back()}>Retour</button>
          </div>
          <div className="button-row2">
            <button onClick={() => router.push("/football")}>Spectateurs</button>
          </div>
        </div>
      </div>


      <div className="droite">
        <div className="scoreboard">
          <div className="score-line">
            Team A {matchData.teamA.score} - {matchData.teamB.score} Team B
          </div>

          <div className="points-section">
            <button onClick={() => subPoint("A")}>-</button>
            <div className="timer">{formattedTime}</div>
            <button onClick={() => addPoint("A")}>+</button>
          </div>

          <div className="cards-section">
            <button onClick={() => addYellow("A")}>+ Jaune A</button>
            <button onClick={() => addRed("A")}>+ Rouge A</button>
          </div>

          <div className="bottom-controls">
            <button onClick={startChrono}>Start</button>
            <button onClick={stopChrono}>Stop</button>
            <button>End</button>
          </div>
        </div>
      </div>
    </main>
  );
}
