import React from "react";

export type RankingEntry = {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  scoreDiff?: number;
};

/**
 * Composant pour afficher le classement d'une poule sous forme de tableau.
 * Props : poolName, ranking, qualifiedToFinals, qualifiedToLoserBracket
 */
export function PoolRankingTable({
  poolName,
  ranking,
  qualifiedToFinals = 0,
  qualifiedToLoserBracket = 0,
}: {
  poolName: string;
  ranking: RankingEntry[];
  qualifiedToFinals?: number;
  qualifiedToLoserBracket?: number;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
        <h3 className="font-semibold text-black">{poolName}</h3>
        {(qualifiedToFinals > 0 || qualifiedToLoserBracket > 0) && (
          <div className="flex gap-4 mt-1 text-xs text-black">
            {qualifiedToFinals > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-100 border border-green-400 rounded"></span>
                {qualifiedToFinals} qualifié{qualifiedToFinals > 1 ? 's' : ''} phase finale
              </span>
            )}
            {qualifiedToLoserBracket > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-orange-100 border border-orange-400 rounded"></span>
                {qualifiedToLoserBracket} qualifié{qualifiedToLoserBracket > 1 ? 's' : ''} loser bracket
              </span>
            )}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Pos</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Équipe</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">J</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">G</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">N</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">P</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Pts</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Diff</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ranking.map((entry) => {
              let bgColor = "hover:bg-gray-50";
              if (entry.position <= qualifiedToFinals) {
                bgColor = "bg-green-50 hover:bg-green-100 border-l-4 border-green-500";
              } else if (entry.position <= qualifiedToFinals + qualifiedToLoserBracket) {
                bgColor = "bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-500";
              }
              return (
                <tr key={entry.team} className={bgColor}>
                  <td className="px-4 py-3 text-sm font-medium text-black">{entry.position}</td>
                  <td className="px-4 py-3 text-sm text-black">{entry.team}</td>
                  <td className="px-4 py-3 text-sm text-center text-black">{entry.played}</td>
                  <td className="px-4 py-3 text-sm text-center text-green-600">{entry.won}</td>
                  <td className="px-4 py-3 text-sm text-center text-black">{entry.drawn}</td>
                  <td className="px-4 py-3 text-sm text-center text-red-600">{entry.lost}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-black">{entry.points}</td>
                  <td className="px-4 py-3 text-sm text-center text-black">{entry.scoreDiff !== undefined ? (entry.scoreDiff > 0 ? `+${entry.scoreDiff}` : entry.scoreDiff) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
