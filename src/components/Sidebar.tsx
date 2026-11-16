import React from 'react';
import {
  Package,
  LayoutDashboard,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  FileClock,
  FileSpreadsheet,
  Lock,
  RotateCcw,
  LogOut,
  X,
} from 'lucide-react';
import { Product } from '../types/inventory';
import { downloadTemplateBarangMasuk, downloadTemplateDataPenjualan } from '../utils/excelParser';
import { useAuth } from '../context/AuthContext';

export type AppTab = 'dashboard' | 'inventaris' | 'upload_masuk' | 'upload_penjualan' | 'riwayat_upload' | 'mutasi';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  products: Product[];
  batchesCount: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenClearModal: () => void;
  onResetData: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  products,
  batchesCount,
  isMobileOpen,
  onCloseMobile,
  onOpenClearModal,
  onResetData,
}) => {
  const { user, login, logout } = useAuth();

  const criticalCount = products.filter((p) => p.currentStock <= 0).length;
  const lowCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock).length;
  const totalAlertCount = criticalCount + lowCount;

  const navItems: {
    id: AppTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Ringkasan Gudang',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'inventaris',
      label: 'Daftar Stok Produk',
      icon: <Layers className="w-4 h-4 shrink-0" />,
      badge: totalAlertCount > 0 ? totalAlertCount : undefined,
    },
    {
      id: 'upload_masuk',
      label: 'Upload Barang Masuk',
      icon: <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />,
    },
    {
      id: 'upload_penjualan',
      label: 'Upload Penjualan',
      icon: <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />,
    },
    {
      id: 'riwayat_upload',
      label: 'Log Riwayat Upload',
      icon: <FileClock className="w-4 h-4 shrink-0" />,
      badge: batchesCount > 0 ? batchesCount : undefined,
    },
    {
      id: 'mutasi',
      label: 'Buku Mutasi Arus',
      icon: <History className="w-4 h-4 shrink-0" />,
    },
  ];

  const handleNavClick = (tab: AppTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <button
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2.5 text-left group focus-visible:outline-hidden"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white group-hover:bg-indigo-600 transition-colors shrink-0">
            <Package className="w-4.5 h-4.5 text-indigo-300 group-hover:text-white transition-colors" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            GudangFlow
          </span>
        </button>

        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          aria-label="Tutup menu sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <nav aria-label="Menu Utama" className="space-y-1">
          <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
            Menu Utama
          </div>
          {navItems.map((item, idx) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={`${item.id}-${idx}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-sm shrink-0 ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-amber-100 text-amber-800 font-semibold'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Excel Templates & Data Controls */}
        <div className="space-y-1 pt-4 border-t border-slate-200">
          <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
            Template Excel
          </div>
          <button
            onClick={() => {
              downloadTemplateBarangMasuk();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Template Barang Masuk</span>
          </button>
          <button
            onClick={() => {
              downloadTemplateDataPenjualan();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="truncate">Template Penjualan</span>
          </button>
        </div>

        <div className="space-y-1 pt-4 border-t border-slate-200">
          <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
            Pengelolaan Data
          </div>
          {products.length > 0 ? (
            <button
              onClick={() => {
                onCloseMobile();
                onOpenClearModal();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors whitespace-nowrap"
              title="Hapus data simulasi secara permanen (Dilindungi password)"
            >
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="truncate">Hapus Data Simulasi</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onCloseMobile();
                onResetData();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors whitespace-nowrap"
              title="Muat ulang data simulasi awal"
            >
              <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">Muat Ulang Demo</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom User & Firebase Account Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 shrink-0">
        {user ? (
          <div className="flex items-center justify-between gap-2 px-1 py-1">
            <div
              className="flex items-center gap-2.5 min-w-0"
              title={`Terhubung ke Firebase Firestore sebagai: ${user.email}`}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Akun'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-slate-300 object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="min-w-0 flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium truncate">
                  Firestore Sinkron
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-colors shrink-0"
              title="Keluar dari akun Firebase"
              aria-label="Keluar akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => login()}
            className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
            title="Masuk dengan Google untuk sinkronisasi cloud real-time ke Firestore"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
            <span>Masuk Google</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block sticky top-0 h-screen shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 h-full max-w-[80vw] shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
