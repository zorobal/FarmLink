/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, Category, Region, Commande, Promotion, VendeurDetails } from '../types';
import { Plus, Edit2, Trash2, Check, X, Tag, DollarSign, Package, Star, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';

interface SellerSpaceProps {
  sellerProfile: VendeurDetails;
  products: Product[];
  categories: Category[];
  regions: Region[];
  orders: Commande[];
  promotions: Promotion[];
  onAddProduct: (productData: any) => Promise<boolean>;
  onEditProduct: (productId: string, productData: any) => Promise<boolean>;
  onDeleteProduct: (productId: string) => Promise<boolean>;
  onAddPromotion: (promoData: any) => Promise<boolean>;
  onDeletePromotion: (promoId: string) => Promise<boolean>;
  onConfirmAllocation: (orderId: string, productId: string, status: 'confirmed' | 'rejected') => Promise<boolean>;
  onTriggerPayout: (sellerId: string) => Promise<boolean>;
  language: 'FR' | 'EN';
}

export const SellerSpace: React.FC<SellerSpaceProps> = ({
  sellerProfile,
  products,
  categories,
  regions,
  orders,
  promotions,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onAddPromotion,
  onDeletePromotion,
  onConfirmAllocation,
  onTriggerPayout,
  language
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'promotions' | 'orders'>('dashboard');
  
  // Product Form states
  const [isProductModal, setIsProductModal] = useState(false);
  const [editProdId, setEditProdId] = useState<string | null>(null);
  
  const [prodName, setProdName] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodUnit, setProdUnit] = useState('kg');
  const [prodPriceType, setProdPriceType] = useState<'fixed' | 'market'>('fixed');
  const [prodPrice, setProdPrice] = useState(1000);
  const [prodStock, setProdStock] = useState(10);
  const [prodLocation, setProdLocation] = useState('');
  const [prodPhoto, setProdPhoto] = useState('');

  // Specific Flexible Fields (JSON)
  const [specHarvestDate, setSpecHarvestDate] = useState('');
  const [specVariety, setSpecVariety] = useState('');
  const [specIsOrganic, setSpecIsOrganic] = useState(false);
  const [specSlaughterDate, setSpecSlaughterDate] = useState('');
  const [specPoidsVif, setSpecPoidsVif] = useState(0);
  const [specHealthCert, setSpecHealthCert] = useState(false);

  // Promotion Form state
  const [isPromoModal, setIsPromoModal] = useState(false);
  const [promoProdId, setPromoProdId] = useState('');
  const [promoDiscountType, setPromoDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [promoValue, setPromoValue] = useState(10);

  // Filter products belonging to THIS active seller
  const myProducts = products.filter(p => p.sellerId === sellerProfile.id);
  const myPromotions = promotions.filter(p => p.sellerId === sellerProfile.id);

  // Find incoming order allocations for this seller
  const myAllocations = orders.filter(o => 
    o.allocations.some(a => a.sellerId === sellerProfile.id)
  );

  // Calculate some simple dashboard KPIs
  const activeSalesCount = orders.filter(o => 
    o.status === 'delivered' && o.allocations.some(a => a.sellerId === sellerProfile.id)
  ).length;

  const totalRevenue = sellerProfile.soldeAttente + sellerProfile.soldeVerse;

  // Check category type (vegetal or animal) to render different input fields dynamically
  const selectedCatObj = categories.find(c => c.id === prodCat);
  const isAnimalCat = selectedCatObj?.type === 'animal' || selectedCatObj?.parentId === 'cat-ani';

  const resetProductForm = () => {
    setEditProdId(null);
    setProdName('');
    setProdCat(categories[0]?.id || '');
    setProdDesc('');
    setProdUnit('kg');
    setProdPriceType('fixed');
    setProdPrice(1000);
    setProdStock(10);
    setProdLocation('');
    setProdPhoto('');
    setSpecHarvestDate('');
    setSpecVariety('');
    setSpecIsOrganic(false);
    setSpecSlaughterDate('');
    setSpecPoidsVif(0);
    setSpecHealthCert(false);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditProdId(prod.id);
    setProdName(prod.name);
    setProdCat(prod.categoryId);
    setProdDesc(prod.description);
    setProdUnit(prod.unit);
    setProdPriceType(prod.priceType);
    setProdPrice(prod.price);
    setProdStock(prod.stock);
    setProdLocation(prod.location);
    setProdPhoto(prod.photos[0] || '');
    
    // Set flexible attributes from JSON
    setSpecHarvestDate(prod.specificFields.harvestDate || '');
    setSpecVariety(prod.specificFields.variety || '');
    setSpecIsOrganic(prod.specificFields.isOrganic || false);
    setSpecSlaughterDate(prod.specificFields.slaughterDate || '');
    setSpecPoidsVif(prod.specificFields.poidsVif || 0);
    setSpecHealthCert(prod.specificFields.healthCertificate || false);

    setIsProductModal(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodCat || !prodLocation) {
      alert(language === 'FR' ? "Veuillez remplir tous les champs obligatoires." : "Please fill in all required fields.");
      return;
    }

    const specificFields: any = {};
    if (isAnimalCat) {
      if (specSlaughterDate) specificFields.slaughterDate = specSlaughterDate;
      if (specPoidsVif > 0) specificFields.poidsVif = specPoidsVif;
      specificFields.healthCertificate = specHealthCert;
    } else {
      if (specHarvestDate) specificFields.harvestDate = specHarvestDate;
      if (specVariety) specificFields.variety = specVariety;
      specificFields.isOrganic = specIsOrganic;
    }

    const productPayload = {
      name: prodName,
      categoryId: prodCat,
      description: prodDesc,
      unit: prodUnit,
      priceType: prodPriceType,
      price: prodPriceType === 'market' ? 0 : Number(prodPrice), // aligns to reference on backend
      stock: Number(prodStock),
      provenance: sellerProfile.regionId === 'reg-ce' ? 'Centre' : sellerProfile.regionId === 'reg-lt' ? 'Littoral' : 'Ouest',
      location: prodLocation,
      photos: [prodPhoto || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=400'],
      status: 'published',
      specificFields,
      sellerId: sellerProfile.id,
      sellerName: sellerProfile.name
    };

    let success = false;
    if (editProdId) {
      success = await onEditProduct(editProdId, productPayload);
    } else {
      success = await onAddProduct(productPayload);
    }

    if (success) {
      setIsProductModal(false);
      resetProductForm();
    }
  };

  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoProdId || promoValue <= 0) return;

    const payload = {
      productId: promoProdId,
      sellerId: sellerProfile.id,
      discountType: promoDiscountType,
      discountValue: Number(promoValue),
      startDate: new Date().toISOString().substring(0, 10),
      endDate: "2026-12-31" // Year-end
    };

    const success = await onAddPromotion(payload);
    if (success) {
      setIsPromoModal(false);
      setPromoProdId('');
      setPromoValue(10);
    }
  };

  return (
    <div id="seller-space-view" className="min-h-screen bg-[#F8F9FA] text-slate-800 pb-20 font-sans">
      {/* Space Hero */}
      <div className="bg-white text-gray-950 py-4 px-6 border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-green-50 flex items-center justify-center font-bold text-lg text-green-700 border border-green-200 shrink-0">
              🌾
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] bg-green-100 text-green-800 border border-green-250 px-2 py-0.5 rounded font-bold font-mono uppercase tracking-wider">
                  {language === 'FR' ? 'Producteur Partenaire' : 'Partner Farmer'}
                </span>
              </div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight mt-0.5">{sellerProfile.name}</h1>
              <p className="text-[11px] text-gray-500 font-mono font-medium">
                {sellerProfile.phone} | {sellerProfile.regionId === 'reg-ce' ? 'Région Centre (Yaoundé)' : 'Région Littoral (Douala)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${activeTab === 'dashboard' ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              📊 {language === 'FR' ? 'Dashboard' : 'KPI Dashboard'}
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${activeTab === 'products' ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              📦 {language === 'FR' ? 'Mes Produits' : 'My Products'}
            </button>
            <button
              onClick={() => setActiveTab('promotions')}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${activeTab === 'promotions' ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              🏷️ {language === 'FR' ? 'Mes Promos' : 'My Promos'}
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition relative ${activeTab === 'orders' ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              🔔 {language === 'FR' ? 'Commandes' : 'Orders'}
              {myAllocations.some(o => o.status === 'checking') && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-rose-500 border border-white"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6">

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Financial Balances Row (Section 3.7: pending/paid status display) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Solde en Attente (Delivered but not payout transferred yet) */}
              <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                      {language === 'FR' ? 'Solde en Attente' : 'Pending Payouts'}
                    </span>
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-amber-950 mt-2 font-mono">
                    {sellerProfile.soldeAttente.toLocaleString()} <span className="text-xs font-normal">FCFA</span>
                  </h2>
                  <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">
                    {language === 'FR' 
                      ? 'Crédité après confirmation de livraison chez le client. Transféré sur votre Mobile Money à votre demande.' 
                      : 'Earned upon delivery. Transferred to your Mobile Money account upon request.'}
                  </p>
                </div>

                <button
                  onClick={async () => {
                    if (sellerProfile.soldeAttente === 0) {
                      alert(language === 'FR' ? "Aucun solde à transférer." : "No balance to payout.");
                      return;
                    }
                    const success = await onTriggerPayout(sellerProfile.id);
                    if (success) {
                      alert(language === 'FR' ? "Demande de versement transmise au SuperAdmin !" : "Payout request sent to SuperAdmin!");
                    }
                  }}
                  disabled={sellerProfile.soldeAttente === 0}
                  className={`mt-4 w-full text-xs font-bold py-2.5 rounded-lg transition text-center ${
                    sellerProfile.soldeAttente === 0 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                  }`}
                >
                  📥 {language === 'FR' ? 'Demander Versement' : 'Request MoMo Cashout'}
                </button>
              </div>

              {/* Solde Déjà Versé (Paid out) */}
              <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                      {language === 'FR' ? 'Solde déjà versé' : 'Settled Balance'}
                    </span>
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-emerald-950 mt-2 font-mono">
                    {sellerProfile.soldeVerse.toLocaleString()} <span className="text-xs font-normal">FCFA</span>
                  </h2>
                  <p className="text-[10px] text-emerald-700 mt-1 leading-relaxed">
                    {language === 'FR' ? 'Fonds déjà versés sur votre numéro de téléphone de confiance.' : 'Successfully settled on your registered phone number via MTN/Orange MoMo.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-emerald-500/10 text-center text-[10px] text-emerald-600 font-bold uppercase font-mono">
                  🔒 {language === 'FR' ? 'Compte de Paiement Sécurisé' : 'Secure Payout Node'}
                </div>
              </div>

              {/* Internal ratings (Section 3.10: non-public rating) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {language === 'FR' ? 'Évaluation Interne' : 'Internal Admin Rating'}
                    </span>
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-800 mt-2 font-mono flex items-center gap-1">
                    {sellerProfile.rating || '5.0'} <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    {language === 'FR' 
                      ? 'Note de confiance attribuée par les administrateurs après chaque livraison (fiabilité des stocks, ponctualité, conformité).' 
                      : 'Calculated internally based on stock reliability, punctual logistics, and product quality.'}
                  </p>
                </div>
                <div className="mt-4 text-[9px] bg-slate-100 text-slate-600 font-semibold px-2 py-1 rounded text-center">
                  ⚠️ {language === 'FR' ? 'Strictement confidentiel - Invisible par le client' : 'Admin Only - Hidden from Public'}
                </div>
              </div>

            </div>

            {/* Quick Tips Section */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800 leading-relaxed">
                <strong>{language === 'FR' ? "Astuce Vendeur :" : "Farmer Tip:"}</strong>{' '}
                {language === 'FR' 
                  ? "Les produits fixés au 'prix du marché' se vendent 3 fois plus vite ! L'administration les agrège automatiquement en un seul lot géant, idéal pour recevoir des commandes de gros volumes (comme les restaurants)." 
                  : "Items set to 'market price' sell 3x faster! Admins consolidate their stock with other local farmers, routing bulk wholesale orders directly to you."}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY PRODUCTS */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold font-mono">
                {myProducts.length} {language === 'FR' ? 'produits répertoriés' : 'registered products'}
              </span>
              <button
                id="btn-trigger-add-product"
                onClick={() => { resetProductForm(); setIsProductModal(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'FR' ? 'Nouveau Produit' : 'Add Product'}</span>
              </button>
            </div>

            {/* Grid of seller products */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myProducts.map(prod => (
                <div key={prod.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className="p-4 flex gap-3.5">
                    <img src={prod.photos[0]} alt="" className="w-16 h-16 rounded object-cover border border-slate-150 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded font-mono ${
                          prod.priceType === 'market' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {prod.priceType === 'market' ? 'Prix marché' : 'Prix fixe'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Stock: {prod.stock} {prod.unit}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800">{prod.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{prod.location}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900 font-mono">
                      {prod.priceType === 'market' ? (language === 'FR' ? 'Aligné au marché' : 'Aligned to Market') : `${prod.price.toLocaleString()} FCFA`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditProduct(prod)}
                        className="text-slate-600 hover:text-emerald-700 hover:bg-white p-1 rounded transition border border-transparent hover:border-slate-200"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(language === 'FR' ? "Supprimer ce produit ?" : "Delete product?")) {
                            await onDeleteProduct(prod.id);
                          }
                        }}
                        className="text-slate-600 hover:text-rose-600 hover:bg-white p-1 rounded transition border border-transparent hover:border-slate-200"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PROMOTIONS */}
        {activeTab === 'promotions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                🌟 <strong>{language === 'FR' ? 'Promotions Publiques Immédiates :' : 'Instant Self-Promotions:'}</strong>{' '}
                {language === 'FR' 
                  ? "Créez des remises de prix à tout moment. La promotion s'applique immédiatement dans le catalogue. La commission de la plateforme reste calculée sur votre prix d'origine." 
                  : "Add instant markdown discounts on your fixed-price stocks. Platform commission still calculates on original price."}
              </p>
              <button
                id="btn-trigger-add-promo"
                onClick={() => setIsPromoModal(true)}
                disabled={myProducts.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'FR' ? 'Créer Promo' : 'Add Discount'}</span>
              </button>
            </div>

            {/* List of current promotions */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              {myPromotions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {language === 'FR' ? "Aucune promotion active actuellement." : "No discounts active currently."}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {myPromotions.map(promo => {
                    const prod = products.find(p => p.id === promo.productId);
                    if (!prod) return null;
                    return (
                      <div key={promo.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <img src={prod.photos[0]} alt="" className="w-10 h-10 object-cover rounded" />
                          <div>
                            <p className="font-bold text-slate-800">{prod.name}</p>
                            <p className="text-slate-500 font-mono">
                              {language === 'FR' ? 'Remise :' : 'Markdown :'} -{promo.discountValue}{' '}
                              {promo.discountType === 'percent' ? '%' : 'FCFA'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            if (confirm(language === 'FR' ? "Retirer cette promotion ?" : "Remove discount?")) {
                              await onDeletePromotion(promo.id);
                            }
                          }}
                          className="text-rose-600 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded font-bold transition"
                        >
                          Retirer / Cancel
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ORDERS & ALLOCATIONS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-950 p-4 rounded-xl text-xs leading-relaxed">
              <strong>{language === 'FR' ? 'Protocole de Confiance :' : 'Assurance Protocol:'}</strong>{' '}
              {language === 'FR' 
                ? "Lorsqu'un administrateur répartit une commande, vous recevez un SMS/WhatsApp. Veuillez confirmer immédiatement la disponibilité en stock. Dès que tous les éleveurs impliqués disent OK, le livreur démarre la collecte." 
                : "Incoming allocation targets must be confirmed 'OK' to lock stocks and schedule local collection runners."}
            </div>

            <div className="space-y-4">
              {myAllocations.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-xl text-xs text-slate-400">
                  {language === 'FR' ? "Aucune commande loguée pour le moment." : "No orders logged currently."}
                </div>
              ) : (
                myAllocations.map(ord => {
                  // Find allocations belonging to this vendor
                  const matches = ord.allocations.filter(a => a.sellerId === sellerProfile.id);

                  return (
                    <div key={ord.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 text-xs">
                        <div>
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded">
                            #{ord.id}
                          </span>
                          <span className="text-slate-400 ml-2 font-mono">{new Date(ord.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded font-bold uppercase tracking-wider font-mono text-[10px] border ${
                          ord.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {ord.status}
                        </span>
                      </div>

                      {/* Display allocation items and status */}
                      <div className="space-y-3">
                        {matches.map((alloc, i) => {
                          const prod = products.find(p => p.id === alloc.productId);
                          return (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-150">
                              <div>
                                <span className="font-semibold text-slate-500 font-mono">Détail :</span>
                                <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{alloc.quantity} x {prod?.name || 'Produit'}</h4>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Unité: {prod?.unit} | {prod?.location}</p>
                              </div>

                              {/* Confirmation state */}
                              <div className="flex items-center gap-2">
                                {alloc.confirmed === 'pending' ? (
                                  <>
                                    <button
                                      id={`btn-confirm-ok-${ord.id}-${alloc.productId}`}
                                      onClick={async () => {
                                        await onConfirmAllocation(ord.id, alloc.productId, 'confirmed');
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded flex items-center gap-1 shadow-sm transition"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Confirmer (OK)</span>
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (confirm("Refuser cette commande (indisponible) ?")) {
                                          await onConfirmAllocation(ord.id, alloc.productId, 'rejected');
                                        }
                                      }}
                                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold px-3 py-1.5 rounded flex items-center gap-1 transition"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Refuser</span>
                                    </button>
                                  </>
                                ) : (
                                  <span className={`px-3 py-1.5 rounded font-bold font-mono text-[10px] uppercase border ${
                                    alloc.confirmed === 'confirmed' 
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                      : 'bg-rose-50 text-rose-800 border-rose-200'
                                  }`}>
                                    ● {alloc.confirmed === 'confirmed' ? 'Disponibilité Confirmée (OK)' : 'Refusé / Indisponible'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* --- ADD/EDIT PRODUCT MODAL (Section 3.2: specific flexible attributes stored) --- */}
      {isProductModal && (
        <div id="product-form-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wider uppercase font-mono">
                {editProdId ? 'Modifier le Produit' : 'Ajouter un Nouveau Produit'}
              </h3>
              <button
                onClick={() => { setIsProductModal(false); resetProductForm(); }}
                className="hover:bg-slate-800 p-1.5 rounded transition text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nom du produit *</label>
                  <input
                    id="input-prod-name"
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Ex: Poulet fermier de chair, Tomate Cobra..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Catégorie *</label>
                  <select
                    id="select-prod-cat"
                    value={prodCat}
                    onChange={(e) => setProdCat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'vegetal' ? 'Végétal' : 'Animal'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  rows={2}
                  placeholder="Décrivez brièvement la provenance, l'alimentation, la fraîcheur..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unité de vente *</label>
                  <input
                    type="text"
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    placeholder="Ex: kg, pièce, sac, carton..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Stock de départ *</label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    min={0}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Type de tarification *</label>
                  <select
                    id="select-prod-price-type"
                    value={prodPriceType}
                    onChange={(e) => setProdPriceType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium cursor-pointer"
                  >
                    <option value="fixed">🔒 Prix Fixe Vendeur</option>
                    <option value="market">📈 Alignement Prix de Marché</option>
                  </select>
                </div>
              </div>

              {prodPriceType === 'fixed' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Prix de vente unitaire (FCFA) *</label>
                  <input
                    id="input-prod-price"
                    type="number"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    min={100}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lieu de collecte exact *</label>
                  <input
                    type="text"
                    value={prodLocation}
                    onChange={(e) => setProdLocation(e.target.value)}
                    placeholder="Ex: Yaoundé, Yaoundé-Mvan, Obala..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-sans focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lien photo produit (Optionnel)</label>
                  <input
                    type="text"
                    value={prodPhoto}
                    onChange={(e) => setProdPhoto(e.target.value)}
                    placeholder="https://images.com/photos.jpg..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* DYNAMIC JSON METADATA INPUTS BY CATEGORY */}
              <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 space-y-3.5">
                <h4 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-1 font-mono uppercase tracking-wider">
                  🧪 {language === 'FR' ? 'Champs Spécifiques / Traçabilité' : 'Traceability Specifics'}
                </h4>

                {isAnimalCat ? (
                  /* ANIMAL SPECIFIC FIELDS */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Date d'abattage (le cas échéant)</label>
                      <input
                        type="date"
                        value={specSlaughterDate}
                        onChange={(e) => setSpecSlaughterDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Poids Vif Estimé (kg)</label>
                      <input
                        type="number"
                        value={specPoidsVif}
                        onChange={(e) => setSpecPoidsVif(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={specHealthCert}
                          onChange={(e) => setSpecHealthCert(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-slate-700">Certificat sanitaire disponible</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  /* VEGETAL SPECIFIC FIELDS */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Date de récolte</label>
                      <input
                        type="date"
                        value={specHarvestDate}
                        onChange={(e) => setSpecHarvestDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Variété spécifique (Espèce)</label>
                      <input
                        type="text"
                        value={specVariety}
                        placeholder="Ex: Cobra, Composite..."
                        onChange={(e) => setSpecVariety(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-sans"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={specIsOrganic}
                          onChange={(e) => setSpecIsOrganic(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-slate-700">Certification Biologique locale (Bio)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsProductModal(false); resetProductForm(); }}
                  className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  id="btn-submit-product-form"
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition"
                >
                  {editProdId ? 'Sauvegarder' : 'Publier immédiatement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD PROMOTION MODAL --- */}
      {isPromoModal && (
        <div id="promo-form-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-xs tracking-wider uppercase font-mono">Créer une Promotion</h3>
              <button
                onClick={() => setIsPromoModal(false)}
                className="hover:bg-slate-800 p-1.5 rounded transition text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePromoSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sélectionner un produit *</label>
                <select
                  id="select-promo-prod"
                  value={promoProdId}
                  onChange={(e) => setPromoProdId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium cursor-pointer"
                >
                  <option value="">-- Choisir un produit --</option>
                  {myProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.price} FCFA)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Type de remise *</label>
                  <select
                    value={promoDiscountType}
                    onChange={(e) => setPromoDiscountType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium cursor-pointer"
                  >
                    <option value="percent">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (FCFA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Valeur de réduction *</label>
                  <input
                    id="input-promo-val"
                    type="number"
                    value={promoValue}
                    onChange={(e) => setPromoValue(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPromoModal(false)}
                  className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  id="btn-submit-promo-form"
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition"
                >
                  Publier immédiatement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
