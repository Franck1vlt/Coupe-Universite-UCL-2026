"use client";

import { useState, useEffect } from "react";
import { getAvailableCourts } from "./courtUtils";
import "./flechettes.css";
import { useSearchParams } from "next/navigation";
import { useFlechettesMatch } from "./useFlechettesMatch";
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

export default function FlechettesTableMarquagePage() {
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
    addThrow,
    multiplyLastThrow,
    cancelLastThrow,
    validateThrow,
    declareBust,
    resetSet,
    getCurrentPlayer,
    getCurrentTeam,
    gameMode,
    setGameMode,
    setTeamName,
    setTeamLogo,
    setMatchType: setMatchTypeMeta,
    setPlayerName,
    swipeGameMode,
    swapSides,
    court,
    handleEnd,
    updateMatchStatus
  } = useFlechettesMatch(matchId);

  // Redéfinir les handlers pour intégrer la gestion du statut
  const handleStart = () => {
    updateMatchStatus('in_progress');
  };


  // Synchroniser les données du match avec les states locaux
  useEffect(() => {
    console.log('[Flechettes Scoreboard] Match data changed:', matchData);
    console.log('[Flechettes Scoreboard] Court:', court);
    
    if (matchData.teamA.name && matchData.teamA.name !== "Team A") {
      setTeamA(matchData.teamA.name);
      console.log('[Flechettes Scoreboard] Set Team A to:', matchData.teamA.name);
    }
    if (matchData.teamB.name && matchData.teamB.name !== "Team B") {
      setTeamB(matchData.teamB.name);
      console.log('[Flechettes Scoreboard] Set Team B to:', matchData.teamB.name);
    }
    if (matchData.matchType) {
      setMatchType(matchData.matchType);
      console.log('[Flechettes Scoreboard] Set Match Type to:', matchData.matchType);
    }
    if (court) {
      setMatchGround(court);
      console.log('[Flechettes Scoreboard] Set Court to:', court);
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
    <main className="flechettes-root">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-black mb-2">
          Flechettes - Table de marquage
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

            <label htmlFor="gameMode">Mode de jeu :</label>
            {matchId ? (
            <input
              type="text"
              value={matchData.gameMode || "BO3"}
              disabled
              className="w-full text-center rounded-md border-none mb-2.5 bg-white text-black cursor-not-allowed p-2"
            />
            ) : (
            <select
              id="gameModeSelector"
              value={matchData.gameMode || gameMode}
              onChange={e => setGameMode(e.target.value as "BO3" | "BO5")}
            >
              <option value="BO3">BO3 (2 sets gagnants)</option>
              <option value="BO5">BO5 (3 sets gagnants)</option>
            </select>
            )}

        {/* Section pour personnaliser les noms des joueurs
          <label htmlFor="player1A">Joueur 1A :</label>
          <input
            id="player1A"
            type="text"
            value={matchData.teamA.players[0]}
            onChange={(e) => setPlayerName("A", 0, e.target.value)}
            className="w-full text-center rounded-md border-none mb-2.5 bg-white text-black cursor-not-allowed p-2"
            placeholder="Joueur 1A"
          />

          <label htmlFor="player2A">Joueur 2A :</label>
          <input
            id="player2A"
            type="text"
            value={matchData.teamA.players[1]}
            onChange={(e) => setPlayerName("A", 1, e.target.value)}
            className="w-full text-center rounded-md border-none mb-2.5 bg-white text-black cursor-not-allowed p-2"
            placeholder="Joueur 2A"
          />

          <label htmlFor="player1B">Joueur 1B :</label>
          <input
            id="player1B"
            type="text"
            value={matchData.teamB.players[0]}
            onChange={(e) => setPlayerName("B", 0, e.target.value)}
            className="w-full text-center rounded-md border-none mb-2.5 bg-white text-black cursor-not-allowed p-2"
            placeholder="Joueur 1B"
          />

          <label htmlFor="player2B">Joueur 2B :</label>
          <input
            id="player2B"
            type="text"
            value={matchData.teamB.players[1]}
            onChange={(e) => setPlayerName("B", 1, e.target.value)}
            className="w-full text-center rounded-md border-none mb-2.5 bg-white text-black cursor-not-allowed p-2"
            placeholder="Joueur 2B"
          /> */}
        </div>

        <div className="bouton_pied_page">
          <div className="button-row1">
            <button onClick={() => router.back()}>Retour</button>
          </div>
            <div className="button-row2">
            <button onClick={() => window.open("./flechettes/spectators", "_blank")}>Spectateurs</button>
            </div>
        </div>
      </div>

      {/* Tableau de marquage */}
      <div className="droite">
        <div className="scoreboard">
          <div className="score-display">
            <div className="score-line flex justify-center items-center gap-8">
              <div>{matchData.teamA.name !== "Team A" ? matchData.teamA.name : (teamA != "" ? teams.find((c: Team) => c.id === teamA)?.name : "Team A")}</div>
              <div className="Points text-2xl font-bold">{matchData.teamA.score}</div>
              <div className="Sets text-xl font-bold">{matchData.teamA.sets} - {matchData.teamB.sets}</div>
              <div className="Points text-2xl font-bold">{matchData.teamB.score}</div>
              <div>{matchData.teamB.name !== "Team B" ? matchData.teamB.name : (teamB != "" ? teams.find((c: Team) => c.id === teamB)?.name : "Team B")}</div>
            </div>
            <div className="current-player mt-4">
              <p className="text-lg font-semibold">🎯 À {getCurrentPlayer()} de jouer</p>
              <p className="text-xl">Volée en cours : {(matchData.currentThrows || []).join(" + ") || "Aucune fléchette"} {(matchData.currentThrows || []).length > 0 && `= ${(matchData.currentThrows || []).reduce((a, b) => a + b, 0)}`}</p>
            </div>
            <div className="info-line text-2xl mt-2">
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

          <div className="buttons-section flex flex-col items-center gap-6">
            {/* Boutons pour les points (1-20, 25, 50) */}
            <div className="PointButtons flex flex-row flex-wrap gap-4 justify-center">
              <button className="btnAdd" onClick={() => addThrow(1)}>1</button>
              <button className="btnAdd" onClick={() => addThrow(2)}>2</button>
              <button className="btnAdd" onClick={() => addThrow(3)}>3</button>
              <button className="btnAdd" onClick={() => addThrow(4)}>4</button>
              <button className="btnAdd" onClick={() => addThrow(5)}>5</button>
              <button className="btnAdd" onClick={() => addThrow(6)}>6</button>
              <button className="btnAdd" onClick={() => addThrow(7)}>7</button>
              <button className="btnAdd" onClick={() => addThrow(8)}>8</button>
              <button className="btnAdd" onClick={() => addThrow(9)}>9</button>
              <button className="btnAdd" onClick={() => addThrow(10)}>10</button>
              <button className="btnAdd" onClick={() => addThrow(11)}>11</button>
              <button className="btnAdd" onClick={() => addThrow(12)}>12</button>
              <button className="btnAdd" onClick={() => addThrow(13)}>13</button>
              <button className="btnAdd" onClick={() => addThrow(14)}>14</button>
              <button className="btnAdd" onClick={() => addThrow(15)}>15</button>
              <button className="btnAdd" onClick={() => addThrow(16)}>16</button>
              <button className="btnAdd" onClick={() => addThrow(17)}>17</button>
              <button className="btnAdd" onClick={() => addThrow(18)}>18</button>
              <button className="btnAdd" onClick={() => addThrow(19)}>19</button>
              <button className="btnAdd" onClick={() => addThrow(20)}>20</button>
              <button className="btnBull" onClick={() => addThrow(25)}>Bull (25)</button>
              <button className="btnDoubleBull" onClick={() => addThrow(25, true)}>Bull Double (50)</button>
            </div>

            {/* Boutons multiplicateurs et actions */}
            <div className="multiplicatePointButtons flex flex-row gap-6">
              <button className="btnMultiply" onClick={() => multiplyLastThrow(1)}>x1 (Simple)</button>
              <button className="btnMultiply" onClick={() => multiplyLastThrow(2)}>x2 (Double)</button>
              <button className="btnMultiply" onClick={() => multiplyLastThrow(3)}>x3 (Triple)</button>
              <button className="btnMiss" onClick={() => addThrow(0)}>Manqué</button>
            </div>

            {/* Boutons d'action de volée */}
            <div className="action-buttons flex flex-row gap-6">
              <button className="btnAction text-white px-4 py-2 rounded" onClick={cancelLastThrow}>
                ↩️ Annuler dernière
              </button>
              <button className="btnAction text-white px-4 py-2 rounded" onClick={declareBust}>
                ❌ BUST
              </button>
              <button className="btnAction text-white px-4 py-2 rounded font-bold" onClick={validateThrow}>
                ✓ Valider volée
              </button>
            </div>
          </div>
          <div className="bottom-controls grid grid-cols-4 grid-rows-1 gap-4">
            <button onClick={handleStart} className="btnAction text-white">Start</button>
            <button onClick={swipeGameMode} className="btnAction">Mode de jeu</button>
            <button onClick={handleSwipe} className="btnAction text-white">Swipe</button>
            <button onClick={resetSet} className="btnAction text-white">🔄 Reset Set</button>
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
