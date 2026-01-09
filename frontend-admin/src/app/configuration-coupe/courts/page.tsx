"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Types
type Court = {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
};

type MatchSchedule = {
  match_id: number;
  court_id: number;
  scheduled_datetime: string;
  actual_start_datetime: string | null;
  actual_end_datetime: string | null;
  estimated_duration_minutes: number | null;
};

export default function CourtsPage() {
  const router = useRouter();

  const [courts, setCourts] = useState<Court[]>([]);
  const [matchSchedules, setMatchSchedules] = useState<MatchSchedule[]>([]);
  const [inputName, setInputName] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [updating, setUpdating] = useState<number | null>(null);
  const updatingRef = useRef<HTMLInputElement>(null);

  // *** Backend URL ***
  const API_BASE_URL = "http://localhost:8000";

  // Charger les terrains depuis l'API
  const fetchCourts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/courts`);
      if (!res.ok) throw new Error("Impossible de charger les terrains.");
      const data = await res.json();
      const items = Array.isArray(data?.data?.items) ? data.data.items : [];
      setCourts(items);
    } catch (e: any) {
      setError(e?.message || "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchSchedules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/match-schedules`);
      if (!res.ok) throw new Error("Impossible de charger les horaires des matchs.");
      const data = await res.json();

      // Vérifiez si la réponse contient les données attendues
      if (data.success && Array.isArray(data.data)) {
        setMatchSchedules(data.data.map((schedule: MatchSchedule) => ({
          court_id: schedule.court_id,
          scheduled_datetime: schedule.scheduled_datetime,
          actual_start_datetime: schedule.actual_start_datetime || schedule.scheduled_datetime,
          actual_end_datetime: schedule.actual_end_datetime || schedule.scheduled_datetime,
          estimated_duration_minutes: schedule.estimated_duration_minutes,
        })));
      } else {
        throw new Error("Format de réponse inattendu.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors du chargement des horaires des matchs.");
    }
  };

  // Vérifier si un terrain est utilisé en fonction des horaires des matchs
  const isCourtInUse = (courtId: number): boolean => {
    const now = new Date();
    return matchSchedules.some((match) => {
      if (match.court_id === courtId) {
        const startTime = new Date(match.actual_start_datetime || match.scheduled_datetime);
        const endTime = new Date(match.actual_end_datetime || match.scheduled_datetime);
        return now >= startTime && now <= endTime;
      }
      return false;
    });
  };

  useEffect(() => {
    fetchCourts();
    fetchMatchSchedules();
  }, []);

  useEffect(() => {
    // Recharger les horaires des matchs toutes les minutes pour garder les statuts à jour
    const interval = setInterval(fetchMatchSchedules, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAddCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!inputName.trim()) {
      setError("Le nom du terrain est requis.");
      return;
    }
    if (courts.find((c) => c.name.toLowerCase() === inputName.trim().toLowerCase())) {
      setError("Ce terrain existe déjà.");
      return;
    }
    setAdding(true);

    try {
      const now = new Date().toISOString();
      const url = `${API_BASE_URL}/courts?name=${encodeURIComponent(inputName.trim())}&is_active=false&created_at=${encodeURIComponent(now)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Accept": "application/json" }
      });

      if (res.ok) {
        const resp = await res.json();
        if (resp && resp.data) {
          setCourts((current) => [...current, resp.data]);
          setInputName("");
        }
      } else {
        const resp = await res.json();
        setError(resp.detail || "Erreur lors de l'ajout du terrain");
      }
    } catch {
      setError("Erreur réseau lors de l'ajout du terrain.");
    } finally {
      setAdding(false);
    }
  };

  // Suppression d'un terrain
  const handleRemoveCourt = async (courtId: number) => {
    setMenuOpenId(null);
    if (!window.confirm("Supprimer ce terrain ? Cette action est irréversible.")) {
      return;
    }
    setRemoving(courtId);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/courts/${courtId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data?.error?.message || data?.message || "Erreur lors de la suppression.");
      }
      fetchCourts();
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la suppression.");
    } finally {
      setRemoving(null);
    }
  };

  // Modification d'un terrain
  const handleUpdateCourt = async (court: Court, name: string) => {
    setUpdating(court.id);
    setError(null);

    if (!name.trim()) {
      setError("Veuillez saisir le nom du terrain.");
      setUpdating(null);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
      };

      const res = await fetch(`${API_BASE_URL}/courts/${court.id}`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data?.error?.message || data?.message || "Erreur lors de la modification.");
      }

      await fetchCourts();
      setEditMode(null);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la modification.");
    } finally {
      setUpdating(null);
    }
  };

  // Gestion dropdown extérieur : refermer le menu si clic hors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuOpenId !== null) {
        const menus = document.querySelectorAll(".dropdown-court-menu");
        let clickedInDropdown = false;
        menus.forEach((menu) => {
          if (menu.contains(e.target as Node)) {
            clickedInDropdown = true;
          }
        });
        if (!clickedInDropdown) setMenuOpenId(null);
      }
    }
    if (menuOpenId !== null) {
      document.addEventListener("mousedown", handleClickOutside, true);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [menuOpenId]);

  // Edition inline : auto-focus input
  useEffect(() => {
    if (editMode !== null && updatingRef.current) {
      updatingRef.current.focus();
    }
  }, [editMode]);

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Retour */}
      <button
        onClick={() => router.back()}
        className="absolute left-4 top-4 flex items-center gap-2 bg-white rounded-full shadow px-4 py-2 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Retour"
      >
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 20 20" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4l-6 6m0 0l6 6m-6-6h14" />
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
          Configuration des terrains
        </h1>
        <p className="text-gray-600 text-lg">
          Ajouter ou supprimer des terrains pour la Coupe de l'Université
        </p>
      </header>
      <section className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6">
        <form
          onSubmit={handleAddCourt}
          className="flex flex-col md:flex-row gap-2 mb-6 items-start"
        >
          <div className="flex flex-col gap-1 flex-1">
            <input
              type="text"
              value={inputName}
              placeholder="Nom du terrain"
              onChange={(e) => setInputName(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black placeholder-gray-400"
              disabled={adding}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300"
            disabled={adding}
          >
            {adding ? "Ajout..." : "Ajouter terrain"}
          </button>
        </form>
        {error && (
          <div className="text-red-600 text-sm mb-3">{error}</div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nom du terrain
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Créé le
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Statut
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={(5)} className="px-6 py-4 text-gray-500 italic text-center">
                  Chargement...
                </td>
              </tr>
            ) : courts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-gray-500 italic text-center">
                  Aucun terrain pour ce tournoi.
                </td>
              </tr>
            ) : (
              courts.map((court) => (
                <tr key={court.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-lg text-gray-800">
                    {editMode === court.id ? (
                      <input
                        ref={updatingRef}
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-400"
                        disabled={updating === court.id}
                        required
                      />
                    ) : (
                      court.name
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                    {court.id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-600 text-sm">
                    {court.created_at
                      ? (() => {
                          try {
                            const d = new Date(court.created_at);
                            return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("fr-FR");
                          } catch {
                            return "-";
                          }
                        })()
                      : new Date().toLocaleDateString("fr-FR")} {/* Date du jour par défaut */}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span
                      className={
                        isCourtInUse(court.id)
                          ? "inline-flex px-3 py-1 rounded-full  bg-red-100 text-red-800 text-xs font-medium"
                          : "inline-flex px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium"
                      }
                    >
                      {isCourtInUse(court.id) ? "Utilisé" : "Libre"}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center relative">
                    {editMode === court.id ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => {
                            setEditMode(null);
                          }}
                          className="px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm"
                          type="button"
                          disabled={updating === court.id}
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => handleUpdateCourt(court, editName.trim())}
                          className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                          type="button"
                          disabled={updating === court.id || !editName.trim()}
                        >
                          {updating === court.id ? "Modif..." : "Valider"}
                        </button>
                      </div>
                    ) : (
                      <div className="relative inline-block dropdown-court-menu">
                        <button
                          className="p-1 rounded hover:bg-gray-100 focus:outline-none"
                          aria-label="Menu actions"
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === court.id ? null : court.id);
                          }}
                          disabled={removing === court.id}
                        >
                          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                            <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                          </svg>
                        </button>
                        {menuOpenId === court.id && (
                          <div
                            className="absolute right-0 z-10 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 dropdown-court-menu"
                            tabIndex={-1}
                          >
                            <button
                              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-blue-50 text-sm"
                              onClick={() => {
                                setEditMode(court.id);
                                setEditName(court.name);
                                setMenuOpenId(null);
                              }}
                              type="button"
                            >
                              Modifier
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 text-sm"
                              onClick={() => handleRemoveCourt(court.id)}
                              type="button"
                              disabled={removing === court.id}
                            >
                              {removing === court.id ? (
                                <span className="animate-spin">⏳ Suppression...</span>
                              ) : (
                                "Supprimer"
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}