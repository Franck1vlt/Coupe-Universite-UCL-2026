import React from "react";
import { RankingEntry } from "./PoolRankingTable";

/**
 * Composant pour afficher le classement final du tournoi.
 * Props : finalRanking (array de RankingEntry)
 */
export function FinalRankingTable({ finalRanking }: { finalRanking: RankingEntry[] }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-100">
        <h3 className="font-semibold text-red-600">Classement Final du Tournoi</h3>
        <p className="text-xs text-black mt-1">Points cumulés de toutes les phases (qualifs, brackets, finales)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Pos</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Équipe</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Points Totaux</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {finalRanking.length > 0 ? (
              finalRanking.map((entry) => (
                <tr
                  key={entry.team}
                  className={`hover:bg-gray-50 ${
                    entry.position === 1 ? "bg-yellow-50" :
                    entry.position === 2 ? "bg-gray-100" :
                    entry.position === 3 ? "bg-orange-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-black">
                    {entry.position === 1 && "🥇 "}
                    {entry.position === 2 && "🥈 "}
                    {entry.position === 3 && "🥉 "}
                    {entry.position}
                  </td>
                  <td className="px-4 py-3 text-sm text-black font-medium">{entry.team}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-blue-600 text-lg">{entry.points}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-black">
                  Aucun résultat pour le moment.<br />
                  <span className="text-xs text-gray-500">Les points apparaîtront quand les matchs seront terminés.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
