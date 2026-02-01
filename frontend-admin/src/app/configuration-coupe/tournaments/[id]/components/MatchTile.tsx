import React from 'react';

export function MatchTile({ match, selected, onSelect, onDragStart }: {
  match: any;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  function getTypeColor(type: string) {
    switch (type) {
      case 'qualifications': return 'bg-indigo-100 text-indigo-800';
      case 'poule': return 'bg-purple-100 text-purple-800';
      case 'phase-finale': return 'bg-orange-100 text-orange-800';
      case 'loser-bracket': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  function getStatusColor(status: string) {
    switch (status) {
      case 'à venir': return 'bg-gray-200 text-gray-700';
      case 'en cours': return 'bg-blue-200 text-blue-800';
      case 'terminé': return 'bg-green-200 text-green-800';
      default: return 'bg-gray-200 text-gray-700';
    }
  }
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className={`absolute bg-white rounded-lg shadow-lg border-2 p-4 w-72 cursor-move transition-all hover:shadow-xl ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
      style={{
        left: match.position.x,
        top: match.position.y,
        minHeight: '160px',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(match.type)}`}>
            {match.type === "qualifications" ? "Qualifs" :
              match.type === "poule" ? "Poule" :
              match.type === "phase-finale" ? "Phase Finale" :
              match.type === "loser-bracket" ? "Loser Bracket" :
              "Match"}
          </span>
          {match.type === "qualifications" && match.winnerCode && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-50 text-black">
              {match.winnerCode}
            </span>
          )}
          {match.type === "loser-bracket" && match.loserBracketMatchType && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-black">
              {match.loserBracketMatchType === "loser-round-1" ? "Repêchage" :
                match.loserBracketMatchType === "loser-round-2" ? "Demi LB" :
                match.loserBracketMatchType === "loser-petite-finale" ? "7e place" :
                match.loserBracketMatchType === "loser-finale" ? "5e place" : ""}
            </span>
          )}
          {match.type === "phase-finale" && match.bracketMatchType && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-black">
              {match.bracketMatchType === "quarts" ? "QF" :
                match.bracketMatchType === "demi" ? "SF" :
                match.bracketMatchType === "petite-finale" ? "3e place" :
                match.bracketMatchType === "finale" ? "Finale" : ""}
            </span>
          )}
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(match.status)}`}>
          {match.status}
        </span>
      </div>
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
  );
}
