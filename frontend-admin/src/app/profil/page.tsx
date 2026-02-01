"use client";

import { useRouter } from "next/navigation";
import { usePermissions, PERMISSIONS, type PermissionKey } from "../../hooks/usePermissions";

// Labels français pour les permissions
const PERMISSION_LABELS: Record<PermissionKey, string> = {
  config_coupe: "Configuration de la Coupe",
  tournois_tableaux: "Tournois et tableaux",
  scores_finaux: "Tableau des scores finaux",
  scores_direct: "Scores en direct",
  gestion_equipes: "Gestion des équipes",
  gestion_sports: "Gestion des sports",
  gestion_terrains: "Gestion des terrains",
  lecture: "Lecture seule",
};

// Descriptions des rôles
const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Accès complet à toutes les fonctionnalités de l'application. Peut gérer les utilisateurs, configurer les tournois et modifier tous les paramètres.",
  staff: "Peut gérer les tournois, les équipes et les terrains. Accès aux tableaux de scores.",
  technicien: "Accès aux scores en direct et au tableau des scores finaux. Idéal pour la gestion technique pendant les matchs.",
};

export default function ProfilPage() {
  const router = useRouter();
  const { userName, userRole, isAdmin, hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Couleur du badge selon le rôle
  const roleBadgeColors: Record<string, string> = {
    admin: "bg-red-100 text-red-700 border-red-200",
    staff: "bg-blue-100 text-blue-700 border-blue-200",
    technicien: "bg-green-100 text-green-700 border-green-200",
  };
  const roleBadgeColor = roleBadgeColors[userRole || ""] || "bg-gray-100 text-gray-700 border-gray-200";

  // Initiales pour l'avatar
  const initials = userName
    ? userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Bouton retour */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 mb-6 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour à l'accueil
        </button>

        {/* Header du profil */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="px-6 pt-16 pb-6">
            <div className="flex items-end -mt-12 mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                {initials}
              </div>
              <div className="ml-4 pb-2">
                <h1 className="text-2xl font-bold text-gray-800">{userName || "Utilisateur"}</h1>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${roleBadgeColor}`}>
                  {userRole?.toUpperCase() || "INCONNU"}
                </span>
              </div>
            </div>
            <p className="text-gray-600">
              {ROLE_DESCRIPTIONS[userRole || ""] || "Rôle non défini"}
            </p>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Vos permissions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.keys(PERMISSIONS) as PermissionKey[]).map((key) => {
              const hasAccess = hasPermission(key);
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    hasAccess
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <span className={hasAccess ? "text-gray-800" : "text-red-400"}>
                    {PERMISSION_LABELS[key]}
                  </span>
                  {hasAccess ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lien admin si admin */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Administration
            </h2>
            <p className="text-gray-600 mb-4">
              En tant qu'administrateur, vous avez accès à la gestion des utilisateurs.
            </p>
            <button
              onClick={() => router.push("/admin/utilisateurs")}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Gérer les utilisateurs
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
