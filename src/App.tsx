/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LowStockBanner } from './components/LowStockBanner';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { UploadExcelView } from './components/UploadExcelView';
import { MutationHistoryView } from './components/MutationHistoryView';
import { ProductFormModal } from './components/ProductFormModal';
import { StockAdjustmentModal } from './components/StockAdjustmentModal';
import { ClearDataPasswordModal } from './components/ClearDataPasswordModal';
import { Product, StockMovement, UploadBatch, LowStockNotification } from './types/inventory';
import {
  getStoredProducts,
  getStoredMovements,
  getStoredBatches,
  getStoredNotifications,
  saveProducts,
  deleteSingleProduct,
  resetAllDataToDefault,
} from './utils/storage';
import { downloadTemplateBarangMasuk, downloadTemplateDataPenjualan } from './utils/excelParser';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  subscribeProducts,
  subscribeMovements,
  subscribeBatches,
  subscribeNotifications,
  syncProductsBatchToFirestore,
  syncMovementsBatchToFirestore,
} from './services/firestoreSync';
import { RefreshCw, RotateCcw, Lock } from 'lucide-react';

function AppContent() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'inventaris' | 'upload_masuk' | 'upload_penjualan' | 'mutasi'
  >('dashboard');

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [notifications, setNotifications] = useState<LowStockNotification[]>([]);

  // Modals & Filters
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'menipis' | 'habis' | 'aman'>('all');

  // Load from LocalStorage
  const refreshData = useCallback(() => {
    setProducts(getStoredProducts());
    setMovements(getStoredMovements());
    setBatches(getStoredBatches());
    setNotifications(getStoredNotifications());
  }, []);

  // Data Fetching: Only attach onSnapshot listeners if auth is ready and user is authenticated
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Offline / guest mode: load local storage data
      refreshData();
      return;
    }

    // User is authenticated: attach real-time Firestore listeners
    let isInitialFetch = true;
    const unsubProducts = subscribeProducts(
      (firestoreProducts) => {
        if (firestoreProducts.length > 0) {
          setProducts(firestoreProducts);
          localStorage.setItem('gudangflow_products_v1', JSON.stringify(firestoreProducts));
        } else if (isInitialFetch) {
          // If Firestore is empty on initial connection, upload existing local products to cloud
          const localProds = getStoredProducts();
          if (localProds.length > 0) {
            syncProductsBatchToFirestore(localProds).catch(() => {});
          }
        }
        isInitialFetch = false;
      },
      (err) => console.warn('Firestore products listener error:', err)
    );

    const unsubMovements = subscribeMovements(
      (firestoreMovements) => {
        if (firestoreMovements.length > 0) {
          setMovements(firestoreMovements);
          localStorage.setItem('gudangflow_movements_v1', JSON.stringify(firestoreMovements));
        } else {
          const localMovs = getStoredMovements();
          if (localMovs.length > 0) {
            syncMovementsBatchToFirestore(localMovs).catch(() => {});
          }
        }
      },
      (err) => console.warn('Firestore movements listener error:', err)
    );

    const unsubBatches = subscribeBatches(
      (firestoreBatches) => {
        if (firestoreBatches.length > 0) {
          setBatches(firestoreBatches);
          localStorage.setItem('gudangflow_batches_v1', JSON.stringify(firestoreBatches));
        }
      },
      (err) => console.warn('Firestore batches listener error:', err)
    );

    const unsubNotifications = subscribeNotifications(
      (firestoreNotifs) => {
        setNotifications(firestoreNotifs);
      },
      (err) => console.warn('Firestore notifications listener error:', err)
    );

    return () => {
      unsubProducts();
      unsubMovements();
      unsubBatches();
      unsubNotifications();
    };
  }, [user, authLoading, refreshData]);

  // Update minStock directly from table
  const handleUpdateMinStock = (productId: string, newMin: number) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return { ...p, minStock: newMin, lastUpdated: new Date().toISOString() };
      }
      return p;
    });
    setProducts(updated);
    saveProducts(updated);
  };

  // Jump to low-stock filtered view
  const handleFilterLowStock = () => {
    setInventoryFilter('menipis');
    setActiveTab('inventaris');
  };

  // Reset to default sample warehouse data
  const handleResetData = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin mengatur ulang data gudang ke contoh data simulasi awal? Semua data mutasi dan berkas upload saat ini akan di-reset.'
      )
    ) {
      resetAllDataToDefault();
      refreshData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'inventaris') setInventoryFilter('all');
        }}
        notifications={notifications}
        products={products}
        onOpenAddProduct={() => setIsAddProductOpen(true)}
        onResetData={handleResetData}
        onFilterLowStock={handleFilterLowStock}
        onOpenClearModal={() => setIsClearModalOpen(true)}
      />

      {/* Global Low Stock Notification Banner */}
      <LowStockBanner
        products={products}
        onViewLowStock={handleFilterLowStock}
        onQuickRestock={() => setActiveTab('upload_masuk')}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            products={products}
            movements={movements}
            batches={batches}
            onNavigate={(tab) => {
              setActiveTab(tab);
              if (tab === 'inventaris') setInventoryFilter('all');
            }}
            onFilterLowStock={handleFilterLowStock}
            onOpenAddProduct={() => setIsAddProductOpen(true)}
          />
        )}

        {activeTab === 'inventaris' && (
          <InventoryView
            products={products}
            initialFilter={inventoryFilter}
            onOpenAddProduct={() => setIsAddProductOpen(true)}
            onOpenAdjustStock={(p) => setAdjustingProduct(p)}
            onUpdateMinStock={handleUpdateMinStock}
            onGoToUploadMasuk={() => setActiveTab('upload_masuk')}
            onOpenClearModal={() => setIsClearModalOpen(true)}
            onDeleteProduct={(id) => {
              deleteSingleProduct(id);
              refreshData();
            }}
          />
        )}

        {activeTab === 'upload_masuk' && (
          <UploadExcelView
            mode="barang_masuk"
            setMode={(m) => setActiveTab(m === 'barang_masuk' ? 'upload_masuk' : 'upload_penjualan')}
            products={products}
            onDataUpdated={refreshData}
            onGoToInventory={() => {
              setInventoryFilter('all');
              setActiveTab('inventaris');
            }}
          />
        )}

        {activeTab === 'upload_penjualan' && (
          <UploadExcelView
            mode="data_penjualan"
            setMode={(m) => setActiveTab(m === 'barang_masuk' ? 'upload_masuk' : 'upload_penjualan')}
            products={products}
            onDataUpdated={refreshData}
            onGoToInventory={() => {
              setInventoryFilter('all');
              setActiveTab('inventaris');
            }}
          />
        )}

        {activeTab === 'mutasi' && (
          <MutationHistoryView
            movements={movements}
            onGoToUploadMasuk={() => setActiveTab('upload_masuk')}
            onGoToUploadPenjualan={() => setActiveTab('upload_penjualan')}
          />
        )}
      </main>

      {/* Modals */}
      <ProductFormModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSuccess={refreshData}
      />

      <StockAdjustmentModal
        product={adjustingProduct}
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        onSuccess={refreshData}
      />

      <ClearDataPasswordModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onSuccess={() => {
          refreshData();
          setInventoryFilter('all');
        }}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">GudangFlow</span>
            <span>·</span>
            <span>Sistem Pembaruan Stok Excel & Pelacakan Arus Keluar Masuk Real-Time</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={downloadTemplateBarangMasuk}
              className="hover:text-slate-900 transition-colors"
            >
              Template Barang Masuk
            </button>
            <button
              onClick={downloadTemplateDataPenjualan}
              className="hover:text-slate-900 transition-colors"
            >
              Template Data Penjualan
            </button>
            {products.length > 0 ? (
              <button
                onClick={() => setIsClearModalOpen(true)}
                className="hover:text-rose-600 transition-colors flex items-center gap-1 font-medium text-rose-600/90"
                title="Hapus data simulasi secara permanen dengan otorisasi kata sandi"
              >
                <Lock className="w-3 h-3" />
                <span>Hapus Data Simulasi</span>
              </button>
            ) : (
              <button
                onClick={handleResetData}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1"
                title="Muat ulang data simulasi jika diperlukan"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Muat Ulang Demo</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
