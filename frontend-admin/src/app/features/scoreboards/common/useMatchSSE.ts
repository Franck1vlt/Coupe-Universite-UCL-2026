/**
 * Hook pour recevoir les scores en temps réel via Server-Sent Events (SSE).
 *
 * Ce hook gère:
 * - Connexion SSE au backend pour plusieurs matchs
 * - Reconnexion automatique avec backoff exponentiel
 * - État React synchronisé par match
 *
 * Utilisé par le composant split-screen pour afficher les scores en temps réel.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Reconnection configuration - reduced for faster recovery
const INITIAL_RETRY_DELAY = 500; // 500ms
const MAX_RETRY_DELAY = 10000; // 10s (reduced from 30s)
const BACKOFF_MULTIPLIER = 1.5;

export type LiveScoreSport = 'volleyball' | 'badminton' | 'petanque' | 'flechettes' | 'football' | 'basketball' | 'handball';

export interface LiveScoreData {
    match_id: number;
    sport: LiveScoreSport;
    timestamp: string;
    data: {
        team1: string;
        team2: string;
        matchType?: string;
        matchGround?: string;
        logo1?: string;
        logo2?: string;
        // Volleyball/Badminton specific
        score1?: number;
        score2?: number;
        sets1?: number;
        sets2?: number;
        serviceTeam?: 'A' | 'B';
        chrono?: string;
        // Petanque specific
        scoreA?: number;
        scoreB?: number;
        cochonnetTeam?: 'A' | 'B';
        meneCount?: number;
        targetScore?: number;
        winner?: string;
        // Flechettes specific
        setsA?: number;
        setsB?: number;
        currentPlayer?: string;
        currentThrows?: number[];
        gameMode?: string;
        // Football/Basketball/Handball specific
        yellowCards1?: number;
        yellowCards2?: number;
        redCards1?: number;
        redCards2?: number;
        // Basketball specific
        technicalFouls1?: number;
        technicalFouls2?: number;
        shotClock?: string;
        period?: string;
        [key: string]: unknown;
    };
}

export interface SSEConnectionState {
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    retryCount: number;
}

interface UseMatchSSEOptions {
    matchIds: number[];
    enabled?: boolean;
    onScoreUpdate?: (data: LiveScoreData) => void;
}

interface UseMatchSSEReturn {
    scores: Map<number, LiveScoreData>;
    connectionState: SSEConnectionState;
    reconnect: () => void;
    disconnect: () => void;
}

/**
 * Hook pour s'abonner aux scores live de plusieurs matchs via SSE
 */
