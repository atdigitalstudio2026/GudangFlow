import * as XLSX from 'xlsx';
import { Product, StockMovement } from '../types/inventory';

export interface ParsedExcelRow {
  raw: Record<string, any>;
  productName: string;
  quantity: number;
  sku?: string;
  category?: string;
  dateOrYear?: string; // Formatted date e.g. "08-01-2021" or "2021-01-08"
  year?: string | number; // e.g. 2021
  documentNo?: string; // e.g. "SO : 03078", "PO21090050", "SO : 0365 , SJ : 01829"
  minStock?: number;
  isValid: boolean;
  validationError?: string;
}

export interface ParseResult {
  headers: string[];
  mappedColumns: {
    productNameCol: string | null;
    quantityCol: string | null;
    documentNoCol: string | null;
    dateOrYearCol: string | null;
    categoryCol: string | null;
    minStockCol: string | null;
  };
  rows: ParsedExcelRow[];
  totalValid: number;
  totalInvalid: number;
  detectedDates?: string[];
  grandTotalQuantity?: number;
}

// Clean and normalize column header
function cleanHeader(header: string): string {
  return String(header || '')
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, ' ');
}

// Robust quantity parser handling commas, quotes, and unit suffixes
export function parseCleanQuantity(rawQty: any): number {
  if (typeof rawQty === 'number') return rawQty;
  if (rawQty === null || rawQty === undefined) return NaN;
  let str = String(rawQty).trim();
  if (!str) return NaN;

  // Clean surrounding quotes
  str = str.replace(/["']/g, '').trim();

  // Strip unit suffix if present (e.g. "12 pcs", "24 Pcs")
  str = str.replace(/\b(?:pcs|unit|buah|karton|sak|box|btg|pak|pack)\b/gi, '').trim();

  // Handle thousand separators vs decimals
  if (str.includes(',') && !str.includes('.')) {
    // If comma is followed by 3 digits (e.g. "3,582"), it's thousand separator
    if (/,\d{3}$/.test(str)) {
      str = str.replace(/,/g, '');
    } else {
      // European / ID style decimal (e.g. "12,5")
      str = str.replace(',', '.');
    }
  } else if (str.includes(',') && str.includes('.')) {
    if (str.indexOf(',') < str.indexOf('.')) {
      // US style 1,234.50
      str = str.replace(/,/g, '');
    } else {
      // European / ID style 1.234,50
      str = str.replace(/\./g, '').replace(',', '.');
    }
  }

  return parseFloat(str);
}

// Helper: Detect date section header (e.g. "Tanggal: 08-01-2021", "Tgl: 2021-01-08")
export function parseDateSection(cellValue: any): { formattedDate: string; isoDate: string; year: number } | null {
  if (!cellValue) return null;
  const str = String(cellValue).trim();
  const match = str.match(/^(?:tanggal|tgl|date)\s*[:=\-]?\s*([0-9]{1,4}[-/.\s][0-9]{1,2}[-/.\s][0-9]{1,4})/i);
  if (!match) return null;

  const rawDate = match[1].trim();
  const parts = rawDate.split(/[-/.\s]+/);
  if (parts.length === 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2];
    if (day.length === 4) {
      // Format YYYY-MM-DD
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    } else {
      // Format DD-MM-YYYY
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
      year = parts[2];
    }
    const numYear = parseInt(year, 10);
    return {
      formattedDate: `${day}-${month}-${year}`,
      isoDate: `${year}-${month}-${day}`,
      year: isNaN(numYear) ? new Date().getFullYear() : numYear,
    };
  }

  return {
    formattedDate: rawDate,
    isoDate: rawDate,
    year: new Date().getFullYear(),
  };
}

// Helper: Check if row is a Subtotal or Grand Total summary row that must be skipped to avoid double counting
export function isSummaryOrTotalRow(row: any[]): boolean {
  if (!Array.isArray(row)) return false;
  return row.some((cell) => {
    if (!cell) return false;
    const s = String(cell).trim().toLowerCase();
    return (
      s.startsWith('subtotal') ||
      s.includes('subtotal') ||
      s.includes('sub total') ||
      s.startsWith('grand total') ||
      s.includes('grand total') ||
      s.includes('grand-total') ||
      s.includes('total keseluruhan') ||
      s.includes('jumlah total') ||
      s === 'total' ||
      s.startsWith('total :') ||
      s.startsWith('total:')
    );
  });
}

// Intelligent matching of headers
export function detectColumns(headers: string[]) {
  let productNameCol: string | null = null;
  let quantityCol: string | null = null;
  let documentNoCol: string | null = null;
  let dateOrYearCol: string | null = null;
  let categoryCol: string | null = null;
  let minStockCol: string | null = null;

  for (const h of headers) {
    const clean = cleanHeader(h);

    // Document / Reference match (No SO, No PO, No Dokumen, Surat Jalan, dsb.)
    if (!documentNoCol) {
      if (
        clean.includes('no so') ||
        clean.includes('nomor so') ||
        clean.includes('no po') ||
        clean.includes('nomor po') ||
        clean.includes('no sj') ||
        clean.includes('surat jalan') ||
        clean.includes('no faktur') ||
        clean.includes('no transaksi') ||
        clean.includes('no dokumen') ||
        clean.includes('no invoice') ||
        clean.includes('no ref') ||
        clean === 'so' ||
        clean === 'po' ||
        clean === 'sj'
      ) {
        documentNoCol = h;
        continue;
      }
    }

    // Product Name match
    if (!productNameCol) {
      if (
        clean.includes('nama produk') ||
        clean.includes('nama barang') ||
        clean.includes('nama item') ||
        clean === 'produk' ||
        clean === 'product' ||
        clean === 'barang' ||
        clean === 'item' ||
        clean === 'nama'
      ) {
        productNameCol = h;
        continue;
      }
    }

    // Quantity match
    if (!quantityCol) {
      if (
        clean.includes('jumlah') ||
        clean.includes('qty') ||
        clean.includes('kuantitas') ||
        clean.includes('quantity') ||
        clean.includes('volume') ||
        clean.includes('terjual') ||
        clean.includes('masuk') ||
        clean.includes('keluar') ||
        clean.includes('stok')
      ) {
        quantityCol = h;
        continue;
      }
    }

    // Date or Year match
    if (!dateOrYearCol) {
      if (
        clean.includes('tahun') ||
        clean.includes('year') ||
        clean.includes('tanggal') ||
        clean.includes('date') ||
        clean.includes('periode') ||
        clean.includes('bulan') ||
        clean === 'tgl'
      ) {
        dateOrYearCol = h;
        continue;
      }
    }

    // Category match
    if (!categoryCol) {
      if (clean.includes('kategori') || clean.includes('category') || clean.includes('jenis')) {
        categoryCol = h;
        continue;
      }
    }

    // Min Stock match
    if (!minStockCol) {
      if (clean.includes('minimum') || clean.includes('min stock') || clean.includes('stok min')) {
        minStockCol = h;
        continue;
      }
    }
  }

  // Fallbacks if strictly 2 columns and not mapped
  if (!productNameCol && headers.length >= 1) {
    productNameCol = headers[0];
  }
  if (!quantityCol && headers.length >= 2) {
    // If col 0 is product, col 1 is quantity
    if (productNameCol === headers[0]) {
      quantityCol = headers[1];
    } else {
      quantityCol = headers[headers.length - 1];
    }
  }

  return { productNameCol, quantityCol, documentNoCol, dateOrYearCol, categoryCol, minStockCol };
}

// Parse Excel or CSV File with support for hierarchical/sectioned reports (like Rekap SO Per Hari)
export async function parseExcelFile(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File excel tidak memiliki worksheet atau kosong.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    defval: '',
  });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('Lembar kerja Excel kosong.');
  }

  // Find header row (first row with at least 2 non-empty values matching column pattern)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
    const row = jsonData[i] as any[];
    if (Array.isArray(row) && row.filter((c) => String(c).trim() !== '').length >= 2) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Tidak dapat menemukan baris header pada file. Pastikan terdapat kolom Nama Produk dan Jumlah.');
  }

  const rawHeaders = (jsonData[headerIndex] as any[]).map((h) => String(h || '').trim());
  const detected = detectColumns(rawHeaders);

  const dataRows = jsonData.slice(headerIndex + 1);
  const rows: ParsedExcelRow[] = [];
  const detectedDatesSet = new Set<string>();

  // State to track current section date in hierarchical reports
  let currentSectionDate: string | undefined = undefined;
  let currentSectionYear: string | number | undefined = undefined;

  for (let r = 0; r < dataRows.length; r++) {
    const rawRow = dataRows[r] as any[];
    if (!Array.isArray(rawRow) || rawRow.every((val) => val === '' || val === null || val === undefined)) {
      continue; // Skip entirely empty rows
    }

    // 1. Check if row is a Date section header (e.g. "Tanggal: 08-01-2021,,")
    let foundDateSection: { formattedDate: string; isoDate: string; year: number } | null = null;
    for (const cell of rawRow) {
      const parsed = parseDateSection(cell);
      if (parsed) {
        foundDateSection = parsed;
        break;
      }
    }

    if (foundDateSection) {
      currentSectionDate = foundDateSection.isoDate;
      currentSectionYear = foundDateSection.year;
      detectedDatesSet.add(foundDateSection.isoDate);
      continue; // Section header is not a product row
    }

    // 2. Check if row is a Subtotal, Grand Total, or Summary row
    if (isSummaryOrTotalRow(rawRow)) {
      continue; // Skip summary rows to prevent duplicate quantity counting
    }

    // Build row object matching header
    const rowObj: Record<string, any> = {};
    rawHeaders.forEach((colName, idx) => {
      rowObj[colName] = rawRow[idx] !== undefined ? rawRow[idx] : '';
    });

    const rawName = detected.productNameCol ? String(rowObj[detected.productNameCol] || '').trim() : '';
    const rawQty = detected.quantityCol ? rowObj[detected.quantityCol] : '';
    const rawDocNo = detected.documentNoCol ? String(rowObj[detected.documentNoCol] || '').trim() : undefined;
    const rawColDate = detected.dateOrYearCol ? String(rowObj[detected.dateOrYearCol] || '').trim() : undefined;
    const rawCategory = detected.categoryCol ? String(rowObj[detected.categoryCol] || '').trim() : undefined;
    const rawMinStock = detected.minStockCol ? Number(rowObj[detected.minStockCol]) : undefined;

    // If both name and quantity are empty, skip row silently
    if (!rawName && (rawQty === '' || rawQty === null || rawQty === undefined)) {
      continue;
    }

    // Validate quantity with clean parser
    const parsedQty = parseCleanQuantity(rawQty);
    let isValid = true;
    let validationError: string | undefined = undefined;

    if (!rawName) {
      isValid = false;
      validationError = 'Nama produk tidak boleh kosong';
    } else if (isNaN(parsedQty) || parsedQty <= 0) {
      isValid = false;
      validationError = `Jumlah kuantitas tidak valid ("${rawQty}")`;
    }

    // Determine row date and year (priority: per-row column date > section date)
    const effectiveDate = rawColDate || currentSectionDate;
    let effectiveYear = currentSectionYear;
    if (effectiveDate && !effectiveYear) {
      const parsed = parseDateSection('Tanggal: ' + effectiveDate);
      if (parsed) effectiveYear = parsed.year;
    }

    rows.push({
      raw: rowObj,
      productName: rawName,
      quantity: isNaN(parsedQty) ? 0 : Math.round(parsedQty),
      sku: undefined,
      documentNo: rawDocNo || undefined,
      dateOrYear: effectiveDate,
      year: effectiveYear,
      category: rawCategory,
      minStock: rawMinStock && !isNaN(rawMinStock) ? rawMinStock : undefined,
      isValid,
      validationError,
    });
  }

  const validRows = rows.filter((r) => r.isValid);
  const grandTotal = validRows.reduce((sum, r) => sum + r.quantity, 0);

  return {
    headers: rawHeaders,
    mappedColumns: detected,
    rows,
    totalValid: validRows.length,
    totalInvalid: rows.filter((r) => !r.isValid).length,
    detectedDates: Array.from(detectedDatesSet),
    grandTotalQuantity: grandTotal,
  };
}

