import React from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert, ArrowDownLeft } from 'lucide-react';
import { Product } from '../types/inventory';

interface LowStockBannerProps {
  products: Product[];
  onViewLowStock: () => void;
  onQuickRestock: () => void;
}

export const LowStockBanner: React.FC<LowStockBannerProps> = ({
  products,
  onViewLowStock,
  onQuickRestock,
}) => {
  const depleted = products.filter((p) => p.currentStock <= 0);
  const lowStock = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock);
  const totalWarnings = depleted.length + lowStock.length;

  if (totalWarnings === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border-b border-amber-200/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span>Perhatian: {totalWarnings} Produk Mencapai Ambang Batas Minimum</span>
              {depleted.length > 0 && (
                <span className="text-[11px] font-mono text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded-sm">
                  {depleted.length} Habis Total
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Item menipis: {depleted.concat(lowStock).slice(0, 3).map((p) => `${p.name} (${p.currentStock} ${p.unit})`).join(', ')}
              {totalWarnings > 3 ? `, dan ${totalWarnings - 3} barang lainnya.` : '.'} Segera jadwalkan pengadaan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            onClick={onViewLowStock}
            className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors flex items-center gap-1"
          >
            <span>Filter Daftar Produk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onQuickRestock}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Upload Permintaan Masuk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
