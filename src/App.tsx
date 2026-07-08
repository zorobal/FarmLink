/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Profile, Region, DeliveryZone, VendeurDetails, 
  Category, Product, PrixMarche, Promotion, Commande, 
  Reclamation, EvaluationVendeur, DriverDetails, NotificationLog 
} from './types';
import { RoleSelector } from './components/RoleSelector';
import { NotificationLogPanel } from './components/NotificationLogPanel';
import { ClientSpace } from './components/ClientSpace';
import { SellerSpace } from './components/SellerSpace';
import { DriverSpace } from './components/DriverSpace';
import { AdminSpace } from './components/AdminSpace';
import { SuperAdminSpace } from './components/SuperAdminSpace';
import { ShieldCheck, Tractor, Truck, Users, LayoutDashboard, Globe, RefreshCw } from 'lucide-react';

export default function App() {
  // Localization: French (default) and English
  const [language, setLanguage] = useState<'FR' | 'EN'>('FR');

  // Unified Database State (Synced with Backend)
  const [db, setDb] = useState<{
    regions: Region[];
    deliveryZones: DeliveryZone[];
    deliveryFeeMatrix: Record<string, Record<string, number>>;
    profiles: Profile[];
    vendeurs: VendeurDetails[];
    drivers: DriverDetails[];
    categories: Category[];
    prixMarche: PrixMarche[];
    products: Product[];
    promotions: Promotion[];
    commandes: Commande[];
    reclamations: Reclamation[];
    evaluations: EvaluationVendeur[];
    notifications: NotificationLog[];
    globalSettings: { commissionRate: number; contactSMSPrestataire: string };
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // Active simulated user profile
  const [currentProfile, setCurrentProfile] = useState<Profile>({
    id: "client-guest",
    name: "Samuel Ebanda",
    email: "samuel@gmail.com",
    phone: "+237 671 22 33 44",
    role: "client"
  });

  // Fetch full state from server
  const fetchDbState = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        setDb(data);
      }
    } catch (err) {
      console.error("Error fetching database from FarmLink backend:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbState();
  }, []);

  // Post / Put helper that triggers a reload
  const triggerAction = async (url: string, method: 'POST' | 'PUT' | 'DELETE', body?: any) => {
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });
      if (res.ok) {
        // Refresh local memory from server
        const updatedRes = await fetch('/api/db');
        if (updatedRes.ok) {
          const updatedData = await updatedRes.json();
          setDb(updatedData);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(`Error executing call to ${url}:`, err);
      return false;
    }
  };

  // Resets complete database state
  const handleResetDb = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setDb(result.data);
      }
    } catch (err) {
      console.error("Error resetting database:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS LOGIC DISPATCHED TO BACKEND ---

  // Client places order
  const handlePlaceOrder = async (orderData: any) => {
    return await triggerAction('/api/orders', 'POST', orderData);
  };

  // Client submits claim (Section 3.8: mandatory photo)
  const handleSubmitClaim = async (orderId: string, description: string, photoUrl: string) => {
    return await triggerAction(`/api/orders/${orderId}/claim`, 'POST', { description, photoUrl });
  };

  // Vendeur adds product
  const handleAddProduct = async (productData: any) => {
    return await triggerAction('/api/products', 'POST', productData);
  };

  // Vendeur edits product (or admin)
  const handleEditProduct = async (productId: string, productData: any) => {
    return await triggerAction(`/api/products/${productId}`, 'PUT', productData);
  };

  // Vendeur deletes product
  const handleDeleteProduct = async (productId: string) => {
    return await triggerAction(`/api/products/${productId}`, 'DELETE');
  };

  // Vendeur adds promotion (Section 3.9)
  const handleAddPromotion = async (promoData: any) => {
    return await triggerAction('/api/promotions', 'POST', promoData);
  };

  // Vendeur deletes promotion
  const handleDeletePromotion = async (promoId: string) => {
    return await triggerAction(`/api/promotions/${promoId}`, 'DELETE');
  };

  // Vendeur confirms allocation (Section 3.3)
  const handleConfirmAllocation = async (orderId: string, productId: string, status: 'confirmed' | 'rejected') => {
    return await triggerAction(`/api/orders/${orderId}/allocation/confirm`, 'PUT', {
      productId,
      sellerId: currentProfile.id,
      confirmedStatus: status
    });
  };

  // Vendeur triggers cashout
  const handleTriggerPayout = async (sellerId: string) => {
    return await triggerAction(`/api/vendeurs/${sellerId}/payout`, 'POST');
  };

  // Driver updates order delivery status (Section 3.5: Collecting -> Delivering -> Delivered)
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    return await triggerAction(`/api/orders/${orderId}/status`, 'PUT', { status });
  };

  // Regional Admin invites new seller (Section 3.1)
  const handleInviteSeller = async (sellerData: any) => {
    return await triggerAction('/api/vendeurs', 'POST', sellerData);
  };

  // Regional Admin suspends/reactivates seller (Section 2.2)
  const handleUpdateSellerStatus = async (sellerId: string, status: 'active' | 'suspended') => {
    return await triggerAction(`/api/vendeurs/${sellerId}/status`, 'PUT', { status });
  };

  // Regional Admin saves manual allocation split (Section 3.3)
  const handleSaveAllocation = async (orderId: string, allocations: any[]) => {
    return await triggerAction(`/api/orders/${orderId}/allocation`, 'PUT', { allocations });
  };

  // Regional Admin assigns driver (Section 2.2)
  const handleAssignDriver = async (orderId: string, driverId: string) => {
    return await triggerAction(`/api/orders/${orderId}/status`, 'PUT', { driverId, status: 'collecting' });
  };

  // Regional Admin resolves claims (Section 3.8)
  const handleResolveClaim = async (claimId: string, decision: string, deductionSellerId?: string, deductionAmount?: number) => {
    return await triggerAction(`/api/claims/${claimId}/resolve`, 'PUT', { decision, deductionSellerId, deductionAmount });
  };

  // Regional Admin evaluates seller internally (Section 3.10)
  const handleEvaluateSeller = async (orderId: string, evaluationData: any) => {
    return await triggerAction(`/api/orders/${orderId}/evaluate`, 'POST', evaluationData);
  };

  // SuperAdmin updates general settings (Section 2.1)
  const handleUpdateSettings = async (settings: any) => {
    return await triggerAction('/api/settings', 'PUT', settings);
  };

  // SuperAdmin updates reference market price (Section 3.4)
  const handleUpdateMarketPrice = async (categoryId: string, productName: string, price: number) => {
    return await triggerAction('/api/prix-marche', 'PUT', { categoryId, productName, price });
  };

  // SuperAdmin adds new regional admin (Section 2.1)
  const handleAddRegionalAdmin = async (adminData: any) => {
    // Generate new admin profile
    return await triggerAction('/api/vendeurs', 'POST', adminData); // simplified, same model
  };

  if (loading || !db) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-emerald-400 gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-emerald-500" />
        <span className="text-sm tracking-wider font-mono font-medium">Chargement de FarmLink Cameroun...</span>
      </div>
    );
  }

  // Find corresponding detail records if simulated profile matches specialized roles
  const activeSellerObj = db.vendeurs.find(v => v.id === currentProfile.id);
  const activeDriverObj = db.drivers.find(d => d.id === currentProfile.id);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] font-sans">
      
      {/* Sticky Role Simulator Selector Bar */}
      <RoleSelector
        currentProfile={currentProfile}
        profiles={db.profiles}
        onProfileChange={(prof) => setCurrentProfile(prof)}
        language={language}
        onLanguageChange={(lang) => setLanguage(lang)}
        onResetDb={handleResetDb}
      />

      {/* Main View Area Routing Based on Active Role */}
      <main className="flex-grow">
        
        {/* ROLE 1: CLIENT */}
        {currentProfile.role === 'client' && (
          <ClientSpace
            products={db.products}
            categories={db.categories}
            regions={db.regions}
            deliveryZones={db.deliveryZones}
            promotions={db.promotions}
            deliveryFeeMatrix={db.deliveryFeeMatrix}
            orders={db.commandes}
            onPlaceOrder={handlePlaceOrder}
            onSubmitClaim={handleSubmitClaim}
            language={language}
          />
        )}

        {/* ROLE 2: VENDEUR (FARMER) */}
        {currentProfile.role === 'vendeur' && activeSellerObj && (
          <SellerSpace
            sellerProfile={activeSellerObj}
            products={db.products}
            categories={db.categories}
            regions={db.regions}
            orders={db.commandes}
            promotions={db.promotions}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddPromotion={handleAddPromotion}
            onDeletePromotion={handleDeletePromotion}
            onConfirmAllocation={handleConfirmAllocation}
            onTriggerPayout={handleTriggerPayout}
            language={language}
          />
        )}

        {/* ROLE 3: LIVREUR (COURIER) */}
        {currentProfile.role === 'livreur' && activeDriverObj && (
          <DriverSpace
            driverProfile={activeDriverObj}
            orders={db.commandes}
            products={db.products}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            language={language}
          />
        )}

        {/* ROLE 4: REGIONAL ADMIN (RLS restricted) */}
        {currentProfile.role === 'admin_regional' && (
          <AdminSpace
            adminProfile={currentProfile}
            orders={db.commandes}
            products={db.products}
            vendeurs={db.vendeurs}
            drivers={db.drivers}
            reclamations={db.reclamations}
            categories={db.categories}
            onInviteSeller={handleInviteSeller}
            onUpdateSellerStatus={handleUpdateSellerStatus}
            onSaveAllocation={handleSaveAllocation}
            onAssignDriver={handleAssignDriver}
            onResolveClaim={handleResolveClaim}
            onEvaluateSeller={handleEvaluateSeller}
            language={language}
          />
        )}

        {/* ROLE 5: SUPERADMIN CENTRAL */}
        {currentProfile.role === 'superadmin' && (
          <SuperAdminSpace
            superAdminProfile={currentProfile}
            orders={db.commandes}
            vendeurs={db.vendeurs}
            profiles={db.profiles}
            categories={db.categories}
            prixMarche={db.prixMarche}
            regions={db.regions}
            deliveryZones={db.deliveryZones}
            deliveryFeeMatrix={db.deliveryFeeMatrix}
            globalSettings={db.globalSettings}
            onUpdateSettings={handleUpdateSettings}
            onUpdateMarketPrice={handleUpdateMarketPrice}
            onAddRegionalAdmin={handleAddRegionalAdmin}
            language={language}
          />
        )}

      </main>

      {/* Observability: live simulation notifications logs panel */}
      <NotificationLogPanel
        logs={db.notifications}
        language={language}
      />

    </div>
  );
}
