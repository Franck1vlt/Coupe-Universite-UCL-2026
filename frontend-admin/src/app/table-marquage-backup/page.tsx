"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SPORTS = [
  {
    code: "football",
    label: "Football",
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v4m0 10v4M3 12h4m10 0h4M6.34 6.34l2.83 2.83m5.66 5.66l2.83 2.83M6.34 17.66l2.83-2.83m5.66-5.66l2.83-2.83" />
      </svg>
    ),
  },
  {
    code: "handball",
    label: "Handball",
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 6v12" />
      </svg>
    ),
  },
  {
    code: "basketball",
    label: "Basketball",
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c0 5 4 9 9 9M12 3c0 5-4 9-9 9M12 21c0-5 4-9 9-9M12 21c0-5-4-9-9-9" />
      </svg>
    ),
  },
  {
    code: "volleyball",
    label: "Volleyball",
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.5 9.5C7 9 10 6 10.5 3M20.5 9.5C17 9 14 6 13.5 3M12 21v-9" />
      </svg>
    ),
  },
  {
    code: "badminton",
    label: "Badminton",
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3l2 4h4l-3.5 3 1.5 4.5L12 12l-4 2.5 1.5-4.5L6 7h4l2-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12l5 7" />
      </svg>
    ),
  },
  {
    code: "petanque",
    label: "Pétanque",
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="8" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
      </svg>
    ),
  },
  {
    code: "flechettes",
    label: "Fléchettes",
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="5" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="1.5" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3V6M12 18v3M3 12h3M18 12h3" />
      </svg>
    ),
  },
];

export default function TableMarquageBackup() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Bouton retour */}
      <button
        onClick={() => router.push("/")}
        className="absolute left-4 top-4 flex items-center gap-2 bg-white rounded-full shadow px-4 py-2 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Retour"
      >
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 20 20" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4l-6 6m0 0l6 6m-6-6h14" />
        </svg>
        <span className="text-blue-700 font-medium">Retour</span>
      </button>

      <header className="mb-12 text-center">
        <img
          src="/img/coupe.png"
          alt="Logo Coupe Universitaire"
          className="mx-auto mb-6 h-24 w-24 object-contain"
        />
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Table de Marquage Backup</h1>
        <p className="text-gray-600 text-lg">
          Sélectionnez un sport pour ouvrir une table de marquage indépendante.
        </p>
      </header>

      <section className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SPORTS.map((sport) => (
            <Link
              key={sport.code}
              href={`/choix-sport/tournaments/table-marquage/${sport.code}`}
              className="group bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-orange-200 flex flex-col items-center text-center cursor-pointer"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                {sport.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                {sport.label}
              </h3>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
