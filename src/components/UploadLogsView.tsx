import React, { useState, useMemo } from 'react';
import {
  FileClock,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCcw,
} from 'lucide-react';
import { UploadBatch, StockMovement } from '../types/inventory';
import { deleteUploadBatch } from '../utils/storage';

interface UploadLogsViewProps {
  batches: UploadBatch[];
  movements: StockMovement[];
  onDataUpdated: () => void;
  onGoToUploadMasuk: () => void;
  onGoToUploadPenjualan: () => void;
}

export const UploadLogsView: React.FC<UploadLogsViewProps> = ({
  batches,
  movements,
  onDataUpdated,
  onGoToUploadMasuk,
  onGoToUploadPenjualan,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'barang_masuk' | 'data_penjualan'>('all');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState<UploadBatch | null>(null);
  const [rollbackNotice, setRollbackNotice] = useState<string | null>(null);

  const sortedBatches = useMemo(() => {
    return [...batches].sort(
      (a, b) =>
        new Date(b.uploadedAt || b.uploadDate).getTime() -
        new Date(a.uploadedAt || a.uploadDate).getTime()
    );
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return sortedBatches.filter((b) => {
      if (typeFilter !== 'all' && b.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchFile = b.fileName.toLowerCase().includes(q);
        const matchNotes = b.notes?.toLowerCase().includes(q) || false;
        const matchDate = b.uploadDate.toLowerCase().includes(q);
        const matchProduct = b.items.some((item) => item.productName.toLowerCase().includes(q));
        if (!matchFile && !matchNotes && !matchDate && !matchProduct) return false;
      }
      return true;
    });
  }, [sortedBatches, typeFilter, searchQuery]);

  const incomingBatches = batches.filter((b) => b.type === 'barang_masuk');
  const salesBatches = batches.filter((b) => b.type === 'data_penjualan');
  const incomingQty = incomingBatches.reduce((sum, b) => sum + b.totalQuantity, 0);
  const salesQty = salesBatches.reduce((sum, b) => sum + b.totalQuantity, 0);

  const handleConfirmDelete = () => {
    if (!confirmDeleteBatch) return;
    const res = deleteUploadBatch(confirmDeleteBatch.id);
    if (res.success && res.deletedBatch) {
      const actionLabel =
        res.deletedBatch.type === 'barang_masuk'
          ? `stok dikurangi kembali -${res.revertedQuantity.toLocaleString('id-ID')} Pcs`
          : `stok dikembalikan +${res.revertedQuantity.toLocaleString('id-ID')} Pcs`;
      setRollbackNotice(
        `Berhasil menghapus log "${res.deletedBatch.fileName}" (${res.revertedMovementsCount} baris mutasi dihapus, ${actionLabel} pada ${res.affectedProductsCount} produk).`
      );
      if (expandedBatchId === confirmDeleteBatch.id) {
        setExpandedBatchId(null);
      }
      onDataUpdated();
    }
    setConfirmDeleteBatch(null);
  };

  const getBatchMovementsCount = (batch: UploadBatch) => {
    const byId = movements.filter((m) => m.batchId === batch.id);
    if (byId.length > 0) return byId.length;
    return movements.filter((m) => !m.batchId && m.sourceFileName === batch.fileName).length;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Log & Riwayat Upload Excel
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Catatan historis setiap berkas Excel yang pernah diunggah. Jika terjadi salah upload, hapus log berkas tertentu untuk mengembalikan stok produk terkait secara otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={onGoToUploadMasuk}
            className="px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Upload Masuk</span>
          </button>
          <button
            onClick={onGoToUploadPenjualan}
            className="px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Upload Penjualan</span>
          </button>
        </div>
      </div>

      {/* Rollback Confirmation Banner */}
      {rollbackNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{rollbackNotice}</span>
          </div>
          <button
            onClick={() => setRollbackNotice(null)}
            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors"
            aria-label="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Total Berkas Upload</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {batches.length} <span className="text-xs font-normal text-slate-500">file</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <FileClock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Log Upload Barang Masuk</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
              {incomingBatches.length}{' '}
              <span className="text-xs font-normal text-slate-500">
                file (+{incomingQty.toLocaleString('id-ID')} Pcs)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Log Upload Penjualan</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-700 mt-1">
              {salesBatches.length}{' '}
              <span className="text-xs font-normal text-slate-500">
                file (-{salesQty.toLocaleString('id-ID')} Pcs)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama file Excel, tanggal upload, catatan, atau nama produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({batches.length})
          </button>
          <button
            onClick={() => setTypeFilter('barang_masuk')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              typeFilter === 'barang_masuk' ? 'bg-white text-emerald-800 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Barang Masuk ({incomingBatches.length})
          </button>
          <button
            onClick={() => setTypeFilter('data_penjualan')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              typeFilter === 'data_penjualan' ? 'bg-white text-rose-800 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Penjualan ({salesBatches.length})
          </button>
        </div>
      </div>

      {/* Upload Batch Log List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredBatches.length === 0 ? (
          <div className="py-14 px-4 text-center space-y-3">
            <FileClock className="w-9 h-9 mx-auto text-slate-300" />
            <div className="text-sm font-semibold text-slate-700">
              {batches.length === 0
                ? 'Belum ada riwayat upload Excel'
                : 'Tidak ada log upload yang cocok dengan pencarian'}
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Setiap file Excel barang masuk atau data penjualan yang Anda unggah akan tercatat lengkap di sini beserta opsi pembatalan (rollback) jika terjadi kesalahan input.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Waktu & Tanggal Upload</th>
                  <th className="py-3 px-4">Nama Berkas Excel</th>
                  <th className="py-3 px-4">Jenis Upload</th>
                  <th className="py-3 px-4 text-right">Baris / Produk</th>
                  <th className="py-3 px-4 text-right">Total Kuantitas</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.map((batch, bIdx) => {
                  const isIncoming = batch.type === 'barang_masuk';
                  const isExpanded = expandedBatchId === batch.id;
                  const linkedMovCount = getBatchMovementsCount(batch);

                  return (
                    <React.Fragment key={`${batch.id}-${bIdx}`}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-semibold text-slate-900 tabular-nums">
                            {batch.uploadDate}
                          </div>
                          {batch.uploadedAt && (
                            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                              {new Date(batch.uploadedAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[260px]" title={batch.fileName}>
                              {batch.fileName}
                            </span>
                          </div>
                          {batch.notes && (
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[280px]">
                              {batch.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {isIncoming ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              <span>Barang Masuk (+)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-rose-50 text-rose-800">
                              <ArrowUpRight className="w-3 h-3 text-rose-600" />
                              <span>Data Penjualan (-)</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          <div>{batch.totalItems} baris</div>
                          <div className="text-[11px] text-slate-400">
                            {batch.affectedProductsCount} produk
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                          <span className={isIncoming ? 'text-emerald-700' : 'text-rose-700'}>
                            {isIncoming ? '+' : '-'}
                            {batch.totalQuantity.toLocaleString('id-ID')} Pcs
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                setExpandedBatchId(isExpanded ? null : batch.id)
                              }
                              className="px-2.5 py-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors inline-flex items-center gap-1"
                            >
                              <span>Rincian</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => setConfirmDeleteBatch(batch)}
                              className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors inline-flex items-center gap-1"
                              title="Hapus data upload ini & kembalikan stok produk terkait"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus Upload</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Itemized Breakdown */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/80 px-6 py-4 border-t border-slate-100">
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-700">
                                  Daftar Produk dalam Berkas "{batch.fileName}"
                                </span>
                                <span className="font-mono tabular-nums">
                                  {linkedMovCount} catatan mutasi aktif di buku arus
                                </span>
                              </div>

                              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                      <th className="py-2 px-3 w-10">No</th>
                                      <th className="py-2 px-3">Nama Produk</th>
                                      <th className="py-2 px-3">Tanggal / Dokumen</th>
                                      <th className="py-2 px-3 text-right">Kuantitas (Pcs)</th>
                                      <th className="py-2 px-3">Keterangan Sistem</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {batch.items.map((item, iIdx) => (
                                      <tr key={`${batch.id}-item-${iIdx}`}>
                                        <td className="py-1.5 px-3 font-mono text-slate-400">
                                          {iIdx + 1}
                                        </td>
                                        <td className="py-1.5 px-3 font-medium text-slate-900">
                                          {item.productName}
                                        </td>
                                        <td className="py-1.5 px-3 font-mono text-slate-500">
                                          {item.yearOrDate || batch.uploadDate}
                                        </td>
                                        <td
                                          className={`py-1.5 px-3 text-right font-mono tabular-nums font-semibold ${
                                            isIncoming ? 'text-emerald-700' : 'text-rose-700'
                                          }`}
                                        >
                                          {isIncoming ? '+' : '-'}
                                          {item.quantity.toLocaleString('id-ID')} Pcs
                                        </td>
                                        <td className="py-1.5 px-3 text-slate-500">
                                          {item.message || 'Diproses sistem'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Deleting Specific Upload Batch */}
      {confirmDeleteBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setConfirmDeleteBatch(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Hapus Log Upload & Kembalikan Stok?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hanya data dari unggahan berikut yang akan dihapus; riwayat upload lainnya tidak akan berubah:
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Nama File:</span>
                <span className="font-semibold text-slate-900 text-right truncate max-w-[230px]">
                  {confirmDeleteBatch.fileName}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Tanggal Upload:</span>
                <span className="font-mono text-slate-800">{confirmDeleteBatch.uploadDate}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Dampak Rollback Stok:</span>
                <span
                  className={`font-mono font-bold ${
                    confirmDeleteBatch.type === 'barang_masuk'
                      ? 'text-rose-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {confirmDeleteBatch.type === 'barang_masuk'
                    ? `-${confirmDeleteBatch.totalQuantity.toLocaleString('id-ID')} Pcs (Kurangi kembali)`
                    : `+${confirmDeleteBatch.totalQuantity.toLocaleString('id-ID')} Pcs (Kembalikan stok)`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteBatch(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ya, Hapus & Kembalikan Stok</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
