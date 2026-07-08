/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'superadmin' | 'admin_regional' | 'vendeur' | 'livreur' | 'client';

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  regionId?: string; // Standard Cameroon regions
}

export interface Region {
  id: string;
  name: string;
  code: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  regionId: string;
}

// Delivery fee matrix: Origin Region -> Destination Zone -> fee
export interface DeliveryFeeMatrix {
  [originRegionId: string]: {
    [destinationZoneId: string]: number; // FCFA
  };
}

export interface VendeurDetails {
  id: string; // matches profile id
  name: string;
  phone: string;
  regionId: string;
  status: 'active' | 'suspended';
  validatedAt?: string;
  validatedBy?: string;
  soldeAttente: number; // pending balance
  soldeVerse: number; // paid balance
  rating?: number; // internal rating average
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  type: 'vegetal' | 'animal';
}

export interface ProductSpecificFields {
  harvestDate?: string;
  variety?: string;
  isOrganic?: boolean;
  slaughterDate?: string;
  poidsVif?: number; // live weight in kg
  poidsNet?: number; // net weight in kg
  healthCertificate?: boolean;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  categoryId: string;
  name: string;
  description: string;
  unit: string; // e.g. "kg", "sac", "pièce"
  priceType: 'fixed' | 'market';
  price: number; // in FCFA
  stock: number;
  provenance: string; // e.g. "Ouest (Foumbot)"
  location: string; // precise village or local market
  photos: string[]; // Mock URLs / Base64 / Generated images
  status: 'draft' | 'published';
  specificFields: ProductSpecificFields;
}

export interface PrixMarche {
  categoryId: string;
  productName: string;
  price: number; // reference price in FCFA
  updatedAt: string;
}

export interface Promotion {
  id: string;
  productId: string;
  sellerId: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
}

export interface CommandeItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number; // price at order time (after discount if seller promo)
  originalPrice: number; // price before any promo (used to calculate platform commission)
  sellerId: string;
  priceType: 'fixed' | 'market';
}

export interface CommandeItemAllocation {
  productId: string;
  sellerId: string;
  quantity: number;
  confirmed: 'pending' | 'confirmed' | 'rejected';
}

export interface Commande {
  id: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientEmail?: string;
  deliveryRegionId: string;
  deliveryZoneId: string;
  items: CommandeItem[];
  allocations: CommandeItemAllocation[]; // manual partition between sellers for aggregated products
  deliveryMode: 'superadmin' | 'internal' | 'external';
  paymentMode: 'cash' | 'mobile_money';
  paymentConfirmed: boolean;
  totalAmount: number; // items cost + delivery fee
  itemsCost: number;
  deliveryFee: number;
  commissionAmount: number; // platform cut
  status: 'pending' | 'checking' | 'collecting' | 'delivering' | 'delivered' | 'cancelled';
  createdAt: string;
  regionalAdminId?: string;
  driverId?: string;
  claimsStatus: 'none' | 'reported' | 'resolved';
}

export interface Reclamation {
  id: string;
  orderId: string;
  clientName: string;
  clientPhone: string;
  description: string;
  photoUrl: string; // photo is mandatory
  status: 'pending' | 'resolved';
  adminDecision?: string;
  createdAt: string;
}

export interface EvaluationVendeur {
  id: string;
  orderId: string;
  sellerId: string;
  reliabilityRating: number; // 1-5
  qualityRating: number; // 1-5
  delayRating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface DriverDetails {
  id: string; // matches profile id
  name: string;
  vehicleType: string;
  isAvailable: boolean;
  regionId: string;
}

export interface NotificationLog {
  id: string;
  recipientId: string;
  recipientRole: UserRole;
  recipientName: string;
  canal: 'app' | 'sms' | 'whatsapp' | 'call';
  content: string;
  status: 'sent' | 'failed';
  createdAt: string;
}
