import { auth, type UserRole } from "../auth"
import { NextResponse } from "next/server"

// Configuration des permissions par route
// Definit quels roles peuvent acceder a quelles pages
const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Configuration de la Coupe : admin uniquement
  "/configuration-coupe": ["admin"],
  "/configuration-coupe/sports": ["admin"],
  "/configuration-coupe/teams": ["admin", "staff"],
  "/configuration-coupe/courts": ["admin", "staff"],
  "/configuration-coupe/tournaments": ["admin", "staff"],

  // Choix sport et tournois : admin et staff
  "/choix-sport": ["admin", "staff"],
  "/choix-sport/tournaments": ["admin", "staff"],

  // Table de marquage (scores en direct) : admin, staff et technicien
  "/choix-sport/tournaments/table-marquage": ["admin", "staff", "technicien"],

  // Tableau des scores finaux : admin, staff et technicien
  "/tableau-scores": ["admin", "staff", "technicien"],

  // Scores en direct : admin, staff et technicien
  "/scores-direct": ["admin", "staff", "technicien"],

  // Page d'accueil : tous les roles authentifies
  "/": ["admin", "staff", "technicien"],

  // Page unauthorized : accessible a tous (pour afficher le message)
  "/unauthorized": ["admin", "staff", "technicien"],
}

// Fonction pour verifier si un role a acces a une route
function hasAccess(pathname: string, userRole: UserRole | undefined): boolean {
  if (!userRole) return false

  // Trier les routes par longueur decroissante pour matcher les plus specifiques en premier
  const sortedRoutes = Object.entries(ROUTE_PERMISSIONS).sort(
    (a, b) => b[0].length - a[0].length
  )

  // Chercher une correspondance exacte ou par prefixe (plus specifique d'abord)
  for (const [route, allowedRoles] of sortedRoutes) {
    if (pathname === route || (route !== "/" && pathname.startsWith(route + "/"))) {
      return allowedRoles.includes(userRole)
    }
  }

  // Verifier la route racine "/" explicitement
  if (pathname === "/") {
    const rootRoles = ROUTE_PERMISSIONS["/"]
    if (rootRoles) {
      return rootRoles.includes(userRole)
    }
  }

  // Si la route n'est pas dans la config, autoriser par defaut (pour les routes non listees)
  return true
}

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role as UserRole | undefined
  const { pathname } = req.nextUrl

  // Pages publiques qui ne necessitent pas d'authentification
  const publicPaths = ["/login", "/api/auth"]
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // Si l'utilisateur n'est pas connecte et essaie d'acceder a une page protegee
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    return NextResponse.redirect(loginUrl)
  }

  // Si l'utilisateur est connecte et essaie d'acceder a /login, rediriger vers /
  if (isLoggedIn && pathname === "/login") {
    const homeUrl = new URL("/", req.nextUrl.origin)
    return NextResponse.redirect(homeUrl)
  }

  // Verifier les permissions basees sur le role
  if (isLoggedIn && !isPublicPath) {
    if (!hasAccess(pathname, userRole)) {
      // Rediriger vers une page "acces refuse" ou le dashboard
      const unauthorizedUrl = new URL("/unauthorized", req.nextUrl.origin)
      return NextResponse.redirect(unauthorizedUrl)
    }
  }

  return NextResponse.next()
})

// Configurer les routes sur lesquelles le middleware s'applique
export const config = {
  matcher: [
    // Proteger toutes les routes sauf les fichiers statiques
    "/((?!_next/static|_next/image|favicon.ico|img|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
}
