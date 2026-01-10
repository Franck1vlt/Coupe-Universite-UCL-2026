"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useSport } from "../../../../hooks/useSport";
import { useTeamSportIdToName } from "../../../../hooks/useTeamSportIdToName";
import { useTournamentMatches } from "../../../../hooks/useTournamentMatches";
import { MatchCard } from "../../../../components/MatchCard";
import { PoolRankingTable } from "../../../../components/PoolRankingTable";
import { FinalRankingTable } from "../../../../components/FinalRankingTable";
import { use } from "react";

// Page principale du tournoi, version simplifiée avec hooks et composants
export default function TournamentViewPage() {
  const params = useParams();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showMatchSelect, setShowMatchSelect] = useState(false);
  const { sport, sportCode, loading, error } = useSport(params?.id as string);
  const teamSportIdToName = useTeamSportIdToName();
  const { matches } = useTournamentMatches(params?.id as string, teamSportIdToName);

  // TODO: pools, brackets, loserBrackets à extraire dans des hooks si besoin
  // TODO: rankings à calculer via hooks ou utilitaires
  // TODO: handleResetAllMatches et handlePropagateResults à extraire dans un hook ou utilitaire
  // TODO: Modal de sélection de match à extraire en composant

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-8">
      {/* Header simplifié */}
      <header className="w-full max-w-6xl mb-8">
        <div className="flex items-center justify-between">
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

          <div className="text-center flex-1 mx-4">
            <h1 className="text-3xl font-bold text-black mb-2">
              {loading ? "Chargement du tournoi..." : sport ? `Tournoi ${sport.name}` : "Tournoi"}
            </h1>
            {sport && (
              <p className="text-black text-sm">Type de score : {sport.score_type}</p>
            )}
            {!loading && error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 mb-2">{error}</p>
                <button
                  onClick={() => router.push(`/configuration-coupe/tournaments/${params.id}`)}
                  className="text-sm text-red-700 hover:text-red-800 font-medium underline"
                >
                  Aller à la configuration du tournoi →
                </button>
              </div>
            )}
          </div>

          {/* Menu 3 points */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Options"
            >
              <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                <button
                  onClick={() => {
                    setShowMatchSelect(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">Modifier un match</div>
                    <div className="text-xs text-gray-500">Choisir un match à éditer</div>
                  </div>
                </button>
                <button
                  // onClick={handlePropagateResults}
                  className="w-full text-left px-4 py-3 hover:bg-green-50 transition flex items-center gap-3 border-t border-gray-100"
                >
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div>
                    <div className="font-medium text-black">Propager les résultats</div>
                    <div className="text-xs text-green-600">Mettre à jour les matchs suivants</div>
                  </div>
                </button>
                <button
                  // onClick={handleResetAllMatches}
                  className="w-full text-left px-4 py-3 hover:bg-red-50 transition flex items-center gap-3 border-t border-gray-100"
                >
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <div>
                    <div className="font-medium text-black">Réinitialiser tous les matchs</div>
                    <div className="text-xs text-red-500">Remettre à zéro tous les scores</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal de sélection de match */}
      {showMatchSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Sélectionner un match à modifier</h3>
              <button
                onClick={() => setShowMatchSelect(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6">
              {matches.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucun match disponible</p>
              ) : (
                <div className="grid gap-3">
                  {matches.map((match) => (
                    <button
                      key={match.id}
                      onClick={() => {
                        if (!sportCode) return;
                        router.push(`/choix-sport/tournaments/table-marquage/${sportCode}?matchId=${match.id}`);
                        setShowMatchSelect(false);
                      }}
                      className="text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg p-4 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMatchTypeBadge(match.type)}`}>
                            {match.type === "qualifications" ? "Qualifs" : match.type}
                          </span>
                          {match.label && (
                            <span className="text-xs font-semibold text-gray-700">{match.label}</span>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMatchStatusBadge(match.status)}`}>
                          {match.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900">
                          {formatTeamName(match.teamA, tournamentMatches, tournamentPools, tournamentBrackets, tournamentLoserBrackets)}
                        </span>
                        <span className="text-gray-500 mx-2">vs</span>
                        <span className="font-medium text-gray-900">
                          {formatTeamName(match.teamB, tournamentMatches, tournamentPools, tournamentBrackets, tournamentLoserBrackets)}
                        </span>
                      </div>
                      {match.status === "terminé" && match.scoreA !== undefined && match.scoreB !== undefined && (
                        <div className="mt-2 text-center text-sm font-bold text-blue-600">
                          {match.scoreA} - {match.scoreB}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vue des matchs */}
      <section className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <h2 className="text-xl font-semibold text-black mb-4">Vue du tournoi</h2>
          {matches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-black text-sm mb-4">Aucun match n'est encore configuré pour ce tournoi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  sportCode={sportCode}
                  onClick={() => sportCode && router.push(`/choix-sport/tournaments/table-marquage/${sportCode}?matchId=${match.id}`)}
                  formatTeamName={(teamName) => teamSportIdToName[parseInt(teamName)] || teamName}
                  getMatchTypeBadge={() => ""}
                  getMatchStatusBadge={() => ""}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section des classements (à compléter avec hooks) */}
      {/* <section className="w-full max-w-4xl mt-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <PoolRankingTable ... />
          <FinalRankingTable ... />
        </div>
      </section> */}
    </main>
  );
}
