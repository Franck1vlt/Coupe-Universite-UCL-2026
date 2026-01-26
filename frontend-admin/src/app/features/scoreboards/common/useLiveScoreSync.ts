/**
 * Hook pour la synchronisation des scores en temps réel vers le backend SSE.
 *
 * Ce hook centralise la logique de:
 * - Envoi des scores live au backend (POST /matches/{id}/live-score)
 * - Debouncing pour éviter le flood d'appels API
 * - Gestion des erreurs avec retry automatique
 *
 * Il est utilisé par les hooks de sport (useVolleyballMatch, useBadmintonMatch, etc.)
 * pour synchroniser les scores vers les écrans spectateurs split-screen.
 */

import { useRef, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 150;

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 500;

export type LiveScoreSport = 'volleyball' | 'badminton' | 'petanque' | 'flechettes';

export interface LiveScorePayload {
    team1: string;
    team2: string;
    matchType?: string;
    matchGround?: string;
    logo1?: string;
    logo2?: string;
    [key: string]: unknown; // Sport-specific fields
}

interface SendLiveScoreOptions {
    matchId: string;
    sport: LiveScoreSport;
    payload: LiveScorePayload;
}

/**
 * Envoie les scores live au backend avec retry
 */
async function sendLiveScoreToBackend(
    matchId: string,
    sport: LiveScoreSport,
    payload: LiveScorePayload,
    retryCount = 0
): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/matches/${matchId}/live-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sport,
                data: payload,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return true;
    } catch (error) {
        console.warn(`[useLiveScoreSync] Failed to send live score (attempt ${retryCount + 1}):`, error);

        if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return sendLiveScoreToBackend(matchId, sport, payload, retryCount + 1);
        }

        console.error('[useLiveScoreSync] Max retries reached, giving up');
        return false;
    }
}

/**
 * Hook pour synchroniser les scores en temps réel avec le backend
 */
export function useLiveScoreSync() {
    // Ref pour stocker les timers de debounce par matchId
    const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Ref pour suivre la dernière payload envoyée (éviter les doublons)
    const lastPayloads = useRef<Map<string, string>>(new Map());

    /**
     * Envoie les scores live avec debouncing
     * Seul le dernier appel dans la fenêtre de debounce sera envoyé
     */
    const sendLiveScore = useCallback((options: SendLiveScoreOptions) => {
        const { matchId, sport, payload } = options;

        // Skip if no matchId
        if (!matchId) {
            return;
        }

        // Serialize payload for comparison
        const payloadString = JSON.stringify(payload);

        // Skip if payload hasn't changed
        if (lastPayloads.current.get(matchId) === payloadString) {
            return;
        }

        // Clear existing debounce timer for this match
        const existingTimer = debounceTimers.current.get(matchId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new debounce timer
        const timer = setTimeout(async () => {
            debounceTimers.current.delete(matchId);

            // Double-check payload hasn't changed during debounce
            const currentPayloadString = JSON.stringify(payload);
            if (lastPayloads.current.get(matchId) === currentPayloadString) {
                return;
            }

            // Update last payload
            lastPayloads.current.set(matchId, currentPayloadString);

            // Send to backend
            const success = await sendLiveScoreToBackend(matchId, sport, payload);

            if (success) {
                console.debug(`[useLiveScoreSync] Score synced for match ${matchId}`);
            }
        }, DEBOUNCE_DELAY);

        debounceTimers.current.set(matchId, timer);
    }, []);

    /**
     * Force un envoi immédiat (sans debounce)
     * Utile pour les événements importants comme la fin de set
     */
    const sendLiveScoreImmediate = useCallback(async (options: SendLiveScoreOptions): Promise<boolean> => {
        const { matchId, sport, payload } = options;

        if (!matchId) {
            return false;
        }

        // Clear any pending debounced send
        const existingTimer = debounceTimers.current.get(matchId);
        if (existingTimer) {
            clearTimeout(existingTimer);
            debounceTimers.current.delete(matchId);
        }

        // Update last payload
        lastPayloads.current.set(matchId, JSON.stringify(payload));

        // Send immediately
        return sendLiveScoreToBackend(matchId, sport, payload);
    }, []);

    /**
     * Nettoie les ressources pour un match (à appeler lors de l'unmount)
     */
    const cleanup = useCallback((matchId?: string) => {
        if (matchId) {
            const timer = debounceTimers.current.get(matchId);
            if (timer) {
                clearTimeout(timer);
                debounceTimers.current.delete(matchId);
            }
            lastPayloads.current.delete(matchId);
        } else {
            // Cleanup all
            debounceTimers.current.forEach(timer => clearTimeout(timer));
            debounceTimers.current.clear();
            lastPayloads.current.clear();
        }
    }, []);

    return {
        sendLiveScore,
        sendLiveScoreImmediate,
        cleanup,
    };
}

export default useLiveScoreSync;
