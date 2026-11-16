import { Product, StockMovement, UploadBatch, LowStockNotification } from '../types/inventory';
import { ParsedExcelRow } from './excelParser';
import {
  syncProductsBatchToFirestore,
  syncMovementsBatchToFirestore,
  syncBatchToFirestore,
  syncNotificationsBatchToFirestore,
  deleteProductFromFirestore,
  deleteProductsByIdsFromFirestore,
  deleteMovementsByIdsFromFirestore,
  deleteBatchFromFirestore,
  deleteNotificationsByIdsFromFirestore,
  clearAllFirestoreData,
} from '../services/firestoreSync';
import { auth } from '../services/firebase';

const STORAGE_KEYS = {
  PRODUCTS: 'gudangflow_products_v1',
  MOVEMENTS: 'gudangflow_movements_v1',
  BATCHES: 'gudangflow_batches_v1',
  NOTIFICATIONS: 'gudangflow_notifications_v1',
  CLEARED_FLAG: 'gudangflow_simulation_cleared_v1',
};

let idSeq = 0;
function uniqueId(prefix: string): string {
  idSeq = (idSeq + 1) % 1000000;
  return `${prefix}-${Date.now()}-${idSeq}-${Math.random().toString(36).substring(2, 7)}`;
}

// Initial Realistic Warehouse Dataset (Hanya Barang Masuk / Stok Tersedia, Tanpa Data Penjualan Dummy)
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'SBK-001',
    name: 'Beras Premium Ramos 5kg',
    category: 'Sembako',
    unit: 'Pcs',
    initialStock: 50,
    totalIncoming: 120,
    totalOutgoing: 0,
    currentStock: 170,
    minStock: 25,
    unitPrice: 74000,
    lastUpdated: '2026-11-10T09:30:00Z',
    notes: 'Kemasan beras kualitas super',
  },
  {
    id: 'prod-2',
    sku: 'SBK-002',
    name: 'Minyak Goreng Sawit 2L',
    category: 'Sembako',
    unit: 'Pcs',
    initialStock: 40,
    totalIncoming: 60,
    totalOutgoing: 0,
    currentStock: 100,
    minStock: 20,
    unitPrice: 38500,
    lastUpdated: '2026-11-09T14:20:00Z',
    notes: 'Kebutuhan pokok',
  },
  {
    id: 'prod-3',
    sku: 'SBK-003',
    name: 'Gula Pasir Kristal Putih 1kg',
    category: 'Sembako',
    unit: 'Pcs',
    initialStock: 80,
    totalIncoming: 150,
    totalOutgoing: 0,
    currentStock: 230,
    minStock: 30,
    unitPrice: 17500,
    lastUpdated: '2026-11-08T11:15:00Z',
  },
  {
    id: 'prod-4',
    sku: 'MNM-001',
    name: 'Kopi Arabika Gayo 250g',
    category: 'Minuman',
    unit: 'Pcs',
    initialStock: 30,
    totalIncoming: 40,
    totalOutgoing: 0,
    currentStock: 70,
    minStock: 15,
    unitPrice: 55000,
    lastUpdated: '2026-11-11T08:00:00Z',
    notes: 'Kopi premium kemasan valve',
  },
  {
    id: 'prod-5',
    sku: 'MNM-002',
    name: 'Susu UHT Full Cream 1000ml',
    category: 'Minuman',
    unit: 'Pcs',
    initialStock: 25,
    totalIncoming: 80,
    totalOutgoing: 0,
    currentStock: 105,
    minStock: 20,
    unitPrice: 198000,
    lastUpdated: '2026-11-07T16:45:00Z',
  },
  {
    id: 'prod-6',
    sku: 'MNM-003',
    name: 'Teh Celup Melati Kotak (Isi 25)',
    category: 'Minuman',
    unit: 'Pcs',
    initialStock: 60,
    totalIncoming: 100,
    totalOutgoing: 0,
    currentStock: 160,
    minStock: 20,
    unitPrice: 9500,
    lastUpdated: '2026-11-06T10:10:00Z',
  },
  {
    id: 'prod-7',
    sku: 'SBK-004',
    name: 'Tepung Terigu Segitiga 1kg',
    category: 'Sembako',
    unit: 'Pcs',
    initialStock: 70,
    totalIncoming: 110,
    totalOutgoing: 0,
    currentStock: 180,
    minStock: 25,
    unitPrice: 13000,
    lastUpdated: '2026-11-05T13:25:00Z',
  },
  {
    id: 'prod-8',
    sku: 'BMB-001',
    name: 'Garam Dapur Beriodium 500g',
    category: 'Bumbu Dapur',
    unit: 'Pcs',
    initialStock: 50,
    totalIncoming: 50,
    totalOutgoing: 0,
    currentStock: 100,
    minStock: 15,
    unitPrice: 5000,
    lastUpdated: '2026-11-11T12:00:00Z',
    notes: 'Sedia di gudang',
  },
  {
    id: 'prod-9',
    sku: 'BMB-002',
    name: 'Kecap Manis Botol 600ml',
    category: 'Bumbu Dapur',
    unit: 'Pcs',
    initialStock: 35,
    totalIncoming: 70,
    totalOutgoing: 0,
    currentStock: 105,
    minStock: 15,
    unitPrice: 24500,
    lastUpdated: '2026-11-04T15:30:00Z',
  },
  {
    id: 'prod-10',
    sku: 'BMB-003',
    name: 'Saus Sambal Botol 335ml',
    category: 'Bumbu Dapur',
    unit: 'Pcs',
    initialStock: 40,
    totalIncoming: 50,
    totalOutgoing: 0,
    currentStock: 90,
    minStock: 15,
    unitPrice: 16000,
    lastUpdated: '2026-11-11T10:15:00Z',
  },
];

