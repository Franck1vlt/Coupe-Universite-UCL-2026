"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

// Types
type Sport = {
  id: number;
  name: string;
  score_type: string;
  created_at?: string;
};

type MatchType = "qualifications" | "poule" | "huitiemes" | "quarts" | "demi-finale" | "finale" | "petite-finale";
type MatchStatus = "planifié" | "en-cours" | "terminé" | "annulé";

type Match = {
  id: string;
  teamA: string;
  teamB: string;
  date: string;
  time: string;
  court: string;
  status: MatchStatus;
  duration: number; // en minutes
  type: MatchType;
  scoreA?: number;
  scoreB?: number;
  position: { x: number; y: number };
  // Pour les poules
  isPoolContainer?: boolean;
  poolTeams?: string[];
  poolMatches?: string[]; // IDs des matchs de la poule
};

type Pool = {
  id: string;
  name: string;
  teams: string[];
  matches: Match[];
  position: { x: number; y: number };
};

type Team = {
  id: string;
  name: string;
};

type Court = {
  id: string;
  name: string;
};

export default function TournamentsPage() {
  const router = useRouter();
  const params = useParams();
  const [sport, setSport] = useState<Sport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedPoolMatch, setSelectedPoolMatch] = useState<Match | null>(null);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [draggedMatch, setDraggedMatch] = useState<string | null>(null);
  const [isDraggingFromPalette, setIsDraggingFromPalette] = useState(false);

  // Récupérer les équipes depuis l'API
  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch("http://localhost:8000/teams?skip=0&limit=100", {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) throw new Error("Impossible de charger les équipes");
      const data = await res.json();
      const teamsData = Array.isArray(data?.data?.items) ? data.data.items : [];
      setTeams(teamsData.map((team: any) => ({
        id: team.id.toString(),
        name: team.name
      })));
    } catch (error) {
      console.error("Erreur lors du chargement des équipes:", error);
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  // Récupérer les terrains depuis l'API
  const fetchCourts = async () => {
    setLoadingCourts(true);
    try {
      const res = await fetch("http://localhost:8000/courts?skip=0&limit=100", {
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

  // Charger les données initiales
  useEffect(() => {
    fetchTeams();
    fetchCourts();
    
    // Données factices pour les matchs de démo
    setMatches([
      {
        id: "1",
        teamA: "",
        teamB: "",
        date: "2026-01-10",
        time: "10:00",
        court: "",
        status: "planifié",
        duration: 90,
        type: "poule",
        position: { x: 100, y: 100 }
      },
      {
        id: "2",
        teamA: "",
        teamB: "",
        date: "2026-01-10",
        time: "12:00",
        court: "",
        status: "planifié",
        duration: 90,
        type: "poule",
        position: { x: 400, y: 100 }
      }
    ]);
  }, []);

  // Récupérer le sport par son ID
  const fetchSport = async (sportId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/sports/${sportId}`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) throw new Error("Sport introuvable");
      const data = await res.json();
      setSport(data.data);
    } catch (error) {
      console.error("Erreur lors du chargement du sport:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id && typeof params.id === 'string') {
      fetchSport(params.id);
    }
  }, [params.id]);

  const addNewMatchFromPalette = (type: MatchType, x: number, y: number) => {
    if (type === "poule") {
      // Créer une nouvelle poule
      const newPool: Pool = {
        id: Date.now().toString(),
        name: `Poule ${pools.length + 1}`,
        teams: [],
        matches: [],
        position: { x: Math.max(0, x - 150), y: Math.max(0, y - 100) }
      };
      setPools([...pools, newPool]);
      setSelectedPool(newPool);
      setSelectedMatch(null);
    } else {
      // Créer un match normal
      const newMatch: Match = {
        id: Date.now().toString(),
        teamA: "",
        teamB: "",
        date: "",
        time: "",
        court: "",
        status: "planifié",
        duration: type === "finale" || type === "demi-finale" ? 120 : 90,
        type: type,
        position: { x: Math.max(0, x - 144), y: Math.max(0, y - 80) }
      };
      setMatches([...matches, newMatch]);
      setSelectedMatch(newMatch);
      setSelectedPool(null);
    }
  };

  const handlePaletteDragStart = (e: React.DragEvent, matchType: MatchType) => {
    e.dataTransfer.setData("text/plain", matchType);
    e.dataTransfer.effectAllowed = "move";
    setIsDraggingFromPalette(true);
  };

  const handlePaletteDragEnd = () => {
    setIsDraggingFromPalette(false);
  };

  const updateMatch = (updatedMatch: Match) => {
    setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
    setSelectedMatch(updatedMatch);
  };

  const updatePoolMatch = (updatedMatch: Match) => {
    const pool = pools.find(p => p.matches.some(m => m.id === updatedMatch.id));
    if (pool) {
      const updatedPool = {
        ...pool,
        matches: pool.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m)
      };
      updatePool(updatedPool);
      setSelectedPoolMatch(updatedMatch);
    }
  };

  const updatePool = (updatedPool: Pool) => {
    setPools(pools.map(p => p.id === updatedPool.id ? updatedPool : p));
    setSelectedPool(updatedPool);
  };

  const addTeamToPool = (poolId: string, teamName: string) => {
    const pool = pools.find(p => p.id === poolId);
    if (pool && !pool.teams.includes(teamName)) {
      const updatedPool = {
        ...pool,
        teams: [...pool.teams, teamName]
      };
      updatePool(updatedPool);
      generatePoolMatches(updatedPool);
    }
  };

  const removeTeamFromPool = (poolId: string, teamName: string) => {
    const pool = pools.find(p => p.id === poolId);
    if (pool) {
      const updatedPool = {
        ...pool,
        teams: pool.teams.filter(t => t !== teamName)
      };
      updatePool(updatedPool);
      generatePoolMatches(updatedPool);
    }
  };

  const generatePoolMatches = (pool: Pool) => {
    if (pool.teams.length < 2) return;

    const newMatches: Match[] = [];
    for (let i = 0; i < pool.teams.length; i++) {
      for (let j = i + 1; j < pool.teams.length; j++) {
        newMatches.push({
          id: `${pool.id}-${i}-${j}`,
          teamA: pool.teams[i],
          teamB: pool.teams[j],
          date: "",
          time: "",
          court: "",
          status: "planifié",
          duration: 90,
          type: "poule",
          position: { x: 0, y: 0 }
        });
      }
    }
    
    const updatedPool = {
      ...pool,
      matches: newMatches
    };
    updatePool(updatedPool);
  };

  const deleteMatch = (matchId: string) => {
    setMatches(matches.filter(m => m.id !== matchId));
    setSelectedMatch(null);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedMatch(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFromPalette(false);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Vérifier si c'est un drag depuis la palette
    const paletteData = e.dataTransfer.getData("text/plain");
    if (paletteData && (paletteData === "poule" || paletteData === "qualifications" || paletteData === "finale" || paletteData === "demi-finale" || paletteData === "quarts" || paletteData === "huitiemes" || paletteData === "petite-finale")) {
      addNewMatchFromPalette(paletteData as MatchType, x, y);
      return;
    }

    // Sinon, c'est un déplacement d'élément existant
    if (!draggedMatch) return;
    
    // Vérifier si c'est une poule
    const pool = pools.find(p => p.id === draggedMatch);
    if (pool) {
      setPools(pools.map(p => 
        p.id === draggedMatch 
          ? { ...p, position: { x, y } }
          : p
      ));
    } else {
      // C'est un match
      setMatches(matches.map(match => 
        match.id === draggedMatch 
          ? { ...match, position: { x, y } }
          : match
      ));
    }
    setDraggedMatch(null);
  };

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case "planifié": return "bg-blue-100 text-blue-800";
      case "en-cours": return "bg-yellow-100 text-yellow-800";
      case "terminé": return "bg-green-100 text-green-800";
      case "annulé": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: MatchType) => {
    switch (type) {
      case "poule": return "bg-purple-100 text-purple-800";
      case "qualifications": return "bg-indigo-100 text-indigo-800";
      case "huitiemes": return "bg-orange-100 text-orange-800";
      case "quarts": return "bg-amber-100 text-amber-800";
      case "demi-finale": return "bg-red-100 text-red-800";
      case "finale": return "bg-yellow-100 text-yellow-800";
      case "petite-finale": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixe */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
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
        
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">
                {loading ? "Chargement..." : sport ? `Tournoi ${sport.name}` : "Tournoi introuvable"}
              </h1>
              <p className="text-sm text-gray-500">Configuration des matchs</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">
              Glissez une tuile depuis la palette pour créer un match
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Zone principale - Canvas des matchs */}
        <div 
          className={`flex-1 relative bg-gray-100 overflow-auto ${isDraggingFromPalette ? 'bg-blue-50' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDrop={handleDrop}
        >
          <div className="absolute inset-0 bg-dot-pattern opacity-30"></div>
          
          {/* Grille de fond */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>

          {/* Tuiles de matchs */}
          {matches.map((match) => (
            <div
              key={match.id}
              draggable
              onDragStart={(e) => handleDragStart(e, match.id)}
              onClick={() => setSelectedMatch(match)}
              className={`absolute bg-white rounded-lg shadow-lg border-2 p-4 w-72 cursor-move transition-all hover:shadow-xl ${
                selectedMatch?.id === match.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
              style={{
                left: match.position.x,
                top: match.position.y,
                minHeight: '160px'
              }}
            >
              {/* Header du match */}
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(match.type)}`}>
                  {match.type.charAt(0).toUpperCase() + match.type.slice(1)}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(match.status)}`}>
                  {match.status}
                </span>
              </div>

              {/* Équipes */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-gray-900">
                    {match.teamA || "Équipe A"}
                  </span>
                  {match.scoreA !== undefined && (
                    <span className="text-lg font-bold text-gray-900">{match.scoreA}</span>
                  )}
                </div>
                <div className="text-center text-xs text-gray-500 my-1">VS</div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">
                    {match.teamB || "Équipe B"}
                  </span>
                  {match.scoreB !== undefined && (
                    <span className="text-lg font-bold text-gray-900">{match.scoreB}</span>
                  )}
                </div>
              </div>

              {/* Informations du match */}
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {match.date && match.time ? `${match.date} à ${match.time}` : "Date/heure non définie"}
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {match.court || "Terrain non défini"}
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {match.duration} min
                </div>
              </div>
            </div>
          ))}

          {/* Tuiles de poules */}
          {pools.map((pool) => (
            <div
              key={pool.id}
              draggable
              onDragStart={(e) => handleDragStart(e, pool.id)}
              onClick={() => {setSelectedPool(pool); setSelectedMatch(null);}}
              className={`absolute bg-white rounded-lg shadow-lg border-2 p-4 w-80 cursor-move transition-all hover:shadow-xl ${
                selectedPool?.id === pool.id ? 'border-purple-500 ring-2 ring-purple-200' : 'border-purple-200'
              }`}
              style={{
                left: pool.position.x,
                top: pool.position.y,
                minHeight: '200px'
              }}
            >
              {/* Header de la poule */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
                  {pool.name}
                </span>
                <span className="text-xs text-gray-500">{pool.teams.length} équipes</span>
              </div>

              {/* Équipes de la poule */}
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-700 mb-2">Équipes :</div>
                {pool.teams.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {pool.teams.map((team, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-gray-100 rounded">
                        {team}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Aucune équipe sélectionnée</div>
                )}
              </div>

              {/* Matchs générés */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Matchs : {pool.matches.length}
                </div>
                {pool.matches.length > 0 ? (
                  <div className="space-y-1">
                    {pool.matches.slice(0, 3).map((match, index) => (
                      <div 
                        key={index} 
                        className="text-xs text-gray-600 flex justify-between p-1 rounded hover:bg-purple-50 cursor-pointer transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPoolMatch(match);
                          setSelectedMatch(null);
                          setSelectedPool(null);
                        }}
                      >
                        <span>{match.teamA} vs {match.teamB}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${getStatusColor(match.status)}`}>
                          {match.status}
                        </span>
                      </div>
                    ))}
                    {pool.matches.length > 3 && (
                      <div 
                        className="text-xs text-purple-600 italic cursor-pointer hover:text-purple-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPool(pool);
                          setSelectedMatch(null);
                          setSelectedPoolMatch(null);
                        }}
                      >
                        +{pool.matches.length - 3} autres matchs... (cliquez pour voir tous)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Ajoutez des équipes pour générer les matchs</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Panel de configuration à droite */}
        {selectedMatch && (
          <div className="w-80 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Configuration du match</h3>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Équipes */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Équipe A</label>
                {loadingTeams ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des équipes...</div>
                ) : (
                  <select
                    value={selectedMatch.teamA}
                    onChange={(e) => updateMatch({...selectedMatch, teamA: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="">Sélectionner une équipe</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.name}>{team.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Équipe B</label>
                {loadingTeams ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des équipes...</div>
                ) : (
                  <select
                    value={selectedMatch.teamB}
                    onChange={(e) => updateMatch({...selectedMatch, teamB: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="">Sélectionner une équipe</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.name}>{team.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date et heure */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedMatch.date}
                    onChange={(e) => updateMatch({...selectedMatch, date: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Heure</label>
                  <input
                    type="time"
                    value={selectedMatch.time}
                    onChange={(e) => updateMatch({...selectedMatch, time: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
              </div>

              {/* Terrain */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Terrain</label>
                {loadingCourts ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des terrains...</div>
                ) : (
                  <select
                    value={selectedMatch.court}
                    onChange={(e) => updateMatch({...selectedMatch, court: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="">Sélectionner un terrain</option>
                    {courts.map(court => (
                      <option key={court.id} value={court.name}>{court.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Type de match */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Type de match</label>
                <select
                  value={selectedMatch.type}
                  onChange={(e) => updateMatch({...selectedMatch, type: e.target.value as MatchType})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="qualifications">Qualifications</option>
                  <option value="poule">Poule</option>
                  <option value="huitiemes">Huitièmes</option>
                  <option value="quarts">Quarts</option>
                  <option value="demi-finale">Demi-finale</option>
                  <option value="petite-finale">Petite finale</option>
                  <option value="finale">Finale</option>
                </select>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Statut</label>
                <select
                  value={selectedMatch.status}
                  onChange={(e) => updateMatch({...selectedMatch, status: e.target.value as MatchStatus})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="planifié">Planifié</option>
                  <option value="en-cours">En cours</option>
                  <option value="terminé">Terminé</option>
                  <option value="annulé">Annulé</option>
                </select>
              </div>

              {/* Durée */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Durée (minutes)</label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  step="15"
                  value={selectedMatch.duration}
                  onChange={(e) => updateMatch({...selectedMatch, duration: parseInt(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>

              {/* Scores (si terminé) */}
              {selectedMatch.status === "terminé" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score Équipe A</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedMatch.scoreA || ''}
                      onChange={(e) => updateMatch({...selectedMatch, scoreA: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score Équipe B</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedMatch.scoreB || ''}
                      onChange={(e) => updateMatch({...selectedMatch, scoreB: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => deleteMatch(selectedMatch.id)}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition"
              >
                Supprimer le match
              </button>
            </div>
          </div>
        )}

        {/* Panel de configuration des poules */}
        {selectedPool && (
          <div className="w-80 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Configuration de la poule</h3>
                <button
                  onClick={() => setSelectedPool(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Nom de la poule */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Nom de la poule</label>
                <input
                  type="text"
                  value={selectedPool.name}
                  onChange={(e) => updatePool({...selectedPool, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Sélection des équipes */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Équipes participantes</label>
                {loadingTeams ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des équipes...</div>
                ) : (
                  <div className="space-y-2">
                    {teams.map(team => {
                      const isSelected = selectedPool.teams.includes(team.name);
                      return (
                        <div key={team.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`team-${team.id}`}
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addTeamToPool(selectedPool.id, team.name);
                              } else {
                                removeTeamFromPool(selectedPool.id, team.name);
                              }
                            }}
                            className="mr-2"
                          />
                          <label htmlFor={`team-${team.id}`} className="text-sm">
                            {team.name}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Aperçu des matchs générés */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Matchs générés ({selectedPool.matches.length})
                </label>
                {selectedPool.matches.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {selectedPool.matches.map((match, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-purple-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedPoolMatch(match);
                          setSelectedPool(null);
                        }}
                      >
                        <span className="text-sm">{match.teamA} vs {match.teamB}</span>
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(match.status)}`}>
                          {match.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
                    Sélectionnez au moins 2 équipes pour générer les matchs
                  </div>
                )}
                {selectedPool.matches.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Cliquez sur un match pour le configurer individuellement
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setPools(pools.filter(p => p.id !== selectedPool.id));
                  setSelectedPool(null);
                }}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition"
              >
                Supprimer la poule
              </button>
            </div>
          </div>
        )}

        {/* Panel de configuration d'un match de poule */}
        {selectedPoolMatch && (
          <div className="w-80 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Match de poule</h3>
                  <p className="text-sm text-purple-600">{selectedPoolMatch.teamA} vs {selectedPoolMatch.teamB}</p>
                </div>
                <button
                  onClick={() => setSelectedPoolMatch(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Date et heure */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedPoolMatch.date}
                    onChange={(e) => updatePoolMatch({...selectedPoolMatch, date: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Heure</label>
                  <input
                    type="time"
                    value={selectedPoolMatch.time}
                    onChange={(e) => updatePoolMatch({...selectedPoolMatch, time: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Terrain */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Terrain</label>
                {loadingCourts ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des terrains...</div>
                ) : (
                  <select
                    value={selectedPoolMatch.court}
                    onChange={(e) => updatePoolMatch({...selectedPoolMatch, court: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Sélectionner un terrain</option>
                    {courts.map(court => (
                      <option key={court.id} value={court.name}>{court.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Statut</label>
                <select
                  value={selectedPoolMatch.status}
                  onChange={(e) => updatePoolMatch({...selectedPoolMatch, status: e.target.value as MatchStatus})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="planifié">Planifié</option>
                  <option value="en-cours">En cours</option>
                  <option value="terminé">Terminé</option>
                  <option value="annulé">Annulé</option>
                </select>
              </div>

              {/* Durée */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Durée (minutes)</label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  step="15"
                  value={selectedPoolMatch.duration}
                  onChange={(e) => updatePoolMatch({...selectedPoolMatch, duration: parseInt(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Scores (si terminé) */}
              {selectedPoolMatch.status === "terminé" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score {selectedPoolMatch.teamA}</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedPoolMatch.scoreA || ''}
                      onChange={(e) => updatePoolMatch({...selectedPoolMatch, scoreA: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score {selectedPoolMatch.teamB}</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedPoolMatch.scoreB || ''}
                      onChange={(e) => updatePoolMatch({...selectedPoolMatch, scoreB: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Informations sur la poule */}
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-purple-800 mb-1">Match de poule</div>
                <div className="text-xs text-purple-600">
                  Ce match fait partie d'une poule et sera comptabilisé dans le classement général.
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50 space-y-2">
              <button
                onClick={() => {
                  const pool = pools.find(p => p.matches.some(m => m.id === selectedPoolMatch.id));
                  if (pool) {
                    setSelectedPool(pool);
                    setSelectedPoolMatch(null);
                  }
                }}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition"
              >
                Retour à la poule
              </button>
            </div>
          </div>
        )}

        {/* Palette de tuiles à droite */}
        <div className="w-60 bg-white border-l shadow-lg flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-900">Palette des matchs</h3>
            <p className="text-xs text-gray-600 mt-1">Glissez pour créer un nouveau match</p>
          </div>

          <div className="flex-1 p-4 space-y-4">
            {/* Tuile Match de Poule */}
            <div
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, "poule")}
              onDragEnd={handlePaletteDragEnd}
              className="bg-white border-2 border-purple-200 rounded-lg p-4 cursor-grab hover:shadow-lg hover:border-purple-400 transition-all active:cursor-grabbing"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                  Poule
                </span>
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-medium">Équipe A</div>
                <div className="text-center text-xs my-1">VS</div>
                <div className="font-medium">Équipe B</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">90 min</div>
            </div>

            {/* Tuile Phase Finale/Qualifs */}
            <div
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, "qualifications")}
              onDragEnd={handlePaletteDragEnd}
              className="bg-white border-2 border-indigo-200 rounded-lg p-4 cursor-grab hover:shadow-lg hover:border-indigo-400 transition-all active:cursor-grabbing"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                  Qualifs
                </span>
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-medium">Équipe A</div>
                <div className="text-center text-xs my-1">VS</div>
                <div className="font-medium">Équipe B</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">90 min</div>
            </div>

            {/* Tuile Match Finale */}
            <div
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, "finale")}
              onDragEnd={handlePaletteDragEnd}
              className="bg-white border-2 border-yellow-200 rounded-lg p-4 cursor-grab hover:shadow-lg hover:border-yellow-400 transition-all active:cursor-grabbing"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  Finale
                </span>
                <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-medium">Équipe A</div>
                <div className="text-center text-xs my-1">VS</div>
                <div className="font-medium">Équipe B</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">120 min</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
