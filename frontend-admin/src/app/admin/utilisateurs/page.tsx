"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "../../../hooks/usePermissions";
import { useApi } from "../../../hooks/useApi";

// Interface utilisateur
interface User {
  id: number;
  email: string;
  username: string | null;
  full_name: string | null;
  role: "admin" | "staff" | "technicien";
  is_active: boolean;
  is_deletable: boolean;
  has_temp_password: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string | null;
  masked_password?: string;
}

// Interface pour les permissions disponibles
interface AvailablePermission {
  key: string;
  label: string;
  description: string;
}

// Liste des permissions disponibles (définies côté frontend pour éviter un appel API supplémentaire)
const AVAILABLE_PERMISSIONS: AvailablePermission[] = [
  { key: "config_coupe", label: "Configuration de la Coupe", description: "Accès à la configuration générale" },
  { key: "tournois_tableaux", label: "Tournois & Tableaux", description: "Gestion des tournois" },
  { key: "scores_finaux", label: "Scores Finaux", description: "Accès aux scores finaux" },
  { key: "scores_direct", label: "Scores en Direct", description: "Mise à jour des scores en temps réel" },
  { key: "gestion_equipes", label: "Gestion des Équipes", description: "Création et gestion des équipes" },
  { key: "gestion_sports", label: "Gestion des Sports", description: "Configuration des sports" },
  { key: "gestion_terrains", label: "Gestion des Terrains", description: "Gestion des terrains" },
];

// Permissions par défaut selon le rôle
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["config_coupe", "tournois_tableaux", "scores_finaux", "scores_direct", "gestion_equipes", "gestion_sports", "gestion_terrains"],
  staff: ["tournois_tableaux", "scores_finaux", "gestion_equipes", "gestion_terrains"],
  technicien: ["scores_finaux", "scores_direct"],
};

