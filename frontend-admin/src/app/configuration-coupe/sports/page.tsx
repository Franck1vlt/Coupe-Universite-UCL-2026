"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Types côté UI (français pour affichage), et type API (backend)
type TypeScore = "Points" | "Buts" | "Sets";
type ApiScoreType = "points" | "goals" | "sets";
type Sport = {
  id: number;
  name: string;
  score_type: ApiScoreType;
  created_at: string; // Format ISO string de la date
};

const TYPES_SCORE: { ui: TypeScore; api: ApiScoreType }[] = [
  { ui: "Points", api: "points" },
  { ui: "Buts", api: "goals" },
  { ui: "Sets", api: "sets" },
];

function uiToApiScoreType(ui: TypeScore): ApiScoreType {
  switch (ui) {
    case "Points":
      return "points";
    case "Buts":
      return "goals";
    case "Sets":
      return "sets";
    default:
      return "points";
  }
}
function apiToUiScoreType(api: ApiScoreType): TypeScore {
  switch (api) {
    case "points":
      return "Points";
    case "goals":
      return "Buts";
    case "sets":
      return "Sets";
    default:
      return "Points";
  }
}

// Fonction pour formater la date en français
const formatDate = (dateString: string): string => {
  try {
    if (!dateString) {
      return new Date().toLocaleDateString('fr-FR'); // Date du jour par défaut
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString('fr-FR'); // Date du jour par défaut
    }
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return new Date().toLocaleDateString('fr-FR'); // Date du jour par défaut
  }
};

