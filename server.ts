import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  UserRole, Profile, Region, DeliveryZone, VendeurDetails, 
  Category, Product, PrixMarche, Promotion, Commande, 
  Reclamation, EvaluationVendeur, DriverDetails, NotificationLog, CommandeItem 
} from "./src/types";

const DB_FILE = path.join(process.cwd(), "farm_db.json");

// Default Cameroonian seed data
const SEED_DATA = {
  regions: [
    { id: "reg-ce", name: "Centre", code: "CE" },
    { id: "reg-lt", name: "Littoral", code: "LT" },
    { id: "reg-ou", name: "Ouest", code: "OU" },
    { id: "reg-nw", name: "Nord-Ouest", code: "NW" },
    { id: "reg-sw", name: "Sud-Ouest", code: "SW" }
  ] as Region[],

  deliveryZones: [
    { id: "zone-yde", name: "Yaoundé Ville", regionId: "reg-ce" },
    { id: "zone-obl", name: "Obala (Périphérie)", regionId: "reg-ce" },
    { id: "zone-mbm", name: "Mbalmayo (Périphérie)", regionId: "reg-ce" },
    { id: "zone-dla", name: "Douala Ville", regionId: "reg-lt" },
    { id: "zone-nks", name: "Nkongsamba (Périphérie)", regionId: "reg-lt" },
    { id: "zone-eda", name: "Edéa (Périphérie)", regionId: "reg-lt" },
    { id: "zone-bfs", name: "Bafoussam Ville", regionId: "reg-ou" },
    { id: "zone-fbt", name: "Foumbot (Agricole)", regionId: "reg-ou" },
    { id: "zone-dsg", name: "Dschang Ville", regionId: "reg-ou" }
  ] as DeliveryZone[],

  // Delivery fee matrix: Origin Region -> Destination Zone -> Fee in FCFA
  deliveryFeeMatrix: {
    "reg-ce": {
      "zone-yde": 1500, "zone-obl": 2500, "zone-mbm": 2500,
      "zone-dla": 3500, "zone-nks": 4500, "zone-eda": 4000,
      "zone-bfs": 4000, "zone-fbt": 4500, "zone-dsg": 4500
    },
    "reg-lt": {
      "zone-yde": 3500, "zone-obl": 4500, "zone-mbm": 4500,
      "zone-dla": 1500, "zone-nks": 2500, "zone-eda": 2500,
      "zone-bfs": 4000, "zone-fbt": 4500, "zone-dsg": 4000
    },
    "reg-ou": {
      "zone-yde": 4000, "zone-obl": 4500, "zone-mbm": 4500,
      "zone-dla": 3500, "zone-nks": 4000, "zone-eda": 4000,
      "zone-bfs": 1500, "zone-fbt": 2000, "zone-dsg": 2000
    }
  } as Record<string, Record<string, number>>,

  profiles: [
    { id: "prof-sa1", name: "Alain Patrick Nkoumou", email: "alain@farmlink.cm", phone: "+237 677 88 99 00", role: "superadmin" },
    { id: "prof-ar1", name: "Marie Claire (Centre)", email: "marie.claire@farmlink.cm", phone: "+237 699 11 22 33", role: "admin_regional", regionId: "reg-ce" },
    { id: "prof-ar2", name: "Jean-Pierre (Littoral)", email: "jean.pierre@farmlink.cm", phone: "+237 655 44 55 66", role: "admin_regional", regionId: "reg-lt" },
    { id: "prof-v1", name: "Amadou Sali (Aviculteur)", email: "amadou@farm.cm", phone: "+237 680 12 34 56", role: "vendeur", regionId: "reg-ce" },
    { id: "prof-v2", name: "Chantal Atangana (Maraîchère)", email: "chantal@farm.cm", phone: "+237 671 23 45 67", role: "vendeur", regionId: "reg-ce" },
    { id: "prof-v3", name: "Emmanuel Eto'o (Éleveur)", email: "emmanuel@farm.cm", phone: "+237 693 45 67 89", role: "vendeur", regionId: "reg-lt" },
    { id: "prof-v4", name: "Pierre Tagne (Maraîcher Foumbot)", email: "tagne@farm.cm", phone: "+237 670 98 76 54", role: "vendeur", regionId: "reg-ou" },
    { id: "prof-l1", name: "Ferdinand Ndong (Moto)", email: "ferdinand@express.cm", phone: "+237 660 11 22 33", role: "livreur", regionId: "reg-ce" },
    { id: "prof-l2", name: "Gérard Mbappé (Camionnette)", email: "gerard@express.cm", phone: "+237 675 33 44 55", role: "livreur", regionId: "reg-lt" }
  ] as Profile[],

  vendeurs: [
    { id: "prof-v1", name: "Amadou Sali (Aviculteur)", phone: "+237 680 12 34 56", regionId: "reg-ce", status: "active", soldeAttente: 10500, soldeVerse: 45000, rating: 4.8 },
    { id: "prof-v2", name: "Chantal Atangana (Maraîchère)", phone: "+237 671 23 45 67", regionId: "reg-ce", status: "active", soldeAttente: 24000, soldeVerse: 120000, rating: 4.5 },
    { id: "prof-v3", name: "Emmanuel Eto'o (Éleveur)", phone: "+237 693 45 67 89", regionId: "reg-lt", status: "active", soldeAttente: 0, soldeVerse: 85000, rating: 4.2 },
    { id: "prof-v4", name: "Pierre Tagne (Maraîcher Foumbot)", phone: "+237 670 98 76 54", regionId: "reg-ou", status: "active", soldeAttente: 50000, soldeVerse: 350000, rating: 4.9 }
  ] as VendeurDetails[],

  drivers: [
    { id: "prof-l1", name: "Ferdinand Ndong (Moto)", vehicleType: "Moto Cargo", isAvailable: true, regionId: "reg-ce" },
    { id: "prof-l2", name: "Gérard Mbappé (Camionnette)", vehicleType: "Pick-up Toyota", isAvailable: true, regionId: "reg-lt" }
  ] as DriverDetails[],

  categories: [
    { id: "cat-veg", name: "Végétal", type: "vegetal" },
    { id: "cat-ani", name: "Animal", type: "animal" },
    { id: "cat-leg", name: "Légumineuses", parentId: "cat-veg", type: "vegetal" },
    { id: "cat-mar", name: "Maraîcher (Légumes)", parentId: "cat-veg", type: "vegetal" },
    { id: "cat-cer", name: "Céréales", parentId: "cat-veg", type: "vegetal" },
    { id: "cat-vol", name: "Volaille", parentId: "cat-ani", type: "animal" },
    { id: "cat-por", name: "Porcin & Bovin", parentId: "cat-ani", type: "animal" }
  ] as Category[],

  prixMarche: [
    { categoryId: "cat-vol", productName: "Poulet Fermier", price: 3500, updatedAt: "2026-07-01T10:00:00Z" },
    { categoryId: "cat-leg", productName: "Arachides Blanches", price: 1200, updatedAt: "2026-07-02T12:00:00Z" },
    { categoryId: "cat-mar", productName: "Tomates Fraîches", price: 800, updatedAt: "2026-07-03T09:00:00Z" },
    { categoryId: "cat-cer", productName: "Maïs Jaune", price: 450, updatedAt: "2026-07-04T15:00:00Z" }
  ] as PrixMarche[],

  products: [
    {
      id: "prod-1",
      sellerId: "prof-v1",
      sellerName: "Amadou Sali",
      categoryId: "cat-vol",
      name: "Poulet Fermier Vivant",
      description: "Poulets de chair fermiers élevés en plein air à Yaoundé. Très vigoureux, nourris aux céréales locales.",
      unit: "pièce",
      priceType: "market", // will align automatically with PrixMarche for Poulet Fermier (3500)
      price: 3500,
      stock: 80,
      provenance: "Centre",
      location: "Yaoundé-Mvan",
      photos: ["https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=400"],
      status: "published",
      specificFields: { healthCertificate: true, poidsVif: 1.8 }
    },
    {
      id: "prod-2",
      sellerId: "prof-v3",
      sellerName: "Emmanuel Eto'o",
      categoryId: "cat-vol",
      name: "Poulet Fermier Bio Douala",
      description: "Poulets locaux élevés de façon biologique à Nkongsamba. Qualité de viande tendre et savoureuse.",
      unit: "pièce",
      priceType: "fixed",
      price: 4200, // Fixed individually
      stock: 50,
      provenance: "Littoral",
      location: "Nkongsamba",
      photos: ["https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&q=80&w=400"],
      status: "published",
      specificFields: { healthCertificate: true, poidsVif: 2.1, isOrganic: true }
    },
    {
      id: "prod-3",
      sellerId: "prof-v2",
      sellerName: "Chantal Atangana",
      categoryId: "cat-leg",
      name: "Arachides Blanches Décortiquées",
      description: "Arachides blanches récoltées à Obala. Très bon goût, sèches, prêtes pour cuisson ou sauce.",
      unit: "kg",
      priceType: "market", // Aligns to PrixMarche: 1200
      price: 1200,
      stock: 120,
      provenance: "Centre",
      location: "Obala",
      photos: ["https://images.unsplash.com/photo-1590004953392-5aba2e72269a?auto=format&fit=crop&q=80&w=400"],
      status: "published",
      specificFields: { variety: "Blanche locale", harvestDate: "2026-06-12", isOrganic: true }
    },
    {
      id: "prod-4",
      sellerId: "prof-v4",
      sellerName: "Pierre Tagne",
      categoryId: "cat-leg",
      name: "Arachides Blanches Foumbot",
      description: "Arachides de qualité supérieure cultivées dans le sol volcanique riche de Foumbot.",
      unit: "kg",
      priceType: "market", // Aligns to PrixMarche: 1200
      price: 1200,
      stock: 350,
      provenance: "Ouest",
      location: "Foumbot",
      photos: ["https://images.unsplash.com/photo-1534119396591-59ac92850050?auto=format&fit=crop&q=80&w=400"],
      status: "published",
      specificFields: { variety: "Gros grains Ouest", harvestDate: "2026-06-20", isOrganic: true }
    },
    {
      id: "prod-5",
      sellerId: "prof-v4",
      sellerName: "Pierre Tagne",
      categoryId: "cat-mar",
      name: "Tomates Fraîches Cobra",
      description: "Tomates fraîches, fermes et savoureuses de Foumbot. Idéales pour vos sauces de fête.",
      unit: "sac (50kg)",
      priceType: "fixed",
      price: 18000,
      stock: 30,
      provenance: "Ouest",
      location: "Foumbot",
      photos: ["https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400"],
      status: "published",
      specificFields: { variety: "Cobra", harvestDate: "2026-07-02", isOrganic: false }
    },
    {
      id: "prod-6",
      sellerId: "prof-v2",
      sellerName: "Chantal Atangana",
      categoryId: "cat-cer",
      name: "Maïs Jaune Sec en Sac",
      description: "Maïs sec trié et ensaché à Obala. Parfait pour l'alimentation animale ou la fabrication de farine.",
      unit: "sac (100kg)",
      priceType: "fixed",
      price: 24000,
      stock: 60,
      provenance: "Centre",
      location: "Obala",
      photos: ["https://images.unsplash.com/photo-1551754625-702917079571?auto=format&fit=crop&q=80&w=400"],
      status: "published",
      specificFields: { variety: "Composite", harvestDate: "2026-05-15", isOrganic: true }
    }
  ] as Product[],

  promotions: [
    {
      id: "promo-1",
      productId: "prod-6",
      sellerId: "prof-v2",
      discountType: "fixed",
      discountValue: 2000, // 2000 FCFA reduction on sac
      startDate: "2026-07-01",
      endDate: "2026-07-31"
    }
  ] as Promotion[],

  commandes: [
    {
      id: "cmd-001",
      clientName: "Samuel Ebanda",
      clientPhone: "+237 671 22 33 44",
      clientAddress: "Bastos, face Ambassade d'Espagne",
      clientEmail: "ebanda@gmail.com",
      deliveryRegionId: "reg-ce",
      deliveryZoneId: "zone-yde",
      items: [
        { productId: "prod-1", name: "Poulet Fermier Vivant", quantity: 5, unitPrice: 3500, originalPrice: 3500, sellerId: "prof-v1", priceType: "market" }
      ],
      allocations: [
        { productId: "prod-1", sellerId: "prof-v1", quantity: 5, confirmed: "confirmed" }
      ],
      deliveryMode: "internal",
      paymentMode: "cash",
      paymentConfirmed: false,
      itemsCost: 17500,
      deliveryFee: 1500,
      totalAmount: 19000,
      commissionAmount: 1750, // 10% on original
      status: "checking",
      createdAt: "2026-07-06T15:30:00Z",
      regionalAdminId: "prof-ar1",
      claimsStatus: "none"
    },
    {
      id: "cmd-002",
      clientName: "Marcelle Sopo",
      clientPhone: "+237 690 44 55 66",
      clientAddress: "Bonapriso, rue des Palmiers",
      clientEmail: "sopo@outlook.fr",
      deliveryRegionId: "reg-lt",
      deliveryZoneId: "zone-dla",
      items: [
        { productId: "prod-2", name: "Poulet Fermier Bio Douala", quantity: 2, unitPrice: 4200, originalPrice: 4200, sellerId: "prof-v3", priceType: "fixed" }
      ],
      allocations: [
        { productId: "prod-2", sellerId: "prof-v3", quantity: 2, confirmed: "confirmed" }
      ],
      deliveryMode: "superadmin",
      paymentMode: "mobile_money",
      paymentConfirmed: true,
      itemsCost: 8400,
      deliveryFee: 1500,
      totalAmount: 9900,
      commissionAmount: 840,
      status: "delivered",
      createdAt: "2026-07-05T10:15:00Z",
      regionalAdminId: "prof-ar2",
      driverId: "prof-l2",
      claimsStatus: "none"
    }
  ] as Commande[],

  reclamations: [] as Reclamation[],
  evaluations: [] as EvaluationVendeur[],
  notifications: [
    {
      id: "not-1",
      recipientId: "prof-v1",
      recipientRole: "vendeur",
      recipientName: "Amadou Sali",
      canal: "sms",
      content: "Votre compte FarmLink a été validé. Connectez-vous avec votre numéro et le mot de passe reçu.",
      status: "sent",
      createdAt: "2026-07-01T08:00:00Z"
    },
    {
      id: "not-2",
      recipientId: "prof-v1",
      recipientRole: "vendeur",
      recipientName: "Amadou Sali",
      canal: "app",
      content: "Nouvelle commande #cmd-001 de 5 poulets à confirmer.",
      status: "sent",
      createdAt: "2026-07-06T15:31:00Z"
    }
  ] as NotificationLog[],

  globalSettings: {
    commissionRate: 10, // 10% standard platform commission
    contactSMSPrestataire: "Twilio Cameroon Proxy",
    bilingualActive: true
  }
};