export const INITIAL_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    productId: 'prod-1',
    productName: 'Beras Premium Ramos 5kg',
    type: 'masuk',
    quantity: 120,
    stockBefore: 50,
    stockAfter: 170,
    date: '2026-11-01',
    timestamp: '2026-11-01T08:30:00Z',
    sourceFileName: 'Permintaan_Barang_Masuk_Nov2026.xlsx',
    batchId: 'batch-1',
    notes: 'Pengiriman batch awal bulan dari distributor utama',
  },
  {
    id: 'mov-2',
    productId: 'prod-2',
    productName: 'Minyak Goreng Sawit 2L',
    type: 'masuk',
    quantity: 60,
    stockBefore: 40,
    stockAfter: 100,
    date: '2026-11-01',
    timestamp: '2026-11-01T08:35:00Z',
    sourceFileName: 'Permintaan_Barang_Masuk_Nov2026.xlsx',
    batchId: 'batch-1',
  },
];

export const INITIAL_BATCHES: UploadBatch[] = [
  {
    id: 'batch-1',
    fileName: 'Permintaan_Barang_Masuk_Nov2026.xlsx',
    uploadDate: '2026-11-01',
    uploadedAt: '2026-11-01T08:35:00Z',
    type: 'barang_masuk',
    totalItems: 2,
    totalQuantity: 180,
    status: 'berhasil',
    affectedProductsCount: 2,
    lowStockTriggeredCount: 0,
    items: [
      { productName: 'Beras Premium Ramos 5kg', quantity: 120, status: 'sukses' },
      { productName: 'Minyak Goreng Sawit 2L', quantity: 60, status: 'sukses' },
    ],
  },
];

export const INITIAL_NOTIFICATIONS: LowStockNotification[] = [];

// Local Storage Handlers
export function isSimulationCleared(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.CLEARED_FLAG) === 'true';
  } catch (e) {
    return false;
  }
}

const PURGE_MOCK_OUTGOING_FLAG = 'gudangflow_mock_sales_purged_v2';

export function purgeMockSalesDataIfNeeded() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (localStorage.getItem(PURGE_MOCK_OUTGOING_FLAG) === 'true') {
      return;
    }

    // 1. Purge mock movements from movements storage
    const rawMov = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    if (rawMov) {
      const movements: StockMovement[] = JSON.parse(rawMov);
      const cleanedMovements = movements.filter(
        (m) =>
          m.sourceFileName !== 'Laporan_Penjualan_Tahunan_2026.xlsx' &&
          !['mov-3', 'mov-4', 'mov-5', 'mov-6', 'mov-7'].includes(m.id)
      );
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(cleanedMovements));
    }

    // 2. Purge mock sales batches
    const rawBatches = localStorage.getItem(STORAGE_KEYS.BATCHES);
    if (rawBatches) {
      const batches: UploadBatch[] = JSON.parse(rawBatches);
      const cleanedBatches = batches.filter(
        (b) => b.fileName !== 'Laporan_Penjualan_Tahunan_2026.xlsx' && b.id !== 'batch-2'
      );
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(cleanedBatches));
    }

    // 3. Purge mock notifications caused by mock sales
    const rawNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (rawNotifs) {
      const notifs: LowStockNotification[] = JSON.parse(rawNotifs);
      const cleanedNotifs = notifs.filter(
        (n) => !['notif-1', 'notif-2', 'notif-3', 'notif-4'].includes(n.id)
      );
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(cleanedNotifs));
    }

    // 4. Reset totalOutgoing to 0 on existing products if outgoing was purely mock
    const rawProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (rawProducts) {
      const products: Product[] = JSON.parse(rawProducts);
      const realMovementsRaw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      const realMovements: StockMovement[] = realMovementsRaw ? JSON.parse(realMovementsRaw) : [];
      const realOutgoingMap = new Map<string, number>();
      realMovements
        .filter((m) => m.type === 'keluar')
        .forEach((m) => {
          realOutgoingMap.set(m.productId, (realOutgoingMap.get(m.productId) || 0) + m.quantity);
        });

      const updatedProducts = products.map((p) => {
        const realOutgoing = realOutgoingMap.get(p.id) || 0;
        const currentStock = (p.initialStock || 0) + p.totalIncoming - realOutgoing;
        return {
          ...p,
          unit: 'Pcs',
          totalOutgoing: realOutgoing,
          currentStock: Math.max(0, currentStock),
        };
      });
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    }

    localStorage.setItem(PURGE_MOCK_OUTGOING_FLAG, 'true');
  } catch (e) {
    console.error('Failed to purge mock sales data', e);
  }
}

// Auto-run purge once on load
purgeMockSalesDataIfNeeded();

