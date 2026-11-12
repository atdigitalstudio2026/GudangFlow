import React, { useState } from 'react';
import { X, Lock, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { clearSimulationDataWithPassword } from '../utils/storage';

interface ClearDataPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClearDataPasswordModal: React.FC<ClearDataPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = clearSimulationDataWithPassword(password);

    if (result.success) {
      setPassword('');
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } else {
      setErrorMessage(result.message);
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setErrorMessage(null);
    setShowPassword(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Data Simulasi</h3>
              <p className="text-[11px] text-slate-500">Otorisasi Kata Sandi Diperlukan</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-950">Tindakan Permanen</div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Semua data simulasi (produk contoh, riwayat mutasi, dan log unggahan) akan dihapus secara permanen.
                Setelah dihapus, <strong>data tidak akan kembali meskipun halaman web di-refresh</strong>.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Otorisasi Gagal:</span> {errorMessage}
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Masukkan Kata Sandi Keamanan <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Ketik kata sandi..."
                autoFocus
                className="w-full pl-3 pr-10 py-2.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-slate-900 font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Karakter kata sandi disembunyikan untuk menjaga kerahasiaan.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Permanen Data Simulasi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
