import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface BulkEditModalProps {
  open: boolean;
  selectedCount: number;
  mode?: 'shop' | 'portfolio';
  categories: Array<{ id: string; label: string }>;
  statuses: string[];
  onClose: () => void;
  onApply: (patch: {
    category?: string;
    status?: string;
    price?: number;
    stock?: number;
    year?: string;
  }) => void;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  open,
  selectedCount,
  mode = 'shop',
  categories,
  statuses,
  onClose,
  onApply
}) => {
  const [changeCategory, setChangeCategory] = useState(false);
  const [changeStatus, setChangeStatus] = useState(false);
  const [changePrice, setChangePrice] = useState(false);
  const [changeStock, setChangeStock] = useState(false);
  const [changeYear, setChangeYear] = useState(false);

  const [category, setCategory] = useState(categories[0]?.id || '');
  const [status, setStatus] = useState(statuses[0] || 'Διαθέσιμο');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || selectedCount === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: {
      category?: string;
      status?: string;
      price?: number;
      stock?: number;
      year?: string;
    } = {};

    if (changeCategory && category) patch.category = category;
    if (changeStatus && status) patch.status = status;
    if (changePrice && price !== '') patch.price = Number(price);
    if (changeStock && stock !== '') patch.stock = Number(stock);
    if (changeYear && year.trim()) patch.year = year.trim();

    if (Object.keys(patch).length === 0) {
      alert('Ενεργοποίησε τουλάχιστον ένα πεδίο προς αλλαγή.');
      return;
    }

    onApply(patch);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Μαζική Επεξεργασία"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 animate-fade-in cursor-default"
      >
        {/* Header - Fixed */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-base font-black text-stone-900">Μαζική Επεξεργασία</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Εφαρμογή αλλαγών σε <strong>{selectedCount}</strong> επιλεγμένα{' '}
              {mode === 'shop' ? 'προϊόντα' : 'έργα'}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-4 text-sm flex-1 overflow-y-auto">
          <p className="text-xs text-stone-500 bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed text-amber-800">
            Ενεργοποίησε τον διακόπτη μόνο για τα πεδία που επιθυμείς να ενημερώσεις. Όλα τα υπόλοιπα
            χαρακτηριστικά θα παραμείνουν αναλλοίωτα.
          </p>

          {/* Category Toggle & Input */}
          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
              <input
                type="checkbox"
                checked={changeCategory}
                onChange={e => setChangeCategory(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 accent-stone-900"
              />
              <span className="font-bold text-stone-700 text-xs">Κατηγορία</span>
            </label>
            <div
              className={`flex-1 transition-opacity ${
                changeCategory ? 'opacity-100' : 'opacity-40 pointer-events-none'
              }`}
            >
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white text-xs outline-none"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Toggle & Input */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
              <input
                type="checkbox"
                checked={changeStatus}
                onChange={e => setChangeStatus(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 accent-stone-900"
              />
              <span className="font-bold text-stone-700 text-xs">Κατάσταση</span>
            </label>
            <div
              className={`flex-1 transition-opacity ${
                changeStatus ? 'opacity-100' : 'opacity-40 pointer-events-none'
              }`}
            >
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white text-xs outline-none"
              >
                {statuses.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Toggle & Input (for shop) */}
          {mode === 'shop' && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
                <input
                  type="checkbox"
                  checked={changePrice}
                  onChange={e => setChangePrice(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 accent-stone-900"
                />
                <span className="font-bold text-stone-700 text-xs">Τιμή (€)</span>
              </label>
              <div
                className={`flex-1 transition-opacity ${
                  changePrice ? 'opacity-100' : 'opacity-40 pointer-events-none'
                }`}
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="π.χ. 35.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white text-xs outline-none"
                />
              </div>
            </div>
          )}

          {/* Stock Toggle & Input (for shop) */}
          {mode === 'shop' && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
                <input
                  type="checkbox"
                  checked={changeStock}
                  onChange={e => setChangeStock(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 accent-stone-900"
                />
                <span className="font-bold text-stone-700 text-xs">Απόθεμα</span>
              </label>
              <div
                className={`flex-1 transition-opacity ${
                  changeStock ? 'opacity-100' : 'opacity-40 pointer-events-none'
                }`}
              >
                <input
                  type="number"
                  min="0"
                  placeholder="π.χ. 5"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white text-xs outline-none"
                />
              </div>
            </div>
          )}

          {/* Year Toggle & Input (for portfolio) */}
          {mode === 'portfolio' && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
                <input
                  type="checkbox"
                  checked={changeYear}
                  onChange={e => setChangeYear(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 accent-stone-900"
                />
                <span className="font-bold text-stone-700 text-xs">Έτος</span>
              </label>
              <div
                className={`flex-1 transition-opacity ${
                  changeYear ? 'opacity-100' : 'opacity-40 pointer-events-none'
                }`}
              >
                <input
                  type="text"
                  placeholder="π.χ. 2025"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white text-xs outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-stone-200 rounded-lg text-xs font-bold text-stone-600 hover:bg-white transition"
          >
            Ακύρωση
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold shadow-md transition"
          >
            Ενημέρωση {selectedCount} στοιχείων
          </button>
        </div>
      </form>
    </div>
  );
};
