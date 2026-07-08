/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Commande, VendeurDetails, Profile, Category, PrixMarche, DeliveryZone, Region } from '../types';
import { ShieldAlert, Settings, Users, DollarSign, Edit, Check, MapPin, Tag, Plus, Trash, Globe, Shield, X } from 'lucide-react';

interface SuperAdminSpaceProps {
  superAdminProfile: Profile;
  orders: Commande[];
  vendeurs: VendeurDetails[];
  profiles: Profile[];
  categories: Category[];
  prixMarche: PrixMarche[];
  regions: Region[];
  deliveryZones: DeliveryZone[];
  deliveryFeeMatrix: Record<string, Record<string, number>>;
  globalSettings: { commissionRate: number; contactSMSPrestataire: string };
  onUpdateSettings: (settings: any) => Promise<boolean>;
  onUpdateMarketPrice: (categoryId: string, productName: string, price: number) => Promise<boolean>;
  onAddRegionalAdmin: (adminData: any) => Promise<boolean>;
  language: 'FR' | 'EN';
}

export const SuperAdminSpace: React.FC<SuperAdminSpaceProps> = ({
  superAdminProfile,
  orders,
  vendeurs,
  profiles,
  categories,
  prixMarche,
  regions,
  deliveryZones,
  deliveryFeeMatrix,
  globalSettings,
  onUpdateSettings,
  onUpdateMarketPrice,
  onAddRegionalAdmin,
  language
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cockpit' | 'params' | 'admins'>('cockpit');

  // Parameters form states
  const [comRate, setComRate] = useState(globalSettings.commissionRate);
  const [smsProvider, setSmsProvider] = useState(globalSettings.contactSMSPrestataire);

  // Market Prices states
  const [selectedCatForMarket, setSelectedCatForMarket] = useState(prixMarche[0]?.categoryId || '');
  const [marketProdName, setMarketProdName] = useState('');
  const [marketRefPrice, setMarketRefPrice] = useState(2000);

  // New Regional Admin state
  const [isNewAdminModal, setIsNewAdminModal] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminRegion, setAdminRegion] = useState('reg-ce');

  // Delivery Matrix Update state
  const [selectedOrigin, setSelectedOrigin] = useState('reg-ce');
  const [selectedDest, setSelectedDest] = useState('zone-yde');
  const [matrixFee, setMatrixFee] = useState(1500);

  // Global KPIs calculations
  const totalVolume = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCommissions = orders.reduce((sum, o) => sum + o.commissionAmount, 0);
  const sellersCount = vendeurs.length;
  const regionalAdmins = profiles.filter(p => p.role === 'admin_regional');

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onUpdateSettings({
      commissionRate: Number(comRate),
      contactSMSPrestataire: smsProvider
    });
    if (success) {
      alert(language === 'FR' ? "Paramètres globaux mis à jour !" : "Global parameters saved!");
    }
  };

  const handleMarketPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatForMarket || !marketProdName || marketRefPrice <= 0) return;

    const success = await onUpdateMarketPrice(selectedCatForMarket, marketProdName, Number(marketRefPrice));
    if (success) {
      alert(language === 'FR' ? `Prix de référence mis à jour ! Tous les produits alignés sont actualisés.` : `Reference price saved! Cascaded updates successfully.`);
      setMarketProdName('');
    }
  };

  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName || !adminEmail || !adminPhone || !adminRegion) return;

    const success = await onAddRegionalAdmin({
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      regionId: adminRegion,
      role: 'admin_regional'
    });

    if (success) {
      setIsNewAdminModal(false);
      setAdminName('');
      setAdminEmail('');
      setAdminPhone('');
    }
  };

  const handleUpdateMatrixFee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Copy fee matrix
    const newMatrix = { ...deliveryFeeMatrix };
    if (!newMatrix[selectedOrigin]) {
      newMatrix[selectedOrigin] = {};
    }
    newMatrix[selectedOrigin][selectedDest] = Number(matrixFee);

    const success = await onUpdateSettings({
      deliveryFeeMatrix: newMatrix
    });

    if (success) {
      alert(language === 'FR' ? "Grille tarifaire de livraison mise à jour !" : "Logistics fee matrix updated!");
    }
  };

  return (
    <div id="superadmin-space-view" className="min-h-screen bg-[#F8F9FA] text-slate-800 pb-20 font-sans">
      
      {/* Super Header */}
      <div className="bg-white text-gray-950 py-4 px-6 border-b border-gray-200 shadow-xs relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-red-50 border border-red-200 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <span className="text-[9px] bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded uppercase font-bold font-mono tracking-wider">
                {language === 'FR' ? 'Super Administration' : 'Global Governance Dashboard'}
              </span>
              <h1 className="text-base font-bold text-gray-900 tracking-tight mt-0.5">Cockpit Central FarmLink</h1>
              <p className="text-[11px] text-gray-500 font-mono font-medium">
                {superAdminProfile.name} | Superviseur National Cameroun
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveSubTab('cockpit')}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${activeSubTab === 'cockpit' ? 'bg-red-600 text-white border-red-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              📊 {language === 'FR' ? 'Piloter' : 'Piloting Cockpit'}
            </button>
            <button
              onClick={() => setActiveSubTab('params')}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${activeSubTab === 'params' ? 'bg-red-600 text-white border-red-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              ⚙️ {language === 'FR' ? 'Paramètres Globaux' : 'Platform Settings'}
            </button>
            <button
              onClick={() => setActiveSubTab('admins')}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${activeSubTab === 'admins' ? 'bg-red-600 text-white border-red-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              🛡️ {language === 'FR' ? 'Admins Régionaux' : 'Regional Admins'} ({regionalAdmins.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6">

        {/* TAB 1: COCKPIT OVERVIEW */}
        {activeSubTab === 'cockpit' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* KPI metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">{language === 'FR' ? 'Volume d\'Affaires' : 'Total Gross Volume'}</p>
                <h3 className="text-xl font-extrabold text-slate-800 mt-1 font-mono">{totalVolume.toLocaleString()} FCFA</h3>
                <span className="text-[9px] text-emerald-600 font-bold font-mono">100% de transparence</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">{language === 'FR' ? 'Commissions Récoltées' : 'Platform Commission revenue'}</p>
                <h3 className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">+{totalCommissions.toLocaleString()} FCFA</h3>
                <span className="text-[9px] text-slate-400 font-mono">Taux de base: {globalSettings.commissionRate}%</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">{language === 'FR' ? 'Sellers en Région' : 'Active Onboarded Sellers'}</p>
                <h3 className="text-xl font-extrabold text-slate-800 mt-1 font-mono">{sellersCount} Éleveurs</h3>
                <span className="text-[9px] text-slate-400 font-mono">Validation 100% manuelle</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">{language === 'FR' ? 'Admins Certifiés' : 'Delegated Regional Admins'}</p>
                <h3 className="text-xl font-extrabold text-slate-800 mt-1 font-mono">{regionalAdmins.length} Gérants</h3>
                <span className="text-[9px] text-slate-400 font-mono">Pôles: Centre, Littoral</span>
              </div>

            </div>

            {/* Platform Health indicators */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm font-mono uppercase tracking-wider">État Général des flux financiers de proximité</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {vendeurs.map(v => (
                  <div key={v.id} className="bg-slate-50 border border-slate-150 rounded-lg p-4 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{v.name}</p>
                      <p className="text-slate-400 text-[10px] font-mono mt-0.5">Solde en attente: {v.soldeAttente.toLocaleString()} FCFA</p>
                    </div>

                    {v.soldeAttente > 0 ? (
                      <button
                        onClick={async () => {
                          if (confirm(`Déclencher le versement Mobile Money de ${v.soldeAttente} FCFA vers ${v.name} ?`)) {
                            // Hit checkout API on backend
                            const res = await fetch(`/api/vendeurs/${v.id}/payout`, { method: 'POST' });
                            if (res.ok) {
                              alert("Payout successful! SMS receipt fired to partner.");
                              window.location.reload();
                            }
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded transition"
                      >
                        💸 Libérer MoMo
                      </button>
                    ) : (
                      <span className="text-slate-400 font-mono text-[10px] font-bold bg-slate-100 px-2 py-1 rounded">
                        REGLÉ / UP TO DATE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: GLOBAL PARAMETERS */}
        {activeSubTab === 'params' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-200">
            
            {/* Platform sliders config */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-150 pb-2 font-mono uppercase tracking-wider">
                ⚙️ Paramètres Monétaires de Base
              </h3>

              <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Taux de commission prélevé automatiquement (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={30}
                      value={comRate}
                      onChange={(e) => setComRate(Number(e.target.value))}
                      className="flex-1 accent-rose-600"
                    />
                    <span className="font-mono font-bold text-sm bg-slate-100 border border-slate-250 px-2.5 py-1 rounded w-16 text-center">
                      {comRate}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    S'applique sur le prix de départ du produit (avant réductions vendeurs éventuelles).
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Simulateur Passerelle SMS SMS (Prestataire local)</label>
                  <input
                    type="text"
                    value={smsProvider}
                    onChange={(e) => setSmsProvider(e.target.value)}
                    placeholder="Twilio Cameroun SA..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  id="btn-save-global-settings"
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-lg transition"
                >
                  Sauvegarder les paramètres
                </button>
              </form>

              {/* Reference Market Price Matrix (Section 3.4) */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h4 className="font-bold text-slate-800 text-xs font-mono uppercase tracking-wider">📈 Publier le Prix de Référence du Marché (Pool Agrégé)</h4>
                
                <form onSubmit={handleMarketPriceSubmit} className="space-y-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Catégorie Cible</label>
                      <select
                        value={selectedCatForMarket}
                        onChange={(e) => setSelectedCatForMarket(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-medium cursor-pointer"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nom EXACT du produit</label>
                      <input
                        id="input-market-prod-name"
                        type="text"
                        placeholder="Ex: Poulet Fermier, Arachides Blanches..."
                        value={marketProdName}
                        onChange={(e) => setMarketProdName(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nouveau prix de référence de base (FCFA)</label>
                    <input
                      id="input-market-price-val"
                      type="number"
                      min={100}
                      value={marketRefPrice}
                      onChange={(e) => setMarketRefPrice(Number(e.target.value))}
                      required
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-mono"
                    />
                  </div>

                  <button
                    id="btn-submit-market-price"
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded transition text-xs"
                  >
                    🚀 Mettre à jour et Cascade
                  </button>
                </form>
              </div>

            </div>

            {/* Delivery fee matrix editor (Section 4.5: Origin-Destination matrix) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-150 pb-2 font-mono uppercase tracking-wider">
                🗺️ Grille logistique des Tarifs par Zone
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Ce tableau définit le tarif de livraison en Francs CFA pour chaque paire origine (Région)/destination (Zone). Tout changement prend effet immédiatement sur les paniers clients sans retoucher le code source.
              </p>

              <form onSubmit={handleUpdateMatrixFee} className="space-y-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Région Origine (Ferme)</label>
                    <select
                      value={selectedOrigin}
                      onChange={(e) => setSelectedOrigin(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-medium cursor-pointer"
                    >
                      {regions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Zone Destination (Livraison)</label>
                    <select
                      value={selectedDest}
                      onChange={(e) => setSelectedDest(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-medium cursor-pointer"
                    >
                      {deliveryZones.map(z => (
                        <option key={z.id} value={z.id}>
                          {regions.find(r => r.id === z.regionId)?.name} ➜ {z.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Frais de livraison forfaitaire (FCFA)</label>
                  <input
                    id="input-delivery-matrix-fee"
                    type="number"
                    min={0}
                    value={matrixFee}
                    onChange={(e) => setMatrixFee(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-mono"
                  />
                </div>

                <button
                  id="btn-submit-delivery-matrix"
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded transition text-xs"
                >
                  💾 Ajuster Tarif Logistique
                </button>
              </form>
            </div>

          </div>
        )}

        {/* TAB 3: REGIONAL ADMINS ACCOUNTS */}
        {activeSubTab === 'admins' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold font-mono">
                {profiles.filter(p => p.role === 'admin_regional').length} administrateurs régionaux délégués
              </span>
              <button
                id="btn-trigger-add-admin"
                onClick={() => setIsNewAdminModal(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Gérant Régional</span>
              </button>
            </div>

            {/* Admins Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.filter(p => p.role === 'admin_regional').map(adm => (
                <div key={adm.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold font-mono">
                    AR
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-extrabold text-slate-800 font-sans">{adm.name}</p>
                    <p className="text-slate-500 font-mono">{adm.email}</p>
                    <p className="text-slate-400 font-mono">{adm.phone}</p>
                    <span className="inline-block mt-2 bg-rose-50 text-rose-700 text-[9px] font-bold px-2 py-0.5 rounded border border-rose-100 uppercase">
                      Juridiction: {regions.find(r => r.id === adm.regionId)?.name || 'Inconnue'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* --- ADD NEW REGIONAL ADMIN MODAL --- */}
      {isNewAdminModal && (
        <div id="add-admin-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-rose-950 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-xs tracking-wider uppercase font-mono">Créer un Compte Gérant de Région</h3>
              <button
                onClick={() => setIsNewAdminModal(false)}
                className="hover:bg-rose-900 p-1.5 rounded transition text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdminSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom du gérant *</label>
                <input
                  id="admin-form-name"
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Ex: Marie-Louise Mbezele..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email professionnel *</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="marie@farmlink.cm"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Téléphone mobile *</label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="+237 690 12 34 56"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Région de juridiction déléguée *</label>
                <select
                  value={adminRegion}
                  onChange={(e) => setAdminRegion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium cursor-pointer"
                >
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewAdminModal(false)}
                  className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  id="btn-submit-admin-form"
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-sm"
                >
                  🚀 Initialiser et Générer Droits (RLS)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
