import React from "react";
import { TournamentMatch, TournamentMatchType, TournamentMatchStatus } from "../hooks/useTournamentMatches";

/**
 * Composant pour afficher une carte de match avec infos, score et actions.
 * Props : match, sportCode, onClick, formatTeamName, badges.
 */
export function MatchCard({
  match,
  sportCode,
  onClick,
  formatTeamName,
  getMatchTypeBadge,
  getMatchStatusBadge,
}: {
  match: TournamentMatch;
  sportCode?: string | null;
  onClick?: () => void;
  formatTeamName: (teamName: string) => string;
  getMatchTypeBadge: (type: TournamentMatchType) => string;
  getMatchStatusBadge: (status: TournamentMatchStatus) => string;
}) {
  return (
    <button
      key={match.id}
      onClick={onClick}
      className="text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-[10px] text-black bg-green-100 font-medium rounded-full ${getMatchTypeBadge(match.type)}`}>
            {match.type === "qualifications" ? "Qualifs" : match.type}
          </span>
          {match.type === "qualifications" && match.label && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-black">
              {match.label}
            </span>
          )}
          {match.type === "poule" && match.label && (
            <span className="text-[11px] font-semibold text-black">{match.label}</span>
          )}
        </div>
        <span className={`px-2 py-1 text-[10px] text-black bg-purple-100 font-medium rounded-full ${getMatchStatusBadge(match.status)}`}>
          {match.status}
        </span>
      </div>
      <div className="mt-1">
        <div className="flex items-center justify-between text-sm font-medium text-black">
          <span className={match.status === "terminé" && match.scoreA !== undefined && match.scoreB !== undefined && match.scoreA > match.scoreB ? "font-bold text-green-600" : ""}>
            {formatTeamName(match.teamA)}
          </span>
          <div className="flex items-center gap-2">
            {match.status === "planifié" ? (
              <span className="text-black font-bold text-base">0 - 0</span>
            ) : match.scoreA !== undefined && match.scoreB !== undefined ? (
              <span className="text-black font-bold text-base">{match.scoreA} - {match.scoreB}</span>
            ) : (
              <span className="text-black text-xs">VS</span>
            )}
          </div>
          <span className={match.status === "terminé" && match.scoreA !== undefined && match.scoreB !== undefined && match.scoreB > match.scoreA ? "font-bold text-green-600" : ""}>
            {formatTeamName(match.teamB)}
          </span>
        </div>
        {(match.date || match.time || match.court) && (
          <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-2">
            {match.court && (
              <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {match.court}
              </span>
            )}
            {match.date && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {match.date}
              </span>
            )}
            {match.time && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {match.time}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
        <span>Cliquer pour ouvrir la table de marquage</span>
      </div>
    </button>
  );
}