// Modal de modification d'utilisateur (email, username, full_name, role, permissions, mot de passe)
function EditUserModal({
  user,
  onClose,
  onSave,
  isLoading,
}: {
  user: User;
  onClose: () => void;
  onSave: (userId: number, userData: { email?: string; username?: string; full_name?: string; role?: string; permissions?: string[]; new_password?: string }) => Promise<void>;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username || "");
  const [fullName, setFullName] = useState(user.full_name || "");
  const [role, setRole] = useState(user.role);
  const [permissions, setPermissions] = useState<string[]>(user.permissions || []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const isAdminPrincipal = user && user.is_deletable === false;

  // Permissions accordées par le rôle (lecture seule)
  const rolePermissions = ROLE_PERMISSIONS[role] || [];

  // Toggle une permission individuelle
  const togglePermission = (permKey: string) => {
    if (permissions.includes(permKey)) {
      setPermissions(permissions.filter(p => p !== permKey));
    } else {
      setPermissions([...permissions, permKey]);
    }
  };

  const handleSave = async () => {
    // Validation du mot de passe si renseigné
    if (newPassword) {
      if (newPassword.length < 4) {
        setError("Le mot de passe doit contenir au moins 4 caractères");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas");
        return;
      }
    }

    // Validation email
    if (!email) {
      setError("L'email est requis");
      return;
    }

    // Construire les données à envoyer (seulement les champs modifiés)
    const userData: { email?: string; username?: string; full_name?: string; role?: string; permissions?: string[]; new_password?: string } = {};

    if (!isAdminPrincipal) {
      if (email !== user.email) userData.email = email;
      if (username !== (user.username || "")) userData.username = username || undefined;
      if (fullName !== (user.full_name || "")) userData.full_name = fullName || undefined;
      if (role !== user.role) userData.role = role;

      // Comparer les permissions (toujours envoyer si différentes)
      const originalPerms = JSON.stringify((user.permissions || []).sort());
      const newPerms = JSON.stringify(permissions.sort());
      if (originalPerms !== newPerms) {
        userData.permissions = permissions;
      }
    }

    if (newPassword) {
      userData.new_password = newPassword;
    }

    await onSave(user.id, userData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Modifier l'utilisateur</h2>
          <p className="text-blue-100 text-sm">{user.full_name || user.username || user.email}</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                readOnly={isAdminPrincipal}
                disabled={isAdminPrincipal}
                className={`w-full px-4 py-2 border rounded-lg ${
                  isAdminPrincipal
                    ? "border-gray-200 bg-gray-100"
                    : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
                placeholder="email@example.com"
              />
            </div>

            {/* Nom d'utilisateur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                readOnly={isAdminPrincipal}
                disabled={isAdminPrincipal}
                className={`w-full px-4 py-2 border rounded-lg ${
                  isAdminPrincipal
                    ? "border-gray-200 bg-gray-100"
                    : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
                placeholder="nom_utilisateur"
              />
            </div>

            {/* Nom complet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(""); }}
                readOnly={isAdminPrincipal}
                disabled={isAdminPrincipal}
                className={`w-full px-4 py-2 border rounded-lg ${
                  isAdminPrincipal
                    ? "border-gray-200 bg-gray-100"
                    : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
                placeholder="Prénom Nom"
              />
            </div>

            {/* Rôle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
              {isAdminPrincipal ? (
                <input
                  type="text"
                  value={role.toUpperCase()}
                  readOnly
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 bg-gray-100 rounded-lg"
                />
              ) : (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "admin" | "staff" | "technicien")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="staff">Staff</option>
                  <option value="technicien">Technicien</option>
                  <option value="admin">Administrateur</option>
                </select>
              )}
            </div>

            {/* Permissions */}
            {!isAdminPrincipal && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions supplémentaires
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Cochez les permissions à ajouter en plus de celles du rôle. Les permissions grisées sont déjà incluses dans le rôle.
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isRolePermission = rolePermissions.includes(perm.key);
                    const isChecked = isRolePermission || permissions.includes(perm.key);

                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          isRolePermission
                            ? "bg-blue-50 cursor-not-allowed"
                            : isChecked
                            ? "bg-green-50 hover:bg-green-100"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isRolePermission}
                          onChange={() => !isRolePermission && togglePermission(perm.key)}
                          className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isRolePermission ? "text-blue-700" : "text-gray-700"}`}>
                              {perm.label}
                            </span>
                            {isRolePermission && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                                Inclus dans le rôle
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{perm.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Séparateur mot de passe */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-sm text-gray-500 mb-3">
                Modifier le mot de passe (laisser vide pour ne pas changer)
              </p>
            </div>

            {/* Nouveau mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Laisser vide pour ne pas changer"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirmer mot de passe */}
            {newPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirmez le mot de passe"
                />
              </div>
            )}
          </div>

          {isAdminPrincipal && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-700">
                  L'administrateur principal ne peut pas avoir son email, nom d'utilisateur, nom complet ou rôle modifiés. Seul le mot de passe peut être changé.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal d'ajout d'utilisateur
function AddUserModal({
  onClose,
  onSave,
  isLoading,
}: {
  onClose: () => void;
  onSave: (userData: { email: string; username: string; full_name: string; password: string; role: string }) => Promise<void>;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!email) {
      setError("L'email est requis");
      return;
    }
    if (!username) {
      setError("Le nom d'utilisateur est requis");
      return;
    }
    if (password.length < 4) {
      setError("Le mot de passe doit contenir au moins 4 caractères");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    await onSave({ email, username, full_name: fullName, password, role });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-500 to-teal-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Ajouter un utilisateur</h2>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="nom_utilisateur"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Prénom Nom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="staff">Staff</option>
                <option value="technicien">Technicien</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Min. 4 caractères"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe *</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Confirmez le mot de passe"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Création..." : "Créer l'utilisateur"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de confirmation de suppression
function DeleteConfirmModal({
  user,
  onClose,
  onConfirm,
  isLoading,
}: {
  user: User;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-orange-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Confirmer la suppression</h2>
        </div>

        <div className="p-6">
          <p className="text-gray-700">
            Êtes-vous sûr de vouloir supprimer l'utilisateur{" "}
            <span className="font-semibold">{user.full_name || user.username || user.email}</span> ?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Cette action est irréversible.
          </p>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal affichant le mot de passe temporaire
function TempPasswordModal({
  tempPassword,
  username,
  onClose,
}: {
  tempPassword: string;
  username: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Mot de passe temporaire</h2>
          <p className="text-amber-100 text-sm">{username}</p>
        </div>

        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <code className="text-lg font-mono font-bold text-amber-800">{tempPassword}</code>
              <button
                onClick={copyToClipboard}
                className="ml-4 px-3 py-1 bg-amber-200 hover:bg-amber-300 rounded text-amber-800 text-sm transition-colors"
              >
                {copied ? "Copié !" : "Copier"}
              </button>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-red-700">
                <p className="font-medium">Important !</p>
                <p>Notez ce mot de passe maintenant. Il ne sera plus affiché après fermeture de cette fenêtre.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            J'ai noté le mot de passe
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUtilisateursPage() {
  const router = useRouter();
  const { isAdmin, isLoading: permissionsLoading } = usePermissions();
  const { fetchWithAuth } = useApi();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modals
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [tempPasswordData, setTempPasswordData] = useState<{ password: string; username: string } | null>(null);

  // Charger les utilisateurs
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      // Appel direct à l'API GET /users (backend)
      const response = await fetchWithAuth("/users");

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError("Erreur lors du chargement des utilisateurs");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (!permissionsLoading && isAdmin) {
      loadUsers();
    }
  }, [permissionsLoading, isAdmin, loadUsers]);

  // Redirection si non admin
  if (!permissionsLoading && !isAdmin) {
    router.push("/");
    return null;
  }

  if (permissionsLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Modifier un utilisateur (infos + permissions + mot de passe optionnel)
  const handleUpdateUser = async (userId: number, userData: { email?: string; username?: string; full_name?: string; role?: string; permissions?: string[]; new_password?: string }) => {
    try {
      setActionLoading(true);

      // Séparer les données utilisateur et le mot de passe
      const { new_password, ...userInfoData } = userData;

      // Mettre à jour les infos utilisateur si nécessaire (y compris permissions)
      if (Object.keys(userInfoData).length > 0) {
        const userResponse = await fetchWithAuth(`/users/${userId}`, {
          method: "PATCH",
          body: JSON.stringify(userInfoData),
        });

        if (!userResponse.ok) {
          const data = await userResponse.json();
          setError(data.detail || "Erreur lors de la mise à jour des informations");
          return;
        }
      }

      // Mettre à jour le mot de passe si fourni
      if (new_password) {
        const passwordResponse = await fetchWithAuth(`/users/${userId}/password`, {
          method: "PATCH",
          body: JSON.stringify({ new_password }),
        });

        if (!passwordResponse.ok) {
          const data = await passwordResponse.json();
          setError(data.detail || "Erreur lors de la mise à jour du mot de passe");
          return;
        }
      }

      setSuccessMessage("Utilisateur mis à jour avec succès");
      setEditingUser(null);
      loadUsers();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setActionLoading(false);
    }
  };

  // Ajouter un utilisateur
  const handleAddUser = async (userData: { email: string; username: string; full_name: string; password: string; role: string }) => {
    try {
      setActionLoading(true);
      const response = await fetchWithAuth("/users", {
        method: "POST",
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        setSuccessMessage("Utilisateur créé avec succès");
        setShowAddModal(false);
        loadUsers();
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const data = await response.json();
        setError(data.detail || "Erreur lors de la création");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setActionLoading(false);
    }
  };

  // Supprimer un utilisateur
  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      setActionLoading(true);
      const response = await fetchWithAuth(`/users/${deletingUser.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccessMessage("Utilisateur supprimé avec succès");
        setDeletingUser(null);
        loadUsers();
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const data = await response.json();
        setError(data.detail || "Erreur lors de la suppression");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setActionLoading(false);
    }
  };

  // Réinitialiser le mot de passe (générer mot de passe temporaire)
  const handleResetPassword = async (userId: number) => {
    try {
      setActionLoading(true);
      const response = await fetchWithAuth(`/users/${userId}/reset-password`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setTempPasswordData({
          password: data.temp_password,
          username: data.username,
        });
        loadUsers();
      } else {
        const data = await response.json();
        setError(data.detail || "Erreur lors de la réinitialisation");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setActionLoading(false);
    }
  };

  // Couleur du badge selon le role
  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-700",
      staff: "bg-blue-100 text-blue-700",
      technicien: "bg-green-100 text-green-700",
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Bouton retour */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 mb-6 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Gestion des utilisateurs</h1>
                <p className="text-gray-600">Gérez les comptes et les mots de passe des utilisateurs</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un utilisateur
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-700">{successMessage}</span>
          </div>
        )}

        {/* Tableau des utilisateurs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Utilisateur</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Rôle</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Statut</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mot de passe</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {(user.full_name || user.username || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-gray-800">{user.full_name || user.username || "-"}</p>
                            {!user.is_deletable && (
                              <span title="Administrateur principal" className="ml-1 text-gray-400 align-middle">
                                <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17a2 2 0 002-2v-2a2 2 0 00-2-2 2 2 0 00-2 2v2a2 2 0 002 2zm6-6V9a6 6 0 10-12 0v2a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2z" />
                                </svg>
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">@{user.username || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{user.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            Inactif
                          </span>
                        )}
                        {user.has_temp_password && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            MDP temporaire
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {user.masked_password || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Modifier mot de passe */}
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier l'utilisateur"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        {/* Réinitialiser mot de passe */}
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Générer un mot de passe temporaire"
                          disabled={actionLoading}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>

                        {/* Supprimer (si deletable) */}
                        {user.is_deletable ? (
                          <button
                            onClick={() => setDeletingUser(user)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer l'utilisateur"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        ) : (
                          <div
                            className="p-2 text-gray-300 cursor-not-allowed"
                            title="Cet utilisateur ne peut pas être supprimé"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Aucun utilisateur trouvé
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-700">
              <p className="font-medium">Information</p>
              <p>Les utilisateurs sont stockés dans la base de données. L'administrateur principal (marqué par un cadenas) ne peut pas être supprimé pour garantir l'accès au système.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleUpdateUser}
          isLoading={actionLoading}
        />
      )}

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddUser}
          isLoading={actionLoading}
        />
      )}

      {deletingUser && (
        <DeleteConfirmModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteUser}
          isLoading={actionLoading}
        />
      )}

      {tempPasswordData && (
        <TempPasswordModal
          tempPassword={tempPasswordData.password}
          username={tempPasswordData.username}
          onClose={() => setTempPasswordData(null)}
        />
      )}
    </main>
  );
}