export function getStoredProducts(): Product[] {
  try {
    purgeMockSalesDataIfNeeded();
    const cleared = localStorage.getItem(STORAGE_KEYS.CLEARED_FLAG) === 'true';
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw !== null) {
      const parsed: Product[] = JSON.parse(raw);
      return parsed.map((p) => ({
        ...p,
        unit: p.unit && p.unit.toLowerCase() !== 'unit' ? p.unit : 'Pcs',
      }));
    }
    // If not explicitly cleared and first time opening the app, initialize demo
    if (!cleared) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return [];
  } catch (e) {
    console.error('Failed to parse stored products', e);
    return [];
  }
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  if (auth.currentUser) {
    syncProductsBatchToFirestore(products).catch((err) => {
      console.warn('Background Firestore sync (products) skipped or failed:', err);
    });
  }
}

export function getStoredMovements(): StockMovement[] {
  try {
    purgeMockSalesDataIfNeeded();
    const cleared = localStorage.getItem(STORAGE_KEYS.CLEARED_FLAG) === 'true';
    const raw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    if (raw !== null) {
      const parsed: StockMovement[] = JSON.parse(raw);
      // Strictly omit mock sales records
      return parsed.filter((m) => m.sourceFileName !== 'Laporan_Penjualan_Tahunan_2026.xlsx');
    }
    if (!cleared) {
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));
      return INITIAL_MOVEMENTS;
    }
    return [];
  } catch (e) {
    console.error('Failed to parse movements', e);
    return [];
  }
}

export function saveMovements(movements: StockMovement[]) {
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
}

export function getStoredBatches(): UploadBatch[] {
  try {
    purgeMockSalesDataIfNeeded();
    const cleared = localStorage.getItem(STORAGE_KEYS.CLEARED_FLAG) === 'true';
    const raw = localStorage.getItem(STORAGE_KEYS.BATCHES);
    if (raw !== null) {
      const parsed: UploadBatch[] = JSON.parse(raw);
      return parsed.filter((b) => b.fileName !== 'Laporan_Penjualan_Tahunan_2026.xlsx');
    }
    if (!cleared) {
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(INITIAL_BATCHES));
      return INITIAL_BATCHES;
    }
    return [];
  } catch (e) {
    console.error('Failed to parse batches', e);
    return [];
  }
}

export function saveBatches(batches: UploadBatch[]) {
  localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
}

export function getStoredNotifications(): LowStockNotification[] {
  try {
    purgeMockSalesDataIfNeeded();
    const cleared = localStorage.getItem(STORAGE_KEYS.CLEARED_FLAG) === 'true';
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (raw !== null) {
      const parsed: LowStockNotification[] = JSON.parse(raw);
      return parsed.filter((n) => !['notif-1', 'notif-2', 'notif-3', 'notif-4'].includes(n.id));
    }
    if (!cleared) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return [];
  } catch (e) {
    console.error('Failed to parse notifications', e);
    return [];
  }
}

export function saveNotifications(notifications: LowStockNotification[]) {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
}

// Clear all simulation data with password validation
export function clearSimulationDataWithPassword(password: string): { success: boolean; message: string } {
  if (password !== 'stok2026') {
    return {
      success: false,
      message: 'Kata sandi tidak valid. Akses ditolak untuk menghapus data.',
    };
  }

  // Set persistent cleared flag so upon refresh, demo data NEVER returns
  localStorage.setItem(STORAGE_KEYS.CLEARED_FLAG, 'true');
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));

  if (auth.currentUser) {
    clearAllFirestoreData().catch((err) => {
      console.warn('Background Firestore wipe skipped or failed:', err);
    });
  }

  return {
    success: true,
    message: 'Seluruh data simulasi telah berhasil dihapus. Database kini bersih dan siap untuk file excel Anda.',
  };
}

// Delete single product
export function deleteSingleProduct(productId: string) {
  const products = getStoredProducts().filter((p) => p.id !== productId);
  const removedMovements = getStoredMovements().filter((m) => m.productId === productId);
  const movements = getStoredMovements().filter((m) => m.productId !== productId);
  const removedNotifs = getStoredNotifications().filter((n) => n.productId === productId);
  const notifs = getStoredNotifications().filter((n) => n.productId !== productId);

  saveProducts(products);
  saveMovements(movements);
  saveNotifications(notifs);

  if (auth.currentUser) {
    deleteProductFromFirestore(productId).catch((err) => {
      console.warn('Background Firestore delete product failed:', err);
    });
    if (removedMovements.length > 0) {
      deleteMovementsByIdsFromFirestore(removedMovements.map((m) => m.id)).catch(() => {});
    }
    if (removedNotifs.length > 0) {
      deleteNotificationsByIdsFromFirestore(removedNotifs.map((n) => n.id)).catch(() => {});
    }
  }
}