export function useMatchSSE(options: UseMatchSSEOptions): UseMatchSSEReturn {
    const { matchIds, enabled = true, onScoreUpdate } = options;

    // Score data per match
    const [scores, setScores] = useState<Map<number, LiveScoreData>>(new Map());

    // Connection state
    const [connectionState, setConnectionState] = useState<SSEConnectionState>({
        isConnected: false,
        isConnecting: false,
        error: null,
        retryCount: 0,
    });

    // Refs for cleanup
    const eventSourceRef = useRef<EventSource | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryDelayRef = useRef(INITIAL_RETRY_DELAY);

    /**
     * Connect to SSE stream
     */
    const connect = useCallback(() => {
        // Cleanup existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        if (!enabled || matchIds.length === 0) {
            setConnectionState(prev => ({
                ...prev,
                isConnected: false,
                isConnecting: false,
            }));
            return;
        }

        setConnectionState(prev => ({
            ...prev,
            isConnecting: true,
            error: null,
        }));

        const matchIdsParam = matchIds.join(',');
        const url = `${API_URL}/live-scores/stream?match_ids=${matchIdsParam}`;

        console.log('%c[useMatchSSE] 🔌 Connecting to SSE...', 'color: blue; font-weight: bold');
        console.log('[useMatchSSE] URL:', url);
        console.log('[useMatchSSE] Match IDs:', matchIds);

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        // Debug: log readyState changes
        console.log('[useMatchSSE] EventSource created, readyState:', eventSource.readyState);

        eventSource.onopen = () => {
            console.log('%c[useMatchSSE] ✅ CONNECTED to SSE!', 'color: green; font-weight: bold');
            console.log('[useMatchSSE] Subscribed to match IDs:', matchIds);
            setConnectionState({
                isConnected: true,
                isConnecting: false,
                error: null,
                retryCount: 0,
            });
            // Reset retry delay on successful connection
            retryDelayRef.current = INITIAL_RETRY_DELAY;
        };

        eventSource.onmessage = (event) => {
            const now = new Date().toISOString();
            console.log('%c[useMatchSSE] 📨 MESSAGE RECEIVED!', 'color: orange; font-weight: bold', now);
            console.log('[useMatchSSE] Raw event.data:', event.data?.substring(0, 200));

            try {
                // Skip empty data or keepalive
                if (!event.data || event.data.trim() === '' || event.data.startsWith(':')) {
                    console.log('[useMatchSSE] Skipping empty/keepalive');
                    return;
                }

                const rawData = JSON.parse(event.data);
                console.log('[useMatchSSE] Parsed data:', rawData);

                // Handle keepalive comments (empty or just event type)
                if (!rawData.match_id) {
                    console.log('[useMatchSSE] Skipping non-score event (no match_id)');
                    return;
                }

                const scoreData: LiveScoreData = {
                    match_id: rawData.match_id,
                    sport: rawData.sport,
                    timestamp: rawData.timestamp,
                    data: rawData.data,
                };

                console.log('[useMatchSSE] Score update received:', {
                    match_id: scoreData.match_id,
                    sport: scoreData.sport,
                    data: scoreData.data
                });

                // Update scores map
                setScores(prev => {
                    const newScores = new Map(prev);
                    newScores.set(scoreData.match_id, scoreData);
                    console.log('[useMatchSSE] Updated scores map, size:', newScores.size);
                    return newScores;
                });

                // Callback
                if (onScoreUpdate) {
                    onScoreUpdate(scoreData);
                }

                console.log('[useMatchSSE] Score update processed for match', scoreData.match_id);
            } catch (e) {
                console.warn('[useMatchSSE] Parse error:', e, 'Raw data was:', event.data);
            }
        };

        eventSource.onerror = (error) => {
            console.warn('[useMatchSSE] Connection error:', error, 'readyState:', eventSource.readyState);

            eventSource.close();
            eventSourceRef.current = null;

            setConnectionState(prev => ({
                isConnected: false,
                isConnecting: false,
                error: 'Connection lost',
                retryCount: prev.retryCount + 1,
            }));

            // Schedule reconnection with exponential backoff
            if (enabled) {
                const delay = Math.min(retryDelayRef.current, MAX_RETRY_DELAY);
                console.log(`[useMatchSSE] Reconnecting in ${delay}ms...`);

                retryTimeoutRef.current = setTimeout(() => {
                    retryDelayRef.current = Math.min(
                        retryDelayRef.current * BACKOFF_MULTIPLIER,
                        MAX_RETRY_DELAY
                    );
                    connect();
                }, delay);
            }
        };
    }, [matchIds, enabled, onScoreUpdate]);

    /**
     * Disconnect from SSE stream
     */
    const disconnect = useCallback(() => {
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setConnectionState({
            isConnected: false,
            isConnecting: false,
            error: null,
            retryCount: 0,
        });

        retryDelayRef.current = INITIAL_RETRY_DELAY;
    }, []);

    /**
     * Force reconnection
     */
    const reconnect = useCallback(() => {
        disconnect();
        retryDelayRef.current = INITIAL_RETRY_DELAY;
        connect();
    }, [connect, disconnect]);

    // Connect on mount / matchIds change
    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    // Clear scores when matchIds change
    useEffect(() => {
        setScores(new Map());
    }, [matchIds.join(',')]);

    return {
        scores,
        connectionState,
        reconnect,
        disconnect,
    };
}

export default useMatchSSE;
