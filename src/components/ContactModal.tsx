import React, { useState } from 'react';
import { ArtItem } from '../types';
import { X, Send, CheckCircle2 } from 'lucide-react';

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
  const [emailDraftUrl, setEmailDraftUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    interest: artItem ? `Έργο: ${artItem.title} (${artItem.category})` : 'Γενική Ανάθεση / Συνεργασία',
    message: '',
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setSubmitted(false);
    setEmailDraftUrl(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = formData.interest || 'Επικοινωνία με το Aram Creations';
    const body = [
      `Όνομα: ${formData.name}`,
      `Email απάντησης: ${formData.email}`,
      `Θέμα: ${formData.interest || 'Γενική επικοινωνία'}`,
      '',
      formData.message
    ].join('\n');
    const mailto = `mailto:aristeaamnta@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setEmailDraftUrl(mailto);
    setSubmitted(true);
    window.location.href = mailto;
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
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
          <button onClick={handleClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-xl font-bold text-stone-900" style={{ fontFamily: 'Jura, sans-serif' }}>
              Το email είναι έτοιμο για αποστολή
            </h4>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Ετοιμάσαμε προσυμπληρωμένο email. Το μήνυμα δεν έχει σταλεί ακόμη· πατήστε «Αποστολή» στην εφαρμογή email.
            </p>
            {emailDraftUrl && (
              <a href={emailDraftUrl} className="inline-block text-sm font-bold underline text-stone-900">
                Άνοιγμα email ξανά
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                Ονοματεπώνυμο *
              </label>
              <input
                required
                type="text"
                placeholder="π.χ. Μαρία Παπαδοπούλου"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                Email Επικοινωνίας *
              </label>
              <input
                required
                type="email"
                placeholder="you@domain.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                Αντικείμενο Ενδιαφέροντος
              </label>
              <input
                type="text"
                value={formData.interest}
                onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                Μήνυμα / Περιγραφή Ανάθεσης
              </label>
              <textarea
                rows={3}
                placeholder="Περιγράψτε το σχέδιο, τα υλικά ή τις προτιμήσεις σας..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Αποστολή Μηνύματος</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
