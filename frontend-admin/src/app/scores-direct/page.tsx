"use client";

import { useEffect, useState } from "react";

// --- TYPES ---
// Basé sur votre modèle Match dans match.py
interface Team {
  id: number;
  name: string;
  logo_url?: string;
  primary_color?: string;
}

interface TeamSport {
  id: number;
  team?: Team; // Peut être null si non chargé
  team_sport_name?: string; // Nom spécifique si surchargé
}

interface Match {
  id: number;
  match_type: string; // 'qualification', 'pool', 'bracket', etc.
  label?: string; // ex: "Finale", "Poule A - Match 1"
  status: "upcoming" | "in_progress" | "completed" | "cancelled";
  
  // Scores
  score_a: number | null;
  score_b: number | null;
  
  // Infos terrain/horaire
  court?: string;
  time?: string;
  
  // Équipes : Relation via ORM
  team_sport_a?: TeamSport;
  team_sport_b?: TeamSport;
  
  // Équipes : Sources textuelles (fallback)
  team_a_source?: string;
  team_b_source?: string;
}

// --- SOUS-COMPOSANT : ANIMATION DU SCORE ---
// Affiche le score et l'anime (vert + grossissement) quand il change
const LiveScoreDisplay = ({ score }: { score: number | null }) => {
  const [animate, setAnimate] = useState(false);
  const displayScore = score ?? 0;

  useEffect(() => {
    // Déclencher l'animation lors du changement de prop 'score'
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 2000); // Durée 2s
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <span
      className={`transition-all duration-500 font-mono text-3xl font-bold block ${
        animate ? "text-green-400 scale-125" : "text-white scale-100"
      }`}
    >
      {displayScore}
    </span>
  );
};

// --- COMPOSANT PRINCIPAL ---
export default function ScoresDirectPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // URL de l'API (ajustez si nécessaire)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fonction de récupération des données
  const fetchLiveMatches = async () => {
    try {
      // Appel filtré uniquement sur 'in_progress'
      const response = await fetch(`${API_URL}/matches?status=in_progress`);
      
      if (!response.ok) throw new Error("Erreur réseau");
      
      const json = await response.json();
      // On s'assure de récupérer le tableau, peu importe le format de réponse { data: [...] } ou [...]
      const data = json.data ? json.data : (Array.isArray(json) ? json : []);
      
      setMatches(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Erreur fetch live matches:", err);
      // On n'affiche l'erreur que si on n'a jamais chargé de données
      if (matches.length === 0) setError("Impossible de charger les scores en direct.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fonction pour récupérer les données
    const refreshScores = async () => {
      try {
        // On ajoute un paramètre aléatoire (?v=...) pour éviter que le navigateur ne mette la page en cache
        const response = await fetch(`${API_URL}/matches?status=in_progress&v=${Date.now()}`);
        const data = await response.json();
        setMatches(data.data || []);
      } catch (err) {
        console.error("Erreur de rafraîchissement", err);
      }
    };

    // On lance le rafraîchissement immédiatement
    refreshScores();

    // PUIS ON LE LANCE TOUTES LES 3 SECONDES
    const timer = setInterval(refreshScores, 3000);

    return () => clearInterval(timer); // Très important : on arrête le timer si on quitte la page
  }, []);

  // Helper pour déterminer le nom à afficher (Logique Backend match.py)
  const getTeamName = (match: Match, side: "a" | "b") => {
    if (side === "a") {
      // 1. Nom de l'équipe réelle (si liée)
      if (match.team_sport_a?.team?.name) return match.team_sport_a.team.name;
      // 2. Nom spécifique de l'inscription (si défini)
      if (match.team_sport_a?.team_sport_name) return match.team_sport_a.team_sport_name;
      // 3. Source textuelle (ex: "Vainqueur Match 1")
      return match.team_a_source || "Équipe A";
    } else {
      if (match.team_sport_b?.team?.name) return match.team_sport_b.team.name;
      if (match.team_sport_b?.team_sport_name) return match.team_sport_b.team_sport_name;
      return match.team_b_source || "Équipe B";
    }
  };

  // --- RENDU ---
  
  if (loading && matches.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scores en Direct</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mise à jour automatique • Dernière synchro : {lastUpdated?.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center bg-green-50 px-4 py-2 rounded-full border border-green-200 w-fit">
          <span className="relative flex h-3 w-3 mr-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-green-700 font-bold text-sm uppercase tracking-wide">
            Live
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded shadow-sm">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Liste des matchs */}
      {matches.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 text-lg">Aucun match en cours actuellement.</p>
          <p className="text-gray-400 text-sm mt-2">Le live démarrera dès le coup d'envoi du prochain match.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-8">
          {matches.map((match) => (
            <div key={match.id} className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
              
              {/* En-tête avec le Chrono */}
              <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-gray-500">{match.court}</span>
                
                {/* AFFICHAGE DU CHRONO ICI */}
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-mono font-bold bg-black text-green-400 px-3 py-1 rounded shadow-inner">
                    {match.time} {/* C'est ici que s'affichera "09:45" au lieu de "11:04" */}
                  </span>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
              </div>
              {/* Barre supérieure : Terrain & Type */}
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center text-xs text-gray-500 uppercase font-semibold tracking-wider">
                <span>{match.label || match.match_type}</span>
                <span className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  {match.court || "Terrain principal"}
                </span>
              </div>

              {/* Contenu principal : Scoreboard */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  {/* Équipe A (Gauche) */}
                  <div className="flex-1 w-full text-center md:text-right order-2 md:order-1">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">
                      {getTeamName(match, "a")}
                    </h3>
                    <div className="mt-1 hidden md:block w-12 h-1 bg-gray-200 ml-auto rounded"></div>
                  </div>

                  {/* SCORE CENTRAL (Milieu) */}
                  <div className="order-1 md:order-2 bg-gray-900 text-white px-8 py-4 rounded-xl shadow-inner min-w-[160px] flex items-center justify-center gap-4 border border-gray-700">
                    <LiveScoreDisplay score={match.score_a} />
                    <span className="text-gray-500 text-2xl font-light opacity-50">:</span>
                    <LiveScoreDisplay score={match.score_b} />
                  </div>

                  {/* Équipe B (Droite) */}
                  <div className="flex-1 w-full text-center md:text-left order-3 md:order-3">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">
                      {getTeamName(match, "b")}
                    </h3>
                    <div className="mt-1 hidden md:block w-12 h-1 bg-gray-200 mr-auto rounded"></div>
                  </div>

                </div>
              </div>
              
              {/* Pied de carte : Statut */}
              <div className="bg-green-50 px-4 py-2 border-t border-green-100 flex justify-center">
                <span className="text-xs font-bold text-green-700 flex items-center animate-pulse">
                  EN COURS DE JEU
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}