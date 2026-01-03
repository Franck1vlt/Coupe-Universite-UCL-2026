"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Types pour les sports
type ApiScoreType = "points" | "goals" | "sets";
type Sport = {
  id: number;
  name: string;
  score_type: ApiScoreType;
  created_at?: string;
};

// Fonction pour formater le type de score en français
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

export default function ChoixSport() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch la liste des sports depuis l'API
  const fetchSports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/sports?skip=0&limit=100", { 
        method: "GET", 
        headers: { "Accept": "application/json" } 
      });
      if (!res.ok) throw new Error("Impossible de charger les sports.");
      const data = await res.json();
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

      <header className="mb-12 text-center">
        <img
          src="/img/coupe.png"
          alt="Logo Coupe Universitaire"
          className="mx-auto mb-6 h-24 w-24 object-contain"
        />
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Choisir un sport</h1>
        <p className="text-gray-600 text-lg">
          Sélectionnez un sport pour accéder au tournoi correspondant.
        </p>
      </header>

      <section className="w-full max-w-4xl">
        {error && (
          <div className="text-red-600 text-sm mb-6 text-center bg-red-50 p-4 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500 italic text-center text-lg">
            Chargement des sports...
          </div>
        ) : sports.length === 0 ? (
          <div className="text-gray-500 italic text-center text-lg">
            Aucun sport disponible pour le moment.
            <br />
            <Link 
              href="/configuration-coupe/sports" 
              className="text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
            >
              Créer un sport
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sports.map((sport) => (
              <Link
                key={sport.id}
                href={`/tournoi/${sport.id}`}
                className="group"
              >
                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-blue-200">
                  <div className="flex flex-col items-center text-center">
                    {/* Icône du sport */}
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                      <svg 
                        className="w-8 h-8 text-blue-600" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M13 10V3L4 14h7v7l9-11h-7z" 
                        />
                      </svg>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                      {sport.name}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-3">
                      Type de score : {formatScoreType(sport.score_type)}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Sport #{sport.id}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
