"use client";

import { useState } from "react";

interface Match {
    id: number;
    uuid: string;
    team_a_name: string;
    team_b_name: string;
    team_a_logo?: string;
    team_b_logo?: string;
    score_a: number | null;
    score_b: number | null;
    status: string;
    match_type: string;
    label?: string;
    court?: string;
    tournament_name?: string; // Pour distinguer les tournois (Hommes/Femmes)
}

interface MatchSelectorProps {
    availableMatches: Match[];
    selectedMatchIds: number[];
    maxSelection: number;
    onSelect: (matchIds: number[]) => void;
    onClose: () => void;
}

export default function MatchSelector({
    availableMatches,
    selectedMatchIds,
    maxSelection,
    onSelect,
    onClose,
}: MatchSelectorProps) {
    const [selected, setSelected] = useState<Set<number>>(new Set(selectedMatchIds));

    const toggleMatch = (matchId: number) => {
        const newSelected = new Set(selected);

        if (newSelected.has(matchId)) {
            newSelected.delete(matchId);
        } else {
            if (newSelected.size < maxSelection) {
                newSelected.add(matchId);
            } else {
                // Replace oldest selection
                const oldest = Array.from(newSelected)[0];
                newSelected.delete(oldest);
                newSelected.add(matchId);
            }
        }

        setSelected(newSelected);
    };

    const handleConfirm = () => {
        onSelect(Array.from(selected));
    };

    const getMatchTypeBadgeColor = (matchType: string) => {
        const colors: Record<string, string> = {
            pool: "bg-purple-100 text-purple-800",
            qualification: "bg-indigo-100 text-indigo-800",
            bracket: "bg-amber-100 text-amber-800",
            loser_bracket: "bg-orange-100 text-orange-800",
        };
        return colors[matchType] || "bg-gray-100 text-gray-800";
    };

    return (
        <div className="match-selector-overlay" onClick={onClose}>
            <div className="match-selector-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Sélectionner les matchs</h2>
                    <p className="modal-subtitle">
                        {selected.size} / {maxSelection} matchs sélectionnés
                    </p>
                    <button onClick={onClose} className="close-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="modal-content">
                    {availableMatches.length === 0 ? (
                        <div className="no-matches">
                            <p>Aucun match en cours disponible</p>
                        </div>
                    ) : (
                        <div className="matches-grid">
                            {availableMatches.map((match) => (
                                <div
                                    key={match.id}
                                    className={`match-card ${selected.has(match.id) ? 'selected' : ''}`}
                                    onClick={() => toggleMatch(match.id)}
                                >
                                    <div className="match-card-header">
                                        {match.tournament_name && (
                                            <span className="tournament-badge">
                                                {match.tournament_name}
                                            </span>
                                        )}
                                        <span className={`match-type-badge ${getMatchTypeBadgeColor(match.match_type)}`}>
                                            {match.label || match.match_type}
                                        </span>
                                        {match.court && (
                                            <span className="court-badge">
                                                {match.court}
                                            </span>
                                        )}
                                    </div>

                                    <div className="match-teams">
                                        <div className="team">
                                            <img
                                                src={
                                                    match.team_a_logo
                                                        ? match.team_a_logo
                                                        : match.team_a_name
                                                            ? `/img/${encodeURIComponent(match.team_a_name)}.png`
                                                            : "/img/no-logo.png"
                                                }
                                                onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "/img/no-logo.png"; }}
                                                alt=""
                                                className="team-logo"
                                            />
                                            <span className="team-name">{match.team_a_name || "Équipe A"}</span>
                                        </div>
                                        <div className="vs">VS</div>
                                        <div className="team">
                                            <img
                                                src={
                                                    match.team_b_logo
                                                        ? match.team_b_logo
                                                        : match.team_b_name
                                                            ? `/img/${encodeURIComponent(match.team_b_name)}.png`
                                                            : "/img/no-logo.png"
                                                }
                                                onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "/img/no-logo.png"; }}
                                                alt=""
                                                className="team-logo"
                                            />
                                            <span className="team-name">{match.team_b_name || "Équipe B"}</span>
                                        </div>
                                    </div>

                                    <div className="selection-indicator">
                                        {selected.has(match.id) ? (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                            </svg>
                                        ) : (
                                            <div className="empty-checkbox"></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="cancel-btn">
                        Annuler
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="confirm-btn"
                        disabled={selected.size === 0}
                    >
                        Confirmer ({selected.size})
                    </button>
                </div>
            </div>
        </div>
    );
}