// Helper: Reconcile Low Stock Notifications with current products list
function reconcileNotifications(
  products: Product[],
  existingNotifications: LowStockNotification[],
  timestamp: string
): {
  nextNotifications: LowStockNotification[];
  deletedNotificationIds: string[];
  changedNotifications: LowStockNotification[];
} {
  const existingByProd = new Map<string, LowStockNotification>();
  existingNotifications.forEach((n) => {
    if (!existingByProd.has(n.productId)) {
      existingByProd.set(n.productId, n);
    }
  });

  const nextNotifications: LowStockNotification[] = [];
  const changedNotifications: LowStockNotification[] = [];
  const keptIds = new Set<string>();

  products.forEach((p) => {
    if (p.currentStock <= p.minStock) {
      const prev = existingByProd.get(p.id);
      if (prev) {
        const updated: LowStockNotification = {
          ...prev,
          productName: p.name,
          currentStock: p.currentStock,
          minStock: p.minStock,
          deficit: p.minStock - p.currentStock,
        };
        nextNotifications.push(updated);
        keptIds.add(updated.id);
        if (
          prev.currentStock !== updated.currentStock ||
          prev.minStock !== updated.minStock ||
          prev.productName !== updated.productName
        ) {
          changedNotifications.push(updated);
        }
      } else {
        const created: LowStockNotification = {
          id: uniqueId('notif'),
          productId: p.id,
          productName: p.name,
          currentStock: p.currentStock,
          minStock: p.minStock,
          deficit: p.minStock - p.currentStock,
          triggeredAt: timestamp,
          read: false,
        };
        nextNotifications.push(created);
        changedNotifications.push(created);
      }
    }
  });

  const deletedNotificationIds = existingNotifications
    .filter((n) => !keptIds.has(n.id))
    .map((n) => n.id);

  return { nextNotifications, deletedNotificationIds, changedNotifications };
}

// Delete a specific Upload Batch & rollback its exact stock impact
export function deleteUploadBatch(batchId: string): {
  success: boolean;
  deletedBatch?: UploadBatch;
  revertedMovementsCount: number;
  revertedQuantity: number;
  affectedProductsCount: number;
  removedAutoProductsCount: number;
} {
  const batches = getStoredBatches();
  const targetBatch = batches.find((b) => b.id === batchId);
  if (!targetBatch) {
    return {
      success: false,
      revertedMovementsCount: 0,
      revertedQuantity: 0,
      affectedProductsCount: 0,
      removedAutoProductsCount: 0,
    };
  }

  const allMovements = getStoredMovements();
  let batchMovements = allMovements.filter((m) => m.batchId === batchId);

  // Fallback for legacy initial batch without batchId on movement rows
  if (batchMovements.length === 0 && targetBatch.fileName) {
    batchMovements = allMovements.filter(
      (m) => !m.batchId && m.sourceFileName === targetBatch.fileName
    );
  }

  const deletedMovementIds = new Set(batchMovements.map((m) => m.id));
  const remainingMovements = allMovements.filter((m) => !deletedMovementIds.has(m.id));
  const remainingMovProductIds = new Set(remainingMovements.map((m) => m.productId));

  // Aggregate per-product rollback deltas
  const deltas = new Map<
    string,
    { deltaIncoming: number; deltaOutgoing: number; deltaStock: number }
  >();
  let revertedQty = 0;

  batchMovements.forEach((m) => {
    revertedQty += m.quantity;
    const entry = deltas.get(m.productId) || {
      deltaIncoming: 0,
      deltaOutgoing: 0,
      deltaStock: 0,
    };
    if (m.type === 'masuk') {
      entry.deltaIncoming -= m.quantity;
      entry.deltaStock -= m.quantity;
    } else if (m.type === 'keluar') {
      entry.deltaOutgoing -= m.quantity;
      entry.deltaStock += m.quantity;
    } else {
      entry.deltaStock -= m.stockAfter - m.stockBefore;
    }
    deltas.set(m.productId, entry);
  });

  const timestamp = new Date().toISOString();
  const currentProducts = getStoredProducts();
  const updatedProducts: Product[] = [];
  const modifiedProducts: Product[] = [];
  const deletedProductIds: string[] = [];

  currentProducts.forEach((p) => {
    const delta = deltas.get(p.id);
    if (!delta) {
      updatedProducts.push(p);
      return;
    }

    const nextIncoming = Math.max(0, p.totalIncoming + delta.deltaIncoming);
    const nextOutgoing = Math.max(0, p.totalOutgoing + delta.deltaOutgoing);
    const nextStock = p.currentStock + delta.deltaStock;

    const wasAutoCreatedByUpload =
      p.initialStock === 0 &&
      !remainingMovProductIds.has(p.id) &&
      nextIncoming === 0 &&
      nextOutgoing === 0 &&
      nextStock === 0 &&
      Boolean(
        p.notes?.includes('Ditambahkan otomatis') ||
          p.notes?.includes('Terdaftar otomatis') ||
          p.notes?.includes('Masuk via') ||
          p.notes?.includes('Terdaftar via')
      );

    if (wasAutoCreatedByUpload) {
      deletedProductIds.push(p.id);
    } else {
      const updatedProd: Product = {
        ...p,
        totalIncoming: nextIncoming,
        totalOutgoing: nextOutgoing,
        currentStock: nextStock,
        lastUpdated: timestamp,
      };
      updatedProducts.push(updatedProd);
      modifiedProducts.push(updatedProd);
    }
  });

  const remainingBatches = batches.filter((b) => b.id !== batchId);
  const currentNotifications = getStoredNotifications();
  const { nextNotifications, deletedNotificationIds, changedNotifications } =
    reconcileNotifications(updatedProducts, currentNotifications, timestamp);

  // Persist locally
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
  saveMovements(remainingMovements);
  saveBatches(remainingBatches);
  saveNotifications(nextNotifications);

  // Sync to Firestore if signed in
  if (auth.currentUser) {
    deleteBatchFromFirestore(batchId).catch(() => {});
    if (deletedMovementIds.size > 0) {
      deleteMovementsByIdsFromFirestore(Array.from(deletedMovementIds)).catch(() => {});
    }
    if (modifiedProducts.length > 0) {
      syncProductsBatchToFirestore(modifiedProducts).catch(() => {});
    }
    if (deletedProductIds.length > 0) {
      deleteProductsByIdsFromFirestore(deletedProductIds).catch(() => {});
    }
    if (deletedNotificationIds.length > 0) {
      deleteNotificationsByIdsFromFirestore(deletedNotificationIds).catch(() => {});
    }
    if (changedNotifications.length > 0) {
      syncNotificationsBatchToFirestore(changedNotifications).catch(() => {});
    }
  }

  return {
    success: true,
    deletedBatch: targetBatch,
    revertedMovementsCount: batchMovements.length,
    revertedQuantity: revertedQty,
    affectedProductsCount: deltas.size,
    removedAutoProductsCount: deletedProductIds.length,
  };
}

