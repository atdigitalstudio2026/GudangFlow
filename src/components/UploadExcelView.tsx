import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  Download,
  Info,
  RefreshCw,
  XCircle,
  FileText,
  Tag,
  Hash,
} from 'lucide-react';
import { Product, UploadBatch } from '../types/inventory';
import {
  parseExcelFile,
  ParseResult,
  downloadTemplateBarangMasuk,
  downloadTemplateDataPenjualan,
} from '../utils/excelParser';
import { applyIncomingGoodsBatch, applySalesDataBatch } from '../utils/storage';

interface UploadExcelViewProps {
  mode: 'barang_masuk' | 'data_penjualan';
  setMode: (mode: 'barang_masuk' | 'data_penjualan') => void;
  products: Product[];
  onDataUpdated: () => void;
  onGoToInventory: () => void;
}

export const UploadExcelView: React.FC<UploadExcelViewProps> = ({
  mode,
  setMode,
  products,
  onDataUpdated,
  onGoToInventory,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Form controls
  const todayStr = new Date().toISOString().split('T')[0];
  const [uploadDate, setUploadDate] = useState<string>(todayStr);
  const [salesYear, setSalesYear] = useState<string>(new Date().getFullYear().toString());
  const [batchNotes, setBatchNotes] = useState<string>('');

  // Result state
  const [processedBatch, setProcessedBatch] = useState<UploadBatch | null>(null);

  // Handle file selection and parsing
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParseResult(null);
    setProcessedBatch(null);
    setIsLoading(true);

    try {
      const result = await parseExcelFile(file);
      if (result.rows.length === 0) {
        setParseError('File tidak berisi data baris transaksi setelah header.');
      } else {
        setParseResult(result);
        // Automatically sync year and upload date if detected in the document
        const firstWithYear = result.rows.find((r) => r.year);
        if (firstWithYear && firstWithYear.year) {
          setSalesYear(String(firstWithYear.year));
        }
        const firstWithDate = result.rows.find((r) => r.dateOrYear);
        if (firstWithDate && firstWithDate.dateOrYear) {
          setUploadDate(firstWithDate.dateOrYear);
        }
      }
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Gagal memproses file Excel.');
    } finally {
      setIsLoading(false);
    }
  };

  // One-click demo loader for user's attached file
  const handleLoadSampleRekapSO = async () => {
    setIsLoading(true);
    setParseError(null);
    setProcessedBatch(null);
    try {
      const res = await fetch('/assets/aistudio/Rekap_SO_2021_Per_Hari_bd60ddaa.csv');
      if (!res.ok) {
        throw new Error('Gagal mengambil file contoh Rekap SO 2021.');
      }
      const blob = await res.blob();
      const sampleFile = new File([blob], 'Rekap_SO_2021_Per_Hari.csv', { type: 'text/csv' });
      setSelectedFile(sampleFile);
      const result = await parseExcelFile(sampleFile);
      setParseResult(result);

      if (result.rows.length > 0 && result.rows[0].year) {
        setSalesYear(String(result.rows[0].year));
      }
      if (result.rows.length > 0 && result.rows[0].dateOrYear) {
        setUploadDate(result.rows[0].dateOrYear);
      }
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Gagal memuat file contoh.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Re-map column manually if desired
  const handleColumnChange = (field: 'productNameCol' | 'quantityCol' | 'documentNoCol', colName: string) => {
    if (!parseResult) return;
    const newMapped = { ...parseResult.mappedColumns, [field]: colName };
    // Re-evaluate rows
    const updatedRows = parseResult.rows.map((row) => {
      const rawName = newMapped.productNameCol ? String(row.raw[newMapped.productNameCol] || '').trim() : '';
      const rawQty = newMapped.quantityCol ? row.raw[newMapped.quantityCol] : '';
      const rawDoc = newMapped.documentNoCol ? String(row.raw[newMapped.documentNoCol] || '').trim() : undefined;
      const parsedQty = typeof rawQty === 'number' ? rawQty : parseFloat(String(rawQty).replace(/,/g, ''));
      let isValid = true;
      let validationError: string | undefined = undefined;

      if (!rawName) {
        isValid = false;
        validationError = 'Nama produk tidak boleh kosong';
      } else if (isNaN(parsedQty) || parsedQty <= 0) {
        isValid = false;
        validationError = `Jumlah tidak valid ("${rawQty}")`;
      }

      return {
        ...row,
        productName: rawName,
        quantity: isNaN(parsedQty) ? 0 : Math.round(parsedQty),
        documentNo: rawDoc,
        isValid,
        validationError,
      };
    });

    setParseResult({
      ...parseResult,
      mappedColumns: newMapped,
      rows: updatedRows,
      totalValid: updatedRows.filter((r) => r.isValid).length,
      totalInvalid: updatedRows.filter((r) => !r.isValid).length,
    });
  };

  // Execute processing & update warehouse inventory
  const handleProcessUpload = () => {
    if (!parseResult || !selectedFile || parseResult.totalValid === 0) return;

    if (mode === 'barang_masuk') {
      const result = applyIncomingGoodsBatch({
        rows: parseResult.rows,
        fileName: selectedFile.name,
        uploadDate,
        notes: batchNotes || `Upload Permintaan Barang (${uploadDate})`,
      });

      setProcessedBatch(result.newBatch);
      onDataUpdated();
    } else {
      const result = applySalesDataBatch({
        rows: parseResult.rows,
        fileName: selectedFile.name,
        uploadDate,
        salesYear,
        notes: batchNotes || `Upload Data Penjualan Tahun ${salesYear}`,
      });

      setProcessedBatch(result.newBatch);
      onDataUpdated();
    }
  };

  const handleResetForm = () => {
    setSelectedFile(null);
    setParseResult(null);
    setParseError(null);
    setProcessedBatch(null);
    setBatchNotes('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Pre-calculate projection for each row
  const productLookup = new Map<string, Product>();
  products.forEach((p) => productLookup.set(p.name.trim().toLowerCase(), p));

  const hasDocNo = parseResult?.rows.some((r) => !!r.documentNo);
  const hasRowDate = parseResult?.rows.some((r) => !!r.dateOrYear);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header and Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {mode === 'barang_masuk'
              ? 'Upload Permintaan Barang (Barang Masuk)'
              : 'Upload Data Penjualan (Barang Keluar)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {mode === 'barang_masuk'
              ? 'Sistem otomatis memperbarui dan menambah stok gudang keseluruhan berdasarkan file excel yang diunggah.'
              : 'Sistem otomatis memotong stok gudang secara real-time dan memicu notifikasi jika stok menipis/habis.'}
          </p>
        </div>

        {/* Segmented Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto shrink-0 border border-slate-200">
          <button
            onClick={() => {
              setMode('barang_masuk');
              handleResetForm();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              mode === 'barang_masuk'
                ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Barang Masuk (Penambahan)</span>
          </button>
          <button
            onClick={() => {
              setMode('data_penjualan');
              handleResetForm();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              mode === 'data_penjualan'
                ? 'bg-white text-rose-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            <span>Data Penjualan (Potong Stok)</span>
          </button>
        </div>
      </div>

      {/* Success Modal / Recap Screen */}
      {processedBatch && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {mode === 'barang_masuk'
                    ? 'Inventaris Gudang Berhasil Ditambahkan!'
                    : 'Stok Gudang Berhasil Dipotong Real-Time!'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  File: <strong className="text-slate-800">{processedBatch.fileName}</strong> · Tanggal Catat:{' '}
                  <strong className="text-slate-800">{processedBatch.uploadDate}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetForm}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              >
                Upload File Lain
              </button>
              <button
                onClick={onGoToInventory}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <span>Lihat Inventaris Gudang</span>
                <Layers className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metric Recap Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Total Baris Diproses</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {processedBatch.totalItems} <span className="text-xs font-normal text-slate-500">transaksi</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">
                {mode === 'barang_masuk' ? 'Total Kuantitas Masuk' : 'Total Kuantitas Terjual'}
              </div>
              <div
                className={`text-lg font-bold font-mono mt-0.5 ${
                  mode === 'barang_masuk' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {mode === 'barang_masuk' ? '+' : '-'}
                {processedBatch.totalQuantity.toLocaleString('id-ID')}{' '}
                <span className="text-xs font-normal text-slate-500">Pcs</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Produk Terpengaruh</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {processedBatch.affectedProductsCount}{' '}
                <span className="text-xs font-normal text-slate-500">produk</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Peringatan Stok Menipis</div>
              <div
                className={`text-lg font-bold font-mono mt-0.5 ${
                  processedBatch.lowStockTriggeredCount > 0 ? 'text-amber-700 font-semibold' : 'text-slate-600'
                }`}
              >
                {processedBatch.lowStockTriggeredCount}{' '}
                <span className="text-xs font-normal text-slate-500">peringatan</span>
              </div>
            </div>
          </div>

          {/* Details list */}
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <div className="bg-slate-100 px-3 py-2 font-semibold text-slate-700 border-b border-slate-200 flex justify-between">
              <span>Hasil Pembaruan Per Baris</span>
              <span className="text-[11px] text-slate-500 font-normal">Real-Time Sync Selesai</span>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {processedBatch.items.map((item, idx) => (
                <div key={idx} className="px-3 py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 w-5">{idx + 1}.</span>
                    <span className="font-medium text-slate-900">{item.productName}</span>
                    {item.yearOrDate && (
                      <span className="text-[10px] text-slate-500 font-mono">({item.yearOrDate})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono font-semibold ${
                        mode === 'barang_masuk' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {mode === 'barang_masuk' ? '+' : '-'}
                      {item.quantity} Pcs
                    </span>
                    <span className="text-slate-500 text-[11px]">{item.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Upload & Parameters Grid */}
      {!processedBatch && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Metadata & System Upload Date Parameters */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Pengaturan Tanggal & Sistem</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Wajib Diisi</span>
              </div>

              {/* System Upload Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Upload Sistem <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-mono text-slate-900"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dicatat otomatis pada buku mutasi arus gudang sebagai tanggal fisik transaksi.
                </p>
              </div>

              {/* Year Selector if sales upload */}
              {mode === 'data_penjualan' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun Penjualan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={salesYear}
                    onChange={(e) => setSalesYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-mono text-slate-900"
                  >
                    <option value="2026">2026 (Tahun Berjalan)</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021 (Format Rekap SO Per Hari)</option>
                    <option value="2020">2020</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Digunakan untuk pengelompokan analisis tren mutasi tahunan.
                  </p>
                </div>
              )}

              {/* Batch Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Nomor Dokumen (Opsional)
                </label>
                <input
                  type="text"
                  placeholder={
                    mode === 'barang_masuk'
                      ? 'Contoh: PO-2026/XI/001 - Suplai Pusat'
                      : 'Contoh: Rekap SO Penjualan 2021'
                  }
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Format Requirements Info */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dukungan Format File Fleksibel:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                  <li>
                    <strong>Format Rekap SO Per Hari:</strong> Kolom <span className="font-mono text-slate-800">No SO</span>, <span className="font-mono text-slate-800">Nama Barang</span>, <span className="font-mono text-slate-800">Qty</span>. Baris pemisah <span className="font-mono text-slate-800">Tanggal: DD-MM-YYYY</span> dan baris <span className="font-mono text-slate-800">Subtotal/Grand Total</span> diproses otomatis tanpa duplikasi.
                  </li>
                  <li>
                    <strong>Format Tabel Standar:</strong> Kolom <span className="font-mono text-slate-800">Nama Produk</span> dan <span className="font-mono text-slate-800">Jumlah</span>.
                  </li>
                  <li>
                    Satuan barang gudang dihitung dalam <strong className="text-slate-800">Pcs</strong>.
                  </li>
                </ul>
              </div>

              {/* Quick sample loading & Template Buttons */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={handleLoadSampleRekapSO}
                  className="w-full py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Coba File Rekap SO 2021 (83 Transaksi)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'barang_masuk') {
                      downloadTemplateBarangMasuk();
                    } else {
                      downloadTemplateDataPenjualan();
                    }
                  }}
                  className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Unduh Format Template Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: File Dropzone & Live Simulation Preview */}
          <div className="lg:col-span-8 space-y-4">
            {/* File Drag-and-Drop Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all bg-white ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div className="flex flex-col items-center justify-center space-y-3">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    mode === 'barang_masuk'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  <Upload className="w-7 h-7" />
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {selectedFile
                      ? `File Terpilih: ${selectedFile.name}`
                      : `Tarik & Jatuhkan File Excel / CSV ${
                          mode === 'barang_masuk' ? 'Permintaan Barang' : 'Data Penjualan'
                        } di Sini`}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Mendukung format spreadsheet <strong className="text-slate-700">.xlsx, .xls, dan .csv</strong> (termasuk format Rekap SO Per Hari)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
                  >
                    Pilih File dari Komputer
                  </button>

                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {parseError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Terjadi Kesalahan Pembacaan File</div>
                  <div>{parseError}</div>
                  <div className="mt-1 text-slate-500">
                    Tips: Pastikan baris header memuat kolom Nama Produk / Barang dan Jumlah / Qty.
                  </div>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                <div className="text-xs font-medium text-slate-600">
                  Menganalisis baris spreadsheet, memvalidasi seksi tanggal dan kuantitas...
                </div>
              </div>
            )}

            {/* Live Parsing Preview & Column Mapping Check */}
            {parseResult && !isLoading && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
                {/* Header & Column Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Simulasi & Preview Data ({parseResult.rows.length} Baris Valid Terbaca)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Total Kuantitas: <strong className="text-slate-900 font-mono">{parseResult.grandTotalQuantity?.toLocaleString('id-ID')} Pcs</strong>
                      {parseResult.detectedDates && parseResult.detectedDates.length > 0 && (
                        <span> · Terbagi dalam <strong>{parseResult.detectedDates.length} seksi tanggal</strong></span>
                      )}
                    </p>
                  </div>

                  {/* Column mapping overrides */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Mapping Kolom:</span>
                    <select
                      value={parseResult.mappedColumns.productNameCol || ''}
                      onChange={(e) => handleColumnChange('productNameCol', e.target.value)}
                      className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-white font-medium text-slate-700"
                      title="Kolom Nama Produk / Barang"
                    >
                      {parseResult.headers.map((h) => (
                        <option key={h} value={h}>
                          Produk: {h}
                        </option>
                      ))}
                    </select>

                    <select
                      value={parseResult.mappedColumns.quantityCol || ''}
                      onChange={(e) => handleColumnChange('quantityCol', e.target.value)}
                      className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-white font-medium text-slate-700"
                      title="Kolom Qty / Jumlah"
                    >
                      {parseResult.headers.map((h) => (
                        <option key={h} value={h}>
                          Qty: {h}
                        </option>
                      ))}
                    </select>

                    {parseResult.mappedColumns.documentNoCol && (
                      <select
                        value={parseResult.mappedColumns.documentNoCol || ''}
                        onChange={(e) => handleColumnChange('documentNoCol', e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-white font-medium text-slate-700"
                        title="Kolom No Dokumen / SO"
                      >
                        {parseResult.headers.map((h) => (
                          <option key={h} value={h}>
                            Dok: {h}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Hierarchical Section Banner if detected */}
                {parseResult.detectedDates && parseResult.detectedDates.length > 0 && (
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>
                        Format Laporan Multi-Tanggal Terdeteksi: <strong>{parseResult.detectedDates.length} seksi tanggal</strong> ({parseResult.detectedDates[0]} s/d {parseResult.detectedDates[parseResult.detectedDates.length - 1]}). Baris <em>Subtotal</em> dan <em>GRAND TOTAL</em> diabaikan otomatis sehingga stok tidak terhitung dobel.
                      </span>
                    </div>
                  </div>
                )}

                {/* Simulation Table */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[460px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10">No</th>
                        {hasRowDate && <th className="py-2.5 px-3 w-28">Tanggal SO</th>}
                        {hasDocNo && <th className="py-2.5 px-3 w-40">No SO / Dokumen</th>}
                        <th className="py-2.5 px-3">Nama Produk (Excel)</th>
                        <th className="py-2.5 px-3 text-right">
                          {mode === 'barang_masuk' ? 'Jumlah Masuk' : 'Jumlah Keluar'}
                        </th>
                        <th className="py-2.5 px-3 text-right">Stok Fisik Saat Ini</th>
                        <th className="py-2.5 px-3 text-right">Estimasi Stok Akhir</th>
                        <th className="py-2.5 px-3">Status Notifikasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.rows.map((row, idx) => {
                        const existingProd = productLookup.get(row.productName.trim().toLowerCase());
                        const currentStock = existingProd ? existingProd.currentStock : 0;
                        const minStock = existingProd ? existingProd.minStock : (row.minStock || 10);
                        const qty = row.quantity;
                        const projectedStock = mode === 'barang_masuk' ? currentStock + qty : currentStock - qty;

                        // Evaluation
                        let statusTag: React.ReactNode = null;
                        if (!row.isValid) {
                          statusTag = (
                            <span className="text-rose-600 font-medium">⚠️ {row.validationError}</span>
                          );
                        } else if (mode === 'barang_masuk') {
                          if (!existingProd) {
                            statusTag = (
                              <span className="text-indigo-600 font-medium">
                                Produk Baru (Didaftarkan otomatis)
                              </span>
                            );
                          } else if (currentStock <= minStock && projectedStock > minStock) {
                            statusTag = (
                              <span className="text-emerald-600 font-medium">
                                Memulihkan Stok (Kembali Aman)
                              </span>
                            );
                          } else {
                            statusTag = (
                              <span className="text-slate-600">
                                Penambahan Stok Gudang (+{qty})
                              </span>
                            );
                          }
                        } else {
                          // Sales mode (Barang Keluar)
                          if (!existingProd) {
                            statusTag = (
                              <span className="text-amber-700 font-medium">
                                Belum ada di gudang (Stok minus {projectedStock})
                              </span>
                            );
                          } else if (projectedStock <= 0) {
                            statusTag = (
                              <span className="text-rose-700 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Peringatan: Stok Habis Total!</span>
                              </span>
                            );
                          } else if (projectedStock <= minStock) {
                            statusTag = (
                              <span className="text-amber-700 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Peringatan: Stok Menipis (&le; {minStock})</span>
                              </span>
                            );
                          } else {
                            statusTag = (
                              <span className="text-emerald-700">
                                Stok Aman (Sisa {projectedStock})
                              </span>
                            );
                          }
                        }

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              !row.isValid
                                ? 'bg-rose-50/40'
                                : projectedStock <= 0 && mode === 'data_penjualan'
                                ? 'bg-rose-50/30'
                                : projectedStock <= minStock && mode === 'data_penjualan'
                                ? 'bg-amber-50/30'
                                : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                            {hasRowDate && (
                              <td className="py-2 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                {row.dateOrYear || '-'}
                              </td>
                            )}
                            {hasDocNo && (
                              <td className="py-2 px-3 font-mono text-slate-800 text-[11px] font-medium whitespace-nowrap">
                                {row.documentNo ? (
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    {row.documentNo}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                            )}
                            <td className="py-2 px-3 font-medium text-slate-900">
                              <div>{row.productName || <span className="text-slate-400">(Kosong)</span>}</div>
                              {row.category && (
                                <div className="text-[11px] text-slate-400">{row.category}</div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                              <span className={mode === 'barang_masuk' ? 'text-emerald-700' : 'text-rose-700'}>
                                {mode === 'barang_masuk' ? '+' : '-'}
                                {row.quantity} Pcs
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                              {existingProd ? `${currentStock} Pcs` : '0 (Baru)'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {projectedStock}{' '}
                              <span className="text-[11px] font-normal text-slate-500">
                                Pcs
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[11px]">{statusTag}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span>
                      Total Valid: <strong className="text-emerald-700 font-mono">{parseResult.totalValid}</strong> baris
                    </span>
                    <span>·</span>
                    <span>
                      Total Kuantitas: <strong className="text-slate-900 font-mono">{parseResult.grandTotalQuantity?.toLocaleString('id-ID')} Pcs</strong>
                    </span>
                    {parseResult.totalInvalid > 0 && (
                      <span className="text-rose-600">
                        ({parseResult.totalInvalid} baris tidak valid dilewati)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      onClick={handleProcessUpload}
                      disabled={parseResult.totalValid === 0}
                      className={`px-5 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-2 shadow-xs ${
                        mode === 'barang_masuk'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {mode === 'barang_masuk'
                          ? `Proses & Tambah Stok Masuk (${parseResult.totalValid} Item / ${parseResult.grandTotalQuantity?.toLocaleString('id-ID')} Pcs)`
                          : `Proses & Potong Stok Penjualan (${parseResult.totalValid} Item / ${parseResult.grandTotalQuantity?.toLocaleString('id-ID')} Pcs)`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
