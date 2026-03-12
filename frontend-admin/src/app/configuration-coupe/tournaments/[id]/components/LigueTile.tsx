import React from 'react';

export function LigueTile({ league, selected, onSelect, onDragStart }: {
  league: any;
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
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200'
      }`}
      style={{
        left: league.position.x,
        top: league.position.y,
        minHeight: '200px',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
          {league.name}
        </span>
        <span className="text-xs text-gray-500">{league.teams.length} équipes</span>
      </div>
      <div className="mb-3">
        <div className="text-xs font-medium text-black mb-2">Équipes :</div>
        {league.teams.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {league.teams.map((team: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded font-medium bg-blue-200 text-black"
              >
                {team}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Aucune équipe sélectionnée</div>
        )}
      </div>
      <div>
        <div className="text-xs font-medium text-black mb-2">
          Matchs : {league.matches.length}
        </div>
        {league.matches.length > 0 ? (
          <div className="space-y-1">
            {league.matches.slice(0, 3).map((match: any, index: number) => (
              <div
                key={index}
                className="text-xs text-black flex justify-between p-1 rounded hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <span>{match.teamA} vs {match.teamB}</span>
                <span className="px-1 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                  {match.status}
                </span>
              </div>
            ))}
            {league.matches.length > 3 && (
              <div className="text-xs text-blue-600 italic cursor-pointer hover:text-blue-800">
                +{league.matches.length - 3} autres matchs... (cliquez pour voir tous)
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Ajoutez les équipes et créez les matchs manuellement</div>
        )}
      </div>
    </div>
  );
}