export default function GestionSports() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [inputNom, setInputNom] = useState("");
  const [inputTypeScore, setInputTypeScore] = useState<TypeScore>("Points");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null); // For dropdown menu
  const [editMode, setEditMode] = useState<number | null>(null); // sport.id en édition
  const [editName, setEditName] = useState<string>('');
  const [editScoreType, setEditScoreType] = useState<TypeScore>("Points");
  const updatingRef = useRef<null | HTMLInputElement>(null);

  const router = useRouter();

  // Fetch la liste des sports depuis l'API
  const fetchSports = async () => {
    setLoading(true);
    setError(null);
    try {
      // On veut bien récupérer la propriété data.items de la réponse FastAPI
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sports?skip=0&limit=100`, { method: "GET", headers: { "Accept": "application/json" } });
      if (!res.ok) throw new Error("Impossible de charger les sports.");
      const data = await res.json();
      // Récupération correcte du tableau des sports
      setSports(Array.isArray(data?.data?.items) ? data.data.items : []);
    } catch (e: any) {
      setError(e?.message || "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSports();
  }, []);

  // Ajout d'un sport (POST)
  const handleAddSport = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    const nom = inputNom.trim();
    if (!nom) {
      setError("Le nom du sport est requis.");
      setAdding(false);
      return;
    }
    // Unicité côté client pour UX
    if (sports.find((s) => s.name.toLowerCase() === nom.toLowerCase())) {
      setError("Ce sport existe déjà.");
      setAdding(false);
      return;
    }
    const score_type_api = uiToApiScoreType(inputTypeScore);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/sports?name=${encodeURIComponent(nom)}&score_type=${encodeURIComponent(
        score_type_api
      )}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || data?.message || "Erreur lors de l'ajout.");
      }
      setInputNom("");
      setInputTypeScore("Points");
      fetchSports();
    } catch (e: any) {
      setError(e?.message || "Erreur d'ajout.");
    } finally {
      setAdding(false);
    }
  };

  // Suppression d'un sport (DELETE)
  const handleRemoveSport = async (sportId: number) => {
    setMenuOpenId(null); // Ferme le menu au clic
    if (!window.confirm("Supprimer ce sport ? Cette action est irréversible.")) {
      return;
    }
    setRemoving(sportId);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sports/${sportId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || data?.message || "Erreur lors de la suppression.");
      }
      fetchSports();
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la suppression.");
    } finally {
      setRemoving(null);
    }
  };

  // Modifie un sport (PUT) -  ${process.env.NEXT_PUBLIC_API_URL}/sports/{sport_id}
  const [updating, setUpdating] = useState<number | null>(null);

  const handleUpdateSport = async (sportId: number, name: string, score_type: ApiScoreType) => {
    setUpdating(sportId);
    setError(null);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/sports/${sportId}?name=${encodeURIComponent(name)}&score_type=${encodeURIComponent(score_type)}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || data?.message || "Erreur lors de la modification.");
      }
      fetchSports();
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
        // Si click hors du menu
        const menus = document.querySelectorAll(".dropdown-sport-menu");
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
    } else {
      document.removeEventListener("mousedown", handleClickOutside, true);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
    // eslint-disable-next-line
  }, [menuOpenId]);

  // Edition inline : focus automatique input quand on passe en edit
  useEffect(() => {
    if (editMode !== null && updatingRef.current) {
      updatingRef.current.focus();
    }
  }, [editMode]);

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Bouton retour en haut à gauche */}
      <button
        onClick={() => router.push("/configuration-coupe")}
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
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Configuration des sports</h1>
        <p className="text-gray-600 text-lg">
          Ajouter ou supprimer des sports pour la Coupe de l'Université
        </p>
      </header>
      <section className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6">
        <form onSubmit={handleAddSport} className="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            type="text"
            value={inputNom}
            placeholder="Nom du sport"
            onChange={(e) => setInputNom(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black placeholder-black"
            disabled={adding}
          />
          <select
            value={inputTypeScore}
            onChange={(e) => setInputTypeScore(e.target.value as TypeScore)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
            disabled={adding}
          >
            {TYPES_SCORE.map((type) => (
              <option key={type.ui} value={type.ui} className="text-black">{type.ui}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300"
            disabled={adding}
          >
            {adding ? "Ajout..." : "Ajouter"}
          </button>
        </form>
        {error && (
          <div className="text-red-600 text-sm mb-3">{error}</div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sport
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type de scores
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Créé le
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                {/* Actions */}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-gray-500 italic text-center">
                  Chargement...
                </td>
              </tr>
            ) : sports.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-gray-500 italic text-center" colSpan={5}>
                  Aucun sport pour le moment.
                </td>
              </tr>
            ) : (
              sports.map((sport) => (
                <tr key={sport.id}>
                  <td className="px-4 py-4 whitespace-nowrap text-lg text-gray-800">
                    {editMode === sport.id ? (
                      <input
                        ref={updatingRef}
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-400"
                        disabled={updating === sport.id}
                      />
                    ) : (
                      sport.name
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                    {sport.id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                    {editMode === sport.id ? (
                      <select
                        value={editScoreType}
                        onChange={e => setEditScoreType(e.target.value as TypeScore)}
                        className="border border-gray-300 rounded px-1 py-1"
                        disabled={updating === sport.id}
                      >
                        {TYPES_SCORE.map(type => (
                          <option key={type.ui} value={type.ui}>{type.ui}</option>
                        ))}
                      </select>
                    ) : (
                      apiToUiScoreType(sport.score_type)
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-600 text-sm">
                    {formatDate(sport.created_at)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center relative">
                    {editMode === sport.id ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setEditMode(null)}
                          className="px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm"
                          type="button"
                          disabled={updating === sport.id}
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => handleUpdateSport(sport.id, editName.trim(), uiToApiScoreType(editScoreType))}
                          className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                          type="button"
                          disabled={updating === sport.id || !editName.trim()}
                        >
                          {updating === sport.id ? "Modif..." : "Valider"}
                        </button>
                      </div>
                    ) : (
                      <div className="relative inline-block dropdown-sport-menu">
                        <button
                          className="p-1 rounded hover:bg-gray-100 focus:outline-none"
                          aria-label="Menu actions"
                          type="button"
                          onClick={e => {
                            // toggle menu for this sport
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === sport.id ? null : sport.id);
                          }}
                          disabled={removing === sport.id}
                        >
                          {/* 3 points vertical */}
                          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                            <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                          </svg>
                        </button>
                        {menuOpenId === sport.id && (
                          <div
                            className="absolute right-0 z-10 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-1 dropdown-sport-menu"
                            tabIndex={-1}
                          >
                            <button
                              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-blue-50 text-sm"
                              onClick={() => {
                                setEditMode(sport.id);
                                setEditName(sport.name);
                                setEditScoreType(apiToUiScoreType(sport.score_type));
                                setMenuOpenId(null);
                              }}
                              type="button"
                            >
                              Modifier
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 text-sm"
                              onClick={() => handleRemoveSport(sport.id)}
                              type="button"
                              disabled={removing === sport.id}
                            >
                              {removing === sport.id ? (
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