"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const links = [
  {
    href: "/configuration-coupe/sports",
    title: "Les Sports",
    description: "Voir et gérer la liste des sports",
    color: "bg-white hover:bg-blue-50",
    icon: (
      <svg
        className="mx-auto mb-3 h-9 w-9 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} stroke="currentColor" fill="none" />
        <path
          d="M8 12l2 2 4-4"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/configuration-coupe/teams",
    title: "Les équipes",
    description: "Voir et gérer les équipes participantes",
    color: "bg-white hover:bg-green-50",
    icon: (
      <svg
        className="mx-auto mb-3 h-9 w-9 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <circle cx="8.5" cy="10.5" r="4" strokeWidth={1.5} stroke="currentColor" fill="none" />
        <circle cx="17" cy="14" r="3" strokeWidth={1.5} stroke="currentColor" fill="none" />
        <path
          d="M2 20c0-3 5.5-5 8.5-5s8.5 2 8.5 5"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/configuration-coupe/courts",
    title: "Les terrains",
    description: "Voir et gérer les terrains et salles de sport",
    color: "bg-white hover:bg-red-100 border border-red-200", // Met plus en valeur le rouge
    icon: (
      // SVG terrain en ROUGE (remplace text-red-500 par text-red-600)
      <svg
        className="mx-auto mb-3 h-9 w-9 text-red-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        {/* Rectangle du terrain en rouge plus épais */}
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="4"
          stroke="currentColor"
          strokeWidth={2}
          fill="none"
        />
        {/* Ligne médiane */}
        <line
          x1="12"
          y1="3"
          x2="12"
          y2="21"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeDasharray="2,2"
        />
        {/* Point central */}
        <circle
          cx="12"
          cy="12"
          r="1.5"
          stroke="currentColor"
          strokeWidth={1.5}
          fill="none"
        />
        {/* Demi-cercle gauche */}
        <path
          d="M3 8.5 Q7 12 3 15.5"
          stroke="currentColor"
          strokeWidth={1.2}
          fill="none"
        />
        {/* Demi-cercle droit */}
        <path
          d="M21 8.5 Q17 12 21 15.5"
          stroke="currentColor"
          strokeWidth={1.2}
          fill="none"
        />
      </svg>
    ),
  },
  {
    href: "/configuration-coupe/tournaments",
    title: "Création d'un tournois",
    description: "Créer un nouveau tournois sportif",
    color: "bg-white hover:bg-yellow-50",
    icon: (
      <svg
        className="mx-auto mb-3 h-9 w-9 text-yellow-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <rect x="4" y="4" width="16" height="16" rx="4" strokeWidth={1.5} stroke="currentColor" fill="none" />
        <path
          d="M12 8v8M8 12h8"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function StaffHome() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Bouton retour en haut à gauche */}
      <button
        onClick={() => router.push("/")}
        className="absolute left-4 top-4 flex items-center gap-2 bg-white rounded-full shadow px-4 py-2 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Retour"
      >
        <svg
          className="w-5 h-5 text-blue-600"
          fill="none"
          viewBox="0 0 20 20"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4l-6 6m0 0l6 6m-6-6h14"
          />
        </svg>
        <span className="text-blue-700 font-medium">Retour</span>
      </button>
      <header className="mb-12 text-center">
        <img
          src="/img/coupe.png"
          alt="Logo Coupe Universitaire"
          className="mx-auto mb-6 h-24 w-24 object-contain"
        />
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Configuration de la Coupe</h1>
        <p className="text-gray-600 text-lg">
          Gérer les sports, équipes et tournois de la Coupe de l'Université
        </p>
      </header>
      {/* Pour avoir 4 liens sur une seule ligne : */}
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
    </main>
  );
}