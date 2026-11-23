import { localizedArt } from '../lib/portfolio-copy';
import { usePublicLanguage } from "../lib/use-public-language";
import { useDialogKeyboard } from '../lib/use-dialog-keyboard';
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
  const { locale, t } = usePublicLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    interest: artItem ? t(`Έργο: ${artItem.title}`, `Artwork: ${localizedArt(artItem, locale).title}`) : t("Γενική Ανάθεση / Συνεργασία", "General enquiry or collaboration"),
    message: '',
  });

  const handleClose = () => {
    if (isSubmitting) return;
    setSubmitted(false);
    setIsSubmitting(false);
    setErrorMessage(null);
    onClose();
  };

  const dialog = useDialogKeyboard(isOpen, handleClose);

  if (!isOpen) return null;

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
        throw new Error(t(data.error || `Αποτυχία αποστολής μηνύματος (Κωδικός ${response.status}).`, 'Your message could not be sent. Please try again.'));
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || t("Παρουσιάστηκε σφάλμα κατά την αποστολή. Παρακαλούμε δοκιμάστε ξανά.", "The message could not be sent. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      ref={dialog} role="dialog" aria-modal="true" aria-labelledby="contact-title" tabIndex={-1}
      className="studio-overlay fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="studio-dialog bg-white border border-stone-200 max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl text-stone-900"
      >
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div>
            <h2 id="contact-title" className="studio-dialog-title">{t("Επικοινωνία με το εργαστήριο", "Contact the studio")}</h2>
          </div>
          <button 
            type="button"
            onClick={handleClose} 
            className="p-1 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
            aria-label={t("Κλείσιμο παραθύρου", "Close dialog")}
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
              <h4 className="text-xl font-bold text-stone-900" style={{ fontFamily: 'inherit' }}>{t("Το μήνυμά σας εστάλη επιτυχώς", "Your message was sent")}</h4>
              <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">{t("Ευχαριστούμε για την επικοινωνία. Το μήνυμά σας παραδόθηκε άμεσα στο atelier και θα λάβετε απάντηση στη διεύθυνση ", "Thank you for getting in touch. We’ll reply to ")}<span className="font-bold text-stone-900">{formData.email}</span>.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition"
              >{t("Κλείσιμο", "Close")}</button>
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
              <label htmlFor="contact-name" className="block text-sm text-stone-700 mb-1 font-semibold">{t("Ονοματεπώνυμο *", "Full name *")}</label>
              <input id="contact-name" autoComplete="name"
                required
                type="text"
                disabled={isSubmitting}
                placeholder={t("π.χ. Μαρία Παπαδοπούλου", "e.g. Maria Smith")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="block text-sm text-stone-700 mb-1 font-semibold">{t("Email Επικοινωνίας *", "Email address *")}</label>
              <input id="contact-email" autoComplete="email"
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
              <label htmlFor="contact-interest" className="block text-sm text-stone-700 mb-1 font-semibold">{t("Αντικείμενο Ενδιαφέροντος", "Subject")}</label>
              <input id="contact-interest"
                type="text"
                disabled={isSubmitting}
                value={formData.interest}
                onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="block text-sm text-stone-700 mb-1 font-semibold">{t("Μήνυμα / Περιγραφή Ανάθεσης *", "Message or commission details *")}</label>
              <textarea id="contact-message"
                required
                rows={3}
                disabled={isSubmitting}
                placeholder={t("Περιγράψτε το σχέδιο, τα υλικά ή τις προτιμήσεις σας...", "Describe the design, materials, or ideas you have in mind…")}
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
                    <span>{t("Αποστολή μηνύματος μέσω Resend...", "Sending your message…")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{t("Αποστολή Μηνύματος", "Send message")}</span>
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
