export type StockStatus = 'aman' | 'menipis' | 'habis';

export type MovementType = 'masuk' | 'keluar' | 'penyesuaian';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  initialStock: number;
  minStock: number; // Ambang batas stok minimum
  totalIncoming: number;
  totalOutgoing: number;
  unitPrice?: number;
  lastUpdated: string; // ISO string
  notes?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  date: string; // Tanggal transaksi/upload (YYYY-MM-DD or ISO)
  timestamp: string; // Real upload timestamp
  sourceFileName?: string;
  batchId?: string;
  notes?: string;
  year?: number | string; // For yearly sales upload
}

export interface UploadBatch {
  id: string;
  fileName: string;
  uploadDate: string; // Tanggal upload sistem
  uploadedAt?: string; // Real ISO timestamp saat file diunggah
  type: 'barang_masuk' | 'data_penjualan';
  totalItems: number;
  totalQuantity: number;
  status: 'berhasil' | 'sebagian' | 'gagal';
  affectedProductsCount: number;
  lowStockTriggeredCount: number;
  notes?: string;
  items: {
    productName: string;
    quantity: number;
    yearOrDate?: string;
    status: 'sukses' | 'produk_baru' | 'stok_minus_warning' | 'gagal';
    message?: string;
  }[];
}

export interface LowStockNotification {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  deficit: number;
  triggeredAt: string;
  read: boolean;
}
