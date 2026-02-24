"use client";

import { useState, useEffect, useRef } from "react";
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
    updateMatchStatus,
    // Fiche de match & événements
    players,
    pendingEvents,
    pendingGoalTeam,
    confirmGoal,
    cancelGoalModal,
    pendingCardEvent,
    confirmCard,
    cancelCardModal,
  } = useHandballMatch(matchId);

  // États pour les modals
  const [selectedScorerPlayerId, setSelectedScorerPlayerId] = useState<number | "none" | null>(null);
  const [selectedCardPlayerId, setSelectedCardPlayerId] = useState<number | "none" | null>(null);
  const [showEventPanel, setShowEventPanel] = useState(false);
  const scorerFirstOptionRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const goalModalRef = useRef<HTMLDivElement | null>(null);

  // Gestion du focus trap pour le modal buteur
  useEffect(() => {
    if (pendingGoalTeam) {
      previousFocusedElementRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        scorerFirstOptionRef.current?.focus({ preventScroll: true });
      });
      return;
    }
    if (previousFocusedElementRef.current?.isConnected) {
      previousFocusedElementRef.current.focus({ preventScroll: true });
      previousFocusedElementRef.current = null;
    }
  }, [pendingGoalTeam]);

  useEffect(() => {
    if (!pendingGoalTeam) return;
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (goalModalRef.current?.contains(target)) return;
      scorerFirstOptionRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, [pendingGoalTeam]);

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
                    checked={periodSwitchChecked}
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
                  console.log('[Handball] TournamentId:', tournamentId);
                  if (!tournamentId) {
                    alert("Impossible de retrouver l'ID du tournoi pour la redirection.");
                    return;
                  }
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

      {/* FAB notification événements — fixée en haut à droite */}
      {pendingEvents.length > 0 && (
        <div className="goal-events-fab">
          <div className="goal-events-shell">
            <button
              onClick={() => setShowEventPanel((v) => !v)}
              className="goal-events-button"
              aria-label="Afficher les événements"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="goal-events-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="goal-events-badge">{pendingEvents.length}</span>
            </button>
            {showEventPanel && (
              <div className="goal-events-panel">
                <p className="goal-events-panel-title">Événements</p>
                <div className="goal-events-list">
                  {pendingEvents.map((e) => {
                    const minute = Math.ceil((e.match_time_seconds ?? 0) / 60);
                    const teamLabel =
                      e.team === "A"
                        ? matchData.teamA.name || "Équipe A"
                        : matchData.teamB.name || "Équipe B";
                    const playerName = e.player
                      ? [e.player.first_name, e.player.last_name]
                          .filter(Boolean)
                          .join(" ") || "Anonyme"
                      : "Non attribué";

                    if (e.event_type === "goal") {
                      return (
                        <article key={e.localId} className="goal-event-item">
                          <span className="goal-event-minute">{minute}&apos;</span>
                          <div className="goal-event-main">
                            <div className="goal-event-playerline">
                              <span className="goal-event-icon">🤾</span>
                              {e.player && (
                                <span className="goal-event-number">#{e.player.jersey_number ?? "?"}</span>
                              )}
                              <span className="goal-event-player">{playerName}</span>
                            </div>
                            <span className="goal-event-team">{teamLabel}</span>
                          </div>
                        </article>
                      );
                    }

                    if (e.event_type === "yellow_card") {
                      return (
                        <article key={e.localId} className="goal-event-item">
                          <span className="goal-event-minute">{minute}&apos;</span>
                          <div className="goal-event-main">
                            <div className="goal-event-playerline">
                              <span className="goal-event-icon">🟨</span>
                              {e.player && (
                                <span className="goal-event-number">#{e.player.jersey_number ?? "?"}</span>
                              )}
                              <span className="goal-event-player">{playerName}</span>
                            </div>
                            <span className="goal-event-team">{teamLabel}</span>
                          </div>
                        </article>
                      );
                    }

                    return (
                      <article key={e.localId} className="goal-event-item">
                        <span className="goal-event-minute">{minute}&apos;</span>
                        <div className="goal-event-main">
                          <div className="goal-event-playerline">
                            <span className="goal-event-icon">🟥</span>
                            {e.player && (
                              <span className="goal-event-number">#{e.player.jersey_number ?? "?"}</span>
                            )}
                            <span className="goal-event-player">{playerName}</span>
                          </div>
                          <span className="goal-event-team">{teamLabel}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal sélection du joueur cartonné */}
      {pendingCardEvent && (
        <div className="goal-modal-overlay">
          <div
            className="goal-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-modal-title"
          >
            <h2 id="card-modal-title" className="goal-modal-title">
              {pendingCardEvent.event_type === "yellow_card" ? "🟨 Carton jaune" : "🟥 Carton rouge"}
            </h2>
            <p className="goal-modal-team">
              {pendingCardEvent.team === "A"
                ? matchData.teamA.name || "Équipe A"
                : matchData.teamB.name || "Équipe B"}
            </p>

            <div className="goal-modal-players">
              <button
                onClick={() => setSelectedCardPlayerId("none")}
                className={`goal-modal-player-button ${selectedCardPlayerId === "none" ? "goal-modal-player-button-active" : ""}`}
              >
                Non attribué
              </button>
              {players
                .filter((p) => p.team === pendingCardEvent.team)
                .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
                .map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedCardPlayerId(player.id)}
                    className={`goal-modal-player-button ${selectedCardPlayerId === player.id ? "goal-modal-player-button-active" : ""}`}
                  >
                    <span className="font-bold mr-2">#{player.jersey_number ?? "?"}</span>
                    {[player.first_name, player.last_name].filter(Boolean).join(" ") || "Anonyme"}
                    {player.is_captain && (
                      <span className="ml-2 text-[10px] bg-yellow-200 text-yellow-800 px-1 rounded">C</span>
                    )}
                  </button>
                ))}
            </div>

            <div className="goal-modal-actions">
              <button
                onClick={() => { cancelCardModal(); setSelectedCardPlayerId(null); }}
                className="goal-modal-cancel"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (selectedCardPlayerId === null) return;
                  confirmCard(selectedCardPlayerId === "none" ? undefined : selectedCardPlayerId);
                  setSelectedCardPlayerId(null);
                }}
                disabled={selectedCardPlayerId === null}
                className="goal-modal-confirm"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sélection du buteur */}
      {pendingGoalTeam && (
        <div className="goal-modal-overlay">
          <div
            ref={goalModalRef}
            className="goal-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-modal-title"
          >
            <h2 id="goal-modal-title" className="goal-modal-title">
              Qui a marqué ?
            </h2>
            <p className="goal-modal-team">
              {pendingGoalTeam === "A"
                ? matchData.teamA.name || "Équipe A"
                : matchData.teamB.name || "Équipe B"}
            </p>

            <div className="goal-modal-players">
              <button
                ref={scorerFirstOptionRef}
                onClick={() => setSelectedScorerPlayerId("none")}
                className={`goal-modal-player-button ${selectedScorerPlayerId === "none" ? "goal-modal-player-button-active" : ""}`}
              >
                Non attribué
              </button>
              {players
                .filter((p) => p.team === pendingGoalTeam)
                .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
                .map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedScorerPlayerId(player.id)}
                    className={`goal-modal-player-button ${selectedScorerPlayerId === player.id ? "goal-modal-player-button-active" : ""}`}
                  >
                    <span className="font-bold mr-2">#{player.jersey_number ?? "?"}</span>
                    {[player.first_name, player.last_name].filter(Boolean).join(" ") || "Anonyme"}
                    {player.is_captain && (
                      <span className="ml-2 text-[10px] bg-yellow-200 text-yellow-800 px-1 rounded">C</span>
                    )}
                  </button>
                ))}
            </div>

            <div className="goal-modal-actions">
              <button
                onClick={() => { cancelGoalModal(); setSelectedScorerPlayerId(null); }}
                className="goal-modal-cancel"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (selectedScorerPlayerId === null) return;
                  confirmGoal(selectedScorerPlayerId === "none" ? undefined : selectedScorerPlayerId);
                  setSelectedScorerPlayerId(null);
                }}
                disabled={selectedScorerPlayerId === null}
                className="goal-modal-confirm"
              >
                Valider le but
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
