"use client"

import { useSession } from "next-auth/react"
import type { UserRole } from "../../auth"

// Configuration des permissions par fonctionnalite
// Correspond aux permissions definies dans le middleware et le backend
export const PERMISSIONS = {
  // Configuration de la Coupe : admin uniquement
  config_coupe: ["admin"] as UserRole[],

  // Tournois et tableaux : admin et staff
  tournois_tableaux: ["admin", "staff"] as UserRole[],

  // Tableau des scores finaux : admin, staff et technicien
  scores_finaux: ["admin", "staff", "technicien"] as UserRole[],

  // Scores en direct : admin et technicien
  scores_direct: ["admin", "technicien"] as UserRole[],

  // Gestion des equipes : admin et staff
  gestion_equipes: ["admin", "staff"] as UserRole[],

  // Gestion des sports : admin uniquement
  gestion_sports: ["admin"] as UserRole[],

  // Gestion des terrains : admin et staff
  gestion_terrains: ["admin", "staff"] as UserRole[],

  // Lecture seule (tous les roles authentifies)
  lecture: ["admin", "staff", "technicien"] as UserRole[],
} as const

export type PermissionKey = keyof typeof PERMISSIONS

/**
 * Hook pour verifier les permissions de l'utilisateur connecte
 *
 * @example
 * const { hasPermission, hasRole, userRole, isAdmin } = usePermissions()
 *
 * // Verifier une permission specifique
 * if (hasPermission("config_coupe")) {
 *   // Afficher les options de configuration
 * }
 *
 * // Verifier un role
 * if (hasRole("admin")) {
 *   // Afficher les options admin
 * }
 */
export function usePermissions() {
  const { data: session, status } = useSession()

  const userRole = session?.user?.role as UserRole | undefined
  const isAuthenticated = status === "authenticated" && !!userRole

  /**
   * Verifie si l'utilisateur a la permission specifiee
   */
  const hasPermission = (permission: PermissionKey): boolean => {
    if (!isAuthenticated || !userRole) return false
    return PERMISSIONS[permission].includes(userRole)
  }

  /**
   * Verifie si l'utilisateur a un des roles specifies
   */
  const hasRole = (...roles: UserRole[]): boolean => {
    if (!isAuthenticated || !userRole) return false
    return roles.includes(userRole)
  }

  /**
   * Verifie si l'utilisateur a acces a une route specifique
   */
  const canAccessRoute = (route: string): boolean => {
    if (!isAuthenticated || !userRole) return false

    // Mapping simplifie des routes vers les permissions
    const routePermissions: Record<string, PermissionKey> = {
      "/configuration-coupe": "config_coupe",
      "/configuration-coupe/sports": "gestion_sports",
      "/configuration-coupe/teams": "gestion_equipes",
      "/configuration-coupe/courts": "gestion_terrains",
      "/configuration-coupe/tournaments": "tournois_tableaux",
      "/choix-sport": "tournois_tableaux",
      "/tableau-scores": "scores_finaux",
      "/scores-direct": "scores_direct",
    }

    // Chercher la permission correspondante
    for (const [routePrefix, permission] of Object.entries(routePermissions)) {
      if (route === routePrefix || route.startsWith(routePrefix + "/")) {
        return hasPermission(permission)
      }
    }

    // Par defaut, autoriser si authentifie
    return true
  }

  return {
    // Donnees utilisateur
    userRole,
    userName: session?.user?.name,
    isAuthenticated,
    isLoading: status === "loading",

    // Raccourcis pour les roles
    isAdmin: userRole === "admin",
    isStaff: userRole === "staff",
    isTechnicien: userRole === "technicien",

    // Fonctions de verification
    hasPermission,
    hasRole,
    canAccessRoute,

    // Acces direct aux permissions
    permissions: PERMISSIONS,
  }
}

/**
 * Composant pour conditionner l'affichage selon les permissions
 *
 * @example
 * <RequirePermission permission="config_coupe">
 *   <ConfigButton />
 * </RequirePermission>
 *
 * <RequirePermission roles={["admin", "staff"]}>
 *   <EditButton />
 * </RequirePermission>
 */
export function RequirePermission({
  children,
  permission,
  roles,
  fallback = null,
}: {
  children: React.ReactNode
  permission?: PermissionKey
  roles?: UserRole[]
  fallback?: React.ReactNode
}) {
  const { hasPermission, hasRole, isLoading } = usePermissions()

  if (isLoading) {
    return null
  }

  // Verifier par permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  // Verifier par roles
  if (roles && !hasRole(...roles)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
