"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Type pour un Terrain (Court)
type Court = {
  id: number;
  name: string;
  sport_id: number | null;
  is_active: boolean;
};

/**
 * Cette page sert à la configuration/gestion des terrains (courts) pour la compétition.
 * L'API n'étant pas terminée, il n'y a pas de persistance ni appel serveur.
 * Les opérations sont donc faites en local sur une liste simulée ("fake" state).
 */

export default function GestionCourts() {
  // Remplacement du state "Team" par "Court"
  const [courts, setCourts] = useState<Court[]>([]);
  const [inputName, setInputName] = useState("");
  const [inputSportId, setInputSportId] = useState<string>(""); // Utilisé comme chaîne pour pouvoir saisir vide/null
  const [inputIsActive, setInputIsActive] = useState(true);

  const [loading, setLoading] = useState(false); // Faux loading pour garder le gabarit
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editSportId, setEditSportId] = useState<string>("");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const updatingRef = useRef<HTMLInputElement>(null);

  // Pour router.back()
  const router = useRouter();

  // Simule fetch/chargement initial (en mémoire locale)
  useEffect(() => {
    setLoading(true);
    // Simulation de terrain par défaut (seulement à titre d'exemple)
    setTimeout(() => {
      setCourts([
        { id: 1, name: "Stade Principal", sport_id: null, is_active: true },
        { id: 2, name: "Terrain B Basket", sport_id: 3, is_active: true },
        { id: 3, name: "Salle Omnisports", sport_id: null, is_active: false },
      ]);
      setLoading(false);
    }, 400);
  }, []);

  // Drodpown fermeture auto menu si clic extérieur
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
    return () =>
      document.removeEventListener("mousedown", handleClickOutside, true);
  }, [menuOpenId]);

  // Autofocus sur input quand edit
  useEffect(() => {
    if (editMode !== null && updatingRef.current) {
      updatingRef.current.focus();
    }
  }, [editMode]);

  // Handlers pour ajouter un terrain en local
  const handleAddCourt = (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);

    const name = inputName.trim();
    // sport_id nullable, peut être vide
    const sportIdNum =
      inputSportId.trim() === "" ? null : Number(inputSportId.trim());

    if (!name) {
      setError("Le nom du terrain est requis.");
      setAdding(false);
      return;
    }
    if (
      courts.find(
        (t) => t.name.trim().toLowerCase() === name.toLowerCase()
      )
    ) {
      setError("Ce terrain existe déjà.");
      setAdding(false);
      return;
    }

    // Simule ajout local
    setCourts((old) =>
      old.concat({
        id:
          old.length > 0 ? Math.max(...old.map((c) => c.id)) + 1 : 1,
        name,
        sport_id: sportIdNum,
        is_active: inputIsActive,
      })
    );
    setInputName("");
    setInputSportId("");
    setInputIsActive(true);
    setAdding(false);
  };

  // Handler remove court (simulation locale)
  const handleRemoveCourt = (courtId: number) => {
    setMenuOpenId(null);
    if (
      !window.confirm("Supprimer ce terrain ? Cette action est irréversible.")
    ) {
      return;
    }
    setRemoving(courtId);
    setCourts((prev) => prev.filter((c) => c.id !== courtId));
    setRemoving(null);
  };

  // Handler pour démarrer édition (remplit les champs)
  const startEditCourt = (court: Court) => {
    setEditMode(court.id);
    setEditName(court.name);
    setEditSportId(
      court.sport_id !== null && court.sport_id !== undefined
        ? String(court.sport_id)
        : ""
    );
    setEditIsActive(court.is_active);
    setMenuOpenId(null);
  };

  // Handler edit submit (simulation locale)
  const handleUpdateCourt = (court: Court) => {
    setUpdating(court.id);
    setError(null);
    const name = editName.trim();
    const sportIdNum =
      editSportId.trim() === "" ? null : Number(editSportId.trim());

    if (!name) {
      setError("Le nom du terrain est requis.");
      setUpdating(null);
      return;
    }
    // Vérifie unicité hors l'objet en cours d'édition
    if (
      courts.find(
        (t) =>
          t.id !== court.id &&
          t.name.trim().toLowerCase() === name.toLowerCase()
      )
    ) {
      setError("Un autre terrain porte déjà ce nom.");
      setUpdating(null);
      return;
    }
    setCourts((prev) =>
      prev.map((c) =>
        c.id === court.id
          ? { ...c, name, sport_id: sportIdNum, is_active: editIsActive }
          : c
      )
    );
    setEditMode(null);
    setUpdating(null);
  };

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
          Configuration des terrains (courts)
        </h1>
        <p className="text-gray-600 text-lg">
          Ajouter, modifier ou désactiver/activer les terrains sportifs utilisés.
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
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black placeholder-black"
              disabled={adding}
              required
            />
          </div>
          {/* Champ sport_id optionnel */}
          <div className="flex flex-col gap-1 min-w-[116px]">
            <input
              type="number"
              min="1"
              value={inputSportId}
              onChange={(e) => setInputSportId(e.target.value)}
              placeholder="Sport ID (facultatif)"
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black placeholder-black"
              disabled={adding}
            />
          </div>
          {/* Champ actif (checkbox) */}
          <div className="flex flex-col gap-1 min-w-[90px]">
            <label className="flex items-center gap-1 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={inputIsActive}
                onChange={(e) => setInputIsActive(e.target.checked)}
                disabled={adding}
              />
              Actif
            </label>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300"
            disabled={adding}
          >
            {adding ? "Ajout..." : "Ajouter"}
          </button>
        </form>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nom du terrain
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sport ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Statut
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-gray-500 italic text-center">
                  Chargement...
                </td>
              </tr>
            ) : courts.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-gray-500 italic text-center" colSpan={4}>
                  Aucun terrain pour le moment.
                </td>
              </tr>
            ) : (
              courts.map((court) => (
                <tr key={court.id}>
                  {/* Nom du terrain */}
                  <td className="px-4 py-4 whitespace-nowrap text-lg text-gray-800">
                    {editMode === court.id ? (
                      <input
                        ref={updatingRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-400"
                        disabled={updating === court.id}
                        required
                      />
                    ) : (
                      court.name
                    )}
                  </td>
                  {/* Sport ID */}
                  <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                    {editMode === court.id ? (
                      <input
                        type="number"
                        min="1"
                        value={editSportId}
                        onChange={(e) => setEditSportId(e.target.value)}
                        placeholder="(optionnel)"
                        className="border border-gray-300 rounded-lg px-2 py-1 text-black w-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        disabled={updating === court.id}
                      />
                    ) : court.sport_id !== null && court.sport_id !== undefined ? (
                      <span className="text-sm font-mono text-gray-700">{court.sport_id}</span>
                    ) : (
                      <span className="text-xs italic text-gray-400">Polyvalent</span>
                    )}
                  </td>
                  {/* Statut actif */}
                  <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                    {editMode === court.id ? (
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          disabled={updating === court.id}
                        />
                        {editIsActive ? (
                          <span className="text-green-600 font-semibold">Actif</span>
                        ) : (
                          <span className="text-red-500 font-semibold">Hors service</span>
                        )}
                      </label>
                    ) : court.is_active ? (
                      <span className="text-green-600 font-semibold">Actif</span>
                    ) : (
                      <span className="text-red-500 font-semibold">Hors service</span>
                    )}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-4 whitespace-nowrap text-center relative">
                    {editMode === court.id ? (
                      <div className="flex flex-col gap-2 items-center">
                        <div className="flex gap-2 justify-center mt-2">
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
                            onClick={() => handleUpdateCourt(court)}
                            className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                            type="button"
                            disabled={updating === court.id || !editName.trim()}
                          >
                            {updating === court.id ? "Modif..." : "Valider"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative inline-block dropdown-court-menu">
                        <button
                          className="p-1 rounded hover:bg-gray-100 focus:outline-none"
                          aria-label="Menu actions"
                          type="button"
                          onClick={(e) => {
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
                              onClick={() => startEditCourt(court)}
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