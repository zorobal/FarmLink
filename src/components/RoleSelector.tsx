/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole, Profile } from '../types';
import { User, Shield, Tractor, Truck, Users, Globe, RotateCcw } from 'lucide-react';

interface RoleSelectorProps {
  currentProfile: Profile;
  profiles: Profile[];
  onProfileChange: (profile: Profile) => void;
  language: 'FR' | 'EN';
  onLanguageChange: (lang: 'FR' | 'EN') => void;
  onResetDb: () => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  currentProfile,
  profiles,
  onProfileChange,
  language,
  onLanguageChange,
  onResetDb
}) => {
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'superadmin':
        return <Shield className="w-4 h-4 text-rose-500" />;
      case 'admin_regional':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'vendeur':
        return <Tractor className="w-4 h-4 text-emerald-500" />;
      case 'livreur':
        return <Truck className="w-4 h-4 text-amber-500" />;
      default:
        return <User className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'superadmin':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'admin_regional':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'vendeur':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'livreur':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Pre-grouped categories for easy switching
  const clientProfile: Profile = { id: "client-guest", name: "Client Visiteur", email: "", phone: "", role: "client" };

  return (
    <div id="simulation-bar" className="bg-white text-gray-900 py-2.5 px-6 border-b border-gray-200 shadow-xs shrink-0">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Branding & Bilingual Toggle */}
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-xs rotate-45"></div>
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight">
              FarmLink<span className="text-green-600">Pro</span>
            </span>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase font-mono font-bold">Prototype V1.0</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-lang-toggle"
              onClick={() => onLanguageChange(language === 'FR' ? 'EN' : 'FR')}
              className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-green-700 px-2 py-1 rounded transition border border-gray-250 font-mono font-bold"
              title="Changer de langue / Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-green-600" />
              <span>{language}</span>
            </button>

            <button
              id="btn-db-reset"
              onClick={() => {
                if (confirm(language === 'FR' ? "Réinitialiser la base de données ?" : "Reset Database?")) {
                  onResetDb();
                }
              }}
              className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded transition border border-red-200 font-medium"
              title="Réinitialiser la DB d'origine / Factory Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'FR' ? "Réinitialiser" : "Reset DB"}</span>
            </button>
          </div>
        </div>

        {/* User Switcher Dropdown and Info */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-500 font-semibold font-mono uppercase tracking-wider text-[10px]">
            {language === 'FR' ? 'Simuler un rôle :' : 'Simulate Role :'}
          </span>
          <div className="relative">
            <select
              id="select-role-simulator"
              value={currentProfile.id}
              onChange={(e) => {
                if (e.target.value === "client-guest") {
                  onProfileChange(clientProfile);
                } else {
                  const found = profiles.find(p => p.id === e.target.value);
                  if (found) onProfileChange(found);
                }
              }}
              className="bg-gray-50 text-gray-900 text-xs rounded border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer w-64 font-medium"
            >
              <option value="client-guest">🛒 {language === 'FR' ? 'Client (Acheteur / Visiteur)' : 'Client (Buyer / Guest)'}</option>
              
              <optgroup label="👑 Super Administrateur">
                {profiles.filter(p => p.role === 'superadmin').map(p => (
                  <option key={p.id} value={p.id}>🛡️ {p.name}</option>
                ))}
              </optgroup>

              <optgroup label="📍 Administrateurs Régionaux">
                {profiles.filter(p => p.role === 'admin_regional').map(p => (
                  <option key={p.id} value={p.id}>🏢 {p.name}</option>
                ))}
              </optgroup>

              <optgroup label="🚜 Producteurs / Vendeurs">
                {profiles.filter(p => p.role === 'vendeur').map(p => (
                  <option key={p.id} value={p.id}>🌾 {p.name}</option>
                ))}
              </optgroup>

              <optgroup label="🚚 Livreurs de Proximité">
                {profiles.filter(p => p.role === 'livreur').map(p => (
                  <option key={p.id} value={p.id}>🛵 {p.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Active Role Details */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-xs border rounded px-2.5 py-1 font-bold tracking-wide uppercase text-[10px] ${getRoleBadgeColor(currentProfile.role)}`}>
              {getRoleIcon(currentProfile.role)}
              <span className="capitalize">{currentProfile.role.replace('_', ' ')}</span>
            </div>
            {currentProfile.regionId && (
              <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200 rounded px-2 py-1 font-mono font-bold uppercase">
                {currentProfile.regionId === 'reg-ce' ? 'Centre' : currentProfile.regionId === 'reg-lt' ? 'Littoral' : 'Ouest'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
