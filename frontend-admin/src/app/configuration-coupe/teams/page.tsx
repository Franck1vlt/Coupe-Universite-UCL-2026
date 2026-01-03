"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Types pour les équipes côté UI et API
type Team = {
  id: number;
  name: string;
  color: string;
  logo_url: string;
  created_at: string;
};

const DEFAULT_LOGO = "/img/no-logo.png"; // Image par défaut à prévoir dans /public/img/

// Cette fonction adapte le logo_url pour utiliser le dossier public/img local si besoin
function resolveLogoUrl(logoUrl: string | null | undefined): string {
  if (!logoUrl || logoUrl.trim() === "") return DEFAULT_LOGO;
  // Si commence déjà par /img/, on considère que c'est le bon chemin
  if (logoUrl.startsWith("/img/")) return logoUrl;
  // Si commence par img/, corrige pour bien être /img/
  if (logoUrl.startsWith("img/")) return `/${logoUrl}`;
  // Si c'est juste un nom genre "junia.png", alors on veut "/img/junia.png"
  if (!logoUrl.startsWith("/")) return `/img/${logoUrl}`;
  // Fallback (autre format ?)
  return logoUrl;
}

// Génère l'url du logo automatiquement à partir du nom d'école
function computeLogoUrlFromName(name: string): string {
  if (!name) return DEFAULT_LOGO;
  // Nettoie le nom : trim, retire accents, espaces → tirets, minuscules, caractères spéciaux retirés sauf tirets/underscores
  let cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire accents
    .trim()
    .replace(/\s+/g, "-") // espaces en tirets
    .replace(/[^a-zA-Z0-9\-_]/g, "") // caractères spéciaux retirés
    .toLowerCase();
  return `/img/${cleaned}.png`;
}

