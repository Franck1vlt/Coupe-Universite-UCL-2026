"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type ApiScoreType = "points" | "goals" | "sets";

type Sport = {
  id: number;
  name: string;
  score_type: ApiScoreType;
  created_at?: string;
};

const formatScoreType = (scoreType: ApiScoreType): string => {
  switch (scoreType) {
    case "points":
      return "Points";
    case "goals":
      return "Buts";
    case "sets":
      return "Sets";
    default:
      return "Points";
  }
};

export default function TournamentScoringChoicePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sport, setSport] = useState<Sport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSport = async (sportId: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:8000/sports/${sportId}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Sport introuvable");
        const data = await res.json();
        setSport(data.data as Sport);
      } catch (e: any) {
        setError(e?.message || "Erreur lors du chargement du sport.");
      } finally {
        setLoading(false);
      }
    };

    const id = params?.id;
    if (typeof id === "string") {
      fetchSport(id);
    }
  }, [params]);

  const goToScoringPage = () => {
    if (!sport) return;

    const name = sport.name.toLowerCase();
    const matchId = searchParams.get("matchId");

    if (name.includes("badminton")) {
      // Pour l'instant on ignore matchId, mais il pourra être
      // utilisé plus tard pour charger la bonne feuille.
      router.push("/table-marquage/badminton");
      return;
    }

    // TODO: ajouter ici les autres mappings (football, volley, etc.)

    alert(
      "La table de marquage spécifique pour ce sport n'est pas encore configurée."
    );
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Bouton retour */}
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

      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {loading
            ? "Chargement..."
            : sport
            ? `Table de marquage - ${sport.name}`
            : "Table de marquage"}
        </h1>
        {sport && (
          <p className="text-gray-600 text-sm">
            Type de score : {formatScoreType(sport.score_type)}
          </p>
        )}
        {!loading && error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </header>

      <section className="w-full max-w-xl">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 flex flex-col gap-4 items-center text-center">
          <p className="text-gray-600 text-sm mb-4">
            Cette page vous redirige vers la table de marquage adaptée au sport sélectionné.
          </p>

          <button
            onClick={goToScoringPage}
            disabled={loading || !!error}
            className="w-full px-4 py-3 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Aller à la table de marquage
          </button>

          <div className="mt-4 text-xs text-gray-500">
            💡 Aujourd'hui, seul le badminton est branché automatiquement
            (redirection vers /table-marquage/badminton). Les autres sports
            pourront être ajoutés ici au fur et à mesure.
          </div>
        </div>
      </section>
    </main>
  );
}
