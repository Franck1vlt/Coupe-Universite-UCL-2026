"use client"

import { useSession } from "next-auth/react"
import { useCallback } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/**
 * Hook pour faire des appels API authentifiés
 */
export function useApi() {
  const { data: session } = useSession()

  const fetchWithAuth = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...options.headers,
      }

      // Debug logging
      console.log("useApi - session:", session)
      console.log("useApi - accessToken:", session?.accessToken)

      // Ajouter le token si disponible
      if (session?.accessToken) {
        (headers as Record<string, string>)["Authorization"] = `Bearer ${session.accessToken}`
        console.log("useApi - Authorization header added")
      } else {
        console.log("useApi - NO accessToken in session!")
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      })

      return response
    },
    [session?.accessToken]
  )

  return {
    fetchWithAuth,
    isAuthenticated: !!session?.accessToken,
    apiUrl: API_URL,
  }
}