// Database utility functions
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2), "utf8");
      return SEED_DATA;
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database file, using memory fallback:", error);
    return SEED_DATA;
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Helper middleware to get database state
  const getDbState = () => readDb();

  // --- API ROUTES ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Get full db state (needed for client synchronization)
  app.get("/api/db", (req, res) => {
    res.json(getDbState());
  });

  // Reset database to initial seed data
  app.post("/api/reset", (req, res) => {
    writeDb(SEED_DATA);
    res.json({ message: "Base de données réinitialisée aux valeurs d'usine", data: SEED_DATA });
  });

  // Add / Edit products
  app.post("/api/products", (req, res) => {
    const db = getDbState();
    const newProduct: Product = {
      id: "prod-" + Math.random().toString(36).substr(2, 9),
      ...req.body
    };
    db.products.push(newProduct);
    writeDb(db);
    res.json({ success: true, product: newProduct });
  });

  app.put("/api/products/:id", (req, res) => {
    const db = getDbState();
    const index = db.products.findIndex((p: any) => p.id === req.params.id);
    if (index !== -1) {
      db.products[index] = { ...db.products[index], ...req.body };
      
      // If priceType is 'market', align with the market price reference automatically
      if (db.products[index].priceType === "market") {
        const matchingRef = db.prixMarche.find((pm: any) => pm.categoryId === db.products[index].categoryId);
        if (matchingRef) {
          db.products[index].price = matchingRef.price;
        }
      }

      writeDb(db);
      res.json({ success: true, product: db.products[index] });
    } else {
      res.status(404).json({ error: "Produit non trouvé" });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    const db = getDbState();
    db.products = db.products.filter((p: any) => p.id !== req.params.id);
    writeDb(db);
    res.json({ success: true });
  });

  // Create or Update promotion
  app.post("/api/promotions", (req, res) => {
    const db = getDbState();
    const newPromo: Promotion = {
      id: "promo-" + Math.random().toString(36).substr(2, 9),
      ...req.body
    };
    db.promotions.push(newPromo);
    writeDb(db);
    res.json({ success: true, promotion: newPromo });
  });

  app.delete("/api/promotions/:id", (req, res) => {
    const db = getDbState();
    db.promotions = db.promotions.filter((p: any) => p.id !== req.params.id);
    writeDb(db);
    res.json({ success: true });
  });

  // Invite/create sellers (Regional Admin or SuperAdmin)
  app.post("/api/vendeurs", (req, res) => {
    const db = getDbState();
    const { name, phone, regionId, creatorId, creatorName } = req.body;
    
    // Create profiles record and vendors record
    const sellerId = "prof-v" + Math.random().toString(36).substr(2, 5);
    const newProfile: Profile = {
      id: sellerId,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@farm.cm`,
      phone,
      role: "vendeur",
      regionId
    };

    const newVendeur: VendeurDetails = {
      id: sellerId,
      name,
      phone,
      regionId,
      status: "active",
      validatedAt: new Date().toISOString(),
      validatedBy: creatorId,
      soldeAttente: 0,
      soldeVerse: 0,
      rating: 5.0
    };

    db.profiles.push(newProfile);
    db.vendeurs.push(newVendeur);

    // Generate simulated notification SMS
    const newNotification: NotificationLog = {
      id: "not-" + Math.random().toString(36).substr(2, 9),
      recipientId: sellerId,
      recipientRole: "vendeur",
      recipientName: name,
      canal: "sms",
      content: `Bienvenue sur FarmLink Cameroun ! Votre compte a été créé par l'administrateur ${creatorName}. Connectez-vous avec votre téléphone et le mot de passe temporaire 'FarmLink2026'.`,
      status: "sent",
      createdAt: new Date().toISOString()
    };
    db.notifications.push(newNotification);

    writeDb(db);
    res.json({ success: true, vendeur: newVendeur });
  });

  app.put("/api/vendeurs/:id/status", (req, res) => {
    const db = getDbState();
    const index = db.vendeurs.findIndex((v: any) => v.id === req.params.id);
    if (index !== -1) {
      db.vendeurs[index].status = req.body.status;
      writeDb(db);
      res.json({ success: true, vendeur: db.vendeurs[index] });
    } else {
      res.status(404).json({ error: "Vendeur non trouvé" });
    }
  });

  // Create an order (Client Checkout)
  app.post("/api/orders", (req, res) => {
    const db = getDbState();
    const { 
      clientName, clientPhone, clientAddress, clientEmail, 
      deliveryRegionId, deliveryZoneId, items, deliveryMode, paymentMode 
    } = req.body;

    const orderId = "cmd-" + Math.floor(100 + Math.random() * 900); // e.g. cmd-452

    // Calculate delivery fee
    const originRegionId = items[0] ? (db.products.find((p: any) => p.id === items[0].productId)?.provenance === "Littoral" ? "reg-lt" : "reg-ce") : "reg-ce"; 
    // Simplified: lookup origin from matrix
    const regionRates = db.deliveryFeeMatrix[originRegionId] || db.deliveryFeeMatrix["reg-ce"];
    const deliveryFee = regionRates[deliveryZoneId] || 2500;

    // Build CommandeItem list, calculate total costs and platform commissions
    let itemsCost = 0;
    let commissionAmount = 0;
    const orderItems: CommandeItem[] = [];
    const allocations: any[] = [];

    items.forEach((item: any) => {
      const dbProd = db.products.find((p: any) => p.id === item.productId);
      if (dbProd) {
        const itemPrice = item.unitPrice; // current price
        const originalPrice = dbProd.priceType === "market" 
          ? (db.prixMarche.find((pm: any) => pm.categoryId === dbProd.categoryId)?.price || dbProd.price)
          : dbProd.price;

        itemsCost += itemPrice * item.quantity;
        
        // Commission on original price (not discounted)
        const comRate = db.globalSettings.commissionRate / 100;
        commissionAmount += (originalPrice * item.quantity) * comRate;

        orderItems.push({
          productId: item.productId,
          name: dbProd.name,
          quantity: item.quantity,
          unitPrice: itemPrice,
          originalPrice,
          sellerId: dbProd.sellerId,
          priceType: dbProd.priceType
        });

        // Initialize allocation (default to the sole seller, or split later by Admin if aggregated)
        allocations.push({
          productId: item.productId,
          sellerId: dbProd.sellerId,
          quantity: item.quantity,
          confirmed: "pending"
        });
      }
    });

    const newOrder: Commande = {
      id: orderId,
      clientName,
      clientPhone,
      clientAddress,
      clientEmail,
      deliveryRegionId,
      deliveryZoneId,
      items: orderItems,
      allocations,
      deliveryMode,
      paymentMode,
      paymentConfirmed: false,
      itemsCost,
      deliveryFee,
      totalAmount: itemsCost + deliveryFee,
      commissionAmount,
      status: "pending",
      createdAt: new Date().toISOString(),
      claimsStatus: "none"
    };

    // Lock stocks temporarily as requested in specs: "Le stock impliqué est verrouillé temporairement pendant cette phase de confirmation"
    items.forEach((item: any) => {
      const dbProd = db.products.find((p: any) => p.id === item.productId);
      if (dbProd) {
        dbProd.stock = Math.max(0, dbProd.stock - item.quantity);
      }
    });

    db.commandes.push(newOrder);

    // Notify Regional Admin in charge of the delivery region
    const regionalAdmin = db.profiles.find((p: any) => p.role === "admin_regional" && p.regionId === deliveryRegionId);
    if (regionalAdmin) {
      db.notifications.push({
        id: "not-" + Math.random().toString(36).substr(2, 9),
        recipientId: regionalAdmin.id,
        recipientRole: "admin_regional",
        recipientName: regionalAdmin.name,
        canal: "app",
        content: `Nouvelle commande en attente de vérification: ${orderId} pour ${clientName}. Montant: ${newOrder.totalAmount} FCFA.`,
        status: "sent",
        createdAt: new Date().toISOString()
      });
    }

    // Notify client of order placement
    db.notifications.push({
      id: "not-" + Math.random().toString(36).substr(2, 9),
      recipientId: "client-guest",
      recipientRole: "client",
      recipientName: clientName,
      canal: "sms",
      content: `FarmLink: Votre commande ${orderId} a bien été enregistrée. Un conseiller vous contactera pour valider la livraison. Merci pour votre confiance !`,
      status: "sent",
      createdAt: new Date().toISOString()
    });

    writeDb(db);
    res.json({ success: true, order: newOrder });
  });

  // Regional Admin: adjust or confirm allocation (repartition multi-vendeurs)
  app.put("/api/orders/:id/allocation", (req, res) => {
    const db = getDbState();
    const orderIndex = db.commandes.findIndex((c: any) => c.id === req.params.id);
    if (orderIndex !== -1) {
      const oldOrder = db.commandes[orderIndex];
      const newAllocations = req.body.allocations; // array of {productId, sellerId, quantity, confirmed}

      // Check stock adjustments (re-adjust physical products if allocations shifted vendors)
      // For simplicity in a prototype, we calculate difference and adjust stock
      // First, restore old locked quantities
      oldOrder.allocations.forEach((alloc: any) => {
        const prod = db.products.find((p: any) => p.id === alloc.productId);
        if (prod) prod.stock += alloc.quantity;
      });

      // Deduct new locked quantities
      newAllocations.forEach((alloc: any) => {
        const prod = db.products.find((p: any) => p.id === alloc.productId);
        if (prod) prod.stock = Math.max(0, prod.stock - alloc.quantity);
      });

      db.commandes[orderIndex].allocations = newAllocations;
      db.commandes[orderIndex].status = "checking"; // moves to checking phase

      // Log contact attempt & dispatch SMS to each assigned seller
      newAllocations.forEach((alloc: any) => {
        const seller = db.vendeurs.find((v: any) => v.id === alloc.sellerId);
        const prod = db.products.find((p: any) => p.id === alloc.productId);
        if (seller && prod) {
          db.notifications.push({
            id: "not-" + Math.random().toString(36).substr(2, 9),
            recipientId: seller.id,
            recipientRole: "vendeur",
            recipientName: seller.name,
            canal: "whatsapp",
            content: `FarmLink: Bonjour ${seller.name}, merci de confirmer la disponibilité de ${alloc.quantity} x ${prod.name} pour la commande ${oldOrder.id}. Répondez OK pour valider.`,
            status: "sent",
            createdAt: new Date().toISOString()
          });
        }
      });

      writeDb(db);
      res.json({ success: true, order: db.commandes[orderIndex] });
    } else {
      res.status(404).json({ error: "Commande non trouvée" });
    }
  });

  // Update single allocation confirmation (simulates vendor replying OK via SMS/WhatsApp)
  app.put("/api/orders/:id/allocation/confirm", (req, res) => {
    const db = getDbState();
    const { productId, sellerId, confirmedStatus } = req.body;
    const orderIndex = db.commandes.findIndex((c: any) => c.id === req.params.id);
    if (orderIndex !== -1) {
      const order = db.commandes[orderIndex];
      const allocIndex = order.allocations.findIndex((a: any) => a.productId === productId && a.sellerId === sellerId);
      if (allocIndex !== -1) {
        order.allocations[allocIndex].confirmed = confirmedStatus;

        // If all allocations for this order are confirmed, advance status to "collecting"
        const allConfirmed = order.allocations.every((a: any) => a.confirmed === "confirmed");
        if (allConfirmed) {
          order.status = "collecting";
          
          // Log general notification
          db.notifications.push({
            id: "not-" + Math.random().toString(36).substr(2, 9),
            recipientId: order.deliveryRegionId,
            recipientRole: "admin_regional",
            recipientName: "Admin",
            canal: "app",
            content: `Toutes les parts de la commande ${order.id} ont été confirmées par les vendeurs. Prêt pour la collecte !`,
            status: "sent",
            createdAt: new Date().toISOString()
          });
        }

        writeDb(db);
        res.json({ success: true, order });
      } else {
        res.status(404).json({ error: "Allocation non trouvée" });
      }
    } else {
      res.status(404).json({ error: "Commande non trouvée" });
    }
  });

  // Assign driver and update order status (regional admin / driver)
  app.put("/api/orders/:id/status", (req, res) => {
    const db = getDbState();
    const orderIndex = db.commandes.findIndex((c: any) => c.id === req.params.id);
    if (orderIndex !== -1) {
      const oldStatus = db.commandes[orderIndex].status;
      const { status, driverId, deliveryMode } = req.body;
      
      if (status) db.commandes[orderIndex].status = status;
      if (driverId) db.commandes[orderIndex].driverId = driverId;
      if (deliveryMode) db.commandes[orderIndex].deliveryMode = deliveryMode;

      const order = db.commandes[orderIndex];

      // Handle custom business rules when status transitions to "delivered"
      if (status === "delivered") {
        // 1. Confirm payment if Cash on Delivery
        if (order.paymentMode === "cash") {
          order.paymentConfirmed = true;
        }

        // 2. Pay Vendors (credit vendor balance: pending/soldeAttente)
        // Seller gets: (Item Price * quantity) - Platform Commission
        order.allocations.forEach((alloc: any) => {
          const item = order.items.find((it: any) => it.productId === alloc.productId);
          const sellerIndex = db.vendeurs.findIndex((v: any) => v.id === alloc.sellerId);
          if (item && sellerIndex !== -1) {
            // Commission on original price (before discount)
            const comRate = db.globalSettings.commissionRate / 100;
            const comAmt = (item.originalPrice * alloc.quantity) * comRate;
            const finalEarnings = (item.unitPrice * alloc.quantity) - comAmt;

            // Credit pending balance
            db.vendeurs[sellerIndex].soldeAttente += finalEarnings;

            // Record record in paiements_vendeur
            db.notifications.push({
              id: "not-" + Math.random().toString(36).substr(2, 9),
              recipientId: alloc.sellerId,
              recipientRole: "vendeur",
              recipientName: db.vendeurs[sellerIndex].name,
              canal: "sms",
              content: `FarmLink: Commande ${order.id} livrée ! Votre solde en attente a été crédité de ${finalEarnings} FCFA.`,
              status: "sent",
              createdAt: new Date().toISOString()
            });
          }
        });
      }

      // Notify client on major status transitions
      let smsText = "";
      if (status === "collecting") {
        smsText = `FarmLink: Votre commande ${order.id} est en cours de collecte chez nos éleveurs partenaires.`;
      } else if (status === "delivering") {
        const driverName = db.profiles.find((p: any) => p.id === order.driverId)?.name || "notre livreur";
        smsText = `FarmLink: Votre commande ${order.id} est en route ! Elle sera livrée par ${driverName}. Veuillez rester joignable.`;
      } else if (status === "delivered") {
        smsText = `FarmLink: Félicitations ! Votre commande ${order.id} a été livrée. Vous disposez de 24h pour signaler une réclamation via l'application.`;
      } else if (status === "cancelled") {
        smsText = `FarmLink: Nous sommes désolés, votre commande ${order.id} a été annulée. Un conseiller vous contactera pour un remboursement ou avoir.`;
      }

      if (smsText) {
        db.notifications.push({
          id: "not-" + Math.random().toString(36).substr(2, 9),
          recipientId: "client",
          recipientRole: "client",
          recipientName: order.clientName,
          canal: "sms",
          content: smsText,
          status: "sent",
          createdAt: new Date().toISOString()
        });
      }

      writeDb(db);
      res.json({ success: true, order });
    } else {
      res.status(404).json({ error: "Commande non trouvée" });
    }
  });

  // Confirm payment manually (Regional Admin or SuperAdmin for Mobile Money)
  app.put("/api/orders/:id/payment", (req, res) => {
    const db = getDbState();
    const orderIndex = db.commandes.findIndex((c: any) => c.id === req.params.id);
    if (orderIndex !== -1) {
      db.commandes[orderIndex].paymentConfirmed = req.body.paymentConfirmed;
      writeDb(db);
      res.json({ success: true, order: db.commandes[orderIndex] });
    } else {
      res.status(404).json({ error: "Commande non trouvée" });
    }
  });

  // Transfer vendor pending balance to paid balance (SuperAdmin triggers bank/MoMo transfer)
  app.post("/api/vendeurs/:id/payout", (req, res) => {
    const db = getDbState();
    const index = db.vendeurs.findIndex((v: any) => v.id === req.params.id);
    if (index !== -1) {
      const amt = db.vendeurs[index].soldeAttente;
      if (amt > 0) {
        db.vendeurs[index].soldeVerse += amt;
        db.vendeurs[index].soldeAttente = 0;

        db.notifications.push({
          id: "not-" + Math.random().toString(36).substr(2, 9),
          recipientId: req.params.id,
          recipientRole: "vendeur",
          recipientName: db.vendeurs[index].name,
          canal: "sms",
          content: `FarmLink: Versement de ${amt} FCFA effectué sur votre compte Mobile Money. Votre solde en attente est désormais de 0 FCFA.`,
          status: "sent",
          createdAt: new Date().toISOString()
        });

        writeDb(db);
        res.json({ success: true, vendeur: db.vendeurs[index] });
      } else {
        res.status(400).json({ error: "Le solde en attente est nul" });
      }
    } else {
      res.status(404).json({ error: "Vendeur non trouvé" });
    }
  });

  // Post a claim (Client, 24h after delivery)
  app.post("/api/orders/:id/claim", (req, res) => {
    const db = getDbState();
    const { description, photoUrl } = req.body;
    const orderIndex = db.commandes.findIndex((c: any) => c.id === req.params.id);
    if (orderIndex !== -1) {
      const order = db.commandes[orderIndex];
      order.claimsStatus = "reported";

      const claimId = "rec-" + Math.random().toString(36).substr(2, 9);
      const newClaim: Reclamation = {
        id: claimId,
        orderId: order.id,
        clientName: order.clientName,
        clientPhone: order.clientPhone,
        description,
        photoUrl: photoUrl || "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=400", // simulated photo placeholder
        status: "pending",
        createdAt: new Date().toISOString()
      };

      db.reclamations.push(newClaim);

      // Notify Admin
      const admin = db.profiles.find((p: any) => p.role === "admin_regional" && p.regionId === order.deliveryRegionId) || db.profiles[0];
      db.notifications.push({
        id: "not-" + Math.random().toString(36).substr(2, 9),
        recipientId: admin.id,
        recipientRole: "admin_regional",
        recipientName: admin.name,
        canal: "app",
        content: `RÉCLAMATION reçue pour la commande ${order.id} : ${description.substring(0, 50)}...`,
        status: "sent",
        createdAt: new Date().toISOString()
      });

      writeDb(db);
      res.json({ success: true, claim: newClaim, order });
    } else {
      res.status(404).json({ error: "Commande non trouvée" });
    }
  });

  // Resolve a claim (Admin)
  app.put("/api/claims/:id/resolve", (req, res) => {
    const db = getDbState();
    const { decision, deductionSellerId, deductionAmount } = req.body;
    const claimIndex = db.reclamations.findIndex((r: any) => r.id === req.params.id);
    if (claimIndex !== -1) {
      db.reclamations[claimIndex].status = "resolved";
      db.reclamations[claimIndex].adminDecision = decision;

      const orderId = db.reclamations[claimIndex].orderId;
      const orderIndex = db.commandes.findIndex((c: any) => c.id === orderId);
      if (orderIndex !== -1) {
        db.commandes[orderIndex].claimsStatus = "resolved";
      }

      // If deduction applies on vendor as requested in specs: "l'administrateur le contacte directement... ou déduction"
      if (deductionSellerId && deductionAmount) {
        const sIndex = db.vendeurs.findIndex((v: any) => v.id === deductionSellerId);
        if (sIndex !== -1) {
          db.vendeurs[sIndex].soldeAttente = Math.max(0, db.vendeurs[sIndex].soldeAttente - deductionAmount);
        }
      }

      writeDb(db);
      res.json({ success: true, claim: db.reclamations[claimIndex] });
    } else {
      res.status(404).json({ error: "Réclamation non trouvée" });
    }
  });

  // Evaluate vendor internally after delivery (Admin)
  app.post("/api/orders/:id/evaluate", (req, res) => {
    const db = getDbState();
    const { sellerId, reliabilityRating, qualityRating, delayRating, comment } = req.body;
    
    const evalId = "eval-" + Math.random().toString(36).substr(2, 9);
    const newEval: EvaluationVendeur = {
      id: evalId,
      orderId: req.params.id,
      sellerId,
      reliabilityRating,
      qualityRating,
      delayRating,
      comment,
      createdAt: new Date().toISOString()
    };

    db.evaluations.push(newEval);

    // Recalculate average vendor rating
    const vendorEvals = db.evaluations.filter((ev: any) => ev.sellerId === sellerId);
    if (vendorEvals.length > 0) {
      const avg = vendorEvals.reduce((acc: number, item: any) => {
        const itemAvg = (item.reliabilityRating + item.qualityRating + item.delayRating) / 3;
        return acc + itemAvg;
      }, 0) / vendorEvals.length;

      const sIndex = db.vendeurs.findIndex((v: any) => v.id === sellerId);
      if (sIndex !== -1) {
        db.vendeurs[sIndex].rating = parseFloat(avg.toFixed(1));
      }
    }

    writeDb(db);
    res.json({ success: true, evaluation: newEval });
  });

  // Global SuperAdmin settings update
  app.put("/api/settings", (req, res) => {
    const db = getDbState();
    db.globalSettings = { ...db.globalSettings, ...req.body };
    
    // If commission rate changed, update any default price calculations if needed
    writeDb(db);
    res.json({ success: true, settings: db.globalSettings });
  });

  // SuperAdmin update market price
  app.put("/api/prix-marche", (req, res) => {
    const db = getDbState();
    const { categoryId, productName, price } = req.body;

    const index = db.prixMarche.findIndex((p: any) => p.categoryId === categoryId && p.productName === productName);
    if (index !== -1) {
      db.prixMarche[index].price = price;
      db.prixMarche[index].updatedAt = new Date().toISOString();
    } else {
      db.prixMarche.push({
        categoryId,
        productName,
        price,
        updatedAt: new Date().toISOString()
      });
    }

    // Auto-update all published products that are set to 'market' price
    db.products.forEach((prod: any) => {
      if (prod.categoryId === categoryId && prod.priceType === "market" && prod.name.toLowerCase().includes(productName.toLowerCase())) {
        prod.price = price;
      }
    });

    writeDb(db);
    res.json({ success: true, prixMarche: db.prixMarche });
  });

  // Manual contact logs (SMS, Whatsapp, Call attempt log)
  app.post("/api/notifications/log", (req, res) => {
    const db = getDbState();
    const newLog: NotificationLog = {
      id: "not-" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      ...req.body
    };
    db.notifications.push(newLog);
    writeDb(db);
    res.json({ success: true, log: newLog });
  });

  // --- VITE MIDDLEWARE SETUP ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FarmLink Express] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
