/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Commande, DriverDetails, Product } from '../types';
import { MapPin, Phone, CheckCircle, Navigation, Truck, Package, RotateCcw } from 'lucide-react';

interface DriverSpaceProps {
  driverProfile: DriverDetails;
  orders: Commande[];
  products: Product[];
  onUpdateOrderStatus: (orderId: string, status: string) => Promise<boolean>;
  language: 'FR' | 'EN';
}

export const DriverSpace: React.FC<DriverSpaceProps> = ({
  driverProfile,
  orders,
  products,
  onUpdateOrderStatus,
  language
}) => {
  // Find deliveries assigned to this driver
  const myDeliveries = orders.filter(o => o.driverId === driverProfile.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'collecting':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded text-[10px] font-bold font-mono">À COLLECTER (PICKUP)</span>;
      case 'delivering':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded text-[10px] font-bold font-mono font-mono animate-pulse">EN ROUTE (DELIVERING)</span>;
      case 'delivered':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded text-[10px] font-bold font-mono">LIVRÉ / TERMINÉ</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded text-[10px] font-bold font-mono">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div id="driver-space-view" className="min-h-screen bg-[#F8F9FA] text-slate-800 pb-20 font-sans">
      {/* Sub Header */}
      <div className="bg-white text-gray-950 py-4 px-6 border-b border-gray-200 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-green-50 border border-green-200 flex items-center justify-center">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <span className="text-[9px] bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded font-bold font-mono uppercase tracking-wider">
                {language === 'FR' ? 'Chauffeur / Livreur' : 'Local Courier'}
              </span>
              <h1 className="text-base font-bold text-gray-900 tracking-tight mt-0.5">{driverProfile.name}</h1>
              <p className="text-[11px] text-gray-500 font-mono font-medium">
                {driverProfile.vehicleType} | Région: {driverProfile.regionId === 'reg-ce' ? 'Centre' : 'Littoral'}
              </p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-2.5 py-1.5 rounded font-bold tracking-wide uppercase text-[10px]">
            ● {language === 'FR' ? 'En Service' : 'Active Duty'}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-6 space-y-6">
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider font-mono">
          📋 {language === 'FR' ? "Feuille de Route du Jour" : "Daily Delivery Manifest"} ({myDeliveries.length})
        </h2>

        {myDeliveries.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-xl">
            <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-2.5" />
            <p className="text-slate-400 text-xs">
              {language === 'FR' ? "Aucune livraison ne vous est assignée aujourd'hui." : "No deliveries scheduled on your route today."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {myDeliveries.map(delivery => {
              // Extract list of sellers to collect from for this order
              const pickupSellers = Array.from(new Set(delivery.allocations.map(a => a.sellerId)));

              return (
                <div key={delivery.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                  {/* Left Column: Logistics Info & Pickups */}
                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-700">
                        COMMANDE #{delivery.id}
                      </span>
                      {getStatusBadge(delivery.status)}
                    </div>

                    {/* Pickups list (Gather from farmers) */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2 font-mono flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span>{language === 'FR' ? 'Points de collecte (Fermes) :' : 'Farm Pickup Locations :'}</span>
                      </h4>

                      <div className="space-y-2">
                        {delivery.allocations.map((alloc, i) => {
                          const prod = products.find(p => p.id === alloc.productId);
                          return (
                            <div key={i} className="bg-slate-50 border border-slate-150 p-2.5 rounded text-xs font-mono">
                              <div className="flex justify-between font-bold text-slate-800">
                                <span>{alloc.quantity} x {prod?.name}</span>
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 rounded">{alloc.confirmed}</span>
                              </div>
                              <p className="text-slate-500 text-[10px] mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-600" />
                                <span>Producteur: {prod?.sellerName} | {prod?.location} ({prod?.provenance})</span>
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recipient info */}
                    <div className="border-t border-slate-100 pt-3 text-xs space-y-1">
                      <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 font-mono flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-slate-400" />
                        <span>{language === 'FR' ? 'Client Final :' : 'End Customer :'}</span>
                      </h4>
                      <p className="font-extrabold text-slate-800 text-sm">{delivery.clientName}</p>
                      <p className="text-slate-600 flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{delivery.clientPhone}</span>
                      </p>
                      <p className="text-slate-500 font-sans">{delivery.clientAddress}</p>
                    </div>
                  </div>

                  {/* Right Column: Workflow Actions (Section 3.5: Logistics Status updates) */}
                  <div className="p-5 md:w-64 bg-slate-50 flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        {language === 'FR' ? 'Actions Logistiques' : 'Courier Control'}
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {language === 'FR' 
                          ? "Mettez à jour le statut au fur et à mesure. Le client reçoit automatiquement un SMS à chaque étape." 
                          : "Transition status sequentially. Client is automatically pinged with SMS templates on each trigger."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {delivery.status === 'collecting' && (
                        <button
                          id={`btn-driver-collect-${delivery.id}`}
                          onClick={() => onUpdateOrderStatus(delivery.id, 'delivering')}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-lg transition text-center flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Truck className="w-4 h-4" />
                          <span>🚚 Lot collecté ➜ En Route</span>
                        </button>
                      )}

                      {delivery.status === 'delivering' && (
                        <button
                          id={`btn-driver-deliver-${delivery.id}`}
                          onClick={() => onUpdateOrderStatus(delivery.id, 'delivered')}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition text-center flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>✅ Livrer au Client (Payé)</span>
                        </button>
                      )}

                      {delivery.status === 'delivered' && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded p-3 text-center text-xs font-semibold">
                          🎉 {language === 'FR' ? "Livraison confirmée et clôturée !" : "Delivery completed and settled!"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
