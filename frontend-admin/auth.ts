import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

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

        // Vérifier Admin
        if (
          username === process.env.ADMIN_USERNAME &&
          password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "1", name: "Admin" }
        }

        // Vérifier Staff
        if (
          username === process.env.STAFF_USERNAME &&
          password === process.env.STAFF_PASSWORD
        ) {
          return { id: "2", name: "Staff" }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
})