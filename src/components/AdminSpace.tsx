/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Commande, Product, VendeurDetails, DriverDetails, Reclamation, Category, Profile } from '../types';
import { Users, ShoppingCart, AlertCircle, Plus, Send, Check, X, Shield, Star, Award, TrendingUp, Image as ImageIcon } from 'lucide-react';

interface AdminSpaceProps {
  adminProfile: Profile;
  orders: Commande[];
  products: Product[];
  vendeurs: VendeurDetails[];
  drivers: DriverDetails[];
  reclamations: Reclamation[];
  categories: Category[];
  onInviteSeller: (sellerData: any) => Promise<boolean>;
  onUpdateSellerStatus: (sellerId: string, status: 'active' | 'suspended') => Promise<boolean>;
  onSaveAllocation: (orderId: string, allocations: any[]) => Promise<boolean>;
  onAssignDriver: (orderId: string, driverId: string) => Promise<boolean>;
  onResolveClaim: (claimId: string, decision: string, deductionSellerId?: string, deductionAmount?: number) => Promise<boolean>;
  onEvaluateSeller: (orderId: string, evaluationData: any) => Promise<boolean>;
  language: 'FR' | 'EN';
}

export const AdminSpace: React.FC<AdminSpaceProps> = ({
  adminProfile,
  orders,
  products,
  vendeurs,
  drivers,
  reclamations,
  categories,
  onInviteSeller,
  onUpdateSellerStatus,
  onSaveAllocation,
  onAssignDriver,
  onResolveClaim,
  onEvaluateSeller,
  language
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'sellers' | 'claims' | 'stats'>('orders');

  // Filter lists based on Regional Admin's assigned region (RLS security simulation)
  const regionId = adminProfile.regionId || 'reg-ce';
  const regionName = regionId === 'reg-ce' ? 'Centre' : regionId === 'reg-lt' ? 'Littoral' : 'Ouest';

  const regionalOrders = useMemo(() => orders.filter(o => o.deliveryRegionId === regionId), [orders, regionId]);
  const regionalSellers = useMemo(() => vendeurs.filter(v => v.regionId === regionId), [vendeurs, regionId]);
  const regionalDrivers = useMemo(() => drivers.filter(d => d.regionId === regionId), [drivers, regionId]);
  
  const regionalClaims = useMemo(() => {
    return reclamations.filter(r => {
      const order = orders.find(o => o.id === r.orderId);
      return order?.deliveryRegionId === regionId;
    });
  }, [reclamations, orders, regionId]);

  // Invite Seller Form
  const [isInviteModal, setIsInviteModal] = useState(false);
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerPhone, setNewSellerPhone] = useState('');

  // Allocation/Repartition Tool states
  const [selectedOrderForAlloc, setSelectedOrderForAlloc] = useState<Commande | null>(null);
  // Temporary allocation state: Record<productId, Record<sellerId, quantity>>
  const [tempAlloc, setTempAlloc] = useState<Record<string, Record<string, number>>>({});

  // Resolve Claim state
  const [selectedClaimForResolve, setSelectedClaimForResolve] = useState<Reclamation | null>(null);
  const [claimDecision, setClaimDecision] = useState('');
  const [deductSellerId, setDeductSellerId] = useState('');
  const [deductAmount, setDeductAmount] = useState(0);

  // Evaluate Seller State
  const [selectedOrderForEval, setSelectedOrderForEval] = useState<Commande | null>(null);
  const [evalSellerId, setEvalSellerId] = useState('');
  const [evalRel, setEvalRel] = useState(5);
  const [evalQual, setEvalQual] = useState(5);
  const [evalDel, setEvalDel] = useState(5);
  const [evalComment, setEvalComment] = useState('');

  // Invite seller submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerName || !newSellerPhone) return;

    const success = await onInviteSeller({
      name: newSellerName,
      phone: newSellerPhone,
      regionId,
      creatorId: adminProfile.id,
      creatorName: adminProfile.name
    });

    if (success) {
      setIsInviteModal(false);
      setNewSellerName('');
      setNewSellerPhone('');
    }
  };

  // Open Allocation adjustment modal
  const handleOpenAllocation = (order: Commande) => {
    setSelectedOrderForAlloc(order);
    
    // Initialize temporary allocations from existing ones, or propose automatic split
    const currentAlloc: Record<string, Record<string, number>> = {};
    
    order.items.forEach(item => {
      currentAlloc[item.productId] = {};
      
      const originalProduct = products.find(p => p.id === item.productId);
      const categoryIdOfItem = originalProduct ? originalProduct.categoryId : '';
      
      // Look for sellers in the database with the exact product category or name
      const candidates = products.filter(p => 
        p.categoryId === categoryIdOfItem && 
        p.status === 'published' &&
        p.provenance === regionName
      );

      const existingItemAlloc = order.allocations.filter(a => a.productId === item.productId);

      if (existingItemAlloc.length > 0) {
        existingItemAlloc.forEach(a => {
          currentAlloc[item.productId][a.sellerId] = a.quantity;
        });
      } else if (candidates.length > 0) {
        // Simple automatic partition logic: put entire volume on the first eligible seller with enough stock,
        // or split evenly
        let remainingToAllocate = item.quantity;
        candidates.forEach((cand, idx) => {
          if (remainingToAllocate <= 0) return;
          const share = Math.min(cand.stock, remainingToAllocate);
          if (share > 0) {
            currentAlloc[item.productId][cand.sellerId] = share;
            remainingToAllocate -= share;
          }
        });
      }
    });

    setTempAlloc(currentAlloc);
  };

  // Modify individual allocation quantity live
  const handleUpdateAllocValue = (productId: string, sellerId: string, val: number) => {
    setTempAlloc(prev => {
      const next = { ...prev };
      if (!next[productId]) next[productId] = {};
      next[productId][sellerId] = Math.max(0, val);
      return next;
    });
  };

  // Save allocations to backend
  const handleSaveAllocations = async () => {
    if (!selectedOrderForAlloc) return;

    // Build allocation array to submit
    const finalAllocations: any[] = [];
    let isValid = true;
    let errorMsg = "";

    selectedOrderForAlloc.items.forEach(item => {
      const productAlloc = tempAlloc[item.productId] || {};
      const sumAlloc = (Object.values(productAlloc) as number[]).reduce((sum, q) => sum + q, 0);

      if (sumAlloc !== item.quantity) {
        isValid = false;
        errorMsg = `La somme allouée (${sumAlloc}) pour le produit "${item.name}" doit être strictement égale à la quantité commandée (${item.quantity}).`;
      }

      Object.entries(productAlloc).forEach(([sellerId, qty]) => {
        const quantity = qty as number;
        if (quantity > 0) {
          finalAllocations.push({
            productId: item.productId,
            sellerId,
            quantity,
            confirmed: 'pending' // Resets confirmation status to pending
          });
        }
      });
    });

    if (!isValid) {
      alert(errorMsg);
      return;
    }

    const success = await onSaveAllocation(selectedOrderForAlloc.id, finalAllocations);
    if (success) {
      setSelectedOrderForAlloc(null);
    }
  };

  // Submit claim resolution
  const handleResolveClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForResolve || !claimDecision) return;

    const success = await onResolveClaim(
      selectedClaimForResolve.id,
      claimDecision,
      deductSellerId || undefined,
      deductAmount > 0 ? deductAmount : undefined
    );

    if (success) {
      setSelectedClaimForResolve(null);
      setClaimDecision('');
      setDeductSellerId('');
      setDeductAmount(0);
    }
  };

  // Submit Seller Evaluation
  const handleEvalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForEval || !evalSellerId) return;

    const success = await onEvaluateSeller(selectedOrderForEval.id, {
      sellerId: evalSellerId,
      reliabilityRating: Number(evalRel),
      qualityRating: Number(evalQual),
      delayRating: Number(evalDel),
      comment: evalComment
    });

    if (success) {
      setSelectedOrderForEval(null);
      setEvalComment('');
    }
  };

  return (
    <div id="admin-space-view" className="min-h-screen bg-[#F8F9FA] text-slate-800 pb-20 font-sans">
      
      {/* Admin Title Bar */}
      <div className="bg-white text-gray-950 py-4 px-6 border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-green-50 border border-green-200 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <span className="text-[9px] bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded font-bold font-mono uppercase tracking-wider">
                {language === 'FR' ? 'Gestion Régionale' : 'Regional Administration'}
              </span>
              <h1 className="text-base font-bold text-gray-900 tracking-tight mt-0.5">Espace Administratif : {regionName}</h1>
              <p className="text-[11px] text-gray-500 font-mono font-medium">
                {adminProfile.name} | Gérant du pôle local Cameroun {regionName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveSubTab('orders')}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${activeSubTab === 'orders' ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              🛒 {language === 'FR' ? 'Commandes' : 'Orders'} ({regionalOrders.length})
            </button>
            <button
              onClick={() => setActiveSubTab('sellers')}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${activeSubTab === 'sellers' ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              🚜 {language === 'FR' ? 'Vendeurs' : 'Sellers'} ({regionalSellers.length})
            </button>
            <button
              onClick={() => setActiveSubTab('claims')}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${activeSubTab === 'claims' ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              ⚠️ {language === 'FR' ? 'Réclamations' : 'Claims'} ({regionalClaims.length})
            </button>
            <button
              onClick={() => setActiveSubTab('stats')}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${activeSubTab === 'stats' ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              📈 {language === 'FR' ? 'Stats' : 'Stats'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6">

        {/* SUB TAB 1: REGIONAL ORDERS */}
        {activeSubTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider font-mono">
              📦 Commandes rattachées à la région de livraison ({regionalOrders.length})
            </h2>

            <div className="space-y-4">
              {regionalOrders.map(order => {
                const isAggregated = order.items.some(item => 
                  products.find(p => p.id === item.productId)?.priceType === 'market'
                );

                return (
                  <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 p-5 space-y-4">
                    
                    {/* Order header row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
                          ID: #{order.id}
                        </span>
                        <span className="text-slate-400 font-mono">{new Date(order.createdAt).toLocaleDateString()}</span>
                        {isAggregated && (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-bold px-2 py-0.5 rounded">
                            AGRÉGATION REQUIS
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded font-bold uppercase tracking-wider font-mono text-[9px] border ${
                          order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          Statut: {order.status}
                        </span>

                        <span className={`px-2.5 py-1 rounded font-bold uppercase tracking-wider font-mono text-[9px] border ${
                          order.paymentConfirmed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {order.paymentConfirmed ? 'Payé (MoMo/Cash)' : 'Paiement en attente'}
                        </span>
                      </div>
                    </div>

                    {/* Order main info split */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-xs">
                      <div>
                        <h4 className="font-semibold text-slate-400 uppercase tracking-wider font-mono mb-2">Acheteur</h4>
                        <p className="font-bold text-slate-800 text-sm">{order.clientName}</p>
                        <p className="text-slate-600 font-mono mt-0.5">{order.clientPhone}</p>
                        <p className="text-slate-500 mt-1">{order.clientAddress}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-400 uppercase tracking-wider font-mono mb-2">Détails Panier</h4>
                        <div className="space-y-1">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between font-mono text-[11px]">
                              <span>{it.quantity} x {it.name}</span>
                              <span className="font-semibold">{(it.unitPrice * it.quantity).toLocaleString()} FCFA</span>
                            </div>
                          ))}
                          <div className="border-t border-slate-100 pt-1 flex justify-between font-mono text-[11px] text-slate-400">
                            <span>Livraison :</span>
                            <span>{order.deliveryFee.toLocaleString()} FCFA</span>
                          </div>
                          <div className="flex justify-between font-mono text-xs text-slate-800 font-extrabold pt-1">
                            <span>Total :</span>
                            <span>{order.totalAmount.toLocaleString()} FCFA</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-400 uppercase tracking-wider font-mono mb-2">Commissions & Route</h4>
                        <div className="space-y-1.5">
                          <div className="flex justify-between font-mono text-[11px]">
                            <span>Com. Platform ({categories[0]?.id ? '10%' : '10%'}) :</span>
                            <span className="text-emerald-700 font-bold">+{order.commissionAmount.toLocaleString()} FCFA</span>
                          </div>
                          <div className="flex justify-between font-mono text-[11px]">
                            <span>Livreur assigné :</span>
                            <span className="font-semibold text-slate-700">
                              {drivers.find(d => d.id === order.driverId)?.name || 'Non assigné'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS ROW (Section 3.3: Manual allocation triggers) */}
                    <div className="pt-4 flex flex-wrap gap-2 items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {/* Allocations Button */}
                        <button
                          id={`btn-open-alloc-${order.id}`}
                          onClick={() => handleOpenAllocation(order)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1 shadow-sm transition"
                        >
                          ⚙️ {language === 'FR' ? 'Répartition Multi-Vendeurs' : 'Apportion Sellers'}
                        </button>

                        {/* Driver Assignment Dropdown */}
                        <select
                          id={`select-driver-assign-${order.id}`}
                          value={order.driverId || ''}
                          onChange={async (e) => {
                            if (e.target.value) {
                              await onAssignDriver(order.id, e.target.value);
                            }
                          }}
                          className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-2 font-medium cursor-pointer"
                        >
                          <option value="">🚚 Assign Regional Driver...</option>
                          {regionalDrivers.map(drv => (
                            <option key={drv.id} value={drv.id}>
                              {drv.name} ({drv.vehicleType})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Evaluate Seller on Delivered Order */}
                      {order.status === 'delivered' && (
                        <button
                          id={`btn-evaluate-seller-trigger-${order.id}`}
                          onClick={() => {
                            setSelectedOrderForEval(order);
                            setEvalSellerId(order.allocations[0]?.sellerId || '');
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1 transition shadow-sm"
                        >
                          ⭐ {language === 'FR' ? 'Évaluer le Vendeur' : 'Rate Seller'}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUB TAB 2: REGIONAL SELLERS */}
        {activeSubTab === 'sellers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold font-mono">
                {regionalSellers.length} {language === 'FR' ? 'vendeurs actifs' : 'registered sellers'} en région {regionName}
              </span>
              
              {/* Regional invite is ONLY recruitment entry point (Section 3.1: No public signups) */}
              <button
                id="btn-trigger-invite"
                onClick={() => setIsInviteModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'FR' ? 'Inviter un Vendeur' : 'Recruit Seller'}</span>
              </button>
            </div>

            {/* List of sellers */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider font-mono text-[10px] border-b border-slate-200">
                      <th className="p-4 font-bold">Nom / Téléphone</th>
                      <th className="p-4 font-bold">En Attente (Earnings)</th>
                      <th className="p-4 font-bold">Déjà Versé (Settled)</th>
                      <th className="p-4 font-bold">Note Confidentiel</th>
                      <th className="p-4 font-bold">Statut</th>
                      <th className="p-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {regionalSellers.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <p className="font-extrabold text-slate-800 font-sans">{v.name}</p>
                          <p className="text-slate-400 mt-0.5 text-[10px]">{v.phone}</p>
                        </td>
                        <td className="p-4 font-bold text-amber-600">{v.soldeAttente.toLocaleString()} FCFA</td>
                        <td className="p-4 font-bold text-emerald-600">{v.soldeVerse.toLocaleString()} FCFA</td>
                        <td className="p-4 text-slate-800 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span>{v.rating || '5.0'}</span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            v.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {v.status === 'active' ? (
                            <button
                              onClick={() => onUpdateSellerStatus(v.id, 'suspended')}
                              className="text-rose-600 hover:underline hover:bg-rose-50 px-2 py-1 rounded"
                            >
                              Suspendre
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateSellerStatus(v.id, 'active')}
                              className="text-emerald-600 hover:underline hover:bg-emerald-50 px-2 py-1 rounded"
                            >
                              Réactiver
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUB TAB 3: CLAIMS REVIEW */}
        {activeSubTab === 'claims' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider font-mono">
              ⚠️ Réclamations clients de la région ({regionalClaims.length})
            </h2>

            {regionalClaims.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-xl text-xs text-slate-400">
                {language === 'FR' ? "Aucune réclamation enregistrée." : "No customer claims logged."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {regionalClaims.map(claim => (
                  <div key={claim.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
                    
                    <div>
                      {/* Claim Header */}
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 text-xs">
                        <span className="font-mono font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                          Claim #{claim.id}
                        </span>
                        <span className="text-slate-400 font-mono">{new Date(claim.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="mt-3 text-xs space-y-2">
                        <p className="font-bold text-slate-800">Commande associée: #{claim.orderId}</p>
                        <p className="text-slate-600 font-sans">
                          <strong>Client :</strong> {claim.clientName} ({claim.clientPhone})
                        </p>
                        <p className="text-slate-700 font-sans bg-slate-50 p-2.5 rounded border border-slate-150">
                          <strong>Description :</strong> "{claim.description}"
                        </p>
                      </div>

                      {/* Photo evidence display (Section 3.8: Photo is mandatory) */}
                      {claim.photoUrl && (
                        <div className="mt-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Preuve Photo Obligatoire :</p>
                          <div className="h-40 w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                            <img src={claim.photoUrl} alt="Photo proof" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className={`font-mono font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                        claim.status === 'resolved' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        ● {claim.status}
                      </span>

                      {claim.status === 'pending' ? (
                        <button
                          id={`btn-trigger-resolve-claim-${claim.id}`}
                          onClick={() => setSelectedClaimForResolve(claim)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded transition shadow-sm"
                        >
                          ⚖️ Statuer / Résoudre
                        </button>
                      ) : (
                        <p className="text-slate-500 font-sans text-[11px] leading-relaxed max-w-xs text-right">
                          <strong>Décision :</strong> "{claim.adminDecision}"
                        </p>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB TAB 4: STATISTICS */}
        {activeSubTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider font-mono">
              📈 Aperçu analytique - Région {regionName}
            </h2>

            {/* Custom pure Tailwind SVG stats charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Sales SVG chart */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 text-xs font-mono uppercase tracking-wider">Volume des commandes par semaine</h3>
                <div className="h-64 flex items-end justify-between gap-2.5 px-4 pt-4 border-b border-slate-200">
                  <div className="w-full flex flex-col items-center">
                    <div className="bg-emerald-500 w-10 rounded-t h-28 flex items-center justify-center text-[10px] text-white font-bold">28k</div>
                    <span className="text-[10px] text-slate-400 font-mono mt-2">Sem. 1</span>
                  </div>
                  <div className="w-full flex flex-col items-center">
                    <div className="bg-emerald-500 w-10 rounded-t h-36 flex items-center justify-center text-[10px] text-white font-bold">45k</div>
                    <span className="text-[10px] text-slate-400 font-mono mt-2">Sem. 2</span>
                  </div>
                  <div className="w-full flex flex-col items-center">
                    <div className="bg-emerald-500 w-10 rounded-t h-48 flex items-center justify-center text-[10px] text-white font-bold">75k</div>
                    <span className="text-[10px] text-slate-400 font-mono mt-2">Sem. 3</span>
                  </div>
                  <div className="w-full flex flex-col items-center">
                    <div className="bg-emerald-600 w-10 rounded-t h-56 flex items-center justify-center text-[10px] text-white font-bold animate-pulse">120k</div>
                    <span className="text-[10px] text-slate-500 font-bold font-mono mt-2">Sem. 4</span>
                  </div>
                </div>
              </div>

              {/* Pie/Category breakdown SVG simulated */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 mb-4 text-xs font-mono uppercase tracking-wider">Répartition par pôle d'activité</h3>
                  <div className="flex items-center justify-center py-6">
                    {/* SVG Pie Chart */}
                    <svg className="w-36 h-36 transform -rotate-90">
                      <circle cx="72" cy="72" r="50" fill="transparent" stroke="#10b981" strokeWidth="24" strokeDasharray="314" strokeDashoffset="94" />
                      <circle cx="72" cy="72" r="50" fill="transparent" stroke="#f59e0b" strokeWidth="24" strokeDasharray="314" strokeDashoffset="314" />
                    </svg>
                  </div>
                </div>

                <div className="flex justify-around text-xs font-mono border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>🥩 Élevage Animal (70%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>🌽 Maraîcher Végétal (30%)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* --- RECRUIT / INVITE VENDOR MODAL --- */}
      {isInviteModal && (
        <div id="invite-vendor-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-xs tracking-wider uppercase font-mono">Inviter un nouveau Vendeur</h3>
              <button
                onClick={() => setIsInviteModal(false)}
                className="hover:bg-slate-900 p-1.5 rounded transition text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                ⚠️ Conforme aux règles de sécurité de FarmLink : les éleveurs ne s'enregistrent pas eux-mêmes. L'administrateur régional pré-valide le profil d'activité d'abord, puis génère leurs accès temporaires envoyés par SMS.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom complet ou Ferme *</label>
                <input
                  id="invite-vendor-name"
                  type="text"
                  value={newSellerName}
                  onChange={(e) => setNewSellerName(e.target.value)}
                  placeholder="Ex: Élevage de Mvada, Jean-Paul..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Téléphone mobile (Réception SMS) *</label>
                <input
                  id="invite-vendor-phone"
                  type="text"
                  value={newSellerPhone}
                  onChange={(e) => setNewSellerPhone(e.target.value)}
                  placeholder="Ex: +237 670 11 22 33"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsInviteModal(false)}
                  className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  id="btn-submit-invite-form"
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition"
                >
                  🚀 Valider et Envoyer les Accès (SMS)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADJUST ALLOCATIONS MODAL (MULTI-SELLER MATRIX TOOL) --- */}
      {selectedOrderForAlloc && (
        <div id="allocation-matrix-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xs tracking-wider uppercase font-mono">Matrice de Répartition Multi-Vendeurs</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Commande #{selectedOrderForAlloc.id} | Région {regionName}</p>
              </div>
              <button
                onClick={() => setSelectedOrderForAlloc(null)}
                className="hover:bg-slate-900 p-1.5 rounded transition text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {selectedOrderForAlloc.items.map(item => {
                const itemAlloc = tempAlloc[item.productId] || {};
                const sumAlloc = (Object.values(itemAlloc) as number[]).reduce((sum, q) => sum + q, 0);

                // Find eligible regional sellers for this product's category
                const regionalSellersForProd = regionalSellers;

                return (
                  <div key={item.productId} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-xs font-mono">
                      <div>
                        <span className="font-bold text-slate-500">Produit commandé :</span>
                        <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{item.name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500">Cible :</span>
                        <p className="font-extrabold text-emerald-800 text-sm mt-0.5">{sumAlloc} / {item.quantity}</p>
                      </div>
                    </div>

                    {/* Eligible Sellers Grid */}
                    <div className="space-y-3.5 text-xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Saisir les parts d'allocation par producteur :</p>
                      
                      <div className="divide-y divide-slate-100">
                        {regionalSellersForProd.map(seller => {
                          const associatedProduct = products.find(p => p.sellerId === seller.id && p.categoryId === item.categoryId);
                          const sellerStock = associatedProduct?.stock || 0;
                          
                          return (
                            <div key={seller.id} className="py-2.5 flex items-center justify-between gap-4">
                              <div>
                                <p className="font-bold text-slate-800">{seller.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Lieu: {associatedProduct?.location || 'Inconnu'} | Stock dispo: {sellerStock} {item.unit}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  id={`input-alloc-qty-${seller.id}-${item.productId}`}
                                  type="number"
                                  min={0}
                                  max={sellerStock}
                                  value={itemAlloc[seller.id] || 0}
                                  onChange={(e) => handleUpdateAllocValue(item.productId, seller.id, Number(e.target.value))}
                                  className="w-16 bg-white border border-slate-200 rounded p-1.5 text-center font-mono font-bold focus:outline-none focus:border-emerald-500"
                                />
                                <span className="text-slate-400 font-mono text-[11px]">{item.unit}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-4 rounded-lg text-xs text-blue-800 leading-relaxed">
                <span>
                  💡 <strong>Astuce :</strong> Le système verrouille temporairement les parts réservées. Les éleveurs recevront une notification SMS instantanée pour valider.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForAlloc(null)}
                  className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  id="btn-submit-alloc-matrix"
                  type="button"
                  onClick={handleSaveAllocations}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-sm"
                >
                  💾 Valider et Verrouiller Stocks (SMS)
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- STATUER / RESOLVE CLAIM MODAL --- */}
      {selectedClaimForResolve && (
        <div id="resolve-claim-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-xs tracking-wider uppercase font-mono">Régler le Litige Client</h3>
              <button
                onClick={() => setSelectedClaimForResolve(null)}
                className="hover:bg-slate-900 p-1.5 rounded transition text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveClaimSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Décision administrative *</label>
                <textarea
                  id="textarea-claim-decision"
                  value={claimDecision}
                  onChange={(e) => setClaimDecision(e.target.value)}
                  placeholder="Décrivez la sentence (Remboursement, avoir émis, etc.)"
                  rows={3}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>

              {/* Offset wallet choice (Section 3.8: direct seller contact for refund case-by-case) */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs">
                <p className="font-bold text-slate-700 font-mono uppercase text-[9px] tracking-wider">Optionnel : Pénalité Financière Vendeur</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Si le tort incombe au vendeur, vous pouvez déduire un montant de son solde en attente (soldeAttente) pour compenser l'avoir client.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Vendeur concerné</label>
                    <select
                      value={deductSellerId}
                      onChange={(e) => setDeductSellerId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-medium cursor-pointer"
                    >
                      <option value="">Aucun pénalisé</option>
                      {regionalSellers.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Montant pénalité (FCFA)</label>
                    <input
                      id="input-deduct-amt"
                      type="number"
                      min={0}
                      value={deductAmount}
                      onChange={(e) => setDeductAmount(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedClaimForResolve(null)}
                  className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  id="btn-submit-resolve-claim"
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-sm"
                >
                  ⚖️ Clôturer le Dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EVALUATE SELLER SCORECARD MODAL --- */}
      {selectedOrderForEval && (
        <div id="evaluate-seller-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-xs tracking-wider uppercase font-mono">Fiche d'Évaluation Interne</h3>
              <button
                onClick={() => setSelectedOrderForEval(null)}
                className="hover:bg-slate-900 p-1.5 rounded transition text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEvalSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                📝 Note structurée confidentielle (Section 3.10) pour auditer les vendeurs partenaires et attribuer des coefficients de priorité sur les grosses commandes.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sélectionner le producteur *</label>
                <select
                  value={evalSellerId}
                  onChange={(e) => setEvalSellerId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium cursor-pointer"
                >
                  {selectedOrderForAlloc?.allocations.map(a => {
                    const sellerObj = regionalSellers.find(v => v.id === a.sellerId);
                    return sellerObj ? (
                      <option key={sellerObj.id} value={sellerObj.id}>{sellerObj.name}</option>
                    ) : null;
                  })}
                  {/* Fallback to any regional seller */}
                  {selectedOrderForAlloc?.allocations.length === 0 && regionalSellers.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <label className="block font-semibold text-slate-500 mb-1">Fiabilité</label>
                  <select
                    value={evalRel}
                    onChange={(e) => setEvalRel(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold"
                  >
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                  </select>
                </div>
                <div className="text-center">
                  <label className="block font-semibold text-slate-500 mb-1">Qualité Lot</label>
                  <select
                    value={evalQual}
                    onChange={(e) => setEvalQual(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold"
                  >
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                  </select>
                </div>
                <div className="text-center">
                  <label className="block font-semibold text-slate-500 mb-1">Respect Délais</label>
                  <select
                    value={evalDel}
                    onChange={(e) => setEvalDel(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold"
                  >
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Commentaire libre confidentiel *</label>
                <textarea
                  value={evalComment}
                  onChange={(e) => setEvalComment(e.target.value)}
                  placeholder="Ex: Élevage très soigné, poulets bien gras et conformes..."
                  rows={2}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForEval(null)}
                  className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  id="btn-submit-eval"
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition"
                >
                  💾 Enregistrer la Note confidentielle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
