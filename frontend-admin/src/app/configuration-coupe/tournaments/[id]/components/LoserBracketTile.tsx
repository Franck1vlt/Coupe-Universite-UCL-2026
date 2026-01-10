import React from 'react';

export function LoserBracketTile({ loserBracket, selected, onSelect, onDragStart }: {
  loserBracket: any;
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
        selected ? 'border-amber-500 ring-2 ring-amber-200' : 'border-amber-200'
      }`}
      style={{
        left: loserBracket.position.x,
        top: loserBracket.position.y,
        minHeight: '200px',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-amber-100 text-amber-800">
          {loserBracket.name}
        </span>
        <span className="text-xs text-gray-500">{loserBracket.teams.length} équipes</span>
      </div>
      <div className="mb-3">
        <div className="text-xs font-medium text-black mb-2">Rounds activés :</div>
        {loserBracket.enabledRounds.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {loserBracket.enabledRounds.map((round: string, index: number) => {
              const roundLabels: Record<string, string> = {
                "loser-round-1": "Repêchage",
                "loser-round-2": "Demi LB",
                "loser-round-3": "7e place",
                "loser-finale": "5e place"
              };
              return (
                <span
                  key={index}
                  className="px-2 py-1 text-xs rounded font-medium bg-amber-200 text-black"
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
        <div className="text-xs font-medium text-black mb-2">Équipes (perdants) :</div>
        {loserBracket.teams.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {loserBracket.teams.slice(0, 8).map((team: string, index: number) => {
              const isFromBracket = team.startsWith('L');
              const isFromPool = team.includes('Poule');
              return (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs rounded font-medium ${
                    isFromBracket ? 'bg-orange-200 text-black' :
                    isFromPool ? 'bg-purple-200 text-black' :
                    'bg-amber-200 text-black'
                  }`}
                >
                  {team}
                </span>
              );
            })}
            {loserBracket.teams.length > 8 && (
              <span className="px-2 py-1 text-xs italic text-gray-500">
                +{loserBracket.teams.length - 8}
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Aucune équipe sélectionnée</div>
        )}
      </div>
      <div>
        <div className="text-xs font-medium text-black mb-2">
          Matchs : {loserBracket.matches.length}
        </div>
        {loserBracket.matches.length > 0 ? (
          <div className="space-y-1">
            {loserBracket.matches.slice(0, 3).map((match: any, index: number) => {
              const matchTypeLabels: Record<string, string> = {
                "loser-round-1": "Repêchage",
                "loser-round-2": "Demi LB",
                "loser-round-3": "7e place",
                "loser-finale": "5e place"
              };
              const matchLabel = match.loserBracketMatchType ? matchTypeLabels[match.loserBracketMatchType] : "";
              return (
                <div
                  key={index}
                  className="text-xs text-black flex justify-between p-1 rounded hover:bg-amber-50 cursor-pointer transition-colors"
                >
                  <span>{matchLabel}: {match.teamA || "?"} vs {match.teamB || "?"}</span>
                  <span className={`px-1 py-0.5 rounded text-xs bg-gray-200 text-gray-700`}>
                    {match.status}
                  </span>
                </div>
              );
            })}
            {loserBracket.matches.length > 3 && (
              <div className="text-xs text-amber-600 italic cursor-pointer hover:text-amber-800">
                +{loserBracket.matches.length - 3} autres matchs... (cliquez pour voir tous)
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
