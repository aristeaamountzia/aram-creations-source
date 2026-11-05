import React, { useState } from 'react';
import { ArtItem } from '../types';
import { X, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  artItem?: ArtItem | null;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  artItem,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    interest: artItem ? `Έργο: ${artItem.title} (${artItem.category})` : 'Γενική Ανάθεση / Συνεργασία',
    message: '',
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setSubmitted(false);
    setIsSubmitting(false);
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Αποτυχία αποστολής μηνύματος (Κωδικός ${response.status}).`);
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Παρουσιάστηκε σφάλμα κατά την αποστολή. Παρακαλούμε δοκιμάστε ξανά.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-stone-200 max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl text-stone-900"
      >
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              Aram Creations • Atelier Inquiries
            </div>
            <h3 className="text-xl font-bold text-stone-900" style={{ fontFamily: 'Jura, sans-serif' }}>
              Εκδήλωση Ενδιαφέροντος & Αναθέσεις
            </h3>
          </div>
          <button 
            type="button"
            onClick={handleClose} 
            className="p-1 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
            aria-label="Κλείσιμο παραθύρου"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-10 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xl font-bold text-stone-900" style={{ fontFamily: 'Jura, sans-serif' }}>
                Το μήνυμά σας εστάλη επιτυχώς
              </h4>
              <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                Ευχαριστούμε για την επικοινωνία. Το μήνυμά σας παραδόθηκε άμεσα στο atelier και θα λάβετε απάντηση στη διεύθυνση <span className="font-bold text-stone-900">{formData.email}</span>.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {errorMessage && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                Ονοματεπώνυμο *
              </label>
              <input
                required
                type="text"
                disabled={isSubmitting}
                placeholder="π.χ. Μαρία Παπαδοπούλου"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                Email Επικοινωνίας *
              </label>
              <input
                required
                type="email"
                disabled={isSubmitting}
                placeholder="you@domain.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                Αντικείμενο Ενδιαφέροντος
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={formData.interest}
                onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                Μήνυμα / Περιγραφή Ανάθεσης *
              </label>
              <textarea
                required
                rows={3}
                disabled={isSubmitting}
                placeholder="Περιγράψτε το σχέδιο, τα υλικά ή τις προτιμήσεις σας..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition disabled:opacity-60"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Αποστολή μηνύματος μέσω Resend...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Αποστολή Μηνύματος</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
