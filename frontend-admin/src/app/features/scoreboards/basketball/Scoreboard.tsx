"use client";

import { useState, useEffect } from "react";
import "./basketball.css";
import { useSearchParams } from "next/navigation";
import { useBasketballMatch } from "./useBasketballMatch";
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

export default function BasketballTableMarquagePage() {
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
    formattedShotClock,
    shotClock,
    startChrono,
    stopChrono,
    addScore,
    subScore,
    resetGame,
    resetShotClock,
    resetShotClockSmart,
    setShotClock,
    addSecond,
    togglePeriod,
    setTeamName,
    setTeamLogo,
    setMatchType: setMatchTypeMeta,
    swapSides,
    period,
    buzzer,
    addTechnicalFoul,
    subTechnicalFoul,
    court,
  } = useBasketballMatch(matchId);

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
    <main className="basketball-root">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-black mb-2">
          Basketball - Table de marquage
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
            <button onClick={() => window.open("./basketball/spectators", "_blank")}>Spectateurs</button>
            </div>
        </div>
      </div>

      {/* Tableau de marquage */}
      <div className="droite text-lg">
        <div className="scoreboard scale-110">
          <div className="score-display mb-6 text-xl">
            <div className="score-line">
              <span>{teamA != "" ? teams.find((c: Team) => c.id === teamA)?.name : "Team A"} {matchData.teamA.score} - {matchData.teamB.score} {teamB != "" ? teams.find((c: Team) => c.id === teamB)?.name : "Team B"}</span>
            </div>
            <div className="info-line">
              <p>{matchType !== "Type de match" ? matchType : "Type de match"} - {matchGround !== "Terrain" ? courts.find(c => c.id === matchGround)?.name : "Terrain"} - {period !== "MT1" ? period : "MT1"}</p>
            </div>
          </div>

          <div className="controls-section flex flex-col gap-4">

            {/* Timers Section */}
            <div className="timers mb-6 text-2xl">
              <div className="timer" id="gameTimer">{formattedTime}</div>
              <div className="timer" id="shotClock">{formattedShotClock}</div>
            </div>

            <div className="controls text-base">
              <button onClick={startChrono}>Start</button>
              <button onClick={stopChrono}>Stop</button>
              <button onClick={handleSwipe}>Swipe</button>
              <button onClick={resetShotClock}>24s</button>
              <button onClick={() => setShotClock(14)}>14s</button>
              <button onClick={() => buzzer.play()}>Buzzer</button>
              <button onClick={addSecond}>+1s</button>
              <button onClick={resetGame}>End</button>
            </div>
            
            <div className="period-switch text-lg">
              <span>MT1</span>
              <label className="switch">
                  <input type="checkbox" id="periodToggle" onChange={togglePeriod} />
                  <span className="slider round"></span>
              </label>
              <span>MT2</span>
            </div>

            <div className="flex justify-center gap-4 mb-6 text-lg">
              <section>
                  <div className="scores">
                      <p>Points : </p>
                          <div className="team-controls a">
                          <button onClick={() => subScore("A", 1)}>-1</button>
                          <button onClick={() => addScore("A", 1)}>+1</button>
                          <button onClick={() => addScore("A", 2)}>+2</button>
                          <button onClick={() => addScore("A", 3)}>+3</button>
                      </div>
                  </div>
              </section>
              <section>
                  <div className="scores">
                      <p> Points :</p>
                      <div className="team-controls b">
                          <button onClick={() => subScore("B", 1)}>-1</button>
                          <button onClick={() => addScore("B", 1)}>+1</button>
                          <button onClick={() => addScore("B", 2)}>+2</button>
                          <button onClick={() => addScore("B", 3)}>+3</button>
                      </div>
                  </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
