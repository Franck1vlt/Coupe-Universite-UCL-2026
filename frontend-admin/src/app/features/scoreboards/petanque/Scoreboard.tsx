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
    addThrow,
    cancelLastThrow,
    validateThrow,
    resetSet,
    getCochonnetTeam,
    selectMeneWinner,
    setTeamName,
    setTeamLogo,
    setMatchType: setMatchTypeMeta,
    setTargetScore,
    changeService,
    swapSides,
    court,
    handleEnd,
    updateMatchStatus
  } = usePetanqueMatch(matchId);

  // Redéfinir les handlers pour intégrer la gestion du statut
  const handleStart = () => {
    updateMatchStatus('in_progress');
  };


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
        
          <label htmlFor="targetScore">Points par matchs :</label>
          <input
            id="targetScore"
            type="number"
            min="1"
            max="21"
            value={matchData.targetScore}
            onChange={(e) => setTargetScore(parseInt(e.target.value) || 13)}
            className="w-full text-center rounded-md border-none mb-2.5 bg-white text-black p-2"
          />
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
        <div className="scoreboard">
          <div className="score-display">
            <div className="score-line flex flex-row justify-center items-center">
              {/* Equipe A */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  {getCochonnetTeam() === "A" && <img src="/img/cochonet.png" alt="Cochonnet" className="w-6 h-6" />}
                  <span className="text-xl font-semibold">{matchData.teamA.name !== "Team A" ? matchData.teamA.name : (teamA != "" ? teams.find((c: Team) => c.id === teamA)?.name : "Team A")}</span>
                </div>
              </div>

              {/* Score */}
              <div className="flex items-center gap-4">
                <span className="text-5xl font-bold">{matchData.teamA.score}</span>
                <span className="text-3xl font-bold text-gray-400">-</span>
                <span className="text-5xl font-bold">{matchData.teamB.score}</span>
              </div>

              {/* Equipe B */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold">{matchData.teamB.name !== "Team B" ? matchData.teamB.name : (teamB != "" ? teams.find((c: Team) => c.id === teamB)?.name : "Team B")}</span>
                  {getCochonnetTeam() === "B" && <img src="/img/cochonet.png" alt="Cochonnet" className="w-6 h-6" />}
                </div>
              </div>
            </div>

            {/* Infos du match */}
            <div className="flex flex-row justify-center items-center mb-6 gap-4">
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                {matchData.matchType || (matchType !== "Type de match" ? matchType : "Match")}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                {courts.find(c => c.id === matchData.court?.toString())?.name
                  || courts.find(c => c.name === matchData.court)?.name
                  || courts.find(c => c.id === court?.toString())?.name
                  || courts.find(c => c.name === court)?.name
                  || courts.find(c => c.id === matchGround)?.name
                  || matchData.court
                  || court
                  || (matchGround !== "Terrain" ? courts.find(c => c.id === matchGround)?.name : "Terrain")}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                Match en {matchData.targetScore} pts
              </span>
            </div>
          </div>
            
          {/* Infos de la mène en cours */}
          <div className="mene-info">
            <div className="text-lg">
              Mene {matchData.meneHistory.length + 1}
            </div>
            <div className="current-player">
              <p className="text-lg font-semibold flex items-center justify-center gap-2">
                🎯 A {getCochonnetTeam() === "A" ? matchData.teamA.name : matchData.teamB.name} de lancer le cochonnet
              </p>
              <p className="text-xl">
                {matchData.pendingWinner ? (
                  <>Gagnant : {matchData.pendingWinner === "A" ? matchData.teamA.name : matchData.teamB.name} | Points : {matchData.pendingPoints || "?"}</>
                ) : (
                  "Selectionnez le gagnant de la mene"
                )}
              </p>
            </div>
          </div>

          {/* Choix équipe gagnante de la mène */}
          <div className="meneAction flex flex-col items-center gap-4 mt-4">

            <div className="buttons-section flex flex-col items-center gap-4">
              <p>Equipe gagnante de la mene :</p>
              <div className="winner-buttons flex flex-row gap-6 mb-4 justify-center">
                <button
                  onClick={() => selectMeneWinner("A")}
                  className={matchData.pendingWinner === "A" ? "selected" : ""}
                  style={matchData.pendingWinner === "A" ? { backgroundColor: "#4CAF50", color: "white" } : {}}
                >
                  {matchData.teamA.name}
                </button>
                <button
                  onClick={() => selectMeneWinner("B")}
                  className={matchData.pendingWinner === "B" ? "selected" : ""}
                  style={matchData.pendingWinner === "B" ? { backgroundColor: "#4CAF50", color: "white" } : {}}
                >
                  {matchData.teamB.name}
                </button>
              </div>
            </div>

            <div className="buttons-section flex flex-col items-center gap-4">
              {/* Boutons pour les points de la mène (1-6) */}
              <p className="mb-2">Points de la mene :</p>
              <div className="PointButtons flex flex-row flex-wrap gap-4 justify-center">
                <button className={`btnAdd ${matchData.pendingPoints === 1 ? "selected" : ""}`} onClick={() => addThrow(1)} style={matchData.pendingPoints === 1 ? { backgroundColor: "#2196F3", color: "white" } : {}}>1</button>
                <button className={`btnAdd ${matchData.pendingPoints === 2 ? "selected" : ""}`} onClick={() => addThrow(2)} style={matchData.pendingPoints === 2 ? { backgroundColor: "#2196F3", color: "white" } : {}}>2</button>
                <button className={`btnAdd ${matchData.pendingPoints === 3 ? "selected" : ""}`} onClick={() => addThrow(3)} style={matchData.pendingPoints === 3 ? { backgroundColor: "#2196F3", color: "white" } : {}}>3</button>
                <button className={`btnAdd ${matchData.pendingPoints === 4 ? "selected" : ""}`} onClick={() => addThrow(4)} style={matchData.pendingPoints === 4 ? { backgroundColor: "#2196F3", color: "white" } : {}}>4</button>
                <button className={`btnAdd ${matchData.pendingPoints === 5 ? "selected" : ""}`} onClick={() => addThrow(5)} style={matchData.pendingPoints === 5 ? { backgroundColor: "#2196F3", color: "white" } : {}}>5</button>
                <button className={`btnAdd ${matchData.pendingPoints === 6 ? "selected" : ""}`} onClick={() => addThrow(6)} style={matchData.pendingPoints === 6 ? { backgroundColor: "#2196F3", color: "white" } : {}}>6</button>
              </div>
            </div>

            {/* Boutons d'action de mène */}
            <div className="action-buttons flex flex-row gap-6">
              <button className="btnCancel text-white px-4 py-2 rounded" onClick={cancelLastThrow}>
                Annuler
              </button>
              <button
                className="btnValidate text-white px-4 py-2 rounded font-bold"
                onClick={validateThrow}
                disabled={!matchData.pendingWinner || matchData.pendingPoints <= 0}
                style={(!matchData.pendingWinner || matchData.pendingPoints <= 0) ? { opacity: 0.5, cursor: "not-allowed" } : {}}
              >
                Valider mène
              </button>
            </div>
          </div>

          {/* Contrôles en bas */}
          <div className="bottom-controls grid grid-cols-5 grid-rows-1 gap-4">
            <button onClick={handleStart} className="btnAction text-white">Start</button>
            <button onClick={changeService} className="btnAction text-white" title="Changer l'equipe qui lance le cochonnet">
              Service
            </button>
            <button onClick={handleSwipe} className="btnAction text-white">Swipe</button>
            <button onClick={resetSet} className="btnAction text-white">Reset</button>
            <button
              onClick={async () => {
                console.log('🔵 END button clicked');
                console.log('🔵 TournamentId:', tournamentId);
                
                if (!tournamentId) {
                  alert("Impossible de retrouver l'ID du tournoi pour la redirection.");
                  console.error('❌ No tournament ID found');
                  return;
                }
                
                console.log('🔵 Calling handleEnd...');
                await handleEnd();  // handleEnd appelle submitMatchResult qui envoie status: 'completed'
                
                console.log('🔵 Redirecting to tournament:', tournamentId);
                router.push(`/choix-sport/tournaments/${tournamentId}`);
              }}
              disabled={!teamA || !teamB}
            >
              END
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
