import React from 'react';
import {
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  History,
  TrendingDown,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Product, StockMovement, UploadBatch } from '../types/inventory';
import { downloadTemplateBarangMasuk, downloadTemplateDataPenjualan } from '../utils/excelParser';

interface DashboardViewProps {
  products: Product[];
  movements: StockMovement[];
  batches: UploadBatch[];
  onNavigate: (tab: 'inventaris' | 'upload_masuk' | 'upload_penjualan' | 'mutasi') => void;
  onFilterLowStock: () => void;
  onOpenAddProduct: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  movements,
  batches,
  onNavigate,
  onFilterLowStock,
  onOpenAddProduct,
}) => {
  const totalUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalInflow = products.reduce((acc, p) => acc + p.totalIncoming, 0);
  const totalOutflow = products.reduce((acc, p) => acc + p.totalOutgoing, 0);

  const depletedProducts = products.filter((p) => p.currentStock <= 0);
  const lowStockProducts = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock);
  const urgentCount = depletedProducts.length + lowStockProducts.length;

  // Top 5 Fast Moving Products (highest total outgoing)
  const topSelling = [...products].sort((a, b) => b.totalOutgoing - a.totalOutgoing).slice(0, 5);

  // Category distribution
  const categoryStats = products.reduce((acc: Record<string, { count: number; units: number }>, p) => {
    const cat = p.category || 'Umum';
    if (!acc[cat]) acc[cat] = { count: 0, units: 0 };
    acc[cat].count += 1;
    acc[cat].units += p.currentStock;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Sistem Otomasi Gudang</span>
            <span>·</span>
            <span>Update Real-Time Excel</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Dasbor Pemantauan Arus & Inventaris Gudang
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Pantau saldo stok fisik secara real-time, upload permintaan barang masuk, dan sinkronkan data penjualan.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => onNavigate('upload_masuk')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Upload Barang Masuk</span>
          </button>

          <button
            onClick={() => onNavigate('upload_penjualan')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Upload Data Penjualan</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Physical Stock */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Stok Gudang Keseluruhan</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900">
              {totalUnits.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-slate-500">pcs</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Tersebar di</span>
              <strong className="text-slate-800 font-mono">{products.length}</strong>
              <span>jenis produk SKU</span>
            </div>
          </div>
        </div>

        {/* Total Inflow */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Arus Masuk (Restock)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-700">
              +{totalInflow.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-slate-500">pcs</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Penambahan kumulatif dari berkas upload
            </div>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Arus Keluar (Penjualan)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-rose-700">
              -{totalOutflow.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-slate-500">pcs</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Dipotong langsung secara real-time
            </div>
          </div>
        </div>

        {/* Urgent Low Stock Alert Card */}
        <div
          onClick={onFilterLowStock}
          className={`p-5 rounded-xl border shadow-xs cursor-pointer transition-all ${
            urgentCount > 0
              ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-950">Peringatan Stok Minimum</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                urgentCount > 0 ? 'bg-amber-200/80 text-amber-800' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-amber-900">
              {urgentCount}{' '}
              <span className="text-xs font-normal text-amber-800">
                ({depletedProducts.length} Habis, {lowStockProducts.length} Menipis)
              </span>
            </div>
            <div className="text-xs text-amber-800/80 mt-1 font-medium">
              {urgentCount > 0 ? 'Klik untuk review & jadwalkan restock →' : 'Persediaan stok saat ini stabil'}
            </div>
          </div>
        </div>
      </div>

      {/* Clean Warehouse Banner when products.length === 0 */}
      {products.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-indigo-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Gudang Bersih & Siap Digunakan</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Data simulasi telah dihapus permanen. Database tidak akan memuat kembali data contoh saat halaman web di-refresh. Silakan mulai kelola inventaris gudang riil Anda.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            <button
              onClick={() => onNavigate('upload_masuk')}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Upload File Excel Barang Masuk</span>
            </button>
            <button
              onClick={downloadTemplateBarangMasuk}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Template Excel</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Critical Stock Alerts + Fast-Moving Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Urgent Stock Action List */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Daftar Produk Mencapai Ambang Batas Minimum
              </h3>
            </div>
            <button
              onClick={onFilterLowStock}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Lihat di Tabel Inventaris →
            </button>
          </div>

          {urgentCount === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <div>Kondisi aman! Tidak ada stok yang berada di bawah ambang batas minimum saat ini.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {[...depletedProducts, ...lowStockProducts].map((p) => {
                const isZero = p.currentStock <= 0;
                const deficit = p.minStock - p.currentStock;

                return (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {isZero ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded-sm">
                            Habis Total
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-sm">
                            Menipis
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>SKU: {p.sku}</span>
                        <span>·</span>
                        <span>Kategori: {p.category}</span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-4">
                      <div>
                        <div className="font-mono font-bold text-slate-900">
                          {p.currentStock} {p.unit}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Min: {p.minStock} (Kurang {deficit})
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigate('upload_masuk')}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors shrink-0"
                      >
                        Restock
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Fast Moving Products (Barang Paling Laris Keluar) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Produk Fast-Moving (Penjualan Terbanyak)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Arus Keluar</span>
          </div>

          <div className="space-y-3">
            {topSelling.map((p, idx) => {
              const maxOutgoing = topSelling[0]?.totalOutgoing || 1;
              const percentage = Math.round((p.totalOutgoing / maxOutgoing) * 100);

              return (
                <div key={p.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 truncate max-w-[200px]">
                      {idx + 1}. {p.name}
                    </span>
                    <span className="font-mono text-rose-700 font-semibold">
                      {p.totalOutgoing} pcs terjual
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Sisa Stok: {p.currentStock} {p.unit}</span>
                    <span>Min: {p.minStock}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Upload Batches Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Riwayat Berkas Upload Excel Terakhir & Tanggal Sistem
            </h3>
          </div>
          <button
            onClick={() => onNavigate('mutasi')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Buku Mutasi Lengkap →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Tanggal Upload Sistem</th>
                <th className="py-2.5 px-3">Nama Berkas Excel</th>
                <th className="py-2.5 px-3">Tipe Unggahan</th>
                <th className="py-2.5 px-3 text-right">Total Item Produk</th>
                <th className="py-2.5 px-3 text-right">Total Kuantitas</th>
                <th className="py-2.5 px-3">Status Sinkronisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((batch) => {
                const isIncoming = batch.type === 'barang_masuk';

                return (
                  <tr key={batch.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                      {batch.uploadDate}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{batch.fileName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {isIncoming ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm">
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          <span>Permintaan Barang Masuk</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded-sm">
                          <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          <span>Data Penjualan (Keluar)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {batch.totalItems} baris
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={isIncoming ? 'text-emerald-700' : 'text-rose-700'}>
                        {isIncoming ? '+' : '-'}
                        {batch.totalQuantity.toLocaleString('id-ID')} pcs
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Inventaris Diperbarui</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
