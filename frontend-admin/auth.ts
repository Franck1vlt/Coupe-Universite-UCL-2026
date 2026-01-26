import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"

// Roles disponibles
export type UserRole = "admin" | "staff" | "technicien"

// Extension du type Session pour inclure le role
declare module "next-auth" {
  interface User {
    role: UserRole
  }
  interface Session {
    user: {
      id: string
      name: string
      role: UserRole
    } & DefaultSession["user"]
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

        // Verifier Admin
        if (
          username === process.env.ADMIN_USERNAME &&
          password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "1", name: "Admin", role: "admin" as UserRole }
        }

        // Verifier Staff
        if (
          username === process.env.STAFF_USERNAME &&
          password === process.env.STAFF_PASSWORD
        ) {
          return { id: "2", name: "Staff", role: "staff" as UserRole }
        }

        // Verifier Technicien
        if (
          username === process.env.TECHNICIAN_USERNAME &&
          password === process.env.TECHNICIAN_PASSWORD
        ) {
          return { id: "3", name: "Technician", role: "technicien" as UserRole }
        }

        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as UserRole
        session.user.id = token.sub || ""
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})