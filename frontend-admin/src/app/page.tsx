"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

const links = [
  {
    href: "/configuration-coupe",
    title: "Configuration de la Coupe",
    description: "Accéder à la configuration",
    color: "bg-white hover:bg-blue-50",
    icon: (
      <svg
        className="mx-auto mb-3 h-9 w-9 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          strokeWidth={1.5}
          stroke="currentColor"
          fill="none"
        />
        <path
          d="M12 7v5l3 3"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/choix-sport",
    title: "Tournois et tableaux",
    description: "Accéder aux tournois et tableaux",
    color: "bg-white hover:bg-blue-50",
    icon: (
      <svg
        className="mx-auto mb-3 h-9 w-9 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          d="M3 7a2 2 0 012-2h2.28a2 2 0 011.72 1.06l.72 1.28H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/tableau-scores",
    title: "Tableau des scores finaux",
    description: "Filtrer par sport",
    color: "bg-white hover:bg-green-50",
    icon: (
      <svg
        className="mx-auto mb-3 h-9 w-9 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          d="M4 6h16M4 10h16M4 14h16M4 18h16"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/scores-direct",
    title: "Scores en direct",
    description: "Pour la technique",
    color: "bg-gradient-to-tr from-red-100 via-orange-100 to-yellow-100 hover:from-red-200 hover:via-orange-200 hover:to-yellow-200",
    icon: (
      <svg
        className="mx-auto mb-3 h-9 w-9 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          d="M12 6v6l4 2"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="10" strokeWidth={1.5} stroke="currentColor" fill="none"/>
      </svg>
    ),
  },
];

export default function StaffHome() {
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Bouton de déconnexion */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="absolute top-4 right-4 p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Se déconnecter"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>

      <header className="mb-12 text-center">
        <img
          src="/img/coupe.png"
          alt="Logo Coupe de l'Université"
          className="mx-auto mb-6 h-24 w-24 object-contain"
        />
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Interface STAFF</h1>
        <p className="text-gray-600 text-lg">
          Accédez à la configuration des tournois, aux matchs en direct et au classements.
        </p>
      </header>

      <section
        className="
          w-full
          max-w-5xl
          grid
          gap-8
          grid-cols-1
          sm:grid-cols-2
          md:grid-cols-4
          p-2
          "
      >
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              group
              ${item.color}
              rounded-2xl
              shadow-lg
              p-8
              flex flex-col items-center
              text-center
              border-2 border-transparent
              transition-all
              hover:-translate-y-1
              hover:shadow-2xl
              hover:border-blue-300
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-blue-400
              cursor-pointer
              `}
          >
            {item.icon}
            <h2 className="text-2xl font-semibold text-gray-800 mb-2 group-hover:underline underline-offset-4 transition">
              {item.title}
            </h2>
            <p className="text-gray-600">{item.description}</p>
          </Link>
        ))}
      </section>

      {/* Footer Copyright */}
      <footer className="mt-16 text-center text-gray-600 text-sm">
        <p>&copy; {new Date().getFullYear()} Coupe de l'Université. Tous droits réservés.</p>
      </footer>
    </main>
  );
}