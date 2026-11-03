import React from 'react';
import { CheckCircle2, ShieldCheck, ArrowRight, Package } from 'lucide-react';

interface PaymentSuccessModalProps {
  orderNumber: string;
  total?: number;
  onClose: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  orderNumber,
  total,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Jura, sans-serif' }}>
            Η πληρωμή ολοκληρώθηκε!
          </h3>
          <p className="text-xs uppercase tracking-widest text-stone-400 font-bold">
            Επιβεβαιωμενη συναλλαγη μεσω Stripe
          </p>
        </div>

        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2">
          <div className="flex justify-between items-center text-xs text-stone-600">
            <span>Αριθμός Παραγγελίας:</span>
            <span className="font-bold text-stone-900 font-mono">#{orderNumber}</span>
          </div>
          {typeof total === 'number' && (
            <div className="flex justify-between items-center text-xs text-stone-600 pt-2 border-t border-stone-200">
              <span>Σύνολο Πληρωμής:</span>
              <span className="font-bold text-stone-900 text-sm">€{total.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 text-xs text-stone-600 leading-relaxed text-left bg-stone-50/50 p-3.5 rounded-xl border border-stone-100">
          <div className="flex items-start gap-2">
            <Package className="w-4 h-4 text-stone-700 shrink-0 mt-0.5" />
            <span>Η παραγγελία σας καταχωρήθηκε και τα κοσμήματα δεσμεύτηκαν αποκλειστικά για εσάς.</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Θα ετοιμαστούν σε χειροποίητη συσκευασία δώρου και θα παραδοθούν σύμφωνα με τον τρόπο αποστολής που επιλέξατε.</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Συνέχεια στο Κατάστημα</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