// Download Excel Template for Incoming Goods (Unit Pcs)
export function downloadTemplateBarangMasuk() {
  const sampleData = [
    {
      'No Dokumen / PO': 'PO20261101',
      'Nama Produk': 'Date Crown Black Sayer 500 Gr',
      'Jumlah': 100,
      'Kategori': 'Kurma',
      'Stok Minimum': 15,
      'Satuan': 'Pcs',
    },
    {
      'No Dokumen / PO': 'PO20261101',
      'Nama Produk': 'Date Crown Khenaizi 1 Kg',
      'Jumlah': 80,
      'Kategori': 'Kurma',
      'Stok Minimum': 20,
      'Satuan': 'Pcs',
    },
    {
      'No Dokumen / PO': 'PO20261102',
      'Nama Produk': 'Ajwa -Siafa- 400 Gram (Plastik Tub)',
      'Jumlah': 50,
      'Kategori': 'Kurma Premium',
      'Stok Minimum': 10,
      'Satuan': 'Pcs',
    },
    {
      'No Dokumen / PO': 'PO20261102',
      'Nama Produk': 'Sunfruit Tangkai 500Gr Blue (Pcs)',
      'Jumlah': 60,
      'Kategori': 'Kurma',
      'Stok Minimum': 15,
      'Satuan': 'Pcs',
    },
    {
      'No Dokumen / PO': 'PO20261103',
      'Nama Produk': 'Deglet Nour Royal 500Gr (Pcs)',
      'Jumlah': 90,
      'Kategori': 'Kurma',
      'Stok Minimum': 15,
      'Satuan': 'Pcs',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [{ wch: 18 }, { wch: 38 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Permintaan_Barang_Masuk');
  XLSX.writeFile(wb, 'Template_Permintaan_Barang_Masuk.xlsx');
}

// Download Excel Template for Sales / Outgoing Goods
export function downloadTemplateDataPenjualan() {
  const currentYear = new Date().getFullYear();
  const sampleData = [
    {
      'No SO': 'SO : 03078',
      'Nama Barang': 'Date Crown Black Sayer 500 Gr',
      'Qty': 5,
    },
    {
      'No SO': 'SO : 03078',
      'Nama Barang': 'Date Crown Khenaizi 1 Kg',
      'Qty': 25,
    },
    {
      'No SO': 'SO : 03078',
      'Nama Barang': 'Date Crown Khenaizi 250 Gr',
      'Qty': 38,
    },
    {
      'No SO': 'PO21090050',
      'Nama Barang': 'Sukkary Rotab Dates -Royal Palm- 3Kg (Pcs)',
      'Qty': 4,
    },
    {
      'No SO': 'SO : 0365 , SJ : 01829',
      'Nama Barang': 'Sunfruit Tangkai 500Gr Blue (Pcs)',
      'Qty': 24,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [{ wch: 25 }, { wch: 42 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data_Penjualan_Rekap_SO');
  XLSX.writeFile(wb, `Template_Rekap_SO_Penjualan_${currentYear}.xlsx`);
}

// Export Inventory to Excel (All units strictly in Pcs)
export function exportInventoryToExcel(products: Product[]) {
  const exportData = products.map((p, index) => {
    let statusLabel = 'Aman';
    if (p.currentStock <= 0) statusLabel = 'HABIS (Perlu Restock Segera)';
    else if (p.currentStock <= p.minStock) statusLabel = 'MENIPIS (Dibawah Stok Minimum)';

    return {
      'No': index + 1,
      'SKU / Kode': p.sku,
      'Nama Produk': p.name,
      'Kategori': p.category,
      'Satuan': p.unit || 'Pcs',
      'Stok Awal': p.initialStock,
      'Total Masuk': p.totalIncoming,
      'Total Keluar': p.totalOutgoing,
      'Stok Gudang Saat Ini': p.currentStock,
      'Ambang Batas Minimum': p.minStock,
      'Status Persediaan': statusLabel,
      'Terakhir Diperbarui': new Date(p.lastUpdated).toLocaleString('id-ID'),
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 38 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 32 },
    { wch: 24 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventaris_Gudang');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Laporan_Inventaris_Gudang_${dateStr}.xlsx`);
}

// Export Stock Movements to Excel
export function exportMovementsToExcel(movements: StockMovement[]) {
  const exportData = movements.map((m, index) => ({
    'No': index + 1,
    'Tanggal Transaksi': m.date,
    'Waktu Catat Sistem': new Date(m.timestamp).toLocaleString('id-ID'),
    'Jenis Pergerakan': m.type === 'masuk' ? 'Barang Masuk (Penambahan)' : m.type === 'keluar' ? 'Barang Keluar (Penjualan)' : 'Penyesuaian Manual',
    'Nama Produk': m.productName,
    'Jumlah (Pcs)': m.type === 'keluar' ? -m.quantity : m.quantity,
    'Stok Sebelum': m.stockBefore,
    'Stok Sesudah': m.stockAfter,
    'Tahun / Periode': m.year || '-',
    'Sumber / File': m.sourceFileName || 'Input Sistem',
    'Catatan / No Dokumen': m.notes || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 16 },
    { wch: 22 },
    { wch: 28 },
    { wch: 38 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 30 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mutasi_Arus_Barang');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Buku_Mutasi_Arus_Gudang_${dateStr}.xlsx`);
}
