"use client";

import Link from "next/link";

const links = [
  {
    href: "/tournois",
    title: "Tournois et programmation",
    description: "Consultez la liste des tournois et leur programmation.",
    color: "bg-white border border-blue-300 hover:bg-blue-50",
    icon: (
      <svg
        className="mx-auto mb-3 h-9 w-9 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={1.5} stroke="currentColor" fill="none" />
        <path d="M7 3v4M17 3v4" strokeWidth={1.5} strokeLinecap="round" />
        <path d="M3 9h18" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/tableau-scores",
    title: "Tableau des scores finaux",
    description: "Visualisez et filtrez les scores finaux par sport.",
    color: "bg-white border border-green-300 hover:bg-green-50",
    icon: (
      <svg
        className="mx-auto mb-3 h-9 w-9 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <rect x="4" y="6" width="16" height="12" rx="2" strokeWidth={1.5} stroke="currentColor" fill="none" />
        <path d="M8 10v4M12 8v6M16 12v2" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/FAQ",
    title: "FAQ",
    description: "Trouvez les réponses aux questions fréquentes.",
    color: "bg-white border border-yellow-300 hover:bg-yellow-50",
    icon: (
      <svg
        className="mx-auto mb-3 h-9 w-9 text-yellow-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.5} fill="none" />
        <path
          d="M12 16h.01M12 12a2 2 0 10-2-2"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <path
          d="M12 14v2"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/contact",
    title: "Contact",
    description: "Contactez l'organisation pour toute question.",
    color: "bg-white border border-purple-300 hover:bg-purple-50",
    icon: (
      <svg
        className="mx-auto mb-3 h-9 w-9 text-purple-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          d="M16 12H8m0 0l4-4m-4 4l4 4"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.5} fill="none" />
      </svg>
    ),
  },
];

export default function PublicHome() {
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8 relative">

      <header className="mb-12 text-center">
        <img
          src="/img/coupe.png"
          alt="Logo Coupe de l'Université"
          className="mx-auto mb-6 h-24 w-24 object-contain"
        />
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Coupe de l'Université {new Date().getFullYear()}</h1>
        <p className="text-gray-600 text-lg">
          Découvrez les tournois, consultez les programmations, suivez les scores et trouvez toutes les informations utiles sur la compétition.
        </p>
      </header>

      <section
        className="w-full px-2 sm:px-4 max-w-6xl grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
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
              p-4 sm:p-6 md:p-8
              flex flex-col items-center
              text-center
              border-2
              transition-all
              hover:-translate-y-1
              hover:shadow-2xl
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-blue-400
              cursor-pointer
              min-w-0
            `}
          >
            {item.icon}
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-2 group-hover:underline underline-offset-4 transition break-words">
              {item.title}
            </h2>
            <p className="text-gray-600 text-sm sm:text-base break-words">{item.description}</p>
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