// Delete a single movement log entry & rollback its stock impact
export function deleteSingleMovement(movementId: string): {
  success: boolean;
  deletedMovement?: StockMovement;
} {
  const allMovements = getStoredMovements();
  const target = allMovements.find((m) => m.id === movementId);
  if (!target) return { success: false };

  const remainingMovements = allMovements.filter((m) => m.id !== movementId);
  const remainingMovProductIds = new Set(remainingMovements.map((m) => m.productId));
  const timestamp = new Date().toISOString();

  const currentProducts = getStoredProducts();
  const updatedProducts: Product[] = [];
  const modifiedProducts: Product[] = [];
  const deletedProductIds: string[] = [];

  currentProducts.forEach((p) => {
    if (p.id !== target.productId) {
      updatedProducts.push(p);
      return;
    }

    let deltaIncoming = 0;
    let deltaOutgoing = 0;
    let deltaStock = 0;

    if (target.type === 'masuk') {
      deltaIncoming = -target.quantity;
      deltaStock = -target.quantity;
    } else if (target.type === 'keluar') {
      deltaOutgoing = -target.quantity;
      deltaStock = target.quantity;
    } else {
      deltaStock = -(target.stockAfter - target.stockBefore);
    }

    const nextIncoming = Math.max(0, p.totalIncoming + deltaIncoming);
    const nextOutgoing = Math.max(0, p.totalOutgoing + deltaOutgoing);
    const nextStock = p.currentStock + deltaStock;

    const wasAutoCreatedByUpload =
      p.initialStock === 0 &&
      !remainingMovProductIds.has(p.id) &&
      nextIncoming === 0 &&
      nextOutgoing === 0 &&
      nextStock === 0 &&
      Boolean(
        p.notes?.includes('Ditambahkan otomatis') ||
          p.notes?.includes('Terdaftar otomatis') ||
          p.notes?.includes('Masuk via') ||
          p.notes?.includes('Terdaftar via')
      );

    if (wasAutoCreatedByUpload) {
      deletedProductIds.push(p.id);
    } else {
      const updatedProd: Product = {
        ...p,
        totalIncoming: nextIncoming,
        totalOutgoing: nextOutgoing,
        currentStock: nextStock,
        lastUpdated: timestamp,
      };
      updatedProducts.push(updatedProd);
      modifiedProducts.push(updatedProd);
    }
  });

  // Update parent batch stats if movement belonged to a batch
  let updatedBatchToSync: UploadBatch | null = null;
  let deletedBatchId: string | null = null;
  const batches = getStoredBatches();
  const nextBatches: UploadBatch[] = [];

  batches.forEach((b) => {
    if (target.batchId && b.id === target.batchId) {
      const remainingForBatch = remainingMovements.filter((m) => m.batchId === b.id);
      if (remainingForBatch.length === 0) {
        deletedBatchId = b.id;
        return; // Remove empty batch
      }
      const nextTotalQty = remainingForBatch.reduce((acc, m) => acc + m.quantity, 0);
      const nextAffected = new Set(remainingForBatch.map((m) => m.productId)).size;
      // Remove first matching item entry in batch.items
      let removedOne = false;
      const nextItems = b.items.filter((item) => {
        if (!removedOne && item.productName === target.productName && item.quantity === target.quantity) {
          removedOne = true;
          return false;
        }
        return true;
      });
      const updatedB: UploadBatch = {
        ...b,
        totalItems: remainingForBatch.length,
        totalQuantity: nextTotalQty,
        affectedProductsCount: nextAffected,
        items: nextItems,
      };
      updatedBatchToSync = updatedB;
      nextBatches.push(updatedB);
    } else {
      nextBatches.push(b);
    }
  });

  const currentNotifications = getStoredNotifications();
  const { nextNotifications, deletedNotificationIds, changedNotifications } =
    reconcileNotifications(updatedProducts, currentNotifications, timestamp);

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
  saveMovements(remainingMovements);
  saveBatches(nextBatches);
  saveNotifications(nextNotifications);

  if (auth.currentUser) {
    deleteMovementsByIdsFromFirestore([movementId]).catch(() => {});
    if (modifiedProducts.length > 0) {
      syncProductsBatchToFirestore(modifiedProducts).catch(() => {});
    }
    if (deletedProductIds.length > 0) {
      deleteProductsByIdsFromFirestore(deletedProductIds).catch(() => {});
    }
    if (deletedBatchId) {
      deleteBatchFromFirestore(deletedBatchId).catch(() => {});
    } else if (updatedBatchToSync) {
      syncBatchToFirestore(updatedBatchToSync).catch(() => {});
    }
    if (deletedNotificationIds.length > 0) {
      deleteNotificationsByIdsFromFirestore(deletedNotificationIds).catch(() => {});
    }
    if (changedNotifications.length > 0) {
      syncNotificationsBatchToFirestore(changedNotifications).catch(() => {});
    }
  }

  return { success: true, deletedMovement: target };
}

