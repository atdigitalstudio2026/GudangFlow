import React, { useState } from 'react';
import { X, Plus, Package } from 'lucide-react';
import { Product, StockMovement } from '../types/inventory';
import { saveProducts, getStoredProducts, saveMovements, getStoredMovements } from '../utils/storage';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Sembako');
  const [unit, setUnit] = useState('Pcs');
  const [initialStock, setInitialStock] = useState<number>(50);
  const [minStock, setMinStock] = useState<number>(15);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama produk wajib diisi.');
      return;
    }

    const currentProducts = getStoredProducts();
    // Check duplicate name
    if (currentProducts.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      setError(`Produk dengan nama "${name}" sudah ada dalam inventaris.`);
      return;
    }

    const generatedId = 'prod-' + Date.now();
    const finalSku = sku.trim() || 'SKU-' + Math.floor(1000 + Math.random() * 9000);
    const timestamp = new Date().toISOString();
    const todayStr = timestamp.split('T')[0];

    const newProduct: Product = {
      id: generatedId,
      sku: finalSku,
      name: name.trim(),
      category: category.trim() || 'Umum',
      unit: unit.trim() || 'Pcs',
      initialStock: initialStock,
      totalIncoming: initialStock,
      totalOutgoing: 0,
      currentStock: initialStock,
      minStock: minStock >= 0 ? minStock : 10,
      lastUpdated: timestamp,
      notes: notes.trim(),
    };

    const newMovement: StockMovement = {
      id: 'mov-' + Date.now(),
      productId: generatedId,
      productName: newProduct.name,
      type: 'masuk',
      quantity: initialStock,
      stockBefore: 0,
      stockAfter: initialStock,
      date: todayStr,
      timestamp,
      notes: 'Pendaftaran produk baru dengan stok awal',
    };

    saveProducts([newProduct, ...currentProducts]);
    saveMovements([newMovement, ...getStoredMovements()]);

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Package className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Tambah Produk Baru ke Gudang</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nama Produk <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Kopi Robusta Lampung 500g"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kode SKU</label>
              <input
                type="text"
                placeholder="Contoh: KOP-004"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
              <input
                type="text"
                placeholder="Contoh: Sembako, Minuman"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
              <input
                type="text"
                placeholder="Pcs"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stok Awal</label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ambang Batas Min <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono text-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Penyimpanan rak B-02 suhu kering"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simpan Produk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
