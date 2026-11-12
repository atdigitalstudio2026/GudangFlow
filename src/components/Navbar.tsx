import React, { useState } from 'react';
import {
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Bell,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Lock,
  Cloud,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { LowStockNotification, Product } from '../types/inventory';
import { downloadTemplateBarangMasuk, downloadTemplateDataPenjualan } from '../utils/excelParser';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: 'dashboard' | 'inventaris' | 'upload_masuk' | 'upload_penjualan' | 'mutasi';
  setActiveTab: (tab: 'dashboard' | 'inventaris' | 'upload_masuk' | 'upload_penjualan' | 'mutasi') => void;
  notifications: LowStockNotification[];
  products: Product[];
  onOpenAddProduct: () => void;
  onResetData: () => void;
  onFilterLowStock: () => void;
  onOpenClearModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  notifications,
  products,
  onOpenAddProduct,
  onResetData,
  onFilterLowStock,
  onOpenClearModal,
}) => {
  const { user, login, logout, isFirebaseConnected } = useAuth();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // Active unread alerts
  const criticalCount = products.filter((p) => p.currentStock <= 0).length;
  const lowCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock).length;
  const totalAlertCount = criticalCount + lowCount;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Strict 3-zone Top Bar Contract: Brand - Nav Links - Primary Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Wordmark Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus-visible:outline-hidden"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-600 transition-colors">
                <Package className="w-5 h-5 text-indigo-400 group-hover:text-white transition-colors" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                  GudangFlow
                </span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider -mt-1">
                  Inventaris & Mutasi
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Single-line Text Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Ringkasan Gudang
            </button>

            <button
              onClick={() => setActiveTab('inventaris')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'inventaris'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Daftar Stok Produk</span>
              {totalAlertCount > 0 && (
                <span className="text-[11px] font-mono px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-sm">
                  {totalAlertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('upload_masuk')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'upload_masuk'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>Upload Barang Masuk</span>
            </button>

            <button
              onClick={() => setActiveTab('upload_penjualan')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'upload_penjualan'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              <span>Upload Penjualan (Keluar)</span>
            </button>

            <button
              onClick={() => setActiveTab('mutasi')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'mutasi'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Buku Mutasi Arus</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action & Alert Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Template Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Download template Excel siap pakai"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Template Excel</span>
              </button>

              {showTemplateMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowTemplateMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 text-xs">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-slate-500 font-medium">
                      Unduh Format Berkas (.xlsx)
                    </div>
                    <button
                      onClick={() => {
                        downloadTemplateBarangMasuk();
                        setShowTemplateMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-medium">Template Barang Masuk</div>
                        <div className="text-[11px] text-slate-400">Kolom Nama Produk & Qty Masuk</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        downloadTemplateDataPenjualan();
                        setShowTemplateMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <div className="font-medium">Template Data Penjualan</div>
                        <div className="text-[11px] text-slate-400">Kolom Nama Produk, Qty Terjual & Tahun</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className={`relative p-2 rounded-md transition-colors ${
                  totalAlertCount > 0
                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Notifikasi Stok Minimum"
                aria-label="Notifikasi Stok Minimum"
              >
                <Bell className="w-4 h-4" />
                {totalAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4.5 text-[10px] font-mono font-bold bg-amber-600 text-white rounded-full text-center leading-none">
                    {totalAlertCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
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
                      <span className="text-xs font-mono text-slate-500">
                        {totalAlertCount} item butuh perhatian
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
                          .map((p) => {
                            const isZero = p.currentStock <= 0;
                            return (
                              <div
                                key={p.id}
                                className={`p-3 text-xs flex items-start justify-between gap-3 ${
                                  isZero ? 'bg-rose-50/50' : 'bg-amber-50/30'
                                }`}
                              >
                                <div>
                                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <span>{p.name}</span>
                                    {isZero ? (
                                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded-sm">
                                        Habis
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-sm">
                                        Menipis
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                                    <span>
                                      Tersedia:{' '}
                                      <strong className="text-slate-900 font-mono">
                                        {p.currentStock} {p.unit}
                                      </strong>
                                    </span>
                                    <span>·</span>
                                    <span>
                                      Min:{' '}
                                      <strong className="text-slate-700 font-mono">
                                        {p.minStock} {p.unit}
                                      </strong>
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setShowNotifMenu(false);
                                    setActiveTab('upload_masuk');
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

            {/* Quick Add Product Button */}
            <button
              onClick={onOpenAddProduct}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tambah Produk</span>
            </button>

            {/* Quick Clear Simulation Data (Password Protected) */}
            {onOpenClearModal && products.length > 0 && (
              <button
                onClick={onOpenClearModal}
                className="px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Hapus data simulasi secara permanen (Dilindungi password)"
              >
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden md:inline">Hapus Data Simulasi</span>
              </button>
            )}

            {/* Firebase Auth & Cloud Firestore Status */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div
                  className="flex items-center gap-2"
                  title={`Terhubung ke Firebase Firestore sebagai: ${user.email}`}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Akun'}
                      className="w-7 h-7 rounded-full border border-emerald-400 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="hidden xl:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Firestore Sinkron
                    </span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                  title="Keluar dari akun Firebase"
                  aria-label="Keluar akun"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => login()}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                title="Masuk dengan Google untuk sinkronisasi cloud real-time ke Firestore"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Masuk Google</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Row */}
      <div className="lg:hidden border-t border-slate-200 bg-slate-50 px-4 py-2 overflow-x-auto flex items-center gap-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-white font-semibold text-slate-900 shadow-xs'
              : 'text-slate-600'
          }`}
        >
          Ringkasan
        </button>
        <button
          onClick={() => setActiveTab('inventaris')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap shrink-0 ${
            activeTab === 'inventaris'
              ? 'bg-white font-semibold text-slate-900 shadow-xs'
              : 'text-slate-600'
          }`}
        >
          Daftar Stok ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('upload_masuk')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap shrink-0 text-emerald-700 ${
            activeTab === 'upload_masuk'
              ? 'bg-white font-semibold shadow-xs'
              : ''
          }`}
        >
          + Upload Masuk
        </button>
        <button
          onClick={() => setActiveTab('upload_penjualan')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap shrink-0 text-rose-700 ${
            activeTab === 'upload_penjualan'
              ? 'bg-white font-semibold shadow-xs'
              : ''
          }`}
        >
          - Upload Penjualan
        </button>
        <button
          onClick={() => setActiveTab('mutasi')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap shrink-0 ${
            activeTab === 'mutasi'
              ? 'bg-white font-semibold text-slate-900 shadow-xs'
              : 'text-slate-600'
          }`}
        >
          Mutasi
        </button>
      </div>
    </header>
  );
};
