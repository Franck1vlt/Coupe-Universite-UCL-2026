"use client";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useTournament } from "./hooks/useTournament";
import { Match, MatchType, MatchStatus, Pool, Bracket } from "./types/tournament.types";
import {
  resolveTeamName,
  calculatePoolStandings,
  propagateMatchResults,
  calculateFinalRankings,
  getMatchWinner,
  getMatchLoser
} from "./tournamentLogic";
import PaletteTuile from "./components/PaletteTuile";
import { MatchTile } from "./components/MatchTile";
import { PoolTile } from "./components/PoolTile";
import { BracketTile } from "./components/BracketTile";
import { LoserBracketTile } from "./components/LoserBracketTile";
import { useSelectedTile } from "./hooks/useSelectedTile";
import { v4 as uuid } from 'uuid';

type Sport = {
  id: number;
  name: string;
  score_type: string;
  created_at?: string;
};


export default function TournamentPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState<Sport | null>(null);
  const tournamentId = params?.id ? parseInt(params.id as string) : null;
  const tournament = useTournament(tournamentId);
  const {
    selectedMatch, setSelectedMatch,
    selectedPool, setSelectedPool,
    selectedBracket, setSelectedBracket,
    selectedLoserBracket, setSelectedLoserBracket
  } = useSelectedTile();

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
      case "phase-finale": return "bg-orange-100 text-orange-800";
      case "loser-bracket": return "bg-amber-100 text-amber-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  const handlePaletteDragStart = (e: React.DragEvent, matchType: MatchType) => {
    e.dataTransfer.setData("itemType", matchType);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData("itemId", itemId);
    e.dataTransfer.effectAllowed = "move";
  };
  const addNewMatchFromPalette = (type: MatchType, x: number, y: number) => {
    tournament.addMatch(type, { x, y });
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    const type = e.dataTransfer.getData("itemType");
    const canvas = document.getElementById("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (type) {
      addNewMatchFromPalette(type as MatchType, x, y);
      return;
    }
    const match = tournament.matches.find((m) => m.id === itemId);
    if (match) {
      tournament.updateMatch({ ...match, position: { x, y } });
      return;
    }
    const pool = tournament.pools.find((p) => p.id === itemId);
    if (pool) {
      tournament.updatePool({ ...pool, position: { x, y } });
      return;
    }
    const bracket = tournament.brackets.find((b) => b.id === itemId);
    if (bracket) {
      tournament.updateBracket({ ...bracket, position: { x, y } });
      return;
    }
    const loserBracket = tournament.loserBrackets.find((lb) => lb.id === itemId);
    if (loserBracket) {
      tournament.updateLoserBracket({ ...loserBracket, position: { x, y } });
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // État de chargement
  if (tournament.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tournoi...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header fixe */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex-1 flex flex-col items-center justify-center">
            <h1 className="text-xl font-bold text-gray-900">
              {loading ? "Chargement..." : sport ? `Tournoi ${sport.name}` : "Tournoi introuvable"}
            </h1>
            <p className="text-sm text-gray-500">Configuration des matchs</p>
          </div>

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

          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">
              Glissez une tuile depuis la palette pour créer un match
            </div>

            <button
              // onClick={handleResetMatches}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full shadow hover:bg-red-700 transition text-sm"
              title="Réinitialiser tous les matchs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Réinitialiser</span>
            </button>

            <button
              // onClick={handleSaveLayout}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full shadow hover:bg-blue-700 transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Enregistrer</span>
            </button>
          </div>
        </div>
      </header>

      {/* Zone centrale + palette à droite */}
      <div className="flex flex-1 min-h-0">
        {/* Zone du Canvas (le grand espace vide au milieu) */}
        <main
          id="canvas"
          className="flex-1 overflow-auto p-8"
          style={{ position: "relative" }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Affichage des tuiles drag&droppées (Match, Pool, Bracket, LoserBracket) */}
          {tournament.matches.map(match => (
            <MatchTile
              key={match.id}
              match={match}
              selected={selectedMatch?.id === match.id}
              onSelect={() => {
                setSelectedMatch(match);
                setSelectedPool(null);
                setSelectedBracket(null);
                setSelectedLoserBracket(null);
              }}
              onDragStart={e => handleDragStart(e, match.id)}
            />
          ))}
          {tournament.pools.map(pool => (
            <PoolTile
              key={pool.id}
              pool={pool}
              selected={selectedPool?.id === pool.id}
              onSelect={() => {
                setSelectedPool(pool);
                setSelectedMatch(null);
                setSelectedBracket(null);
                setSelectedLoserBracket(null);
              }}
              onDragStart={e => handleDragStart(e, pool.id)}
            />
          ))}
          {tournament.brackets.map(bracket => (
            <BracketTile
              key={bracket.id}
              bracket={bracket}
              selected={selectedBracket?.id === bracket.id}
              onSelect={() => {
                setSelectedBracket(bracket);
                setSelectedMatch(null);
                setSelectedPool(null);
                setSelectedLoserBracket(null);
              }}
              onDragStart={e => handleDragStart(e, bracket.id)}
            />
          ))}
          {tournament.loserBrackets.map(loserBracket => (
            <LoserBracketTile
              key={loserBracket.id}
              loserBracket={loserBracket}
              selected={selectedLoserBracket?.id === loserBracket.id}
              onSelect={() => {
                setSelectedLoserBracket(loserBracket);
                setSelectedMatch(null);
                setSelectedPool(null);
                setSelectedBracket(null);
              }}
              onDragStart={e => handleDragStart(e, loserBracket.id)}
            />
          ))}
        </main>

        {/* Panneau de configuration contextuel à droite + palette */}
        <aside
          className="h-[100vh] max-h-screen border-l bg-white flex flex-col shadow-lg overflow-y-auto sticky top-0 right-0"
          style={{ position: 'sticky', top: 0, minWidth: 320 }}
        >
          {/* Panneau de configuration dynamique */}
          {selectedMatch && (
            <div className="w-80 bg-white border-l shadow-lg flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Configuration du match</h3>
                <button onClick={() => setSelectedMatch(null)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={selectedMatch.type}
                    onChange={e => tournament.updateMatch({ ...selectedMatch, type: e.target.value })}
                  >
                    <option value="qualifications">Qualifications</option>
                    <option value="poule">Poule</option>
                    <option value="phase-finale">Phase Finale</option>
                    <option value="loser-bracket">Loser Bracket</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Équipe A</label>
                  <input className="w-full p-2 border rounded" value={selectedMatch.teamA || ''} onChange={e => tournament.updateMatch({ ...selectedMatch, teamA: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Équipe B</label>
                  <input className="w-full p-2 border rounded" value={selectedMatch.teamB || ''} onChange={e => tournament.updateMatch({ ...selectedMatch, teamB: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input type="date" className="w-full p-2 border rounded" value={selectedMatch.date || ''} onChange={e => tournament.updateMatch({ ...selectedMatch, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Heure</label>
                    <input type="time" className="w-full p-2 border rounded" value={selectedMatch.time || ''} onChange={e => tournament.updateMatch({ ...selectedMatch, time: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Terrain</label>
                  <input className="w-full p-2 border rounded" value={selectedMatch.court || ''} onChange={e => tournament.updateMatch({ ...selectedMatch, court: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Statut</label>
                  <select className="w-full p-2 border rounded" value={selectedMatch.status} onChange={e => tournament.updateMatch({ ...selectedMatch, status: e.target.value })}>
                    <option value="planifié">Planifié</option>
                    <option value="en-cours">En cours</option>
                    <option value="terminé">Terminé</option>
                    <option value="annulé">Annulé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Durée (min)</label>
                  <input type="number" className="w-full p-2 border rounded" value={selectedMatch.duration || ''} onChange={e => tournament.updateMatch({ ...selectedMatch, duration: parseInt(e.target.value) || 0 })} />
                </div>
                <button className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 mt-2" onClick={() => { tournament.deleteMatch(selectedMatch.id); setSelectedMatch(null); }}>Supprimer le match</button>
              </div>
            </div>
          )}
          {selectedPool && (
            <div className="w-80 bg-white border-l shadow-lg flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Configuration de la poule</h3>
                <button onClick={() => setSelectedPool(null)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input className="w-full p-2 border rounded" value={selectedPool.name || ''} onChange={e => tournament.updatePool({ ...selectedPool, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Équipes (séparées par virgule)</label>
                  <input className="w-full p-2 border rounded" value={selectedPool.teams.join(', ')} onChange={e => tournament.updatePool({ ...selectedPool, teams: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre de qualifiés phase finale</label>
                  <input type="number" className="w-full p-2 border rounded" value={selectedPool.qualifiedToFinals || 0} onChange={e => tournament.updatePool({ ...selectedPool, qualifiedToFinals: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre de qualifiés loser bracket</label>
                  <input type="number" className="w-full p-2 border rounded" value={selectedPool.qualifiedToLoserBracket || 0} onChange={e => tournament.updatePool({ ...selectedPool, qualifiedToLoserBracket: parseInt(e.target.value) || 0 })} />
                </div>
                <button className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 mt-2" onClick={() => { tournament.deletePool(selectedPool.id); setSelectedPool(null); }}>Supprimer la poule</button>
              </div>
            </div>
          )}
          {selectedBracket && (
            <div className="w-80 bg-white border-l shadow-lg flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Configuration Phase Finale</h3>
                <button onClick={() => setSelectedBracket(null)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input className="w-full p-2 border rounded" value={selectedBracket.name || ''} onChange={e => tournament.updateBracket({ ...selectedBracket, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rounds activés (séparés par virgule)</label>
                  <input className="w-full p-2 border rounded" value={selectedBracket.enabledRounds.join(', ')} onChange={e => tournament.updateBracket({ ...selectedBracket, enabledRounds: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Équipes (séparées par virgule)</label>
                  <input className="w-full p-2 border rounded" value={selectedBracket.teams.join(', ')} onChange={e => tournament.updateBracket({ ...selectedBracket, teams: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                </div>
                <button className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 mt-2" onClick={() => { tournament.deleteBracket(selectedBracket.id); setSelectedBracket(null); }}>Supprimer le bracket</button>
              </div>
            </div>
          )}
          {selectedLoserBracket && (
            <div className="w-80 bg-white border-l shadow-lg flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Configuration Loser Bracket</h3>
                <button onClick={() => setSelectedLoserBracket(null)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input className="w-full p-2 border rounded" value={selectedLoserBracket.name || ''} onChange={e => tournament.updateLoserBracket({ ...selectedLoserBracket, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rounds activés (séparés par virgule)</label>
                  <input className="w-full p-2 border rounded" value={selectedLoserBracket.enabledRounds.join(', ')} onChange={e => tournament.updateLoserBracket({ ...selectedLoserBracket, enabledRounds: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Équipes (séparées par virgule)</label>
                  <input className="w-full p-2 border rounded" value={selectedLoserBracket.teams.join(', ')} onChange={e => tournament.updateLoserBracket({ ...selectedLoserBracket, teams: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                </div>
                <button className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 mt-2" onClick={() => { tournament.deleteLoserBracket(selectedLoserBracket.id); setSelectedLoserBracket(null); }}>Supprimer le loser bracket</button>
              </div>
            </div>
          )}
          {/* Palette toujours visible */}
          <PaletteTuile handlePaletteDragStart={handlePaletteDragStart} />
        </aside>
      </div>
    </div>
  );
}