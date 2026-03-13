"use client";

import ContactCard from "./ContactCard";

interface Contact {
  name: string;
  role: string;
}

const contacts: Contact[] = [
  {
    name: "Julien Croppi",
    role: "Responsable Général Technique",
  },
  {
    name: "Nathanaël Chombard",
    role: "Responsable Gestion Sportive",
  },
  {
    name: "Thomas Courtois",
    role: "Responsable Bénévoles",
  },
  {
    name: "Eva Mercier",
    role: "Responsable Bénévoles",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8">
      <button
        onClick={() => window.history.back()}
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

      <header className="mb-10 text-center">
        <img
          src="/img/coupe.png"
          alt="Logo Coupe de l'Université"
          className="mx-auto mb-6 h-24 w-24 object-contain"
        />
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Contact</h1>
        <p className="text-gray-600 text-lg">
          Retrouvez ici les contacts de l&apos;organisation de la Coupe de
          l&apos;Université selon votre besoin.
        </p>
      </header>

      <section className="w-full px-2 sm:px-4 max-w-6xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-items-center">
          {contacts.map((contact, idx) => (
            <ContactCard key={idx} name={contact.name} role={contact.role} />
          ))}
        </div>
      </section>
    </main>
  );
}
