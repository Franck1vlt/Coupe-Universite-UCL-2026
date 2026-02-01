"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { usePermissions } from "../hooks/usePermissions";

// Composant Avatar Utilisateur avec Dropdown
function UserAvatar() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { userName, userRole, isAdmin, isLoading } = usePermissions();

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) return null;

  // Initiales pour l'avatar
  const initials = userName
    ? userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  // Couleur du badge selon le rôle
  const roleBadgeColors: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    staff: "bg-blue-100 text-blue-700",
    technicien: "bg-green-100 text-green-700",
  };
  const roleBadgeColor = roleBadgeColors[userRole || ""] || "bg-gray-100 text-gray-700";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton Avatar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        title={userName || "Utilisateur"}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
          {initials}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header avec infos utilisateur */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{userName || "Utilisateur"}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColor}`}>
                  {userRole?.toUpperCase() || "INCONNU"}
                </span>
              </div>
            </div>
          </div>

          {/* Options du menu */}
          <div className="py-1">
            {/* Lien vers Mon Profil */}
            <Link
              href="/profil"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Mon profil
            </Link>

            {/* Gestion des utilisateurs - Admin uniquement */}
            {isAdmin && (
              <Link
                href="/admin/utilisateurs"
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Gérer les utilisateurs
                <span className="ml-auto px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded font-medium">
                  Admin
                </span>
              </Link>
            )}
          </div>

          {/* Séparateur */}
          <div className="border-t border-gray-100 my-1"></div>

          {/* Déconnexion */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

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
      {/* Avatar User avec dropdown (profil, déconnexion, admin) */}
      <div className="absolute top-4 right-4">
        <UserAvatar />
      </div>


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