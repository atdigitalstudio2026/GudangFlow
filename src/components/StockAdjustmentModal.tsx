import React, { useState } from 'react';
import { X, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { Product, StockMovement, LowStockNotification } from '../types/inventory';
import {
  saveProducts,
  getStoredProducts,
  saveMovements,
  getStoredMovements,
  saveNotifications,
  getStoredNotifications,
} from '../utils/storage';

interface StockAdjustmentModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !product) return null;

  const [mode, setMode] = useState<'tambah' | 'kurang' | 'set'>('set');
  const [amount, setAmount] = useState<number>(product.currentStock);
  const [reason, setReason] = useState<string>('Stock Opname Fisik');
  const [newMinStock, setNewMinStock] = useState<number>(product.minStock);

  // Projected stock
  let projectedStock = product.currentStock;
  if (mode === 'tambah') {
    projectedStock = product.currentStock + amount;
  } else if (mode === 'kurang') {
    projectedStock = product.currentStock - amount;
  } else if (mode === 'set') {
    projectedStock = amount;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentProducts = getStoredProducts();
    const currentMovements = getStoredMovements();
    const currentNotifs = getStoredNotifications();
    const timestamp = new Date().toISOString();
    const todayStr = timestamp.split('T')[0];

    const diff = projectedStock - product.currentStock;
    if (diff === 0 && newMinStock === product.minStock) {
      onClose();
      return;
    }

    const updatedProducts = currentProducts.map((p) => {
      if (p.id === product.id) {
        return {
          ...p,
          currentStock: projectedStock,
          minStock: newMinStock,
          totalIncoming: diff > 0 ? p.totalIncoming + diff : p.totalIncoming,
          totalOutgoing: diff < 0 ? p.totalOutgoing + Math.abs(diff) : p.totalOutgoing,
          lastUpdated: timestamp,
        };
      }
      return p;
    });

    const newMovement: StockMovement = {
      id: 'mov-' + Date.now(),
      productId: product.id,
      productName: product.name,
      type: 'penyesuaian',
      quantity: Math.abs(diff),
      stockBefore: product.currentStock,
      stockAfter: projectedStock,
      date: todayStr,
      timestamp,
      notes: `${reason} (${diff >= 0 ? '+' : ''}${diff} ${product.unit})`,
    };

    // Update notifications if stock dips below or is restored
    let updatedNotifs = [...currentNotifs];
    if (projectedStock <= newMinStock) {
      // Add or update notification
      if (!updatedNotifs.some((n) => n.productId === product.id)) {
        updatedNotifs.unshift({
          id: 'notif-' + Date.now(),
          productId: product.id,
          productName: product.name,
          currentStock: projectedStock,
          minStock: newMinStock,
          deficit: newMinStock - projectedStock,
          triggeredAt: timestamp,
          read: false,
        });
      }
    } else {
      // Resolve notification
      updatedNotifs = updatedNotifs.filter((n) => n.productId !== product.id);
    }

    saveProducts(updatedProducts);
    saveMovements([newMovement, ...currentMovements]);
    saveNotifications(updatedNotifs);

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Penyesuaian Stok Fisik (Stock Opname)</h3>
              <p className="text-[11px] text-slate-500 font-mono">{product.sku} · {product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Mode Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Metode Penyesuaian</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMode('set');
                  setAmount(product.currentStock);
                }}
                className={`py-1.5 font-medium rounded-md transition-colors ${
                  mode === 'set' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Set Stok Aktual
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('tambah');
                  setAmount(10);
                }}
                className={`py-1.5 font-medium rounded-md transition-colors ${
                  mode === 'tambah' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                + Tambah Stok
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('kurang');
                  setAmount(5);
                }}
                className={`py-1.5 font-medium rounded-md transition-colors ${
                  mode === 'kurang' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                - Potong Stok
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {mode === 'set' ? 'Stok Fisik Baru' : mode === 'tambah' ? 'Jumlah Ditambahkan' : 'Jumlah Dipotong'}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ambang Stok Minimum</label>
              <input
                type="number"
                min="1"
                value={newMinStock}
                onChange={(e) => setNewMinStock(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono text-slate-900"
                required
              />
            </div>
          </div>

          {/* Projection Indicator */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500">Stok Saat Ini → Stok Akhir</div>
              <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                {product.currentStock} {product.unit} → <span className="text-indigo-600">{projectedStock} {product.unit}</span>
              </div>
            </div>

            {projectedStock <= newMinStock && (
              <div className="text-right">
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Memicu Notifikasi Min</span>
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alasan Penyesuaian</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white"
            >
              <option value="Stock Opname Fisik Rutin">Stock Opname Fisik Rutin</option>
              <option value="Penyesuaian Selisih Fisik vs Sistem">Penyesuaian Selisih Fisik vs Sistem</option>
              <option value="Barang Rusak / Kadaluarsa">Barang Rusak / Kadaluarsa</option>
              <option value="Retur Pengembalian Barang">Retur Pengembalian Barang</option>
              <option value="Bonus / Sampel Tambahan Supplier">Bonus / Sampel Tambahan Supplier</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Simpan Penyesuaian
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
