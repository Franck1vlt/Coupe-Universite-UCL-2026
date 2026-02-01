import React from 'react';

export function BracketTile({ bracket, selected, onSelect, onDragStart }: {
  bracket: any;
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
        selected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-orange-200'
      }`}
      style={{
        left: bracket.position.x,
        top: bracket.position.y,
        minHeight: '200px',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">
          {bracket.name}
        </span>
        <span className="text-xs text-gray-500">{bracket.teams.length} équipes</span>
      </div>
      <div className="mb-3">
        <div className="text-xs font-medium text-black mb-2">Rounds activés :</div>
        {bracket.enabledRounds.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {bracket.enabledRounds.map((round: string, index: number) => {
              const roundLabels: Record<string, string> = {
                "quarts": "Quarts",
                "demi": "Demi-finales",
                "petite-finale": "Petite finale",
                "finale": "Finale"
              };
              return (
                <span
                  key={index}
                  className="px-2 py-1 text-xs rounded font-medium bg-orange-200 text-black"
                >
                  {roundLabels[round]}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Aucun round sélectionné</div>
        )}
      </div>
      <div className="mb-3">
        <div className="text-xs font-medium text-black mb-2">Équipes :</div>
        {bracket.teams.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {bracket.teams.slice(0, 8).map((team: string, index: number) => {
              const isFromPool = team.startsWith('P') && team.includes('-');
              const isFromQualif = team.startsWith('WQ');
              return (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs rounded font-medium ${
                    isFromQualif ? 'bg-indigo-200 text-black' :
                    isFromPool ? 'bg-purple-200 text-black' :
                    'bg-orange-200 text-black'
                  }`}
                >
                  {team}
                </span>
              );
            })}
            {bracket.teams.length > 8 && (
              <span className="px-2 py-1 text-xs italic text-gray-500">
                +{bracket.teams.length - 8}
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Aucune équipe sélectionnée</div>
        )}
      </div>
      <div>
        <div className="text-xs font-medium text-black mb-2">
          Matchs : {bracket.matches.length}
        </div>
        {bracket.matches.length > 0 ? (
          <div className="space-y-1">
            {bracket.matches.slice(0, 3).map((match: any, index: number) => {
              const matchTypeLabels: Record<string, string> = {
                "quarts": "QF",
                "demi": "SF",
                "petite-finale": "PF",
                "finale": "F"
              };
              const matchLabel = match.bracketMatchType ? matchTypeLabels[match.bracketMatchType] : "";
              return (
                <div
                  key={index}
                  className="text-xs text-black flex justify-between p-1 rounded hover:bg-orange-50 cursor-pointer transition-colors"
                >
                  <span>{matchLabel}: {match.teamA || "?"} vs {match.teamB || "?"}</span>
                  <span className={`px-1 py-0.5 rounded text-xs bg-gray-200 text-gray-700`}>
                    {match.status}
                  </span>
                </div>
              );
            })}
            {bracket.matches.length > 3 && (
              <div className="text-xs text-orange-600 italic cursor-pointer hover:text-orange-800">
                +{bracket.matches.length - 3} autres matchs... (cliquez pour voir tous)
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Configurez les rounds et équipes pour générer les matchs</div>
        )}
      </div>
    </div>
  );
}
