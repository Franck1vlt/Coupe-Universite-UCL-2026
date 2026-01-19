/**
 * Hook commun pour la gestion de la propagation des résultats de matchs.
 *
 * Ce hook centralise la logique de:
 * - Récupération des données du match et du tournament_id
 * - Soumission des résultats au backend
 * - Propagation automatique des vainqueurs et perdants vers leurs matchs suivants
 *
 * Il est utilisé par tous les hooks de sport (useBadmintonMatch, useFootballMatch, etc.)
 */

export interface MatchResultPayload {
    score_a: number;
    score_b: number;
    status?: 'upcoming' | 'in_progress' | 'completed';
    team_sport_a_id?: number;
    team_sport_b_id?: number;
}

export interface PropagationResult {
    success: boolean;
    propagatedMatches: number;
    message: string;
    error?: string;
}

export interface SubmitResultOptions {
    matchId: string;
    tournamentId?: string | number;
    payload: MatchResultPayload;
    onSuccess?: (result: PropagationResult) => void;
    onError?: (error: string) => void;
}

/**
 * Récupère le tournament_id depuis le match via sa phase
 */
export async function getTournamentIdFromMatch(matchId: string): Promise<number | null> {
    try {
        // 1. Récupérer le match pour obtenir phase_id
        const matchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${matchId}`);
        if (!matchResponse.ok) {
            console.error('[useMatchPropagation] Match not found:', matchId);
            return null;
        }
        const matchData = await matchResponse.json();
        const match = matchData.data;

        // 2. Récupérer la phase pour obtenir tournament_id
        if (match.phase_id) {
            const phaseResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament-phases/${match.phase_id}`);
            if (phaseResponse.ok) {
                const phaseData = await phaseResponse.json();
                return phaseData.data.tournament_id;
            }
        }

        // 3. Si tournament_id est directement sur le match
        if (match.tournament_id) {
            return match.tournament_id;
        }

        console.warn('[useMatchPropagation] Could not find tournament_id for match:', matchId);
        return null;
    } catch (error) {
        console.error('[useMatchPropagation] Error fetching tournament_id:', error);
        return null;
    }
}

/**
 * Propage les résultats d'un tournoi après la fin d'un match
 * Cela assignera automatiquement les vainqueurs et perdants à leurs matchs suivants
 * en utilisant les winner_destination_slot et loser_destination_slot configurés
 */
export async function propagateTournamentResults(tournamentId: string | number): Promise<PropagationResult> {
    try {
        console.log('[useMatchPropagation] Starting propagation for tournament:', tournamentId);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${tournamentId}/propagate-results`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[useMatchPropagation] Propagation failed:', errorText);
            return {
                success: false,
                propagatedMatches: 0,
                message: 'Propagation failed',
                error: errorText,
            };
        }

        const data = await response.json();
        const propagatedCount = data.data?.propagated_matches || 0;

        console.log('[useMatchPropagation] Propagation successful:', propagatedCount, 'matches propagated');

        return {
            success: true,
            propagatedMatches: propagatedCount,
            message: propagatedCount > 0
                ? `${propagatedCount} match(s) propagated successfully`
                : 'No matches to propagate',
        };
    } catch (error) {
        console.error('[useMatchPropagation] Propagation error:', error);
        return {
            success: false,
            propagatedMatches: 0,
            message: 'Propagation error',
            error: String(error),
        };
    }
}

/**
 * Met à jour le statut d'un match
 */
export async function updateMatchStatus(
    matchId: string,
    status: 'scheduled' | 'in_progress' | 'completed'
): Promise<boolean> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${matchId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });

        if (response.ok) {
            console.log(`[useMatchPropagation] Match ${matchId} status updated to: ${status}`);
            return true;
        }

        console.error(`[useMatchPropagation] Failed to update status for match ${matchId}`);
        return false;
    } catch (error) {
        console.error(`[useMatchPropagation] Error updating status for match ${matchId}:`, error);
        return false;
    }
}

/**
 * Soumet le résultat d'un match et déclenche la propagation automatique
 *
 * Cette fonction:
 * 1. Récupère les team_sport_ids du match si nécessaire
 * 2. Envoie les scores au backend
 * 3. Déclenche la propagation des vainqueurs/perdants vers leurs matchs suivants
 */
export async function submitMatchResultWithPropagation(
    options: SubmitResultOptions
): Promise<PropagationResult> {
    const { matchId, tournamentId, payload, onSuccess, onError } = options;

    try {
        console.log('[useMatchPropagation] === SUBMITTING MATCH RESULT ===');
        console.log('[useMatchPropagation] Match ID:', matchId);
        console.log('[useMatchPropagation] Tournament ID:', tournamentId);
        console.log('[useMatchPropagation] Payload:', payload);

        // 1. Récupérer les données actuelles du match pour avoir les team_sport_ids
        const matchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${matchId}`);
        if (!matchResponse.ok) {
            throw new Error('Could not fetch match data');
        }
        const matchData = await matchResponse.json();
        const match = matchData.data;

        // 2. Préparer le payload final avec les team_sport_ids si disponibles
        const finalPayload: MatchResultPayload = {
            ...payload,
            status: payload.status || 'completed',
        };

        if (match.team_sport_a_id && !finalPayload.team_sport_a_id) {
            finalPayload.team_sport_a_id = match.team_sport_a_id;
        }
        if (match.team_sport_b_id && !finalPayload.team_sport_b_id) {
            finalPayload.team_sport_b_id = match.team_sport_b_id;
        }

        // Vérifier que les équipes sont définies pour la propagation
        if (!finalPayload.team_sport_a_id || !finalPayload.team_sport_b_id) {
            console.warn('[useMatchPropagation] Warning: team_sport_ids not defined, propagation may fail');
        }

        console.log('[useMatchPropagation] Final payload:', finalPayload);

        // 3. Envoyer la mise à jour du match (cela déclenche la propagation côté backend)
        const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${matchId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload),
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('[useMatchPropagation] Match update failed:', errorText);
            throw new Error(`Match update failed: ${errorText}`);
        }

        console.log('[useMatchPropagation] Match result submitted successfully');

        // 4. Déclencher également la propagation explicite (au cas où le backend inline aurait raté)
        let propagationResult: PropagationResult = {
            success: true,
            propagatedMatches: 0,
            message: 'Match completed',
        };

        // Obtenir le tournament_id si non fourni
        let finalTournamentId = tournamentId;
        if (!finalTournamentId) {
            finalTournamentId = await getTournamentIdFromMatch(matchId) || undefined;
        }

        if (finalTournamentId) {
            // Petit délai pour laisser le temps au backend de traiter
            await new Promise(resolve => setTimeout(resolve, 300));

            propagationResult = await propagateTournamentResults(finalTournamentId);
            console.log('[useMatchPropagation] Propagation result:', propagationResult);
        } else {
            console.log('[useMatchPropagation] No tournament_id, skipping explicit propagation');
        }

        // 5. Callback de succès
        if (onSuccess) {
            onSuccess(propagationResult);
        }

        return propagationResult;

    } catch (error) {
        const errorMessage = String(error);
        console.error('[useMatchPropagation] Error:', errorMessage);

        if (onError) {
            onError(errorMessage);
        }

        return {
            success: false,
            propagatedMatches: 0,
            message: 'Error submitting match result',
            error: errorMessage,
        };
    }
}

/**
 * Hook React pour utiliser la propagation dans les composants
 */
export function useMatchPropagation() {
    return {
        submitMatchResultWithPropagation,
        propagateTournamentResults,
        updateMatchStatus,
        getTournamentIdFromMatch,
    };
}

export default useMatchPropagation;
