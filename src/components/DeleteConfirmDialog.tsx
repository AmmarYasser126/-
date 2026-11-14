import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-fade-in">
      <div
        id="delete-confirm-modal"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-rose-100 overflow-hidden relative text-right"
        dir="rtl"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 left-4 p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-950">{title}</h3>
            <p className="text-sm text-emerald-950/70 mt-1 leading-relaxed">{message}</p>
            {itemName && (
              <div className="mt-2 p-2 bg-rose-50 text-rose-900 text-xs font-semibold rounded-xl border border-rose-200 inline-block">
                {itemName}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-950/10 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
          >
            إلغاء الأمر
          </button>
          <button
            id="btn-confirm-delete"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'جارٍ الحذف...' : 'تأكيد الحذف نهائيًا'}
          </button>
        </div>
      </div>
    </div>
  );
};
