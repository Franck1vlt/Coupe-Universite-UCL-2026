"use client";

import { useState, useEffect } from "react";
import { getAvailableCourts } from "./courtUtils";
import "./petanque.css";
import { useSearchParams } from "next/navigation";
import { usePetanqueMatch } from "./usePetanqueMatch";
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

export default function PetanqueTableMarquagePage() {
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const params = useSearchParams();
  const matchId = params.get("matchId");
  const router = useRouter();
  const logoService = "/img/cochonet.png";
  const CONST_SIZE = 30;
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [matchType, setMatchType] = useState("Type de match");
  const [matchGround, setMatchGround] = useState("Terrain");

  const [courts, setCourts] = useState<Court[]>([]);
  const [courtSchedules, setCourtSchedules] = useState<any[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");

  // Charger les équipes au montage du composant
  useEffect(() => {
    fetchTeams();
    fetchCourts();
    fetchCourtSchedules();
  }, []);

  // Récupérer le tournamentId via la chaîne match -> phase -> tournament
  useEffect(() => {
    async function fetchTournamentId() {
      if (!matchId) return;
      try {
        // 1. Récupérer le match pour obtenir phase_id
        const matchRes = await fetch(`http://localhost:8000/matches/${matchId}`);
        if (!matchRes.ok) throw new Error('Match not found');
        const matchData = await matchRes.json();

        // 2. Récupérer la phase pour obtenir tournament_id
        const phaseRes = await fetch(`http://localhost:8000/tournament-phases/${matchData.data.phase_id}`);
        if (!phaseRes.ok) throw new Error('Phase not found');
        const phaseData = await phaseRes.json();

        setTournamentId(phaseData.data.tournament_id.toString());
      } catch (err) {
        console.error("Erreur récupération tournamentId:", err);
      }
    }
    fetchTournamentId();
  }, [matchId]);

  // Récupérer les plannings de tous les terrains (pour filtrer les dispos)
  const fetchCourtSchedules = async () => {
    try {
      const res = await fetch("http://localhost:8000/match-schedules?skip=0&limit=200", {
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
    addPoint,
    subPoint,
    setTeamName,
    setTeamLogo,
    setMatchType: setMatchTypeMeta,
    swapSides,
    court,
    handleEnd,
    changeCochonnet
  } = usePetanqueMatch(matchId);

  // Synchroniser les données du match avec les states locaux
  useEffect(() => {
    console.log('[Petanque Scoreboard] Match data changed:', matchData);
    console.log('[Petanque Scoreboard] Court:', court);

    if (matchData.teamA.name && matchData.teamA.name !== "Team A") {
      setTeamA(matchData.teamA.name);
      console.log('[Petanque Scoreboard] Set Team A to:', matchData.teamA.name);
    }
    if (matchData.teamB.name && matchData.teamB.name !== "Team B") {
      setTeamB(matchData.teamB.name);
      console.log('[Petanque Scoreboard] Set Team B to:', matchData.teamB.name);
    }
    if (matchData.matchType) {
      setMatchType(matchData.matchType);
      console.log('[Petanque Scoreboard] Set Match Type to:', matchData.matchType);
    }
    if (court) {
      setMatchGround(court);
      console.log('[Petanque Scoreboard] Set Court to:', court);
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
    <main className="petanque-root">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-black mb-2">
          Petanque - Table de marquage
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
        </div>

        <div className="bouton_pied_page">
          <div className="button-row1">
            <button onClick={() => router.back()}>Retour</button>
          </div>
            <div className="button-row2">
            <button onClick={() => window.open("./petanque/spectators", "_blank")}>Spectateurs</button>
            </div>
        </div>
      </div>

      {/* Tableau de marquage */}
      <div className="droite">
        <div className="scoreboard gap-8">
          <div className="score-display">
            <div className="teams-line mb-4">
              <span>{matchData.teamA.name !== "Team A" ? matchData.teamA.name : (teamA != "" ? teams.find((c: Team) => c.id === teamA)?.name : "Team A")}</span>
              <span>{matchData.teamB.name !== "Team B" ? matchData.teamB.name : (teamB != "" ? teams.find((c: Team) => c.id === teamB)?.name : "Team B")}</span>
            </div>
            <div className="score-line flex flex-row justify-center items-center gap-8 mb-6">
              <div>
                {matchData.cochonnetOwner === "A" && (
                  <img src={logoService} alt="Logo Cochonnet" width={CONST_SIZE} height={CONST_SIZE} className="service-logo" />
                )}
              </div>
              <div>{matchData.teamA.score} - {matchData.teamB.score}</div>
              <div>
                {matchData.cochonnetOwner === "B" && (
                  <img src={logoService} alt="Logo Cochonnet" width={CONST_SIZE} height={CONST_SIZE} className="service-logo" />
                )}
              </div>
            </div>
            <div className="info-line">
              <p>{matchData.matchType || (matchType !== "Type de match" ? matchType : "Type de match")} - {
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
              <p>Points : {matchData.teamA.score}</p>
              <button onClick={() => subPoint("A")}>-</button>
              <button onClick={() => addPoint("A")}>+</button>
            </div>
            <div className="timer">{formattedTime}</div>
            <div className="flex items-center gap-2">
              <p>Points : {matchData.teamB.score}</p>
              <button onClick={() => subPoint("B")}>-</button>
              <button onClick={() => addPoint("B")}>+</button>
            </div>
          </div>


          {/* Boutons de contrôle généraux */}
          <div className="bottom-controls grid grid-cols-2 gap-4 mt-8">
            <button onClick={startChrono}>Start</button>
            <button onClick={stopChrono}>Stop</button>
            <button onClick={changeCochonnet}>Cochonnet</button>
            <button onClick={handleSwipe}>Swipe</button>
            <button
              onClick={async () => {
                if (!tournamentId) {
                  alert("Impossible de retrouver l'ID du tournoi pour la redirection.");
                  return;
                }
                await handleEnd();
                window.location.href = `/choix-sport/tournaments/${tournamentId}`;
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
