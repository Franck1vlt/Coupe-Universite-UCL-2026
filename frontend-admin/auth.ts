import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"

// Roles disponibles
export type UserRole = "admin" | "staff" | "technicien"

// Extension du type Session pour inclure le role et le token
declare module "next-auth" {
  interface User {
    role: UserRole
    accessToken?: string
  }
  interface Session {
    user: {
      id: string
      name: string
      role: UserRole
    } & DefaultSession["user"]
    accessToken?: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole
    accessToken?: string
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials.username as string
        const password = credentials.password as string

        try {
          // Essayer d'abord l'API backend
          const apiUrl =
            process.env.API_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            "http://localhost:8000"
          const response = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log("Backend /auth/login response:", data)
            const user = {
              id: data.user.id,
              name: data.user.username,
              role: data.user.role as UserRole,
              accessToken: data.access_token,
            }
            console.log("Returning user object:", user)
            return user
          }
        } catch (error) {
          console.log("Backend API not available, falling back to env credentials")
        }

        // Fallback: Verifier Admin via env
        if (
          username === process.env.ADMIN_USERNAME &&
          password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "env_admin", name: "Admin", role: "admin" as UserRole }
        }

        // Fallback: Verifier Staff via env
        if (
          username === process.env.STAFF_USERNAME &&
          password === process.env.STAFF_PASSWORD
        ) {
          return { id: "env_staff", name: "Staff", role: "staff" as UserRole }
        }

        // Fallback: Verifier Technicien via env
        if (
          username === process.env.TECHNICIAN_USERNAME &&
          password === process.env.TECHNICIAN_PASSWORD
        ) {
          return { id: "env_tech", name: "Technician", role: "technicien" as UserRole }
        }

        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log("JWT callback - user:", user)
      console.log("JWT callback - token before:", token)
      if (user) {
        token.role = user.role
        token.accessToken = user.accessToken
        console.log("JWT callback - token after:", token)
      }
      return token
    },
    async session({ session, token }) {
      console.log("Session callback - token:", token)
      console.log("Session callback - session before:", session)
      if (session.user) {
        session.user.role = token.role as UserRole
        session.user.id = token.sub || ""
      }
      session.accessToken = token.accessToken
      console.log("Session callback - session after:", session)
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
