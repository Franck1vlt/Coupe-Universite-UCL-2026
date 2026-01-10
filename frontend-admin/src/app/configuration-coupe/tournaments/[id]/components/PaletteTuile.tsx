"use client";
import React from 'react';

import { MatchType } from "../types/tournament.types";

type PaletteTuileProps = {
    handlePaletteDragStart: (e: React.DragEvent, matchType: MatchType) => void;
};


const PaletteTuile: React.FC<PaletteTuileProps> = ({ handlePaletteDragStart }) => {
    const handlePaletteDragEnd = (
        e: React.DragEvent<HTMLDivElement>
    ) => {
        // Optionally handle drag end logic here
    };

    return (
        <div className="w-60 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-gray-50">
                <h3 className="font-bold text-gray-900">Palette de tuiles</h3>
                <p className="text-xs text-gray-600 mt-1">Glissez pour ajouter une nouvelle phase</p>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* Tuile Match de Poule */}
                <div
                    draggable
                    onDragStart={e => handlePaletteDragStart(e, "poule")}
                    onDragEnd={handlePaletteDragEnd}
                    className="bg-white border-2 border-purple-200 rounded-lg p-4 cursor-grab hover:shadow-lg hover:border-purple-400 transition-all active:cursor-grabbing"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            Poule
                        </span>
                        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <div className="text-sm text-gray-700">
                        <div className="font-medium">Équipe A</div>
                        <div className="text-center text-xs my-1">VS</div>
                        <div className="font-medium">Équipe B</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">90 min</div>
                </div>

                {/* Tuile Phase Qualifs */}
                <div
                    draggable
                    onDragStart={e => handlePaletteDragStart(e, "qualifications")}
                    onDragEnd={handlePaletteDragEnd}
                    className="bg-white border-2 border-indigo-200 rounded-lg p-4 cursor-grab hover:shadow-lg hover:border-indigo-400 transition-all active:cursor-grabbing"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                            Qualifs
                        </span>
                        <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="text-sm text-gray-700">
                        <div className="font-medium">Équipe A</div>
                        <div className="text-center text-xs my-1">VS</div>
                        <div className="font-medium">Équipe B</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">90 min</div>
                </div>

                {/* Tuile Phase Finale */}
                <div
                    draggable
                    onDragStart={e => handlePaletteDragStart(e, "phase-finale")}
                    onDragEnd={handlePaletteDragEnd}
                    className="bg-white border-2 border-orange-200 rounded-lg p-4 cursor-grab hover:shadow-lg hover:border-orange-400 transition-all active:cursor-grabbing"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                            Phase Finale
                        </span>
                        <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                    </div>
                    <div className="text-sm text-gray-700">
                        <div className="font-medium text-xs">Bracket à élimination</div>
                        <div className="text-xs text-gray-500 mt-1">QF • SF • F • PF</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Configuration complète</div>
                </div>

                {/* Tuile Loser Bracket */}
                <div
                    draggable
                    onDragStart={e => handlePaletteDragStart(e, "loser-bracket")}
                    onDragEnd={handlePaletteDragEnd}
                    className="bg-white border-2 border-amber-200 rounded-lg p-4 cursor-grab hover:shadow-lg hover:border-amber-400 transition-all active:cursor-grabbing"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                            Loser Bracket
                        </span>
                        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="text-sm text-gray-700">
                        <div className="font-medium text-xs">Bracket perdants</div>
                        <div className="text-xs text-gray-500 mt-1">LR1 • LR2 • LR3 • LF</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Repêchage</div>
                </div>
            </div>
        </div>
    );
};

export default PaletteTuile;