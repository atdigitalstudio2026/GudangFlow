import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit2,
  ArrowUpDown,
  FileSpreadsheet,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Lock,
  Upload,
} from 'lucide-react';
import { Product } from '../types/inventory';
import { exportInventoryToExcel, exportInventoryForImport, downloadTemplateBarangMasuk } from '../utils/excelParser';

interface InventoryViewProps {
  products: Product[];
  onOpenAddProduct: () => void;
  onOpenAdjustStock: (product: Product) => void;
  onUpdateMinStock: (productId: string, newMin: number) => void;
  onGoToUploadMasuk: () => void;
  onOpenClearModal: () => void;
  onDeleteProduct: (productId: string) => void;
  initialFilter?: 'all' | 'menipis' | 'habis' | 'aman';
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onOpenAddProduct,
  onOpenAdjustStock,
  onUpdateMinStock,
  onGoToUploadMasuk,
  onOpenClearModal,
  onDeleteProduct,
  initialFilter = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'menipis' | 'habis' | 'aman'>(initialFilter);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'currentStock' | 'minStock' | 'lastUpdated'>('currentStock');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Inline editing minStock
  const [editingMinStockId, setEditingMinStockId] = useState<string | null>(null);
  const [tempMinStockVal, setTempMinStockVal] = useState<number>(10);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Summary counts
  const totalUnits = useMemo(() => products.reduce((acc, p) => acc + p.currentStock, 0), [products]);
  const totalIncoming = useMemo(() => products.reduce((acc, p) => acc + p.totalIncoming, 0), [products]);
  const totalOutgoing = useMemo(() => products.reduce((acc, p) => acc + p.totalOutgoing, 0), [products]);
  const depletedCount = useMemo(() => products.filter((p) => p.currentStock <= 0).length, [products]);
  const lowCount = useMemo(
    () => products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock).length,
    [products]
  );

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search text
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchSku = p.sku.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchCat) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && p.category !== selectedCategory) {
          return false;
        }

        // Status filter
        if (statusFilter === 'habis') {
          return p.currentStock <= 0;
        }
        if (statusFilter === 'menipis') {
          return p.currentStock > 0 && p.currentStock <= p.minStock;
        }
        if (statusFilter === 'aman') {
          return p.currentStock > p.minStock;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [products, searchQuery, selectedCategory, statusFilter, sortField, sortAsc]);

  const handleSort = (field: 'name' | 'currentStock' | 'minStock' | 'lastUpdated') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleSaveMinStock = (productId: string) => {
    if (tempMinStockVal >= 0) {
      onUpdateMinStock(productId, tempMinStockVal);
    }
    setEditingMinStockId(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Inventaris & Stok Gudang Terkini
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data stok fisik terintegrasi otomatis dari upload barang masuk & data penjualan barang keluar.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
          {products.length > 0 && (
            <button
              onClick={onOpenClearModal}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              title="Hapus data simulasi secara permanen dengan kata sandi khusus"
            >
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Data Simulasi</span>
            </button>
          )}

          <button
            onClick={() => exportInventoryForImport(products)}
            disabled={products.length === 0}
            className="px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-xs"
            title="Ekspor daftar produk dalam format siap diimpor ulang (Masuk / Penjualan)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ekspor Siap Impor (.xlsx)</span>
          </button>

          <button
            onClick={() => exportInventoryToExcel(products)}
            disabled={products.length === 0}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor Laporan (.xlsx)</span>
          </button>

          <button
            onClick={onOpenAddProduct}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Jenis Produk
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {products.length} <span className="text-xs font-normal text-slate-500">SKU</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Stok Fisik (Pcs)
          </div>
          <div className="text-xl font-bold font-mono text-indigo-700 mt-1">
            {totalUnits.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">pcs</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Barang Masuk
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            +{totalIncoming.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Barang Keluar
          </div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-1">
            -{totalOutgoing.toLocaleString('id-ID')}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(lowCount > 0 || depletedCount > 0 ? 'menipis' : 'all')}
          className={`p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${
            depletedCount > 0 || lowCount > 0
              ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-100/50'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[11px] font-medium text-amber-900 uppercase tracking-wider flex items-center justify-between">
            <span>Perlu Restock</span>
            {(depletedCount > 0 || lowCount > 0) && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            )}
          </div>
          <div className="text-xl font-bold font-mono text-amber-800 mt-1">
            {depletedCount + lowCount}{' '}
            <span className="text-xs font-normal text-amber-700">
              ({depletedCount} Habis, {lowCount} Menipis)
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama produk, SKU, atau kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white text-slate-900"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium"
            >
              <option value="all">Semua Kategori ({categories.length})</option>
              {categories.map((c, cIdx) => (
                <option key={`${c}-${cIdx}`} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs (Segmented control) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Semua ({products.length})
          </button>
          <button
            onClick={() => setStatusFilter('menipis')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'menipis'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 hover:bg-amber-100 bg-amber-50'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Stok Menipis ({lowCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('habis')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'habis'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-800 hover:bg-rose-100 bg-rose-50'
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>Stok Habis Total ({depletedCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('aman')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'aman'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 hover:bg-emerald-100 bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Stok Aman ({products.length - lowCount - depletedCount})</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4 w-12">No</th>
                <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1.5">
                    <span>Produk & SKU</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Stok Awal</th>
                <th className="py-3 px-4 text-right">Total Masuk</th>
                <th className="py-3 px-4 text-right">Total Keluar</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer bg-slate-100/50"
                  onClick={() => handleSort('currentStock')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-bold text-slate-900">Stok Gudang Fisik</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer"
                  onClick={() => handleSort('minStock')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Ambang Min</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Status Persediaan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                        <Package className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        Inventaris Gudang Kosong / Bersih
                      </h3>
                      <p className="text-xs text-slate-500">
                        Seluruh data simulasi telah berhasil dihapus. Database kini bersih dan <strong>tidak akan kembali saat halaman web di-refresh</strong>. Silakan mulai input data gudang riil Anda.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                        <button
                          onClick={onGoToUploadMasuk}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File Excel Masuk</span>
                        </button>
                        <button
                          onClick={downloadTemplateBarangMasuk}
                          className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Download Template</span>
                        </button>
                        <button
                          onClick={onOpenAddProduct}
                          className="px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          + Tambah Produk Manual
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <div>Tidak ada produk yang cocok dengan kriteria pencarian/filter.</div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const isZero = p.currentStock <= 0;
                  const isLow = !isZero && p.currentStock <= p.minStock;

                  return (
                    <tr
                      key={`${p.id}-${idx}`}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isZero ? 'bg-rose-50/30' : isLow ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600 font-medium">{p.category}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {p.initialStock} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-medium">
                        +{p.totalIncoming}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700 font-medium">
                        -{p.totalOutgoing}
                      </td>
                      <td className="py-3 px-4 text-right bg-slate-50/50">
                        <div
                          className={`font-mono text-sm font-bold ${
                            isZero
                              ? 'text-rose-700'
                              : isLow
                              ? 'text-amber-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {p.currentStock}{' '}
                          <span className="text-[11px] font-normal text-slate-500">{p.unit}</span>
                        </div>
                      </td>

                      {/* Ambang Batas Minimum (Inline Editable) */}
                      <td className="py-3 px-4 text-right font-mono">
                        {editingMinStockId === p.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              value={tempMinStockVal}
                              onChange={(e) => setTempMinStockVal(parseInt(e.target.value) || 0)}
                              className="w-16 px-1.5 py-0.5 text-xs border border-indigo-400 rounded-md text-right font-mono"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveMinStock(p.id)}
                              className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-600 text-white rounded-md"
                            >
                              Simpan
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingMinStockId(p.id);
                              setTempMinStockVal(p.minStock);
                            }}
                            className="group cursor-pointer inline-flex items-center justify-end gap-1 text-slate-700 hover:text-indigo-600"
                            title="Klik untuk ubah batas minimum"
                          >
                            <span>{p.minStock}</span>
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* Status Persediaan */}
                      <td className="py-3 px-4">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Habis</span>
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-amber-100 text-amber-900">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Menipis</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-medium bg-emerald-50 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Aman</span>
                          </span>
                        )}
                      </td>

                      {/* Aksi Cepat */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenAdjustStock(p)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                            title="Penyesuaian stok fisik / stock opname"
                          >
                            Sesuaikan
                          </button>
                          {(isZero || isLow) && (
                            <button
                              onClick={onGoToUploadMasuk}
                              className="px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                              title="Restock barang masuk"
                            >
                              Restock
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm(`Hapus produk "${p.name}" dari inventaris gudang?`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                            title={`Hapus ${p.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
