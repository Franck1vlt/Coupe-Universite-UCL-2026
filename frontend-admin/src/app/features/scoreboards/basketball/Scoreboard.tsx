"use client";
import { getAvailableCourts } from "./courtUtils";

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
  const [courtSchedules, setCourtSchedules] = useState<any[]>([]);
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [matchType, setMatchType] = useState("Type de match");
  const [matchGround, setMatchGround] = useState("Terrain");
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");
  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [chronoMinutes, setChronoMinutes] = useState(0);
  const [chronoSeconds, setChronoSeconds] = useState(0);

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
        const matchRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${matchId}`);
        if (!matchRes.ok) throw new Error('Match not found');
        const matchData = await matchRes.json();
        
        // 2. Récupérer la phase pour obtenir tournament_id
        const phaseRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament-phases/${matchData.data.phase_id}`);
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
    formattedShotClock,
    shotClock,
    startChrono,
    stopChrono,
    addScore,
    subScore,
    resetShotClock,
    setShotClock,
    setChrono,
    addSecond,
    togglePeriod,
    setTeamName,
    setTeamLogo,
    setMatchType: setMatchTypeMeta,
    swapSides,
    period,
    buzzer,
    court,
    updateMatchStatus,
    handleEnd,
  } = useBasketballMatch(matchId);

  // Redéfinir les handlers pour intégrer la gestion du statut
  const handleStart = () => {
    updateMatchStatus('in_progress');
    startChrono();
  };

  // État local pour masquer/afficher le shotClock
  const [hideShotClock, setHideShotClock] = useState(false);
  // État local pour pause shotClock
  const [pauseShotClock, setPauseShotClock] = useState(false);

  // Synchroniser les données du match avec les states locaux
  useEffect(() => {
    if (teams.length > 0 && matchData.teamA && matchData.teamB) {
      // Recherche par nom pour l'equipe A
      if (matchData.teamA.name && typeof matchData.teamA.name === 'string' && matchData.teamA.name !== "Team A" && !teamA) {
        const foundA = teams.find(
          (t) => matchData.teamA.name && t.name.trim().toLowerCase() === matchData.teamA.name.trim().toLowerCase()
        );
        if (foundA) {
          setTeamA(foundA.id);
        }
      }
      // Recherche par nom pour l'equipe B
      if (matchData.teamB.name && typeof matchData.teamB.name === 'string' && matchData.teamB.name !== "Team B" && !teamB) {
        const foundB = teams.find(
          (t) => matchData.teamB.name && t.name.trim().toLowerCase() === matchData.teamB.name.trim().toLowerCase()
        );
        if (foundB) {
          setTeamB(foundB.id);
        }
      }
    }
    if (matchData.matchType && matchData.matchType !== matchType) {
      setMatchType(matchData.matchType);
    }
    if (court && court !== matchGround) {
      setMatchGround(court);
    }
  }, [matchData, court, teams]);

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

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      switch (e.key) {
        case "q": case "Q": subScore("A", 1); break;
        case "w": case "W": addScore("A", 1); break;
        case "e": case "E": addScore("A", 2); break;
        case "r": case "R": addScore("A", 3); break;
        case "l": case "L": subScore("B", 1); break;
        case "i": case "I": addScore("B", 1); break;
        case "o": case "O": addScore("B", 2); break;
        case "p": case "P": addScore("B", 3); break;
        case "t": case "T": handleStart(); break;
        case "s": case "S": stopChrono(); break;
        case "x": case "X": handleSwipe(); break;
        case "b": case "B": buzzer.play(); break;
        case "j": case "J": setShotClock(Math.floor(shotClock/10)+1); break;
        case "m": case "M": setHideShotClock(v => !v); break;
        case "k": case "K": setPauseShotClock(v => !v); break;
        case "z": case "Z": stopChrono(); setPauseShotClock(true); buzzer.play(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [subScore, addScore, handleStart, stopChrono, handleSwipe, buzzer, setShotClock, shotClock]);

  // Ajout récupération tournamentId comme dans le foot
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
    <main className="basketball-root">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-black mb-2">
          Basketball - Table de marquage
        </h1>
      </header>

      <div className="gauche">
        <div className="parametres-match">
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
            <button onClick={() => window.open("./basketball/spectators", "_blank")}>Spectateurs</button>
            </div>
        </div>
      </div>

      {/* Tableau de marquage */}
      <div className="droite text-lg">
        <div className="scoreboard">
          <div className="score-display mb-6 text-xl">
            <div className="score-line">
              <span>
                {matchData.teamA.name || (teamA != "" ? teams.find((c: Team) => c.id === teamA)?.name : "Team A")} {matchData.teamA.score} - {matchData.teamB.score} {matchData.teamB.name || (teamB != "" ? teams.find((c: Team) => c.id === teamB)?.name : "Team B")}
              </span>
            </div>
            <div className="info-line">
              <p>{matchType !== "Type de match" ? matchType : "Type de match"} - 
                {
                  // Affiche toujours le nom du terrain si possible
                  courts.find(c => c.id === matchData.court?.toString())?.name
                  || courts.find(c => c.name === matchData.court)?.name
                  || courts.find(c => c.id === court?.toString())?.name
                  || courts.find(c => c.name === court)?.name
                  || courts.find(c => c.id === matchGround)?.name
                  || matchData.court
                  || court
                  || (matchGround !== "Terrain" ? courts.find(c => c.id === matchGround)?.name : "Terrain")
                } - {period !== "MT1" ? period : "MT1"}</p>
            </div>
          </div>

          <div className="controls-section flex flex-col gap-4">

            {/* Timers Section */}
            <div className="timers mb-6 text-2xl">
              <div className="timer" id="gameTimer">{formattedTime}</div>
              {!hideShotClock && (
                <div className="timer" id="shotClock" style={pauseShotClock ? {opacity:0.5} : {}}>{formattedShotClock}</div>
              )}
            </div>

            <div className="controls text-base" style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
              <button onClick={resetShotClock}>24s<span className="shortcut-hint">4</span></button>
              <button onClick={() => setShotClock(14)}>14s<span className="shortcut-hint">6</span></button>
              <button onClick={addSecond}>+1s<span className="shortcut-hint">1</span></button>
              <button onClick={() => setShotClock(Math.floor(shotClock/10)+1)} title="+1s shot clock">+1s SC<span className="shortcut-hint">J</span></button>
              <button onClick={() => setHideShotClock(v => !v)}>{hideShotClock ? "Afficher SC" : "Masquer SC"}<span className="shortcut-hint">M</span></button>
              <button onClick={() => setPauseShotClock(v => !v)}>{pauseShotClock ? "Reprendre SC" : "Pause SC"}<span className="shortcut-hint">K</span></button>
              <button style={{background: '#e53935', color: 'white'}} onClick={() => { stopChrono(); setPauseShotClock(true); buzzer.play(); }}>BUZZER STOP<span className="shortcut-hint">Z</span></button>
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
                          <button onClick={() => subScore("A", 1)}>-1<span className="shortcut-hint">Q</span></button>
                          <button onClick={() => addScore("A", 1)}>+1<span className="shortcut-hint">W</span></button>
                          <button onClick={() => addScore("A", 2)}>+2<span className="shortcut-hint">E</span></button>
                          <button onClick={() => addScore("A", 3)}>+3<span className="shortcut-hint">R</span></button>
                      </div>
                  </div>
              </section>
              <section>
                  <div className="scores">
                      <p> Points :</p>
                      <div className="team-controls b">
                          <button onClick={() => subScore("B", 1)}>-1<span className="shortcut-hint">L</span></button>
                          <button onClick={() => addScore("B", 1)}>+1<span className="shortcut-hint">I</span></button>
                          <button onClick={() => addScore("B", 2)}>+2<span className="shortcut-hint">O</span></button>
                          <button onClick={() => addScore("B", 3)}>+3<span className="shortcut-hint">P</span></button>
                      </div>
                  </div>
              </section>
            </div>

            <div className="controls text-base" style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
              <button onClick={handleStart}>Start<span className="shortcut-hint">T</span></button>
              <button onClick={stopChrono}>Stop<span className="shortcut-hint">S</span></button>
              <button onClick={handleSwipe}>Swipe<span className="shortcut-hint">X</span></button>
              <button onClick={() => buzzer.play()}>Buzzer<span className="shortcut-hint">B</span></button>
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
      </div>
    </main>
  );
}
