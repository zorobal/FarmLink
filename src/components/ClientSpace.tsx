/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, Category, Region, DeliveryZone, Commande, Promotion } from '../types';
import { Search, ShoppingBag, MapPin, Tag, ShieldCheck, CheckCircle2, Clock, Truck, ChevronRight, X, Heart, RefreshCw, AlertTriangle, Image as ImageIcon } from 'lucide-react';

interface ClientSpaceProps {
  products: Product[];
  categories: Category[];
  regions: Region[];
  deliveryZones: DeliveryZone[];
  promotions: Promotion[];
  deliveryFeeMatrix: Record<string, Record<string, number>>;
  orders: Commande[];
  onPlaceOrder: (orderData: any) => Promise<boolean>;
  onSubmitClaim: (orderId: string, description: string, photoUrl: string) => Promise<boolean>;
  language: 'FR' | 'EN';
}

export const ClientSpace: React.FC<ClientSpaceProps> = ({
  products,
  categories,
  regions,
  deliveryZones,
  promotions,
  deliveryFeeMatrix,
  orders,
  onPlaceOrder,
  onSubmitClaim,
  language
}) => {
  // Navigation tabs within Client Space
  const [activeTab, setActiveTab] = useState<'catalog' | 'tracking' | 'account'>('catalog');
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('all');
  const [selectedPriceType, setSelectedPriceType] = useState<'all' | 'market' | 'fixed'>('all');

  // Selected product detail modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Cart State: { productId: quantity }
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout State
  const [isCheckout, setIsCheckout] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [deliveryRegionId, setDeliveryRegionId] = useState('reg-ce'); // default to Centre
  const [deliveryZoneId, setDeliveryZoneId] = useState('zone-yde'); // default to Yaoundé Ville
  const [paymentMode, setPaymentMode] = useState<'cash' | 'mobile_money'>('cash');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  // Claim State
  const [claimOrderId, setClaimOrderId] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [claimPhotoUrl, setClaimPhotoUrl] = useState('');
  const [claimSuccessMessage, setClaimSuccessMessage] = useState('');

  // Favorites
  const [favorites, setFavorites] = useState<string[]>([]);

  // Search tracking Order ID
  const [trackOrderId, setTrackOrderId] = useState('');
  const [foundTrackOrder, setFoundTrackOrder] = useState<Commande | null>(null);

  const t = {
    catalog: language === 'FR' ? 'Catalogue Frais' : 'Fresh Catalog',
    tracking: language === 'FR' ? 'Suivi Commande' : 'Order Tracking',
    account: language === 'FR' ? 'Mon Espace' : 'My Space',
    searchPlaceholder: language === 'FR' ? 'Rechercher un légume, poulet, maïs...' : 'Search vegetables, poultry, corn...',
    allCategories: language === 'FR' ? 'Toutes catégories' : 'All Categories',
    allRegions: language === 'FR' ? 'Tout le Cameroun' : 'All Cameroon',
    priceType: language === 'FR' ? 'Type de prix' : 'Price Type',
    marketPrice: language === 'FR' ? 'Prix du marché' : 'Market Price',
    fixedPrice: language === 'FR' ? 'Prix fixé' : 'Fixed Price',
    aggregatedNotice: language === 'FR' ? 'Stock agrégé multi-vendeurs pour prix de référence' : 'Multi-seller aggregated stock for reference price',
    addToCart: language === 'FR' ? 'Ajouter au panier' : 'Add to Cart',
    cartTitle: language === 'FR' ? 'Votre Panier' : 'Your Cart',
    deliveryFee: language === 'FR' ? 'Frais de livraison' : 'Delivery Fee',
    total: language === 'FR' ? 'Montant Total' : 'Total Amount',
    emptyCart: language === 'FR' ? 'Votre panier est vide.' : 'Your cart is empty.',
    checkoutBtn: language === 'FR' ? 'Passer à la caisse' : 'Proceed to Checkout',
    checkoutTitle: language === 'FR' ? 'Validation de votre Commande' : 'Checkout - Validate Order',
    fullName: language === 'FR' ? 'Nom complet' : 'Full Name',
    phone: language === 'FR' ? 'Téléphone (Mobile Money)' : 'Phone (Mobile Money)',
    address: language === 'FR' ? 'Adresse précise de livraison' : 'Precise Shipping Address',
    deliveryZone: language === 'FR' ? 'Zone de livraison' : 'Delivery Zone',
    paymentType: language === 'FR' ? 'Mode de paiement' : 'Payment Mode',
    payOnDelivery: language === 'FR' ? 'Espèces à la livraison (COD)' : 'Cash on delivery (COD)',
    payMoMo: language === 'FR' ? 'Mobile Money (Orange/MTN hors-ligne)' : 'Mobile Money (Orange/MTN off-line)',
    orderSuccess: language === 'FR' ? 'Votre commande a été enregistrée avec succès ! Un conseiller vous contactera d\'ici peu.' : 'Order placed successfully! A representative will contact you soon.',
    detailsTitle: language === 'FR' ? 'Fiche Technique Produit' : 'Technical Specifications',
    specifics: language === 'FR' ? 'Champs spécifiques :' : 'Specific Attributes:',
    harvestDate: language === 'FR' ? 'Date de récolte' : 'Harvest date',
    slaughterDate: language === 'FR' ? 'Date d\'abattage' : 'Slaughter date',
    organic: language === 'FR' ? 'Certifié Biologique' : 'Certified Organic',
    healthCertificate: language === 'FR' ? 'Certificat sanitaire disponible' : 'Sanitary certificate available',
    weight: language === 'FR' ? 'Poids estimé' : 'Estimated weight'
  };

  // --- BUSINESS LOGIC: MULTI-SELLER STOCK AGGREGATION ---
  // When multiple sellers offer the SAME product at market price, we merge them!
  // Products are considered "same" if they have the same categoryId, priceType === 'market'
  // and close match on name. Let's group them properly to display clean cards.
  const aggregatedProducts = useMemo(() => {
    const published = products.filter(p => p.status === 'published');
    const result: Product[] = [];
    const marketGroups: Record<string, Product[]> = {};

    published.forEach(prod => {
      if (prod.priceType === 'market') {
        // Group by categoryId + simplified name (lowercase, trim)
        const key = `${prod.categoryId}-${prod.name.toLowerCase().trim()}`;
        if (!marketGroups[key]) {
          marketGroups[key] = [];
        }
        marketGroups[key].push(prod);
      } else {
        // Fixed price items are always separate
        result.push(prod);
      }
    });

    // Merge each market group into a single aggregated product
    Object.keys(marketGroups).forEach(key => {
      const group = marketGroups[key];
      if (group.length === 1) {
        result.push(group[0]);
      } else {
        // Merge! Sum stocks, list provenances, point to a representative product
        const totalStock = group.reduce((sum, p) => sum + p.stock, 0);
        const uniqueProvenances = Array.from(new Set(group.map(p => p.provenance))).join(', ');
        
        // We use the first product as primary info, but modify stock and seller identifier
        result.push({
          ...group[0],
          id: `aggregated-${key}`, // unique aggregated ID
          stock: totalStock,
          sellerId: 'aggregated-multi',
          sellerName: `${group.length} Vendeurs Associés`,
          provenance: uniqueProvenances,
          description: `${group[0].description} (Lots agrégés de ${group.length} producteurs locaux: ${uniqueProvenances}).`
        });
      }
    });

    return result;
  }, [products]);

  // Apply search & filters on the aggregated/individual list
  const filteredProducts = useMemo(() => {
    return aggregatedProducts.filter(prod => {
      // 1. Search Query
      const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            prod.provenance.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Category Filter
      const matchesCategory = selectedCategory === 'all' || prod.categoryId === selectedCategory;

      // 3. Region Filter (For aggregated products, we check if the merged provenances contain the region name)
      const targetRegionName = regions.find(r => r.id === selectedRegionId)?.name || '';
      const matchesRegion = selectedRegionId === 'all' || 
                            prod.provenance.toLowerCase().includes(targetRegionName.toLowerCase());

      // 4. Price Type Filter
      const matchesPriceType = selectedPriceType === 'all' || prod.priceType === selectedPriceType;

      return matchesSearch && matchesCategory && matchesRegion && matchesPriceType;
    });
  }, [aggregatedProducts, searchQuery, selectedCategory, selectedRegionId, selectedPriceType, regions]);

  // Get promotional price for product if applicable
  const getProductPrice = (product: Product) => {
    // Aggregated product pricing stays reference market price
    if (product.id.startsWith('aggregated-')) {
      return product.price;
    }
    const promo = promotions.find(p => p.productId === product.id);
    if (promo) {
      if (promo.discountType === 'percent') {
        return Math.round(product.price * (1 - promo.discountValue / 100));
      } else {
        return Math.max(0, product.price - promo.discountValue);
      }
    }
    return product.price;
  };

  // Cart Calculations
  const cartItemsCount = (Object.values(cart) as number[]).reduce((sum, qty) => sum + qty, 0);
  
  const cartSubtotal = useMemo(() => {
    let subtotal = 0;
    Object.entries(cart).forEach(([prodId, val]) => {
      const qty = val as number;
      // Find the corresponding product from the primary list or mock aggregated list
      let prod = products.find(p => p.id === prodId);
      if (!prod && prodId.startsWith('aggregated-')) {
        prod = aggregatedProducts.find(p => p.id === prodId);
      }
      if (prod) {
        subtotal += getProductPrice(prod) * qty;
      }
    });
    return subtotal;
  }, [cart, products, aggregatedProducts, promotions]);

  const calculatedDeliveryFee = useMemo(() => {
    if (cartItemsCount === 0) return 0;
    // Determine origin region based on first item in cart
    const firstItemId = Object.keys(cart)[0];
    let firstProd = products.find(p => p.id === firstItemId);
    if (!firstProd && firstItemId?.startsWith('aggregated-')) {
      firstProd = aggregatedProducts.find(p => p.id === firstItemId);
    }

    const originRegionId = firstProd?.provenance.includes("Littoral") ? "reg-lt" : "reg-ce";
    const regionRates = deliveryFeeMatrix[originRegionId] || deliveryFeeMatrix["reg-ce"];
    return regionRates[deliveryZoneId] || 2500;
  }, [cart, deliveryZoneId, products, aggregatedProducts, deliveryFeeMatrix, cartItemsCount]);

  const cartTotal = cartSubtotal + calculatedDeliveryFee;

  // Modify cart quantity
  const handleUpdateCart = (prodId: string, quantity: number) => {
    // Find stock ceiling
    let prod = products.find(p => p.id === prodId);
    if (!prod && prodId.startsWith('aggregated-')) {
      prod = aggregatedProducts.find(p => p.id === prodId);
    }
    if (!prod) return;

    if (quantity <= 0) {
      const newCart = { ...cart };
      delete newCart[prodId];
      setCart(newCart);
    } else if (quantity <= prod.stock) {
      setCart({ ...cart, [prodId]: quantity });
    } else {
      alert(language === 'FR' ? `Désolé, stock maximum disponible atteint (${prod.stock} ${prod.unit})` : `Sorry, maximum stock reached (${prod.stock} ${prod.unit})`);
    }
  };

  const handleAddToCart = (product: Product) => {
    const currentQty = cart[product.id] || 0;
    if (currentQty < product.stock) {
      setCart({ ...cart, [product.id]: currentQty + 1 });
      // Open cart for preview
      setIsCartOpen(true);
    } else {
      alert(language === 'FR' ? "Stock insuffisant !" : "Insufficient stock!");
    }
  };

  // Toggle favorite
  const toggleFavorite = (prodId: string) => {
    if (favorites.includes(prodId)) {
      setFavorites(favorites.filter(id => id !== prodId));
    } else {
      setFavorites([...favorites, prodId]);
    }
  };

  // Submit Checkout
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !clientAddress) {
      alert(language === 'FR' ? "Veuillez remplir tous les champs obligatoires." : "Please fill in all required fields.");
      return;
    }

    setCheckoutSubmitting(true);
    
    // Prepare items format for backend
    const itemsToSubmit = Object.entries(cart).map(([prodId, qty]) => {
      let prod = products.find(p => p.id === prodId);
      let isAggregated = false;
      if (!prod && prodId.startsWith('aggregated-')) {
        prod = aggregatedProducts.find(p => p.id === prodId);
        isAggregated = true;
      }
      
      const price = prod ? getProductPrice(prod) : 0;

      // If it's aggregated, we point to the first actual matching seller product in the DB
      // or split on backend automatically
      let finalProdId = prodId;
      if (isAggregated && prod) {
        const actualProd = products.find(p => p.categoryId === prod.categoryId && p.priceType === 'market' && p.stock >= qty);
        if (actualProd) finalProdId = actualProd.id;
      }

      return {
        productId: finalProdId,
        quantity: qty,
        unitPrice: price
      };
    });

    const success = await onPlaceOrder({
      clientName,
      clientPhone,
      clientAddress,
      clientEmail,
      deliveryRegionId,
      deliveryZoneId,
      items: itemsToSubmit,
      deliveryMode: 'internal', // Default
      paymentMode
    });

    setCheckoutSubmitting(false);

    if (success) {
      setCart({});
      setIsCheckout(false);
      setIsCartOpen(false);
      setActiveTab('tracking');
      // Set the last placed order for tracking input
      const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (sortedOrders.length > 0) {
        setTrackOrderId(sortedOrders[0].id);
        setFoundTrackOrder(sortedOrders[0]);
      } else {
        alert(t.orderSuccess);
      }
    }
  };

  // Submit Claim (Complaint)
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimOrderId || !claimDescription) {
      alert(language === 'FR' ? "Veuillez indiquer l'ID de commande et la description" : "Please supply order ID and description");
      return;
    }

    // Photo is mandatory according to Cahier des charges: "avec photo obligatoire à l'appui."
    if (!claimPhotoUrl) {
      alert(language === 'FR' ? "Une photo à l'appui est obligatoire pour toute réclamation sous 24h." : "A photo proof is mandatory for any claim filed under 24h.");
      return;
    }

    const success = await onSubmitClaim(claimOrderId, claimDescription, claimPhotoUrl);
    if (success) {
      setClaimSuccessMessage(language === 'FR' ? "Votre réclamation a bien été enregistrée et transmise à l'administrateur régional." : "Claim submitted and routed to Regional Admin.");
      setClaimDescription('');
      setClaimPhotoUrl('');
    }
  };

  // Select Zone automatically sets Region
  const handleZoneChange = (zoneId: string) => {
    setDeliveryZoneId(zoneId);
    const zone = deliveryZones.find(z => z.id === zoneId);
    if (zone) {
      setDeliveryRegionId(zone.regionId);
    }
  };

  // Fast order tracker lookup
  const handleTrackSearch = () => {
    const found = orders.find(o => o.id.toLowerCase() === trackOrderId.trim().toLowerCase());
    if (found) {
      setFoundTrackOrder(found);
    } else {
      setFoundTrackOrder(null);
      alert(language === 'FR' ? "Aucune commande trouvée avec cet ID." : "No order found with this ID.");
    }
  };

  // Helper to draw nice Cameroon flags
  const FlagIcon = () => (
    <span className="inline-flex items-center gap-0.5 ml-1 select-none">
      <span className="w-1.5 h-3 bg-emerald-600 rounded-l"></span>
      <span className="w-1.5 h-3 bg-rose-600 flex items-center justify-center relative">
        <span className="absolute text-[4px] text-yellow-300">★</span>
      </span>
      <span className="w-1.5 h-3 bg-amber-400 rounded-r"></span>
    </span>
  );

  return (
    <div id="client-space-view" className="min-h-screen bg-[#F8F9FA] text-slate-800 pb-20 font-sans">
      {/* Sub Header */}
      <div className="bg-white text-gray-950 py-4 px-6 border-b border-gray-200 shadow-xs relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="bg-green-100 text-[9px] text-green-800 border border-green-200 px-2 py-0.5 rounded font-bold font-mono uppercase tracking-wider">
                  {language === 'FR' ? 'SERVICE DE PROXIMITÉ' : 'NEIGHBORHOOD SERVICE'}
                </span>
                <FlagIcon />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900">
                {language === 'FR' ? 'Marché Agricole Camerounais' : 'Cameroonian Agricultural Market'}
              </h1>
              <p className="text-[11px] text-gray-500 font-normal mt-0.5 max-w-2xl leading-normal">
                {language === 'FR' 
                  ? 'Commandez vos viandes fraîches et légumes locaux en toute sérénité. FarmLink centralise, valide les stocks chez les producteurs régionaux et vous livre à domicile.' 
                  : 'Order fresh livestock and organic vegetables. FarmLink aggregates local stocks, handles validation with farmers, and delivers directly to your door.'}
              </p>
            </div>
            
            {/* Quick Status / Navigation Cards */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                id="tab-client-catalog"
                onClick={() => { setActiveTab('catalog'); setIsCheckout(false); }}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition flex items-center gap-1.5 ${activeTab === 'catalog' && !isCheckout ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{t.catalog}</span>
              </button>

              <button
                id="tab-client-tracking"
                onClick={() => { setActiveTab('tracking'); setIsCheckout(false); }}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition flex items-center gap-1.5 ${activeTab === 'tracking' ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t.tracking}</span>
              </button>

              <button
                id="tab-client-account"
                onClick={() => { setActiveTab('account'); setIsCheckout(false); }}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition flex items-center gap-1.5 ${activeTab === 'account' ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>{t.account}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Arena */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        
        {/* TAB 1: CATALOGUE */}
        {activeTab === 'catalog' && !isCheckout && (
          <div id="catalog-tab-content">
            {/* Search and Advanced Filter Row */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative w-full lg:flex-1">
                <Search className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  id="catalog-search-input"
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                {/* Category Select */}
                <select
                  id="filter-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                >
                  <option value="all">📁 {t.allCategories}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.parentId ? ' └ ' : '• '}{cat.name} ({cat.type === 'vegetal' ? 'Végétal' : 'Animal'})
                    </option>
                  ))}
                </select>

                {/* Region Select */}
                <select
                  id="filter-region"
                  value={selectedRegionId}
                  onChange={(e) => setSelectedRegionId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                >
                  <option value="all">📍 {t.allRegions}</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>

                {/* Price Type Select */}
                <select
                  id="filter-price-type"
                  value={selectedPriceType}
                  onChange={(e) => setSelectedPriceType(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                >
                  <option value="all">💰 {t.priceType}</option>
                  <option value="market">🏷️ {t.marketPrice}</option>
                  <option value="fixed">🔒 {t.fixedPrice}</option>
                </select>
              </div>
            </div>

            {/* Aggregation banner */}
            <div className="mb-6 flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 p-3.5 rounded-lg text-xs leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <p>
                <strong>{language === 'FR' ? 'Gestion Intelligente des Stocks :' : 'Smart Stock Allocation:'}</strong>{' '}
                {t.aggregatedNotice}. {language === 'FR' ? 'Achetez en grande quantité, l\'administration répartit automatiquement la commande entre les éleveurs disponibles d\'une même région.' : 'Buy in bulk, regional admins partition the workload among verified regional farmers.'}
              </p>
            </div>

            {/* Grid of Products */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-150 rounded-xl">
                <p className="text-slate-400 text-sm">
                  {language === 'FR' ? "Aucun produit ne correspond à vos critères de recherche." : "No products matching your search filters."}
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedRegionId('all'); setSelectedPriceType('all'); }}
                  className="mt-4 text-xs font-semibold text-emerald-600 hover:underline"
                >
                  {language === 'FR' ? "Réinitialiser les filtres" : "Clear all filters"}
                </button>
              </div>
            ) : (
              <div id="product-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map(prod => {
                  const finalPrice = getProductPrice(prod);
                  const isDiscounted = finalPrice < prod.price;
                  const isAggregated = prod.id.startsWith('aggregated-');
                  const isFavorited = favorites.includes(prod.id);

                  return (
                    <div 
                      key={prod.id} 
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                    >
                      {/* Product Image Panel */}
                      <div className="h-44 bg-slate-100 relative overflow-hidden">
                        <img
                          src={prod.photos[0] || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=400'}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        
                        {/* Price Type Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                          {isAggregated ? (
                            <span className="bg-emerald-600 text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded shadow-sm">
                              {language === 'FR' ? 'STOCKS AGRÉGÉS' : 'AGGREGATED POOL'}
                            </span>
                          ) : (
                            <span className="bg-slate-900/80 text-white text-[9px] font-medium tracking-wider px-2 py-0.5 rounded shadow-sm">
                              {prod.sellerName}
                            </span>
                          )}

                          {prod.priceType === 'market' ? (
                            <span className="bg-blue-600 text-white text-[8px] font-bold tracking-wider uppercase px-2 py-0.5 rounded w-max shadow-sm">
                              📈 {language === 'FR' ? 'Prix du marché' : 'Market Price'}
                            </span>
                          ) : (
                            <span className="bg-amber-600 text-white text-[8px] font-bold tracking-wider uppercase px-2 py-0.5 rounded w-max shadow-sm">
                              🔒 {language === 'FR' ? 'Prix fixe' : 'Fixed Price'}
                            </span>
                          )}
                        </div>

                        {/* Favorite Button */}
                        <button
                          onClick={() => toggleFavorite(prod.id)}
                          className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition shadow"
                        >
                          <Heart className={`w-4 h-4 transition-colors ${isFavorited ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                        </button>

                        {/* Stock alert */}
                        <div className="absolute bottom-2.5 right-2.5 bg-slate-900/70 text-white text-[9px] font-bold px-2 py-0.5 rounded">
                          Stock: {prod.stock} {prod.unit}
                        </div>
                      </div>

                      {/* Content Panel */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold mb-1 font-mono flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{prod.provenance} ({prod.location})</span>
                          </div>
                          
                          <h3 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                            {prod.name}
                          </h3>
                          
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {prod.description}
                          </p>

                          {/* Specific labels */}
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {prod.specificFields.isOrganic && (
                              <span className="bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded">Bio</span>
                            )}
                            {prod.specificFields.healthCertificate && (
                              <span className="bg-blue-50 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded">Certif. Sanitaire</span>
                            )}
                            {prod.specificFields.poidsVif && (
                              <span className="bg-amber-50 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded">{prod.specificFields.poidsVif} kg vif</span>
                            )}
                          </div>
                        </div>

                        {/* Footer purchase action */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex flex-col">
                            {isDiscounted && (
                              <span className="text-[9px] line-through text-slate-400 font-mono">
                                {prod.price} FCFA
                              </span>
                            )}
                            <span className="font-extrabold text-sm text-slate-900 font-mono">
                              {finalPrice.toLocaleString()} <span className="text-[10px] font-normal">FCFA / {prod.unit}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedProduct(prod)}
                              className="text-xs text-slate-500 hover:text-slate-800 hover:underline px-1.5 py-1"
                            >
                              Details
                            </button>
                            <button
                              id={`btn-add-to-cart-${prod.id}`}
                              onClick={() => handleAddToCart(prod)}
                              disabled={prod.stock === 0}
                              className={`bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded transition ${prod.stock === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : ''}`}
                            >
                              + Panier
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRACKING */}
        {activeTab === 'tracking' && (
          <div id="tracking-tab-content" className="max-w-3xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
              <h2 className="text-lg font-bold text-slate-800 mb-2">
                {language === 'FR' ? "Suivre ma commande en direct" : "Live track my order"}
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                {language === 'FR' 
                  ? "Entrez votre ID de commande reçu par SMS pour suivre la collecte de proximité et la livraison." 
                  : "Enter your order ID received by SMS to monitor regional consolidation and dispatching."}
              </p>

              <div className="flex gap-2">
                <input
                  id="tracking-search-input"
                  type="text"
                  placeholder="Ex: cmd-123"
                  value={trackOrderId}
                  onChange={(e) => setTrackOrderId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg pl-4 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors flex-1 uppercase font-mono font-bold text-slate-700"
                />
                <button
                  id="btn-trigger-track-search"
                  onClick={handleTrackSearch}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition"
                >
                  {language === 'FR' ? "Rechercher" : "Search"}
                </button>
              </div>
            </div>

            {foundTrackOrder ? (
              <div id="tracking-order-results" className="space-y-6 animate-in fade-in duration-200">
                {/* Basic Order details */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase font-mono tracking-wider">
                        Commande #{foundTrackOrder.id}
                      </span>
                      <h3 className="font-bold text-slate-800 mt-1 font-mono text-sm">
                        {foundTrackOrder.totalAmount.toLocaleString()} FCFA
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(foundTrackOrder.createdAt).toLocaleDateString()} {new Date(foundTrackOrder.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium mb-1">Destinataire :</p>
                      <p className="font-semibold text-slate-700">{foundTrackOrder.clientName}</p>
                      <p className="text-slate-600">{foundTrackOrder.clientPhone}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium mb-1">Lieu de livraison :</p>
                      <p className="font-semibold text-slate-700">{foundTrackOrder.clientAddress}</p>
                      <p className="text-slate-500 font-mono">
                        {deliveryZones.find(z => z.id === foundTrackOrder.deliveryZoneId)?.name}
                      </p>
                    </div>
                  </div>

                  {/* List of ordered items */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400 font-medium mb-2">Produits commandés :</p>
                    <div className="space-y-1.5">
                      {foundTrackOrder.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-mono">
                          <span className="text-slate-600">{it.quantity} x {it.name}</span>
                          <span className="font-semibold text-slate-800">{(it.unitPrice * it.quantity).toLocaleString()} FCFA</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100 text-slate-400 font-mono">
                        <span>Frais de livraison :</span>
                        <span>{foundTrackOrder.deliveryFee.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tracking Progress Timeline */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-6 text-sm">
                    {language === 'FR' ? "Statut de préparation et logistique" : "Preparation & Logistics Status"}
                  </h3>

                  <div className="relative border-l border-slate-150 pl-6 ml-3 space-y-8 text-xs">
                    {/* Status 1: Pending */}
                    <div className="relative">
                      <span className={`absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 ${
                        foundTrackOrder.status !== 'cancelled' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-300 border-slate-300 text-slate-500'
                      }`}>
                        ✓
                      </span>
                      <h4 className="font-bold text-slate-800">🧾 {language === 'FR' ? 'Commande Enregistrée' : 'Order Placed'}</h4>
                      <p className="text-slate-500 mt-1">
                        {language === 'FR' ? 'La commande a été transmise aux administrateurs régionaux.' : 'Order has been logged in central register.'}
                      </p>
                    </div>

                    {/* Status 2: Checking (Vérification et répartition) */}
                    <div className="relative">
                      <span className={`absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 ${
                        ['checking', 'collecting', 'delivering', 'delivered'].includes(foundTrackOrder.status)
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        ✓
                      </span>
                      <h4 className="font-bold text-slate-800">🔍 {language === 'FR' ? 'Vérification & Répartition' : 'Verification & Apportioning'}</h4>
                      <p className="text-slate-500 mt-1">
                        {language === 'FR' ? 'L\'administrateur régional vérifie la disponibilité et répartit les lots entre les producteurs.' : 'Regional admins verify stock lists and apportion workload among local sellers.'}
                      </p>
                      {/* Sub confirmation on allocation */}
                      {foundTrackOrder.status === 'checking' && (
                        <div className="mt-2.5 bg-slate-50 p-2 rounded border border-slate-200 max-w-sm">
                          <p className="font-semibold text-slate-600 text-[10px] animate-pulse">
                            ● {language === 'FR' ? 'En attente de confirmation par les vendeurs...' : 'Waiting for vendors to reply OK via SMS...'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Status 3: Collecting */}
                    <div className="relative">
                      <span className={`absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 ${
                        ['collecting', 'delivering', 'delivered'].includes(foundTrackOrder.status)
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        ✓
                      </span>
                      <h4 className="font-bold text-slate-800">📦 {language === 'FR' ? 'Collecte en cours' : 'Consolidation & Picking'}</h4>
                      <p className="text-slate-500 mt-1">
                        {language === 'FR' ? 'Nos équipes collectent les produits frais confirmés directement chez les éleveurs.' : 'Our logistic coordinators are picking up products from verified local farms.'}
                      </p>
                    </div>

                    {/* Status 4: Delivering */}
                    <div className="relative">
                      <span className={`absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 ${
                        ['delivering', 'delivered'].includes(foundTrackOrder.status)
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        ✓
                      </span>
                      <h4 className="font-bold text-slate-800">🚚 {language === 'FR' ? 'Livraison en cours' : 'Dispatched / In Route'}</h4>
                      <p className="text-slate-500 mt-1">
                        {language === 'FR' ? 'Le livreur régional transporte vos produits à votre domicile.' : 'Your designated runner is driving to your shipping address.'}
                      </p>
                    </div>

                    {/* Status 5: Delivered */}
                    <div className="relative">
                      <span className={`absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 ${
                        foundTrackOrder.status === 'delivered'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : foundTrackOrder.status === 'cancelled'
                            ? 'bg-rose-500 border-rose-500 text-white'
                            : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        {foundTrackOrder.status === 'cancelled' ? '✗' : '✓'}
                      </span>
                      <h4 className="font-bold text-slate-800">
                        {foundTrackOrder.status === 'cancelled' ? '❌ Annulée / Cancelled' : '✅ Livrée / Completed'}
                      </h4>
                      <p className="text-slate-500 mt-1">
                        {foundTrackOrder.status === 'cancelled'
                          ? (language === 'FR' ? 'Cette commande a été annulée.' : 'This order was cancelled.')
                          : (language === 'FR' ? 'Le colis a été remis en mains propres et payé.' : 'Delivered and closed.')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submitting claims if delivered (Section 3.8: 24h photo limit) */}
                {foundTrackOrder.status === 'delivered' && (
                  <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm bg-rose-50/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <h3 className="font-bold text-slate-800 text-sm">
                        {language === 'FR' ? "Déclarer une Réclamation (Sous 24 heures)" : "File a Claim (24-hour Limit)"}
                      </h3>
                    </div>

                    {claimSuccessMessage ? (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded text-xs">
                        {claimSuccessMessage}
                      </div>
                    ) : (
                      <form onSubmit={handleClaimSubmit} className="space-y-4">
                        <input type="hidden" value={foundTrackOrder.id} />
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            {language === 'FR' ? 'Description détaillée de la non-conformité' : 'Detailed description of the issue'} *
                          </label>
                          <textarea
                            value={claimDescription}
                            onChange={(e) => setClaimDescription(e.target.value)}
                            rows={3}
                            placeholder={language === 'FR' ? "Ex: Le poulet livré est de poids insuffisant (1.1kg au lieu de 1.8kg)..." : "Ex: The meat delivered shows bruising or weights incorrect..."}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-rose-500 font-sans"
                            required
                          ></textarea>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            {language === 'FR' ? 'Photo preuve obligatoire (Lien ou simulée)' : 'Mandatory photo proof URL'} *
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Ex: https://photos.com/proof.jpg (ou cliquez sur Auto-remplir)"
                              value={claimPhotoUrl}
                              onChange={(e) => setClaimPhotoUrl(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rose-500 flex-1 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setClaimPhotoUrl('https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=400')}
                              className="bg-slate-200 text-slate-700 text-xs px-3 py-2 rounded hover:bg-slate-300 font-medium shrink-0"
                            >
                              📷 Auto Photo
                            </button>
                          </div>
                          <p className="text-[10px] text-rose-600 font-semibold mt-1">
                            ⚠️ {language === 'FR' ? 'La photo est obligatoire selon le protocole de confiance.' : 'Photo upload is strictly mandatory to deter fraud.'}
                          </p>
                        </div>

                        <button
                          type="submit"
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded transition"
                        >
                          {language === 'FR' ? "Déposer la Réclamation" : "Submit Complaint"}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-slate-150 rounded-xl">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-xs">
                  {language === 'FR' ? "Aucune commande sélectionnée pour le suivi." : "No active tracking session."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACCOUNT & HISTORY */}
        {activeTab === 'account' && (
          <div id="account-tab-content" className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
            {/* Account Profile header */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                  SM
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Samuel Ebanda (Client Membre)</h3>
                  <p className="text-xs text-slate-500 font-mono">+237 671 22 33 44 | Bastos, Yaoundé</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full uppercase">
                  ⭐ Fidélité Premium
                </span>
              </div>
            </div>

            {/* Favorite products saved */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-4 text-xs tracking-wider uppercase font-mono">
                💚 {language === 'FR' ? "Mes Produits Favoris" : "My Saved Favorites"}
              </h4>
              {favorites.length === 0 ? (
                <p className="text-xs text-slate-400">
                  {language === 'FR' ? "Vous n'avez pas encore enregistré de favoris." : "No items bookmarked yet."}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {favorites.map(id => {
                    let prod = products.find(p => p.id === id);
                    if (!prod && id.startsWith('aggregated-')) {
                      prod = aggregatedProducts.find(p => p.id === id);
                    }
                    if (!prod) return null;
                    return (
                      <div key={id} className="border border-slate-100 p-3 rounded-lg flex items-center justify-between text-xs hover:border-emerald-500 transition">
                        <div className="flex items-center gap-2">
                          <img src={prod.photos[0]} alt="" className="w-8 h-8 rounded object-cover" />
                          <div>
                            <p className="font-bold text-slate-700 line-clamp-1">{prod.name}</p>
                            <p className="text-slate-500 font-mono">{prod.price.toLocaleString()} FCFA</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToCart(prod!)}
                          className="text-emerald-600 hover:text-emerald-800 font-bold"
                        >
                          + Panier
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historical Orders list */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-4 text-xs tracking-wider uppercase font-mono">
                📋 {language === 'FR' ? "Historique de mes commandes" : "My Order History"}
              </h4>
              <div className="space-y-4">
                {orders.map((ord, idx) => (
                  <div key={idx} className="border border-slate-100 p-4 rounded-lg hover:border-slate-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          #{ord.id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(ord.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {ord.items.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                      </p>
                      <p className="font-mono text-xs font-bold text-slate-800 mt-1">
                        Total: {ord.totalAmount.toLocaleString()} FCFA
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded font-mono border ${
                        ord.status === 'delivered' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : ord.status === 'cancelled' 
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {ord.status}
                      </span>
                      <button
                        onClick={() => {
                          setTrackOrderId(ord.id);
                          setFoundTrackOrder(ord);
                          setActiveTab('tracking');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded transition"
                      >
                        Suivre / Détails
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- CART DRAWER OVERLAY --- */}
      {isCartOpen && (
        <div id="cart-drawer-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div id="cart-drawer-body" className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            {/* Cart Header */}
            <div className="bg-emerald-800 text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <h3 className="font-bold text-base">{t.cartTitle} ({cartItemsCount})</h3>
              </div>
              <button
                id="btn-close-cart"
                onClick={() => { setIsCartOpen(false); setIsCheckout(false); }}
                className="hover:bg-emerald-700 p-1.5 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cartItemsCount === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-200 mb-2.5" />
                  <p>{t.emptyCart}</p>
                </div>
              ) : (
                Object.entries(cart).map(([prodId, val]) => {
                  const qty = val as number;
                  let prod = products.find(p => p.id === prodId);
                  if (!prod && prodId.startsWith('aggregated-')) {
                    prod = aggregatedProducts.find(p => p.id === prodId);
                  }
                  if (!prod) return null;

                  const singlePrice = getProductPrice(prod);
                  const itemPriceTotal = singlePrice * qty;

                  return (
                    <div key={prodId} className="flex gap-3 pb-4 border-b border-slate-100 items-start">
                      <img src={prod.photos[0]} alt="" className="w-14 h-14 object-cover rounded border border-slate-150 shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{prod.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">{singlePrice.toLocaleString()} FCFA / {prod.unit}</p>
                        
                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity control */}
                          <div className="flex items-center border border-slate-200 rounded overflow-hidden">
                            <button
                              onClick={() => handleUpdateCart(prodId, qty - 1)}
                              className="px-2 py-0.5 bg-slate-50 hover:bg-slate-150 text-slate-600 font-extrabold text-xs"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-bold font-mono">{qty}</span>
                            <button
                              onClick={() => handleUpdateCart(prodId, qty + 1)}
                              className="px-2 py-0.5 bg-slate-50 hover:bg-slate-150 text-slate-600 font-extrabold text-xs"
                            >
                              +
                            </button>
                          </div>

                          <span className="font-bold text-xs text-slate-800 font-mono">
                            {itemPriceTotal.toLocaleString()} FCFA
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart Footer */}
            {cartItemsCount > 0 && (
              <div className="p-4 border-t border-slate-150 bg-slate-50 space-y-3.5">
                {/* Mode simulation notice */}
                {!isCheckout ? (
                  <>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Sous-total :</span>
                        <span className="font-bold font-mono">{cartSubtotal.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{t.deliveryFee} (Est.) :</span>
                        <span className="font-mono text-slate-400">Calculé en caisse</span>
                      </div>
                    </div>

                    <button
                      id="btn-trigger-checkout"
                      onClick={() => setIsCheckout(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-lg shadow transition text-center"
                    >
                      {t.checkoutBtn}
                    </button>
                  </>
                ) : (
                  /* CHECKOUT DIRECT EMBED IN DRAWER FOR CONVENIENCE AND FLUIDITY */
                  <form onSubmit={handleCheckoutSubmit} className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                    <h4 className="font-extrabold text-xs text-slate-700 border-b border-slate-200 pb-1.5">
                      {t.checkoutTitle}
                    </h4>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">{t.fullName} *</label>
                      <input
                        id="checkout-client-name"
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Samuel Ebanda"
                        required
                        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">{t.phone} *</label>
                        <input
                          id="checkout-client-phone"
                          type="text"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="+237 671 22 33 44"
                          required
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Email (Optionnel)</label>
                        <input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="ebanda@gmail.com"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">{t.address} *</label>
                      <input
                        id="checkout-client-address"
                        type="text"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        placeholder="Bastos, face Ambassade d'Espagne"
                        required
                        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">{t.deliveryZone} *</label>
                        <select
                          id="checkout-delivery-zone"
                          value={deliveryZoneId}
                          onChange={(e) => handleZoneChange(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                        >
                          {deliveryZones.map(z => (
                            <option key={z.id} value={z.id}>
                              {regions.find(r => r.id === z.regionId)?.name} ➜ {z.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Payment Mode Selection */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t.paymentType} *</label>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                          <input
                            type="radio"
                            name="payment_mode"
                            checked={paymentMode === 'cash'}
                            onChange={() => setPaymentMode('cash')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>💵 {t.payOnDelivery}</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                          <input
                            type="radio"
                            name="payment_mode"
                            checked={paymentMode === 'mobile_money'}
                            onChange={() => setPaymentMode('mobile_money')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>📲 {t.payMoMo}</span>
                        </label>
                      </div>
                    </div>

                    {/* Price summary matrix readout */}
                    <div className="bg-slate-100 p-2.5 rounded text-xs space-y-1 font-mono">
                      <div className="flex justify-between text-slate-600">
                        <span>Sous-total :</span>
                        <span>{cartSubtotal.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{t.deliveryFee} :</span>
                        <span>{calculatedDeliveryFee.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between text-slate-800 font-extrabold text-sm pt-1 border-t border-slate-200">
                        <span>{t.total} :</span>
                        <span>{cartTotal.toLocaleString()} FCFA</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCheckout(false)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded text-xs transition"
                      >
                        {language === 'FR' ? "Retour" : "Back"}
                      </button>
                      <button
                        id="btn-submit-order"
                        type="submit"
                        disabled={checkoutSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded text-xs flex-1 transition"
                      >
                        {checkoutSubmitting ? '...' : (language === 'FR' ? "Confirmer la commande" : "Place Order")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SINGLE PRODUCT DETAIL MODAL --- */}
      {selectedProduct && (
        <div id="product-detail-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="relative h-48 bg-slate-100">
              <img src={selectedProduct.photos[0]} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded uppercase font-mono tracking-wider">
                  {selectedProduct.provenance}
                </span>
                <h3 className="font-extrabold text-lg text-slate-800 mt-1">{selectedProduct.name}</h3>
                <p className="text-xs font-mono text-slate-500">{selectedProduct.sellerName} | {selectedProduct.location}</p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-sans font-normal">
                {selectedProduct.description}
              </p>

              {/* SPECIFIC JSON ATTRIBUTES DETAIL VIEW */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-150">
                <h4 className="text-xs font-bold text-slate-700 mb-2 font-mono">{t.specifics}</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {selectedProduct.specificFields.variety && (
                    <div>
                      <p className="text-slate-400">Variété :</p>
                      <p className="font-semibold text-slate-700">{selectedProduct.specificFields.variety}</p>
                    </div>
                  )}
                  {selectedProduct.specificFields.harvestDate && (
                    <div>
                      <p className="text-slate-400">{t.harvestDate} :</p>
                      <p className="font-semibold text-slate-700 font-mono">{new Date(selectedProduct.specificFields.harvestDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedProduct.specificFields.slaughterDate && (
                    <div>
                      <p className="text-slate-400">{t.slaughterDate} :</p>
                      <p className="font-semibold text-slate-700 font-mono">{new Date(selectedProduct.specificFields.slaughterDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedProduct.specificFields.isOrganic !== undefined && (
                    <div>
                      <p className="text-slate-400">Bio :</p>
                      <p className="font-semibold text-slate-700">
                        {selectedProduct.specificFields.isOrganic ? (language === 'FR' ? 'Oui, certifié' : 'Yes, certified') : 'Non / No'}
                      </p>
                    </div>
                  )}
                  {selectedProduct.specificFields.healthCertificate !== undefined && (
                    <div>
                      <p className="text-slate-400">Sanitaire :</p>
                      <p className="font-semibold text-slate-700">
                        {selectedProduct.specificFields.healthCertificate ? (language === 'FR' ? 'Certificat présent' : 'Certificate present') : 'Non / No'}
                      </p>
                    </div>
                  )}
                  {selectedProduct.specificFields.poidsVif && (
                    <div>
                      <p className="text-slate-400">{t.weight} vif :</p>
                      <p className="font-semibold text-slate-700 font-mono">{selectedProduct.specificFields.poidsVif} kg</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-extrabold text-base text-slate-900 font-mono">
                  {getProductPrice(selectedProduct).toLocaleString()} FCFA <span className="text-xs font-normal">/ {selectedProduct.unit}</span>
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2 rounded-lg transition"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={() => { handleAddToCart(selectedProduct); setSelectedProduct(null); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
                  >
                    {language === 'FR' ? "Acheter" : "Buy Now"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Simple User Icon for fallback without lucide import errors
const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