export default function GestionTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [inputName, setInputName] = useState("");
  const [inputColor, setInputColor] = useState("");

  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editColor, setEditColor] = useState<string>("");
  const [updating, setUpdating] = useState<number | null>(null);
  const updatingRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  // Charger les équipes depuis l'API (couleur => primary_color)
  const fetchTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/teams?skip=0&limit=100", { method: "GET", headers: { "Accept": "application/json" } });
      if (!res.ok) throw new Error("Impossible de charger les équipes.");
      const data = await res.json();

      // Remappe chaque team pour utiliser `primary_color` (API) comme `color` (UI)
      const items = Array.isArray(data?.data?.items) ? data.data.items : [];
      setTeams(
        items.map((t: any) => ({
          ...t,
          color: t.primary_color ?? "",
          logo_url: t.logo_url ?? computeLogoUrlFromName(t.name ?? ""), // Ajout d'un fallback
        }))
      );
    } catch (e: any) {
      setError(e?.message || "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // Suppression d'une équipe (DELETE)
  const handleRemoveTeam = async (teamId: number) => {
    setMenuOpenId(null);
    if (!window.confirm("Supprimer cette équipe ? Cette action est irréversible.")) {
      return;
    }
    setRemoving(teamId);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/teams/${teamId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data?.error?.message || data?.message || "Erreur lors de la suppression.");
      }
      fetchTeams();
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la suppression.");
    } finally {
      setRemoving(null);
    }
  };

  // Gestion dropdown extérieur : refermer le menu si clic hors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuOpenId !== null) {
        // Si click hors du menu
        const menus = document.querySelectorAll(".dropdown-team-menu");
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
    // eslint-disable-next-line
  }, [menuOpenId]);

  // Edition inline : auto-focus input
  useEffect(() => {
    if (editMode !== null && updatingRef.current) {
      updatingRef.current.focus();
    }
  }, [editMode]);

  // Gestion modification champ couleur à la volée (string)
  function handleColorInput(e: React.ChangeEvent<HTMLInputElement>) {
    setInputColor(e.target.value);
  }

  function handleEditColorInput(e: React.ChangeEvent<HTMLInputElement>) {
    setEditColor(e.target.value);
  }

  // Ajout d'équipe (logo automatiquement renseigné dans l'URL)
  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);

    const nom = inputName.trim();
    const color = inputColor.trim();

    if (!nom) {
      setError("Le nom de l'école est requis.");
      setAdding(false);
      return;
    }
    if (teams.find((t) => t.name.toLowerCase() === nom.toLowerCase())) {
      setError("Cette équipe existe déjà.");
      setAdding(false);
      return;
    }
    if (!color) {
      setError("Veuillez entrer la couleur (nom ou code couleur).");
      setAdding(false);
      return;
    }

    try {
      // On construit automatiquement l'URL du logo à partir du nom
      const logoUrl = computeLogoUrlFromName(nom);

      // On ajoute le champ logo_url explicitement dans la requête
      const url = `http://localhost:8000/teams?name=${encodeURIComponent(nom)}&primary_color=${encodeURIComponent(color)}&logo_url=${encodeURIComponent(logoUrl)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json" }
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data?.error?.message || data?.message || "Erreur lors de l'ajout.");
      }

      // Reset
      setInputName("");
      setInputColor("");
      await fetchTeams();
    } catch (e: any) {
      setError(e?.message || "Erreur d'ajout.");
    } finally {
      setAdding(false);
    }
  };

  // Fonction de modification (on garde la gestion logo à jour si le nom change)
  const handleUpdateTeam = async (team: Team, name: string, color: string) => {
    setUpdating(team.id);
    setError(null);

    const colorName = color.trim();
    if (!colorName) {
      setError("Veuillez saisir une couleur.");
      setUpdating(null);
      return;
    }
    if (!name.trim()) {
      setError("Veuillez saisir le nom de l'école.");
      setUpdating(null);
      return;
    }

    try {
      // Recalcule l'URL du logo si le nom a changé (toujours synchronisé sur le nom)
      const logoUrl = computeLogoUrlFromName(name.trim());

      const url = `http://localhost:8000/teams/${team.id}`;
      const payload = {
        name: name.trim(),
        primary_color: colorName,
        logo_url: logoUrl,
      };

      const res = await fetch(url, {
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

      await fetchTeams();
      setEditMode(null);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la modification.");
    } finally {
      setUpdating(null);
    }
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
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Configuration des équipes/écoles</h1>
        <p className="text-gray-600 text-lg">
          Ajouter ou supprimer des équipes pour la Coupe de l'Université
        </p>
      </header>
      <section className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6">
        <form onSubmit={handleAddTeam} className="flex flex-col md:flex-row gap-2 mb-6 items-start">
          <div className="flex flex-col gap-1 flex-1">
            <input
              type="text"
              value={inputName}
              placeholder="Nom de l'école"
              onChange={e => setInputName(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black placeholder-black"
              disabled={adding}
              required
            />
          </div>
          {/* Champ couleur sous forme texte */}
          <div className="flex flex-col gap-1 min-w-[116px]">
            <div className="flex items-center gap-2">
              <input
                id="input-color-code"
                type="text"
                value={inputColor}
                onChange={handleColorInput}
                placeholder="Couleur"
                maxLength={32}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black placeholder-black"
                disabled={adding}
                required
              />
            </div>
          </div>
          {/* Plus d'info logo */}
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
              {/* Ajout de la colonne Logo */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom de l'école</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Couleur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créé le</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-gray-500 italic text-center">
                  Chargement...
                </td>
              </tr>
            ) : teams.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-gray-500 italic text-center" colSpan={5}>
                  Aucune équipe pour le moment.
                </td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr key={team.id}>
                  {/* Colonne Logo affiché sans preview édition */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <img
                      src={resolveLogoUrl(team.logo_url)}
                      alt={team.name}
                      className="h-8 w-8 object-contain border bg-gray-100 rounded"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO }}
                    />
                  </td>
                  {/* Nom de l'école */}
                  <td className="px-4 py-4 whitespace-nowrap text-lg text-gray-800">
                    {editMode === team.id ? (
                      <input
                        ref={updatingRef}
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-400"
                        disabled={updating === team.id}
                        required
                      />
                    ) : (
                      team.name
                    )}
                  </td>
                  {/* Couleur */}
                  <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                    {editMode === team.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editColor}
                          onChange={handleEditColorInput}
                          maxLength={32}
                          placeholder="Couleur"
                          className="border border-gray-300 rounded-lg px-2 py-1 text-black w-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          disabled={updating === team.id}
                          required
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-mono text-gray-700">{team.color}</span>
                    )}
                  </td>
                  {/* Date de création */}
                  <td className="px-4 py-4 whitespace-nowrap text-gray-600 text-sm">
                    {team.created_at
                      ? (() => {
                          try {
                            const d = new Date(team.created_at);
                            return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("fr-FR");
                          } catch {
                            return "-";
                          }
                        })()
                      : "-"}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-4 whitespace-nowrap text-center relative">
                    {editMode === team.id ? (
                      <div className="flex flex-col gap-2 items-center">
                        {/* Pas de preview logo ici, simple validation/annulation */}
                        <div className="flex gap-2 justify-center mt-2">
                          <button
                            onClick={() => {
                              setEditMode(null);
                            }}
                            className="px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm"
                            type="button"
                            disabled={updating === team.id}
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleUpdateTeam(team, editName.trim(), editColor)}
                            className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                            type="button"
                            disabled={updating === team.id || !editName.trim() || !editColor.trim()}
                          >
                            {updating === team.id ? "Modif..." : "Valider"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative inline-block dropdown-team-menu">
                        <button
                          className="p-1 rounded hover:bg-gray-100 focus:outline-none"
                          aria-label="Menu actions"
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === team.id ? null : team.id);
                          }}
                          disabled={removing === team.id}
                        >
                          {/* 3 points vertical */}
                          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                            <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                          </svg>
                        </button>
                        {menuOpenId === team.id && (
                          <div
                            className="absolute right-0 z-10 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 dropdown-team-menu"
                            tabIndex={-1}
                          >
                            <button
                              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-blue-50 text-sm"
                              onClick={() => {
                                setEditMode(team.id);
                                setEditName(team.name);
                                setEditColor(team.color || "Bleu");
                                setMenuOpenId(null);
                              }}
                              type="button"
                            >
                              Modifier
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 text-sm"
                              onClick={() => handleRemoveTeam(team.id)}
                              type="button"
                              disabled={removing === team.id}
                            >
                              {removing === team.id ? (
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