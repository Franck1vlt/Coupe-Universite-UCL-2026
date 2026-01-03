"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Types
type Sport = {
  id: number;
  name: string;
};
type Team = {
  id: number;
  name: string;
  color: string | null;
  logo_url: string;
  created_at: string;
  primary_color?: string | null;
};
type Tournament = {
  id: number;
  name: string;
  sport_id: number;
  typePhases: string[];
  teams: number[];
  status: string;
};

// Options des phases d'un tournoi (Correction: typo "Qualifcations" => "Qualifications")
const PHASES_OPTIONS = [
  "Qualifications",
  "Poules",
  "Quarts de finale",
  "Demi-finales",
  "Petite finale",
  "Finale",
];
const DEFAULT_STATUS = "A Venir";

export default function GestionTournois() {
  const router = useRouter();

  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsLoading, setSportsLoading] = useState(true);
  const [sportsError, setSportsError] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [sportId, setSportId] = useState<number | "">("");
  const [typePhases, setTypePhases] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Correction: typing issue on useRef
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        openDropdownId !== null &&
        dropdownRefs.current[openDropdownId] &&
        !dropdownRefs.current[openDropdownId]?.contains(event.target as Node)
      ) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdownId]);

  // Récupération des sports
  useEffect(() => {
    setSportsLoading(true);
    setSportsError(null);
    fetch("http://localhost:8000/sports?skip=0&limit=100", {
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Erreur lors du chargement des sports");
        }
        return res.json();
      })
      .then((response) => {
        const items = response?.data?.items || [];
        setSports(Array.isArray(items) ? items : []);
        setSportsError(
          items.length > 0
            ? null
            : "Aucun sport disponible pour le moment."
        );
      })
      .catch((error) => {
        console.error("Erreur API:", error);
        setSportsError("Impossible de récupérer les sports via l'API");
        setSports([]);
      })
      .finally(() => {
        setSportsLoading(false);
      });
  }, []);

  // Récupération des équipes
  useEffect(() => {
    setTeamsLoading(true);
    setTeamsError(null);
    fetch("http://localhost:8000/teams?skip=0&limit=100", {
      headers: { Accept: "application/json" }
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Erreur lors du chargement des équipes.");
        }
        return res.json();
      })
      .then((response) => {
        const items = Array.isArray(response?.data?.items) ? response.data.items : [];
        // Correction: éviter d'écraser la couleur si primary_color null mais color présente
        setTeams(
          items.map((t: any) => ({
            ...t,
            color: t.primary_color !== undefined && t.primary_color !== null ? t.primary_color : t.color ?? "", // Respecte color originel si pas de primary_color
            logo_url: t.logo_url ?? computeLogoUrlFromName(t.name ?? ""),
            created_at: t.created_at ?? "",
            primary_color: t.primary_color ?? null,
          }))
        );
      })
      .catch((error) => {
        console.error("Erreur API teams:", error);
        setTeamsError("Impossible de récupérer les équipes.");
        setTeams([]);
      })
      .finally(() => {
        setTeamsLoading(false);
      });
  }, []);

  // Correction: function must be hoisted
  function computeLogoUrlFromName(name: string): string {
    if (!name) return "/img/no-logo.png";
    let cleaned = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\-_]/g, "")
      .toLowerCase();
    return `/img/${cleaned}.png`;
  }

  function getTeamColor(team: Partial<Team>): string {
    const color = team.primary_color ?? team.color ?? "";
    if (
      typeof color === "string" &&
      color.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    ) {
      return color;
    }
    if (typeof color === "string" && color.length > 0) {
      return color;
    }
    return "#cccccc";
  }

  function resetForm() {
    setName("");
    setSportId("");
    setTypePhases([]);
    setSelectedTeams([]);
    setFormError(null);
  }

  function handlePhaseChange(phase: string) {
    setTypePhases((current) =>
      current.includes(phase)
        ? current.filter((p) => p !== phase)
        : [...current, phase]
    );
  }

  function handleTeamCheckboxChange(teamId: number) {
    setSelectedTeams((selected) =>
      selected.includes(teamId)
        ? selected.filter((id) => id !== teamId)
        : [...selected, teamId]
    );
  }

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (typeof name !== "string" || !name.trim()) {
      setFormError("Le nom du tournoi est requis.");
      return;
    }
    if (!sportId) {
      setFormError("Veuillez sélectionner un sport.");
      return;
    }
    if (!Array.isArray(typePhases) || typePhases.length === 0) {
      setFormError("Veuillez sélectionner au moins une phase.");
      return;
    }
    if (!Array.isArray(selectedTeams) || selectedTeams.length === 0) {
      setFormError("Veuillez sélectionner au moins une équipe.");
      return;
    }
    setAdding(true);
    setTimeout(() => {
      setTournaments((prev) => [
        ...prev,
        {
          id: Date.now(),
          name,
          sport_id: Number(sportId),
          typePhases: [...typePhases],
          teams: [...selectedTeams],
          status: DEFAULT_STATUS,
        },
      ]);
      resetForm();
      setAdding(false);
    }, 500);
  }

  function handleDeleteTournament(id: number) {
    setTournaments((prev) => prev.filter((t) => t.id !== id));
    setOpenDropdownId(null);
  }

  function handleEditTournament(tournament: Tournament) {
    setName(tournament.name);
    setSportId(tournament.sport_id);
    setTypePhases([...tournament.typePhases]);
    setSelectedTeams([...tournament.teams]);
    setOpenDropdownId(null);
    setTournaments((prev) => prev.filter((t) => t.id !== tournament.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderActions(tournament: Tournament) {
    return (
      <div
        className="relative flex justify-end items-center h-full"
        ref={(el) => {
          dropdownRefs.current[tournament.id] = el;
        }}
      >
        <button
          aria-label="Actions"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdownId((prev) =>
              prev === tournament.id ? null : tournament.id
            );
          }}
          className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
        >
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            viewBox="0 0 20 20"
            stroke="currentColor"
          >
            <circle cx="10" cy="4" r="1.2" />
            <circle cx="10" cy="10" r="1.2" />
            <circle cx="10" cy="16" r="1.2" />
          </svg>
        </button>
        {openDropdownId === tournament.id && (
          <div className="z-30 absolute right-0 top-8 bg-white border shadow-md rounded-lg w-48 py-2 animate-fade-in">
            <button
              className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-2 text-gray-800"
              onClick={() => handleEditTournament(tournament)}
            >
              <svg
                className="w-5 h-5 text-blue-500"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M4 13.793V16h2.207l8.457-8.457a1 1 0 0 0 0-1.414l-1.793-1.793a1 1 0 0 0-1.414 0L4 13.793z"
                  stroke="currentColor"
                  strokeWidth={1.5}
                />
              </svg>
              Modifier
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-700"
              onClick={() => handleDeleteTournament(tournament.id)}
            >
              <svg
                className="w-5 h-5 text-red-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 20 20"
              >
                <path
                  d="M7 9v6m6-6v6M4 6h12M9 4h2a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Supprimer
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Bouton retour en haut à gauche */}
      <button
        onClick={() => router.back()}
        className="absolute left-4 top-4 flex items-center gap-2 bg-white rounded-full shadow px-4 py-2 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Retour"
      >
        <svg
          className="w-5 h-5 text-blue-600"
          fill="none"
          viewBox="0 0 20 20"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4l-6 6m0 0l6 6m-6-6h14"
          />
        </svg>
        <span className="text-blue-700 font-medium">Retour</span>
      </button>
      <header className="mb-12 text-center">
        <img
          src="/img/coupe.png"
          alt="Logo Coupe Universitaire"
          className="mx-auto mb-6 h-24 w-24 object-contain"
        />
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Gestion des tournois
        </h1>
        <p className="text-gray-600 text-lg">
          Remplissez le formulaire ci-dessous pour créer un nouveau tournoi sportif.
        </p>
      </header>
      {/* Formulaire */}
      <section className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8 mb-12">
        <form
          className="space-y-8"
          onSubmit={handleSubmit}
          autoComplete="off"
        >
          {/* Nom */}
          <div>
            <label
              htmlFor="tournamentName"
              className="block text-lg font-medium text-gray-900 mb-2"
            >
              Nom du tournoi<span className="text-red-500">*</span>
            </label>
            <input
              id="tournamentName"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-lg text-black focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
              placeholder="Ex: Championnat Printemps UCL"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={sportsLoading || teamsLoading}
            />
          </div>
          {/* Sport */}
          <div>
            <label
              htmlFor="sportSelect"
              className="block text-lg font-medium text-gray-900 mb-2"
            >
              Sport<span className="text-red-500">*</span>
            </label>
            <select
              id="sportSelect"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-lg text-black focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition bg-white"
              value={sportId}
              onChange={(e) =>
                setSportId(e.target.value ? Number(e.target.value) : "")
              }
              disabled={sportsLoading || teamsLoading}
            >
              <option value="">
                {sportsLoading
                  ? "Chargement des sports..."
                  : "Sélectionner un sport"}
              </option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
            {sportsLoading ? (
              <p className="text-sm text-gray-600 mt-1">
                Chargement des sports...
              </p>
            ) : sportsError ? (
              <p className="text-sm text-red-600 mt-1">{sportsError}</p>
            ) : null}
          </div>
          {/* Phases */}
          <div>
            <label className="block text-lg font-medium text-gray-900 mb-2">
              Phases du tournoi<span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PHASES_OPTIONS.map((phase) => (
                <label
                  key={phase}
                  className={`flex items-center text-base text-gray-900 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg hover:bg-blue-50 transition ${
                    sportsLoading || teamsLoading ? "opacity-60" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    value={phase}
                    checked={typePhases.includes(phase)}
                    onChange={() => handlePhaseChange(phase)}
                    className="mr-3 accent-blue-600 h-5 w-5"
                    disabled={sportsLoading || teamsLoading}
                  />
                  {phase}
                </label>
              ))}
            </div>
          </div>
          {/* Equipes */}
          <div>
            <label className="block text-lg font-medium text-gray-900 mb-2">
              Équipes du tournoi<span className="text-red-500">*</span>
            </label>
            <div className="max-h-52 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3">
              {teamsLoading ? (
                <p className="text-gray-600 col-span-2">Chargement des équipes...</p>
              ) : teamsError ? (
                <p className="text-red-600 col-span-2">{teamsError}</p>
              ) : teams.length === 0 ? (
                <p className="text-gray-500 col-span-2">Aucune équipe disponible.</p>
              ) : (
                teams.map((team) => (
                  <label
                    key={team.id}
                    className={`flex items-center text-base text-gray-900 cursor-pointer px-2 py-2 rounded-lg hover:bg-blue-50 transition ${
                      teamsLoading ? "opacity-60" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={team.id}
                      checked={selectedTeams.includes(team.id)}
                      onChange={() => handleTeamCheckboxChange(team.id)}
                      className="mr-3 accent-blue-600 h-5 w-5"
                      disabled={teamsLoading}
                    />
                    {/* Affiche le logo au lieu de la pastille couleur */}
                    <img
                      src={team.logo_url || computeLogoUrlFromName(team.name)}
                      alt={team.name}
                      className="inline-block w-6 h-6 object-contain rounded mr-2 border bg-white"
                      style={{ minWidth: 24, minHeight: 24 }}
                    />
                    <span>{team.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          {/* Erreur */}
          {formError && (
            <div className="text-red-600 py-2 px-3 rounded bg-red-50 border border-red-200 text-sm">
              {formError}
            </div>
          )}
          {/* Submit */}
          <div>
            <button
              type="submit"
              className={`${
                !name.trim() ||
                !sportId ||
                typePhases.length === 0 ||
                selectedTeams.length === 0 ||
                sportsLoading ||
                teamsLoading ||
                adding
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white font-semibold rounded-lg px-8 py-3 text-lg shadow transition`}
              disabled={
                !name.trim() ||
                !sportId ||
                typePhases.length === 0 ||
                selectedTeams.length === 0 ||
                sportsLoading ||
                teamsLoading ||
                adding
              }
            >
              {adding ? "Création..." : "Créer le tournoi"}
            </button>
          </div>
        </form>
      </section>
      {/* Tableau des tournois créés */}
      <section className="w-full max-w-4xl mt-8 bg-white rounded-2xl shadow-lg px-0 py-8 overflow-x-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 px-6">
          Tournois créés
        </h2>
        {tournaments.length === 0 ? (
          <p className="text-gray-500 text-lg px-6">
            Aucun tournoi créé pour l'instant.
          </p>
        ) : (
          <div className="px-2">
            <table className="min-w-full overflow-x-auto border-spacing-0 border-separate">
              <thead>
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50 rounded-tl-xl">
                    Nom
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Sport
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Phases
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Équipes
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Statut
                  </th>
                  <th className="px-2 py-4 text-center text-xs font-semibold text-gray-500 uppercase bg-gray-50 rounded-tr-xl"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {tournaments.map((tournament, idx) => (
                  <tr
                    key={tournament.id}
                    className={`${
                      idx % 2 === 1 ? "bg-gray-50" : ""
                    } hover:bg-blue-50/70 group transition`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-base text-gray-900 font-medium rounded-l-xl group-hover:bg-blue-50/40 transition">
                      {tournament.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-700 group-hover:bg-blue-50/20 transition">
                      {
                        (() => {
                          const sport = sports.find(
                            (s) => s.id === tournament.sport_id
                          );
                          return sport ? (
                            sport.name
                          ) : (
                            <span className="italic text-gray-400">
                              Indisponible
                            </span>
                          );
                        })()
                      }
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-700 group-hover:bg-blue-50/20 transition">
                      <div className="flex flex-wrap gap-1">
                        {tournament.typePhases.length > 0 ? (
                          tournament.typePhases.map((phase, i) => (
                            <span
                              key={phase + i}
                              className="inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs font-medium"
                            >
                              {phase}
                            </span>
                          ))
                        ) : (
                          <span className="italic text-gray-400">Aucune</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-700 group-hover:bg-blue-50/20 transition">
                      {tournament.teams && tournament.teams.length > 0 ? (
                        <ul className="flex flex-wrap gap-2">
                          {tournament.teams.map((teamId) => {
                            const teamObj = teams.find(
                              (team) => team.id === teamId
                            );
                            return (
                              <li key={teamId} className="flex items-center gap-1">
                                {teamObj ? (
                                  <>
                                    {/* Remplacer la pastille couleur par le logo de l'équipe */}
                                    <img
                                      src={teamObj.logo_url || computeLogoUrlFromName(teamObj.name)}
                                      alt={teamObj.name}
                                      className="inline-block w-5 h-5 object-contain rounded bg-white border"
                                      style={{ minWidth: 20, minHeight: 20 }}
                                    />
                                    <span className="text-xs">
                                      {teamObj.name}
                                    </span>
                                  </>
                                ) : (
                                  <span className="italic text-gray-400">
                                    ?
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <span className="italic text-gray-400">Aucune</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap group-hover:bg-blue-50/20 transition">
                      <span className="inline-block px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                        {tournament.status}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-center sticky right-0 z-20">
                      {renderActions(tournament)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}