// Business Logic: Process Incoming Goods Excel
export function applyIncomingGoodsBatch({
  rows,
  fileName,
  uploadDate,
  notes,
}: {
  rows: ParsedExcelRow[];
  fileName: string;
  uploadDate: string;
  notes?: string;
}): {
  updatedProducts: Product[];
  newMovements: StockMovement[];
  newBatch: UploadBatch;
  newNotifications: LowStockNotification[];
  summary: {
    addedProductsCount: number;
    updatedProductsCount: number;
    totalQuantityAdded: number;
    lowStockResolvedCount: number;
  };
} {
  const currentProducts = getStoredProducts();
  const currentMovements = getStoredMovements();
  const currentBatches = getStoredBatches();
  const currentNotifications = getStoredNotifications();

  const timestamp = new Date().toISOString();
  const batchId = 'batch-' + Date.now();

  const productMap = new Map<string, Product>();
  currentProducts.forEach((p) => {
    productMap.set(p.name.trim().toLowerCase(), { ...p });
  });

  const createdMovements: StockMovement[] = [];
  const batchItems: UploadBatch['items'] = [];
  let addedCount = 0;
  let updatedCount = 0;
  let totalQty = 0;

  rows.forEach((row) => {
    if (!row.isValid) return;

    const normalizedName = row.productName.trim().toLowerCase();
    const existing = productMap.get(normalizedName);
    const qty = row.quantity;
    totalQty += qty;

    const rowDate = row.dateOrYear || uploadDate;
    const rowYear = row.year || (row.dateOrYear ? (row.dateOrYear.length >= 4 ? row.dateOrYear.slice(0, 4) : undefined) : undefined);
    const movementNotes = row.documentNo
      ? `${row.documentNo}${notes ? ' · ' + notes : ' - Barang Masuk'}`
      : notes || `Barang Masuk via Upload ${fileName}`;

    if (existing) {
      const stockBefore = existing.currentStock;
      const stockAfter = stockBefore + qty;
      existing.currentStock = stockAfter;
      existing.totalIncoming += qty;
      existing.lastUpdated = timestamp;
      if (row.category && !existing.category) existing.category = row.category;
      if (row.minStock && row.minStock > 0) existing.minStock = row.minStock;

      productMap.set(normalizedName, existing);
      updatedCount++;

      createdMovements.push({
        id: uniqueId('mov'),
        productId: existing.id,
        productName: existing.name,
        type: 'masuk',
        quantity: qty,
        stockBefore,
        stockAfter,
        date: rowDate,
        timestamp,
        sourceFileName: fileName,
        batchId,
        year: rowYear,
        notes: movementNotes,
      });

      batchItems.push({
        productName: existing.name,
        quantity: qty,
        yearOrDate: row.documentNo ? `${row.documentNo} (${rowDate})` : rowDate,
        status: 'sukses',
        message: `Stok bertambah dari ${stockBefore} menjadi ${stockAfter}`,
      });
    } else {
      // New Product auto-registration
      const newId = uniqueId('prod');
      const generatedSku = row.sku || 'PRD-' + Math.floor(100 + Math.random() * 900);
      const newProduct: Product = {
        id: newId,
        sku: generatedSku,
        name: row.productName.trim(),
        category: row.category || 'Umum',
        unit: 'Pcs',
        initialStock: 0,
        totalIncoming: qty,
        totalOutgoing: 0,
        currentStock: qty,
        minStock: row.minStock || 10,
        lastUpdated: timestamp,
        notes: row.documentNo ? `Masuk via ${row.documentNo} (${fileName})` : `Ditambahkan otomatis dari upload file ${fileName}`,
      };

      productMap.set(normalizedName, newProduct);
      addedCount++;

      createdMovements.push({
        id: uniqueId('mov'),
        productId: newId,
        productName: newProduct.name,
        type: 'masuk',
        quantity: qty,
        stockBefore: 0,
        stockAfter: qty,
        date: rowDate,
        timestamp,
        sourceFileName: fileName,
        batchId,
        year: rowYear,
        notes: movementNotes,
      });

      batchItems.push({
        productName: newProduct.name,
        quantity: qty,
        yearOrDate: row.documentNo ? `${row.documentNo} (${rowDate})` : rowDate,
        status: 'produk_baru',
        message: `Produk baru terdaftar dengan stok awal ${qty}`,
      });
    }
  });

  const updatedProducts = Array.from(productMap.values());

  // Check if any low stock notifications are now resolved because stock is replenished
  const updatedNotifications = currentNotifications.filter((n) => {
    const prod = updatedProducts.find((p) => p.id === n.productId);
    if (!prod) return true;
    return prod.currentStock <= prod.minStock;
  });

  const newBatch: UploadBatch = {
    id: batchId,
    fileName,
    uploadDate,
    uploadedAt: timestamp,
    type: 'barang_masuk',
    totalItems: batchItems.length,
    totalQuantity: totalQty,
    status: 'berhasil',
    affectedProductsCount: addedCount + updatedCount,
    lowStockTriggeredCount: 0,
    notes: notes || undefined,
    items: batchItems,
  };

  const finalMovements = [...createdMovements, ...currentMovements];
  const finalBatches = [newBatch, ...currentBatches];

  saveProducts(updatedProducts);
  saveMovements(finalMovements);
  saveBatches(finalBatches);
  saveNotifications(updatedNotifications);

  if (auth.currentUser) {
    syncProductsBatchToFirestore(updatedProducts).catch(() => {});
    syncMovementsBatchToFirestore(createdMovements).catch(() => {});
    syncBatchToFirestore(newBatch).catch(() => {});
    const resolvedNotifIds = currentNotifications
      .filter((oldN) => !updatedNotifications.some((newN) => newN.id === oldN.id))
      .map((n) => n.id);
    if (resolvedNotifIds.length > 0) {
      deleteNotificationsByIdsFromFirestore(resolvedNotifIds).catch(() => {});
    }
  }

  return {
    updatedProducts,
    newMovements: finalMovements,
    newBatch,
    newNotifications: updatedNotifications,
    summary: {
      addedProductsCount: addedCount,
      updatedProductsCount: updatedCount,
      totalQuantityAdded: totalQty,
      lowStockResolvedCount: currentNotifications.length - updatedNotifications.length,
    },
  };
}

