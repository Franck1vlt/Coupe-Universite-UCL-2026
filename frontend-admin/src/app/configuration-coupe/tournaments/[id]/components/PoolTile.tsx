import React from 'react';

export function PoolTile({ pool, selected, onSelect, onDragStart }: {
  pool: any;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className={`absolute bg-white rounded-lg shadow-lg border-2 p-4 w-80 cursor-move transition-all hover:shadow-xl ${
        selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-purple-200'
      }`}
      style={{
        left: pool.position.x,
        top: pool.position.y,
        minHeight: '200px',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
          {pool.name}
        </span>
        <span className="text-xs text-gray-500">{pool.teams.length} équipes</span>
      </div>
      <div className="mb-3">
        <div className="text-xs font-medium text-black mb-2">Équipes :</div>
        {pool.teams.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pool.teams.map((team: string, index: number) => {
              const isQualifWinner = team.startsWith('WQ');
              return (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs rounded font-medium ${
                    isQualifWinner ? 'bg-indigo-200 text-black' : 'bg-purple-200 text-black'
                  }`}
                >
                  {team}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Aucune équipe sélectionnée</div>
        )}
      </div>
      <div>
        <div className="text-xs font-medium text-black mb-2">
          Matchs : {pool.matches.length}
        </div>
        {pool.matches.length > 0 ? (
          <div className="space-y-1">
            {pool.matches.slice(0, 3).map((match: any, index: number) => (
              <div
                key={index}
                className="text-xs text-black flex justify-between p-1 rounded hover:bg-purple-50 cursor-pointer transition-colors"
              >
                <span>{match.teamA} vs {match.teamB}</span>
                <span className={`px-1 py-0.5 rounded text-xs bg-gray-200 text-gray-700`}>
                  {match.status}
                </span>
              </div>
            ))}
            {pool.matches.length > 3 && (
              <div className="text-xs text-purple-600 italic cursor-pointer hover:text-purple-800">
                +{pool.matches.length - 3} autres matchs... (cliquez pour voir tous)
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Ajoutez des équipes pour générer les matchs</div>
        )}
      </div>
    </div>
  );
}
