"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getAvailableCourts } from "./courtUtils";
import "./football.css";
import { useSearchParams } from "next/navigation";
import { useFootballMatch, MatchPlayer } from "./useFootballMatch";
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

type PlayerSelectModalProps = {
  title: React.ReactNode;
  teamName: string;
  players: MatchPlayer[];
  selectedId: number | "none" | null;
  onSelect: (id: number | "none") => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  firstButtonRef?: React.RefObject<HTMLButtonElement | null>;
  dialogRef?: React.RefObject<HTMLDivElement | null>;
};

function PlayerSelectModal({
  title,
  teamName,
  players,
  selectedId,
  onSelect,
  onCancel,
  onConfirm,
  confirmLabel,
  firstButtonRef,
  dialogRef,
}: PlayerSelectModalProps) {
  return (
    <div className="goal-modal-overlay">
      <div
        ref={dialogRef}
        className="goal-modal-card"
        role="dialog"
        aria-modal="true"
      >
        <h2 className="goal-modal-title">{title}</h2>
        <p className="goal-modal-team">{teamName}</p>
        <div className="goal-modal-players">
          <button
            ref={firstButtonRef}
            onClick={() => onSelect("none")}
            className={`goal-modal-player-button${selectedId === "none" ? " goal-modal-player-button-active" : ""}`}
          >
            Non attribué
          </button>
          {players
            .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
            .map((player) => (
              <button
                key={player.id}
                onClick={() => onSelect(player.id)}
                className={`goal-modal-player-button${selectedId === player.id ? " goal-modal-player-button-active" : ""}`}
              >
                <span className="font-bold mr-2">
                  #{player.jersey_number ?? "?"}{" "}
                </span>
                {[player.first_name, player.last_name]
                  .filter(Boolean)
                  .join(" ") || "Anonyme"}
                {player.is_captain && (
                  <span className="ml-2 text-[10px] bg-yellow-200 text-yellow-800 px-1 rounded">
                    C
                  </span>
                )}
              </button>
            ))}
        </div>
        <div className="goal-modal-actions">
          <button onClick={onCancel} className="goal-modal-cancel">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={selectedId === null}
            className="goal-modal-confirm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FootballTableMarquagePage() {
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
        const matchRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/matches/${matchId}`,
        );
        if (!matchRes.ok) throw new Error("Match not found");
        const matchData = await matchRes.json();

        // 2. Récupérer la phase pour obtenir tournament_id
        const phaseRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/tournament-phases/${matchData.data.phase_id}`,
        );
        if (!phaseRes.ok) throw new Error("Phase not found");
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/match-schedules?skip=0&limit=200`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      if (!res.ok) throw new Error("Impossible de charger les plannings");
      const data = await res.json();
      setCourtSchedules(
        Array.isArray(data?.data?.items) ? data.data.items : [],
      );
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
    players,
    pendingEvents,
    pendingGoalTeam,
    confirmGoal,
    cancelGoalModal,
    pendingCardEvent,
    confirmCard,
    cancelCardModal,
  } = useFootballMatch(matchId);

  const [selectedScorerPlayerId, setSelectedScorerPlayerId] = useState<
    number | "none" | null
  >(null);
  const [selectedCardPlayerId, setSelectedCardPlayerId] = useState<
    number | "none" | null
  >(null);
  const [showEventPanel, setShowEventPanel] = useState(false);
  const scorerFirstOptionRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const goalModalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pendingGoalTeam) {
      previousFocusedElementRef.current = document.activeElement as HTMLElement;
      const focusFirstControl = () => {
        scorerFirstOptionRef.current?.focus({ preventScroll: true });
      };
      requestAnimationFrame(focusFirstControl);
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

  // Synchroniser les données du match avec les states locaux
  useEffect(() => {
    console.log("[Football Scoreboard] Match data changed:", matchData);
    console.log("[Football Scoreboard] Court:", court);

    if (matchData.teamA.name && matchData.teamA.name !== "Team A") {
      setTeamA(matchData.teamA.name);
      console.log("[Football Scoreboard] Set Team A to:", matchData.teamA.name);
    }
    if (matchData.teamB.name && matchData.teamB.name !== "Team B") {
      setTeamB(matchData.teamB.name);
      console.log("[Football Scoreboard] Set Team B to:", matchData.teamB.name);
    }
    if (matchData.matchType) {
      setMatchType(matchData.matchType);
      console.log(
        "[Football Scoreboard] Set Match Type to:",
        matchData.matchType,
      );
    }
    if (court) {
      setMatchGround(court);
      console.log("[Football Scoreboard] Set Court to:", court);
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teams?skip=0&limit=100`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      if (!res.ok) throw new Error("Impossible de charger les équipes");
      const data = await res.json();
      const teamsData = Array.isArray(data?.data?.items) ? data.data.items : [];
      setTeams(
        teamsData.map((team: any) => ({
          id: team.id.toString(),
          name: team.name,
          logo_url: team.logo_url,
        })),
      );
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courts?skip=0&limit=100`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      if (!res.ok) throw new Error("Impossible de charger les terrains");
      const data = await res.json();
      const courtsData = Array.isArray(data?.data?.items)
        ? data.data.items
        : [];
      setCourts(
        courtsData.map((court: any) => ({
          id: court.id.toString(),
          name: court.name,
        })),
      );
    } catch (error) {
      console.error("Erreur lors du chargement des terrains:", error);
      setCourts([]);
    } finally {
      setLoadingCourts(false);
    }
  };

  const handleSwipe = useCallback(() => {
    setTeamA(teamB);
    setTeamB(teamA);
    swapSides();
  }, [teamA, teamB, swapSides]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (pendingGoalTeam || pendingCardEvent) return;
      switch (e.key) {
        case "w":
        case "W":
          addPoint("A");
          break;
        case "q":
        case "Q":
          subPoint("A");
          break;
        case "o":
        case "O":
          addPoint("B");
          break;
        case "l":
        case "L":
          subPoint("B");
          break;
        case "t":
        case "T":
          startChrono();
          break;
        case "Escape":
          stopChrono();
          break;
        case "x":
        case "X":
          handleSwipe();
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    addPoint,
    subPoint,
    startChrono,
    stopChrono,
    handleSwipe,
    pendingGoalTeam,
    pendingCardEvent,
  ]);

  return (
    <main className="football-root">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-black mb-2">
          Football - Table de marquage
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
            <select
              name="teamA"
              value={teamA}
              onChange={handleTeamAChange}
              disabled={loadingTeams}
            >
              <option value="">
                {loadingTeams ? "Chargement..." : "Sélectionner"}
              </option>
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
            <select
              id="teamB"
              name="teamB"
              value={teamB}
              onChange={handleTeamBChange}
              disabled={loadingTeams}
            >
              <option value="">
                {loadingTeams ? "Chargement..." : "Sélectionner"}
              </option>
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
            <select
              id="matchTypeSelector"
              value={matchType}
              onChange={handleMatchTypeChange}
            >
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
                courts.find((c) => c.id === matchData.court?.toString())
                  ?.name ||
                courts.find((c) => c.name === matchData.court)?.name ||
                courts.find((c) => c.id === court?.toString())?.name ||
                courts.find((c) => c.name === court)?.name ||
                courts.find((c) => c.id === matchGround)?.name ||
                matchData.court ||
                court ||
                (matchGround !== "Terrain"
                  ? courts.find((c) => c.id === matchGround)?.name
                  : "Terrain")
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
                <option value="">
                  {loadingCourts ? "Chargement..." : "Sélectionner"}
                </option>
                {getAvailableCourts(
                  courts,
                  courtSchedules,
                  selectedDateTime,
                ).map((court: any) => (
                  <option
                    key={court.id}
                    value={court.id}
                    disabled={court.isOccupied}
                  >
                    {court.name} {court.isOccupied ? "(occupé)" : ""}
                  </option>
                ))}
              </select>
              {/* Sélecteur de date/heure pour la planification (exemple simple) */}
              <input
                type="datetime-local"
                value={selectedDateTime}
                onChange={(e) => setSelectedDateTime(e.target.value)}
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
            <button
              onClick={() => window.open("./football/spectators", "_blank")}
            >
              Spectateurs
            </button>
          </div>
        </div>
      </div>

      {/* Tableau de marquage */}
      <div className="droite">
        <div className="scoreboard grid grid-cols-1 gap-2">
          <div className="score-display">
            <div className="score-line">
              <span>
                {matchData.teamA.name !== "Team A"
                  ? matchData.teamA.name
                  : teamA != ""
                    ? teams.find((c: Team) => c.id === teamA)?.name
                    : "Team A"}{" "}
                {matchData.teamA.score} - {matchData.teamB.score}{" "}
                {matchData.teamB.name !== "Team B"
                  ? matchData.teamB.name
                  : teamB != ""
                    ? teams.find((c: Team) => c.id === teamB)?.name
                    : "Team B"}
              </span>
            </div>
            <div className="info-line">
              <p>
                {matchData.matchType ||
                  (matchType !== "Type de match"
                    ? matchType
                    : "Type de match")}{" "}
                -{" "}
                {
                  // Affiche toujours le nom du terrain si possible
                  courts.find((c) => c.id === matchData.court?.toString())
                    ?.name ||
                    courts.find((c) => c.name === matchData.court)?.name ||
                    courts.find((c) => c.id === court?.toString())?.name ||
                    courts.find((c) => c.name === court)?.name ||
                    courts.find((c) => c.id === matchGround)?.name ||
                    matchData.court ||
                    court ||
                    (matchGround !== "Terrain"
                      ? courts.find((c) => c.id === matchGround)?.name
                      : "Terrain")
                }
              </p>
            </div>
          </div>

          <div className="points-section">
            <div className="flex items-center gap-2">
              <p>Buts : {matchData.teamA.score}</p>
              <button title="Q" onClick={() => subPoint("A")}>
                - <span className="shortcut-hint">Q</span>
              </button>
              <button title="W" onClick={() => addPoint("A")}>
                + <span className="shortcut-hint">W</span>
              </button>
            </div>
            <div className="timer">{formattedTime}</div>
            <div className="flex items-center gap-2">
              <p>Buts : {matchData.teamB.score}</p>
              <button title="L" onClick={() => subPoint("B")}>
                - <span className="shortcut-hint">L</span>
              </button>
              <button title="O" onClick={() => addPoint("B")}>
                + <span className="shortcut-hint">O</span>
              </button>
            </div>
          </div>

          <div className="cards-section grid grid-cols-2 gap-4 mb-4">
            {/* Cartons Équipe A */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <p>
                  Cartons Jaunes :{" "}
                  {matchData.teamA.yellowCards != 0
                    ? matchData.teamA.yellowCards
                    : 0}
                </p>
                <button
                  style={{ backgroundColor: "var(--bg-yellow-900)" }}
                  onClick={() => subYellowCard("A")}
                >
                  -
                </button>
                <button
                  style={{ backgroundColor: "var(--bg-yellow-900)" }}
                  onClick={() => addYellowCard("A")}
                >
                  +
                </button>
              </div>
              <div className="flex items-center gap-2">
                <p>
                  Cartons Rouges :{" "}
                  {matchData.teamA.redCards != 0 ? matchData.teamA.redCards : 0}
                </p>
                <button
                  style={{ backgroundColor: "var(--bg-red-900)" }}
                  onClick={() => subRedCard("A")}
                >
                  -
                </button>
                <button
                  style={{ backgroundColor: "var(--bg-red-900)" }}
                  onClick={() => addRedCard("A")}
                >
                  +
                </button>
              </div>
            </div>
            {/* Cartons Équipe B */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <p>
                  Cartons Jaunes :{" "}
                  {matchData.teamB.yellowCards != 0
                    ? matchData.teamB.yellowCards
                    : 0}
                </p>
                <button
                  style={{ backgroundColor: "var(--bg-yellow-900)" }}
                  onClick={() => subYellowCard("B")}
                >
                  -
                </button>
                <button
                  style={{ backgroundColor: "var(--bg-yellow-900)" }}
                  onClick={() => addYellowCard("B")}
                >
                  +
                </button>
              </div>
              <div className="flex items-center gap-2">
                <p>
                  Cartons Rouges :{" "}
                  {matchData.teamB.redCards != 0 ? matchData.teamB.redCards : 0}
                </p>
                <button
                  style={{ backgroundColor: "var(--bg-red-900)" }}
                  onClick={() => subRedCard("B")}
                >
                  -
                </button>
                <button
                  style={{ backgroundColor: "var(--bg-red-900)" }}
                  onClick={() => addRedCard("B")}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="bottom-controls">
            <button onClick={startChrono}>
              Start <span className="shortcut-hint">T</span>
            </button>
            <button onClick={stopChrono}>
              Stop <span className="shortcut-hint">Échap</span>
            </button>
            <button onClick={handleSwipe}>
              Swipe <span className="shortcut-hint">X</span>
            </button>
            <button
              onClick={async () => {
                if (!tournamentId) {
                  alert(
                    "Impossible de retrouver l'ID du tournoi pour la redirection.",
                  );
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

      {/* Icône notification buts — fixée en haut à droite */}
      {pendingEvents.length > 0 && (
        <div className="goal-events-fab">
          <div className="goal-events-shell">
            <button
              onClick={() => setShowEventPanel((v) => !v)}
              className="goal-events-button"
              aria-label="Afficher les buts"
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
                          <span className="goal-event-minute">
                            {minute}&apos;
                          </span>
                          <div className="goal-event-main">
                            <div className="goal-event-playerline">
                              <span className="goal-event-icon">⚽</span>
                              {e.player && (
                                <span className="goal-event-number">
                                  #{e.player.jersey_number ?? "?"}
                                </span>
                              )}
                              <span className="goal-event-player">
                                {playerName}
                              </span>
                            </div>
                            <span className="goal-event-team">{teamLabel}</span>
                          </div>
                        </article>
                      );
                    }

                    if (e.event_type === "yellow_card") {
                      return (
                        <article key={e.localId} className="goal-event-item">
                          <span className="goal-event-minute">
                            {minute}&apos;
                          </span>
                          <div className="goal-event-main">
                            <div className="goal-event-playerline">
                              <span className="goal-event-icon">🟨</span>
                              {e.player && (
                                <span className="goal-event-number">
                                  #{e.player.jersey_number ?? "?"}
                                </span>
                              )}
                              <span className="goal-event-player">
                                {playerName}
                              </span>{" "}
                            </div>
                            <span className="goal-event-team">{teamLabel}</span>
                          </div>
                        </article>
                      );
                    }

                    return (
                      <article key={e.localId} className="goal-event-item">
                        <span className="goal-event-minute">
                          {minute}&apos;
                        </span>
                        <div className="goal-event-main">
                          <div className="goal-event-playerline">
                            <span className="goal-event-icon">🟥</span>
                            {e.player && (
                              <span className="goal-event-number">
                                #{e.player.jersey_number ?? "?"}
                              </span>
                            )}
                            <span className="goal-event-player">
                              {playerName}
                            </span>
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
        <PlayerSelectModal
          title={
            pendingCardEvent.event_type === "yellow_card"
              ? "🟨 Carton jaune"
              : "🟥 Carton rouge"
          }
          teamName={
            pendingCardEvent.team === "A"
              ? matchData.teamA.name || "Équipe A"
              : matchData.teamB.name || "Équipe B"
          }
          players={players.filter((p) => p.team === pendingCardEvent.team)}
          selectedId={selectedCardPlayerId}
          onSelect={setSelectedCardPlayerId}
          onCancel={() => {
            cancelCardModal();
            setSelectedCardPlayerId(null);
          }}
          onConfirm={() => {
            if (selectedCardPlayerId === null) return;
            confirmCard(
              selectedCardPlayerId === "none"
                ? undefined
                : selectedCardPlayerId,
            );
            setSelectedCardPlayerId(null);
          }}
          confirmLabel="Valider"
        />
      )}

      {/* Modal sélection du buteur */}
      {pendingGoalTeam && (
        <PlayerSelectModal
          title="⚽ Qui a marqué ?"
          teamName={
            pendingGoalTeam === "A"
              ? matchData.teamA.name || "Équipe A"
              : matchData.teamB.name || "Équipe B"
          }
          players={players.filter((p) => p.team === pendingGoalTeam)}
          selectedId={selectedScorerPlayerId}
          onSelect={setSelectedScorerPlayerId}
          onCancel={() => {
            cancelGoalModal();
            setSelectedScorerPlayerId(null);
          }}
          onConfirm={() => {
            if (selectedScorerPlayerId === null) return;
            confirmGoal(
              selectedScorerPlayerId === "none"
                ? undefined
                : selectedScorerPlayerId,
            );
            setSelectedScorerPlayerId(null);
          }}
          confirmLabel="Valider le but"
          firstButtonRef={scorerFirstOptionRef}
          dialogRef={goalModalRef}
        />
      )}
    </main>
  );
}
