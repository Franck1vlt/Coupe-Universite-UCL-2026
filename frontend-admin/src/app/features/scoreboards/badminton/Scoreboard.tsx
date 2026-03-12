"use client";

import { useState, useEffect, useCallback } from "react";
import { getAvailableCourts } from "./courtUtils";
import "./badminton.css";
import "../football/football.css";
import { useSearchParams } from "next/navigation";
// Make sure the hook exists at the correct path, or create a stub if missing
import { useBadmintonMatch } from "./useBadmintonMatch";
import Image from "next/image";
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

export default function BadmintonTableMarquagePage() {
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const params = useSearchParams();
  const matchId = params.get("matchId");
  console.log('[Badminton Scoreboard] ========== COMPONENT LOADED ==========');
  console.log('[Badminton Scoreboard] MatchId from URL:', matchId);
  const router = useRouter();
  const logoService = "/img/badminton.png";
  const CONST_SIZE = 30;
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [matchType, setMatchType] = useState("Type de match");
  const [matchGround, setMatchGround] = useState("Terrain");
  const [numberOfSets, setNumberOfSets] = useState<number | undefined>(undefined);
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtSchedules, setCourtSchedules] = useState<any[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const selectedDateTime = "";

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
    addPoint,
    subPoint,
    addSet,
    subSet,
    setTeamName,
    setTeamLogo,
    setMatchType: setMatchTypeMeta,
    swapSides,
    court,
    setCourt,
    handleEnd,
    changeService,
    updateMatchStatus,
    setNumSets,
    resetChrono,
    undoLastAction,
    canUndo,
  } = useBadmintonMatch(matchId);

  // Redéfinir les handlers pour intégrer la gestion du statut
  const handleStart = () => {
    updateMatchStatus('in_progress');
  };


  // Synchroniser les données du match avec les states locaux (mode tournoi uniquement)
  useEffect(() => {
    if (!matchId) return;

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
    if (typeof matchData.numberOfSets !== "undefined") {
      setNumberOfSets(matchData.numberOfSets);
    }
  }, [matchData, court, matchId]);

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

  const handleSwipe = useCallback(() => {
    setTeamA((prevA) => { setTeamB(prevA); return teamB; });
    swapSides();
  }, [teamB, swapSides]);

  // Raccourcis clavier
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case "w": case "W": addPoint("A"); break;
        case "q": case "Q": subPoint("A"); break;
        case "o": case "O": addPoint("B"); break;
        case "l": case "L": subPoint("B"); break;
        case "t": case "T": startChrono(); break;
        case "Escape": stopChrono(); break;
        case "r": case "R": resetChrono(); break;
        case "s": case "S": changeService(); break;
        case "x": case "X": handleSwipe(); break;
        case "z": case "Z":
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); undoLastAction(); }
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addPoint, subPoint, startChrono, stopChrono, resetChrono, changeService, undoLastAction, handleSwipe]);

    useEffect(() => {
    async function fetchTournamentId() {
      if (!matchId) return;
      try {
        // 1. Récupérer le match pour obtenir phase_id
        const matchRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${matchId}`);
        if (!matchRes.ok) throw new Error('Match not found');
        const matchData = await matchRes.json();
        // 2. Récupérer la phase pour obtenir tournament_id
        const phaseRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament-phases/${matchData.data.phase_id}`);
        if (!phaseRes.ok) throw new Error('Phase not found');
        const phaseData = await phaseRes.json();
        setTournamentId(phaseData.data.tournament_id.toString());
      } catch (err) {
        setTournamentId(null);
      }
    }
    fetchTournamentId();
  }, [matchId]);

  return (
    <main className="badminton-root">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-black mb-2">
          Badminton - Table de marquage
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
              <option value="Qualifications">Qualifications</option>
              <option value="Poule">Poule</option>
              <option value="Ligue">Ligue</option>
              <option value="Quarts de finale">Quarts de finale</option>
              <option value="Demi-finale">Demi-finale</option>
              <option value="Petite Finale">Petite Finale</option>
              <option value="Finale">Finale</option>
              <option value="Repechage">Repechage</option>
              <option value="Demi-finale de LB">Demi-finale de LB</option>
              <option value="Place de 7e">Place de 7e</option>
              <option value="Place de 5e">Place de 5e</option>
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
            <select
                id="matchGroundSelector"
                value={matchGround}
                onChange={(e) => {
                  const id = e.target.value;
                  setMatchGround(id);
                  const name = courts.find((c) => c.id === id)?.name || id;
                  setCourt(name);
                }}
                disabled={loadingCourts}
              >
                <option value="">{loadingCourts ? "Chargement..." : "Sélectionner"}</option>
                {getAvailableCourts(courts, courtSchedules, selectedDateTime).map((court: any) => (
                  <option key={court.id} value={court.id} disabled={court.isOccupied}>
                    {court.name} {court.isOccupied ? "(occupé)" : ""}
                  </option>
                ))}
              </select>
          )}
          
          <label htmlFor="numberOfSets">Nombre de sets :</label>
          <input
            id="numberOfSets"
            type="number"
            min={1}
            value={numberOfSets ?? ""}
            onChange={(e) => {
              const intValue = parseInt(e.target.value, 10);
              const newValue = isNaN(intValue) ? undefined : intValue;
              
              // 1. Mise à jour de l'état local (pour l'affichage de l'input)
              setNumberOfSets(newValue);
              
              // 2. Mise à jour de l'état global (pour la logique du match)
              if (newValue) {
                setNumSets(newValue);
              }
            }}
            className="w-full text-center rounded-md border-none mb-2.5 bg-white text-black p-2"
          />
        </div>

        <div className="bouton_pied_page">
          <div className="button-row1">
            <button onClick={() => router.back()}>Retour</button>
          </div>
            <div className="button-row2">
            <button onClick={() => window.open("./badminton/spectators", "_blank")}>Spectateurs</button>
            </div>
        </div>
      </div>

      {/* Tableau de marquage */}
      <div className="droite">
        <div className="scoreboard gap-8">
          <div className="score-display">
            <div className="teams-line mb-4">
              <div>{matchData.teamA.name !== "Team A" ? matchData.teamA.name : (teamA != "" ? teams.find((c: Team) => c.id === teamA)?.name : "Team A")}</div>
              <div>
                <div className="text-sm">Sets :</div>
                <div className="Sets">{matchData.teamA.sets} - {matchData.teamB.sets}</div>
              </div>
              <div>{matchData.teamB.name !== "Team B" ? matchData.teamB.name : (teamB != "" ? teams.find((c: Team) => c.id === teamB)?.name : "Team B")}</div>
            </div>
            <div className="score-line flex flex-row justify-center items-center gap-8 mb-6">
              <div>
                {matchData.serviceTeam === "A" && (
                  <Image src={logoService} alt="Logo Service" width={CONST_SIZE} height={CONST_SIZE} className="service-logo" />
                )}
              </div>
              <div>{matchData.teamA.score} - {matchData.teamB.score}</div>
              <div>
                {matchData.serviceTeam === "B" && (
                  <Image src={logoService} alt="Logo Service" width={CONST_SIZE} height={CONST_SIZE} className="service-logo" />
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
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <p>Points : {matchData.teamA.score}</p>
                <button onClick={() => subPoint("A")} title="Q">- <span className="shortcut-hint">Q</span></button>
                <button onClick={() => addPoint("A")} title="W">+ <span className="shortcut-hint">W</span></button>
              </div>
              <div className="flex items-center gap-2">
                <p>Sets : {matchData.teamA.sets}</p>
                <button onClick={() => subSet("A")}>-</button>
                <button onClick={() => addSet("A")}>+</button>
              </div>
            </div>
            <div>
              <p>Pause</p>
              <div className="timer">{formattedTime}</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <p>Points : {matchData.teamB.score}</p>
                <button onClick={() => subPoint("B")} title="L">- <span className="shortcut-hint">L</span></button>
                <button onClick={() => addPoint("B")} title="O">+ <span className="shortcut-hint">O</span></button>
              </div>
              <div className="flex items-center gap-2">
                <p>Sets : {matchData.teamB.sets}</p>
                <button onClick={() => subSet("B")}>-</button>
                <button onClick={() => addSet("B")}>+</button>
              </div>
            </div>
          </div>

          <div className="bottom-controls">
            <button onClick={handleStart}>Start Match</button>
            <button onClick={startChrono} title="T">Start Timer <span className="shortcut-hint">T</span></button>
            <button onClick={stopChrono} title="Échap">Stop <span className="shortcut-hint">Échap</span></button>
            <button onClick={resetChrono} title="R">Reset <span className="shortcut-hint">R</span></button>
            <button onClick={changeService} title="S">Service <span className="shortcut-hint">S</span></button>
            <button onClick={handleSwipe} title="X">Swipe <span className="shortcut-hint">X</span></button>
            <button
              onClick={undoLastAction}
              disabled={!canUndo()}
              title="Ctrl+Z"
              style={{ opacity: canUndo() ? 1 : 0.4 }}
            >
              Annuler <span className="shortcut-hint">Ctrl+Z</span>
            </button>
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
