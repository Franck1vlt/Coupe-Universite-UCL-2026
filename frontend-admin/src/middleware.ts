import { auth } from "../auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Pages publiques qui ne nécessitent pas d'authentification
  const publicPaths = ["/login", "/api/auth"]
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une page protégée
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    return NextResponse.redirect(loginUrl)
  }

  // Si l'utilisateur est connecté et essaie d'accéder à /login, rediriger vers /
  if (isLoggedIn && pathname === "/login") {
    const homeUrl = new URL("/", req.nextUrl.origin)
    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
})

// Configurer les routes sur lesquelles le middleware s'applique
export const config = {
  matcher: [
    // Protéger toutes les routes sauf les fichiers statiques
    "/((?!_next/static|_next/image|favicon.ico|img|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
}
