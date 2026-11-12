import React, { useState, useMemo } from 'react';
import {
  History,
  Download,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { StockMovement } from '../types/inventory';
import { exportMovementsToExcel } from '../utils/excelParser';

interface MutationHistoryViewProps {
  movements: StockMovement[];
  onGoToUploadMasuk: () => void;
  onGoToUploadPenjualan: () => void;
}

export const MutationHistoryView: React.FC<MutationHistoryViewProps> = ({
  movements,
  onGoToUploadMasuk,
  onGoToUploadPenjualan,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'masuk' | 'keluar' | 'penyesuaian'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Available years from movements
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    movements.forEach((m) => {
      if (m.year) set.add(String(m.year));
      else if (m.date) set.add(m.date.split('-')[0]);
    });
    return Array.from(set).sort().reverse();
  }, [movements]);

  // Aggregate stats
  const totalInflow = useMemo(
    () => movements.filter((m) => m.type === 'masuk').reduce((acc, m) => acc + m.quantity, 0),
    [movements]
  );
  const totalOutflow = useMemo(
    () => movements.filter((m) => m.type === 'keluar').reduce((acc, m) => acc + m.quantity, 0),
    [movements]
  );

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Type
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;

      // Year
      if (selectedYear !== 'all') {
        const itemYear = m.year ? String(m.year) : m.date.split('-')[0];
        if (itemYear !== selectedYear) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.productName.toLowerCase().includes(q);
        const matchFile = m.sourceFileName?.toLowerCase().includes(q) || false;
        const matchNotes = m.notes?.toLowerCase().includes(q) || false;
        if (!matchName && !matchFile && !matchNotes) return false;
      }

      return true;
    });
  }, [movements, typeFilter, selectedYear, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Buku Mutasi & Arus Barang Keluar-Masuk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Riwayat kronologis real-time dari setiap upload permintaan barang masuk dan pemotongan penjualan.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            onClick={() => exportMovementsToExcel(movements)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor Mutasi (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Arus Masuk (Penambahan)
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              +{totalInflow.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-slate-500">pcs</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Arus Keluar (Penjualan)
            </div>
            <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
              -{totalOutflow.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-slate-500">pcs</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Catatan Transaksi
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {movements.length} <span className="text-xs font-normal text-slate-500">entri</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama produk, nama file upload, atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white text-slate-900"
            />
          </div>

          {/* Year selector */}
          {availableYears.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium font-mono"
              >
                <option value="all">Semua Tahun</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Movement Type Segmented Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Semua Mutasi ({movements.length})
          </button>
          <button
            onClick={() => setTypeFilter('masuk')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              typeFilter === 'masuk'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 hover:bg-emerald-100 bg-emerald-50'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Barang Masuk (+)</span>
          </button>
          <button
            onClick={() => setTypeFilter('keluar')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              typeFilter === 'keluar'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-800 hover:bg-rose-100 bg-rose-50'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Barang Keluar / Penjualan (-)</span>
          </button>
          <button
            onClick={() => setTypeFilter('penyesuaian')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              typeFilter === 'penyesuaian'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-800 hover:bg-indigo-100 bg-indigo-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Penyesuaian Manual</span>
          </button>
        </div>
      </div>

      {/* Movement Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4 w-12">No</th>
                <th className="py-3 px-4">Tanggal Transaksi</th>
                <th className="py-3 px-4">Jenis Arus</th>
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4 text-right">Perubahan Kuantitas</th>
                <th className="py-3 px-4 text-right">Stok Sebelum</th>
                <th className="py-3 px-4 text-right">Stok Sesudah</th>
                <th className="py-3 px-4">Sumber Dokumen / File</th>
                <th className="py-3 px-4">Catatan / Tahun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <div>Tidak ada riwayat mutasi yang cocok.</div>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m, idx) => {
                  const isIncoming = m.type === 'masuk';
                  const isOutgoing = m.type === 'keluar';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium text-slate-900">{m.date}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(m.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isIncoming ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                            <span>Masuk</span>
                          </span>
                        ) : isOutgoing ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-rose-50 text-rose-800">
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                            <span>Keluar (Jual)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-indigo-50 text-indigo-800">
                            <SlidersHorizontal className="w-3 h-3 text-indigo-600" />
                            <span>Penyesuaian</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{m.productName}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                        <span className={isIncoming ? 'text-emerald-700' : 'text-rose-700'}>
                          {isIncoming ? '+' : '-'}
                          {m.quantity.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {m.stockBefore.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {m.stockAfter.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {m.sourceFileName ? (
                          <span className="flex items-center gap-1 text-slate-700" title={m.sourceFileName}>
                            <FileSpreadsheet className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[180px]">{m.sourceFileName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Input Manual</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        <div>{m.notes || '-'}</div>
                        {m.year && (
                          <span className="font-mono text-[10px] text-slate-400">Periode: {m.year}</span>
                        )}
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
