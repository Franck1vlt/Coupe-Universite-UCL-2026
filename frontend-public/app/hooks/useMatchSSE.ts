/**
 * Hook pour recevoir les scores en temps réel via Server-Sent Events (SSE).
 * Version pour frontend-public.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const INITIAL_RETRY_DELAY = 500;
const MAX_RETRY_DELAY = 10000;
const BACKOFF_MULTIPLIER = 1.5;

export interface LiveScoreData {
    match_id: number;
    sport: string;
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
        chronoRunning?: boolean;
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

export function useMatchSSE(options: UseMatchSSEOptions): UseMatchSSEReturn {
    const { matchIds, enabled = true, onScoreUpdate } = options;

    const [scores, setScores] = useState<Map<number, LiveScoreData>>(new Map());
    const [connectionState, setConnectionState] = useState<SSEConnectionState>({
        isConnected: false,
        isConnecting: false,
        error: null,
        retryCount: 0,
    });

    const eventSourceRef = useRef<EventSource | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryDelayRef = useRef(INITIAL_RETRY_DELAY);

    // Store callback in ref to avoid triggering reconnection on callback change
    const onScoreUpdateRef = useRef(onScoreUpdate);
    onScoreUpdateRef.current = onScoreUpdate;

    // Stable matchIds string for comparison
    const matchIdsKey = matchIds.join(',');

    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        if (!enabled || matchIds.length === 0) {
            setConnectionState({
                isConnected: false,
                isConnecting: false,
                error: null,
                retryCount: 0,
            });
            return;
        }

        setConnectionState(prev => ({
            ...prev,
            isConnecting: true,
            error: null,
        }));

        const matchIdsParam = matchIds.join(',');
        const url = `${API_URL}/live-scores/stream?match_ids=${matchIdsParam}`;

        console.log('[useMatchSSE] Connecting to:', url);

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('[useMatchSSE] Connected');
            setConnectionState({
                isConnected: true,
                isConnecting: false,
                error: null,
                retryCount: 0,
            });
            retryDelayRef.current = INITIAL_RETRY_DELAY;
        };

        eventSource.onmessage = (event) => {
            try {
                if (!event.data || event.data.trim() === '' || event.data.startsWith(':')) {
                    return;
                }

                const rawData = JSON.parse(event.data);

                if (!rawData.match_id) {
                    return;
                }

                const scoreData: LiveScoreData = {
                    match_id: rawData.match_id,
                    sport: rawData.sport,
                    timestamp: rawData.timestamp,
                    data: rawData.data,
                };

                console.log('[useMatchSSE] Score update:', scoreData.match_id, scoreData.data);

                setScores(prev => {
                    const newScores = new Map(prev);
                    newScores.set(scoreData.match_id, scoreData);
                    return newScores;
                });

                // Callback via ref (stable reference)
                if (onScoreUpdateRef.current) {
                    onScoreUpdateRef.current(scoreData);
                }
            } catch (e) {
                console.warn('[useMatchSSE] Parse error:', e);
            }
        };

        eventSource.onerror = () => {
            console.warn('[useMatchSSE] Connection error');

            eventSource.close();
            eventSourceRef.current = null;

            setConnectionState(prev => ({
                isConnected: false,
                isConnecting: false,
                error: 'Connection lost',
                retryCount: prev.retryCount + 1,
            }));

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
    }, [matchIdsKey, enabled]); // Removed onScoreUpdate - using ref instead

    const disconnect = useCallback(() => {
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        retryDelayRef.current = INITIAL_RETRY_DELAY;
    }, []);

    const reconnect = useCallback(() => {
        disconnect();
        retryDelayRef.current = INITIAL_RETRY_DELAY;
        connect();
    }, [connect, disconnect]);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [matchIdsKey, enabled]); // Use stable key instead of connect/disconnect

    useEffect(() => {
        setScores(new Map());
    }, [matchIdsKey]);

    return {
        scores,
        connectionState,
        reconnect,
        disconnect,
    };
}

export default useMatchSSE;