// Business Logic: Process Sales / Outgoing Goods Excel (Cuts inventory in real-time)
export function applySalesDataBatch({
  rows,
  fileName,
  uploadDate,
  salesYear,
  notes,
}: {
  rows: ParsedExcelRow[];
  fileName: string;
  uploadDate: string;
  salesYear?: string | number;
  notes?: string;
}): {
  updatedProducts: Product[];
  newMovements: StockMovement[];
  newBatch: UploadBatch;
  newNotifications: LowStockNotification[];
  summary: {
    affectedCount: number;
    totalQuantitySold: number;
    lowStockCountTriggered: number;
    outOfStockCountTriggered: number;
    negativeStockWarnings: string[];
  };
} {
  const currentProducts = getStoredProducts();
  const currentMovements = getStoredMovements();
  const currentBatches = getStoredBatches();
  const currentNotifications = getStoredNotifications();

  const timestamp = new Date().toISOString();
  const batchId = 'batch-' + Date.now();

  const productMap = new Map<string, Product>();
  currentProducts.forEach((p) => {
    productMap.set(p.name.trim().toLowerCase(), { ...p });
  });

  const createdMovements: StockMovement[] = [];
  const batchItems: UploadBatch['items'] = [];
  const newNotificationsGenerated: LowStockNotification[] = [];
  const negativeStockWarnings: string[] = [];

  let affectedCount = 0;
  let totalSold = 0;
  let lowCount = 0;
  let outCount = 0;

  rows.forEach((row) => {
    if (!row.isValid) return;

    const normalizedName = row.productName.trim().toLowerCase();
    const existing = productMap.get(normalizedName);
    const qty = row.quantity;
    totalSold += qty;

    const rowDate = row.dateOrYear || uploadDate;
    const rowYear = row.year || (row.dateOrYear ? (row.dateOrYear.length >= 4 ? row.dateOrYear.slice(0, 4) : undefined) : salesYear || new Date(uploadDate).getFullYear());
    const movementNotes = row.documentNo
      ? `${row.documentNo}${notes ? ' · ' + notes : ' - Pemotongan Penjualan'}`
      : notes || `Pemotongan penjualan via ${fileName}`;

    if (existing) {
      const stockBefore = existing.currentStock;
      const stockAfter = stockBefore - qty;

      if (stockAfter < 0) {
        negativeStockWarnings.push(
          `${existing.name}: Penjualan (${qty}) melebihi stok fisik (${stockBefore}). Stok menjadi minus (${stockAfter}).`
        );
      }

      existing.currentStock = stockAfter;
      existing.totalOutgoing += qty;
      existing.lastUpdated = timestamp;

      productMap.set(normalizedName, existing);
      affectedCount++;

      // Check minimum stock trigger
      if (stockAfter <= 0) {
        outCount++;
        newNotificationsGenerated.push({
          id: uniqueId('notif'),
          productId: existing.id,
          productName: existing.name,
          currentStock: stockAfter,
          minStock: existing.minStock,
          deficit: existing.minStock - stockAfter,
          triggeredAt: timestamp,
          read: false,
        });
      } else if (stockAfter <= existing.minStock) {
        lowCount++;
        newNotificationsGenerated.push({
          id: uniqueId('notif'),
          productId: existing.id,
          productName: existing.name,
          currentStock: stockAfter,
          minStock: existing.minStock,
          deficit: existing.minStock - stockAfter,
          triggeredAt: timestamp,
          read: false,
        });
      }

      createdMovements.push({
        id: uniqueId('mov'),
        productId: existing.id,
        productName: existing.name,
        type: 'keluar',
        quantity: qty,
        stockBefore,
        stockAfter,
        date: rowDate,
        timestamp,
        sourceFileName: fileName,
        batchId,
        year: rowYear,
        notes: movementNotes,
      });

      batchItems.push({
        productName: existing.name,
        quantity: qty,
        yearOrDate: row.documentNo ? `${row.documentNo} (${rowDate})` : String(rowDate || rowYear),
        status: stockAfter < 0 ? 'stok_minus_warning' : 'sukses',
        message: `Stok dipotong dari ${stockBefore} menjadi ${stockAfter}`,
      });
    } else {
      // Product was not previously in warehouse: record with negative stock or alert
      const newId = uniqueId('prod');
      const generatedSku = row.sku || 'PRD-' + Math.floor(100 + Math.random() * 900);
      const stockAfter = -qty;

      negativeStockWarnings.push(
        `Produk baru "${row.productName}" belum terdaftar sebelumnya. Penjualan tercatat menghasilkan stok awal minus (${stockAfter}).`
      );

      const newProduct: Product = {
        id: newId,
        sku: generatedSku,
        name: row.productName.trim(),
        category: row.category || 'Umum',
        unit: 'Pcs',
        initialStock: 0,
        totalIncoming: 0,
        totalOutgoing: qty,
        currentStock: stockAfter,
        minStock: row.minStock || 10,
        lastUpdated: timestamp,
        notes: row.documentNo ? `Terdaftar via ${row.documentNo} (${fileName})` : `Terdaftar otomatis dari data penjualan ${fileName}`,
      };

      productMap.set(normalizedName, newProduct);
      affectedCount++;
      outCount++;

      newNotificationsGenerated.push({
        id: uniqueId('notif'),
        productId: newId,
        productName: newProduct.name,
        currentStock: stockAfter,
        minStock: newProduct.minStock,
        deficit: newProduct.minStock - stockAfter,
        triggeredAt: timestamp,
        read: false,
      });

      createdMovements.push({
        id: uniqueId('mov'),
        productId: newId,
        productName: newProduct.name,
        type: 'keluar',
        quantity: qty,
        stockBefore: 0,
        stockAfter,
        date: rowDate,
        timestamp,
        sourceFileName: fileName,
        batchId,
        year: rowYear,
        notes: movementNotes,
      });

      batchItems.push({
        productName: newProduct.name,
        quantity: qty,
        yearOrDate: row.documentNo ? `${row.documentNo} (${rowDate})` : String(rowDate || rowYear),
        status: 'stok_minus_warning',
        message: `Produk baru langsung dipotong menjadi ${stockAfter}`,
      });
    }
  });

  const updatedProducts = Array.from(productMap.values());

  // Merge notifications avoiding duplicates on same product if unread
  const mergedNotifications = [...newNotificationsGenerated, ...currentNotifications];
  // Deduplicate by productId, keeping latest
  const seenProd = new Set<string>();
  const dedupedNotifications: LowStockNotification[] = [];
  mergedNotifications.forEach((notif) => {
    if (!seenProd.has(notif.productId)) {
      seenProd.add(notif.productId);
      dedupedNotifications.push(notif);
    }
  });

  const newBatch: UploadBatch = {
    id: batchId,
    fileName,
    uploadDate,
    uploadedAt: timestamp,
    type: 'data_penjualan',
    totalItems: batchItems.length,
    totalQuantity: totalSold,
    status: negativeStockWarnings.length > 0 ? 'sebagian' : 'berhasil',
    affectedProductsCount: affectedCount,
    lowStockTriggeredCount: lowCount + outCount,
    notes: notes || undefined,
    items: batchItems,
  };

  const finalMovements = [...createdMovements, ...currentMovements];
  const finalBatches = [newBatch, ...currentBatches];

  saveProducts(updatedProducts);
  saveMovements(finalMovements);
  saveBatches(finalBatches);
  saveNotifications(dedupedNotifications);

  if (auth.currentUser) {
    syncProductsBatchToFirestore(updatedProducts).catch(() => {});
    syncMovementsBatchToFirestore(createdMovements).catch(() => {});
    syncBatchToFirestore(newBatch).catch(() => {});
    if (newNotificationsGenerated.length > 0) {
      syncNotificationsBatchToFirestore(dedupedNotifications).catch(() => {});
    }
  }

  return {
    updatedProducts,
    newMovements: finalMovements,
    newBatch,
    newNotifications: dedupedNotifications,
    summary: {
      affectedCount,
      totalQuantitySold: totalSold,
      lowStockCountTriggered: lowCount,
      outOfStockCountTriggered: outCount,
      negativeStockWarnings,
    },
  };
}
