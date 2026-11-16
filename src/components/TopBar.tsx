import React, { useState } from 'react';
import { Menu, Bell, AlertTriangle, Plus } from 'lucide-react';
import { Product } from '../types/inventory';
import { AppTab } from './Sidebar';

interface TopBarProps {
  activeTab: AppTab;
  products: Product[];
  onOpenMobileMenu: () => void;
  onOpenAddProduct: () => void;
  onFilterLowStock: () => void;
  onNavigateUploadMasuk: () => void;
}

const TAB_LABELS: Record<AppTab, string> = {
  dashboard: 'Ringkasan Gudang',
  inventaris: 'Daftar Stok Produk',
  upload_masuk: 'Upload Barang Masuk',
  upload_penjualan: 'Upload Data Penjualan',
  riwayat_upload: 'Log & Riwayat Upload',
  mutasi: 'Buku Mutasi Arus',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  products,
  onOpenMobileMenu,
  onOpenAddProduct,
  onFilterLowStock,
  onNavigateUploadMasuk,
}) => {
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const criticalCount = products.filter((p) => p.currentStock <= 0).length;
  const lowCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock).length;
  const totalAlertCount = criticalCount + lowCount;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shrink-0">
      {/* Left: Mobile Sidebar Toggle + Contextual Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors shrink-0"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
          <span className="text-slate-400 font-medium hidden sm:inline whitespace-nowrap">
            GudangFlow
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <span className="font-semibold text-slate-900 truncate">
            {TAB_LABELS[activeTab]}
          </span>
        </div>
      </div>

      {/* Right: Notification Bell & Primary Action */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Notification Bell with Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className={`relative p-2 rounded-lg border transition-colors ${
              totalAlertCount > 0
                ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                : 'text-slate-600 bg-white border-slate-200 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="Notifikasi Stok Minimum"
            aria-label="Notifikasi Stok Minimum"
          >
            <Bell className="w-4 h-4" />
            {totalAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4.5 text-[10px] font-mono tabular-nums font-bold bg-amber-600 text-white rounded-full text-center leading-none">
                {totalAlertCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-slate-900">
                      Peringatan Stok Minimum
                    </span>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {totalAlertCount} item
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {totalAlertCount === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Semua produk saat ini berada di atas ambang batas stok minimum. Aman!
                    </div>
                  ) : (
                    products
                      .filter((p) => p.currentStock <= p.minStock)
                      .map((p, pIdx) => {
                        const isZero = p.currentStock <= 0;
                        return (
                          <div
                            key={`${p.id}-${pIdx}`}
                            className={`p-3 text-xs flex items-start justify-between gap-3 ${
                              isZero ? 'bg-rose-50/50' : 'bg-amber-50/30'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{p.name}</span>
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-sm ${
                                    isZero
                                      ? 'text-rose-700 bg-rose-100'
                                      : 'text-amber-800 bg-amber-100'
                                  }`}
                                >
                                  {isZero ? 'Habis' : 'Menipis'}
                                </span>
                              </div>
                              <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                                <span>
                                  Tersedia:{' '}
                                  <strong className="text-slate-900 font-mono tabular-nums">
                                    {p.currentStock} {p.unit}
                                  </strong>
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  Min:{' '}
                                  <strong className="text-slate-700 font-mono tabular-nums">
                                    {p.minStock} {p.unit}
                                  </strong>
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setShowNotifMenu(false);
                                onNavigateUploadMasuk();
                              }}
                              className="px-2 py-1 text-[11px] font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors shrink-0"
                            >
                              Restock
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>

                {totalAlertCount > 0 && (
                  <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setShowNotifMenu(false);
                        onFilterLowStock();
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Lihat semua di tabel inventaris →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenAddProduct}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Produk</span>
        </button>
      </div>
    </header>
  );
};
