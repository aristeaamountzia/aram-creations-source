import { usePublicLanguage } from "../lib/use-public-language";
import React from 'react';
import { useDialogKeyboard } from '../lib/use-dialog-keyboard';
import { X, ShieldCheck, FileText, RotateCcw, Truck, Sparkles, CheckCircle2 } from 'lucide-react';

export type LegalPolicyType = 'terms' | 'privacy' | 'returns' | null;

interface LegalModalProps {
  type: LegalPolicyType;
  onClose: () => void;
  onSelectType?: (type: LegalPolicyType) => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  type,
  onClose,
  onSelectType,
}) => {
  const { t } = usePublicLanguage();
  const dialog = useDialogKeyboard(Boolean(type), onClose);
  if (!type) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true" ref={dialog} aria-labelledby="legal-title" tabIndex={-1}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="studio-dialog w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
              {type === 'terms' && <FileText className="w-4 h-4" />}
              {type === 'privacy' && <ShieldCheck className="w-4 h-4" />}
              {type === 'returns' && <RotateCcw className="w-4 h-4" />}
            </div>
            <div>
              <h3 id="legal-title" className="studio-dialog-title">
                {type === 'terms' && t("Όροι Χρήσης & Συναλλαγών", "Terms of Use and Sale")}
                {type === 'privacy' && t("Πολιτική Απορρήτου & Δεδομένων (GDPR)", "Privacy and Data Policy (GDPR)")}
                {type === 'returns' && t("Πολιτική Αποστολών & Επιστροφών", "Shipping and Returns Policy")}
              </h3>
              <p className="text-[11px] text-stone-500 font-sans">
                Aram Creations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("Κλείσιμο παραθύρου", "Close dialog")}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation for quick switching */}
        {onSelectType && (
          <div className="flex border-b border-stone-200 bg-white px-6 gap-2 pt-2 text-xs font-medium">
            <button
              onClick={() => onSelectType('terms')}
              className={`pb-2.5 px-2 border-b-2 transition flex items-center gap-1.5 ${
                type === 'terms'
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t("Όροι Χρήσης", "Terms of Use")}</span>
            </button>
            <button
              onClick={() => onSelectType('privacy')}
              className={`pb-2.5 px-2 border-b-2 transition flex items-center gap-1.5 ${
                type === 'privacy'
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t("Πολιτική Απορρήτου", "Privacy Policy")}</span>
            </button>
            <button
              onClick={() => onSelectType('returns')}
              className={`pb-2.5 px-2 border-b-2 transition flex items-center gap-1.5 ${
                type === 'returns'
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t("Αποστολές & Επιστροφές", "Shipping and Returns")}</span>
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-stone-700 leading-relaxed font-sans">
          
          {/* CONTENT: TERMS */}
          {type === 'terms' && (
            <div className="space-y-5">
              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("1. Ταυτότητα Εργαστηρίου", "1. Studio identity")}</h4>
                <p>{t("Ο διαδικτυακός χώρος ", "The website ")}<strong>aram.creations</strong>{t(" είναι κατάστημα χειροποίητων κοσμημάτων. Η περιήγηση στον ιστότοπο και η υποβολή παραγγελίας συνεπάγεται την πλήρη αποδοχή των παρακάτω όρων.", " is an online shop for handmade jewelry. Browsing the site and placing an order constitutes acceptance of the terms below.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("2. Χειροποίητος & Μοναδικός Χαρακτήρας Προϊόντων", "2. Handmade and one-of-a-kind products")}</h4>
                <p>{t("Όλα τα κοσμήματα και τα έργα κατασκευάζονται στο χέρι με φυσικά στοιχεία, πραγματικά αποξηραμένα άνθη, ημιπολύτιμους λίθους, υγρό γυαλί / ρητίνη, ασήμι 925 και υποαλλεργικό ανοξείδωτο ατσάλι.", "All jewelry and artwork are made by hand using natural elements, real dried flowers, semi-precious stones, clear resin, sterling silver, and hypoallergenic stainless steel.")}</p>
                <p className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-stone-600">{t("Λόγω της φυσικής προέλευσης των υλικών και της χειροποίητης φύσης της διαδικασίας, κάθε κομμάτι είναι μοναδικό. Ενδέχεται να υφίστανται ανεπαίσθητες φυσικές διαφοροποιήσεις σε σχέση με τη φωτογραφία του καταλόγου, στοιχείο που υπογραμμίζει την αυθεντικότητά του.", "Natural materials and handcrafting make each piece unique. The piece you receive may differ slightly from its catalog photograph.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("3. Πνευματική Ιδιοκτησία & Προστασία Σχεδίων", "3. Intellectual property and designs")}</h4>
                <p>{t("Όλα τα πρωτότυπα σχέδια κοσμημάτων, τα γλυπτά, οι φωτογραφίες, τα γραφικά, τα κείμενα και τα λογότυπα που εμφανίζονται στο Aram Creations αποτελούν πνευματική ιδιοκτησία του εργαστηρίου Aram Creations και προστατεύονται από τις ελληνικές και διεθνείς διατάξεις περί πνευματικής ιδιοκτησίας. Απαγορεύεται αυστηρά οποιαδήποτε αντιγραφή, αναπαραγωγή ή εμπορική χρήση χωρίς προηγούμενη έγγραφη άδεια.", "The original jewelry designs, sculptures, photographs, graphics, text, and logos shown on Aram Creations are the studio’s intellectual property and are protected by Greek and international intellectual property law. Copying, reproduction, or commercial use requires prior written permission.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("4. Τρόποι Πληρωμής & Ασφάλεια Συναλλαγών", "4. Payment methods and transaction security")}</h4>
                <p>{t("Οι πληρωμές στο κατάστημά μας πραγματοποιούνται με απόλυτη διαφάνεια και ασφάλεια:", "We process payments securely and transparently:")}</p>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <p>
                    <strong>{t("Πληρωμή με Κάρτα / Ψηφιακά Πορτοφόλια:", "Card payments and digital wallets:")}</strong>{t(" Διεκπεραιώνεται με κρυπτογράφηση TLS 256-bit μέσω της διεθνούς πλατφόρμας ", " Payments are processed with 256-bit TLS encryption through ")}<strong>Stripe</strong>{t(" (Visa, Mastercard, Maestro, Apple Pay, Google Pay, Revolut Pay). Το Aram Creations δεν έχει καμία πρόσβαση στα στοιχεία της κάρτας σας.", " (Visa, Mastercard, Maestro, Apple Pay, Google Pay, Revolut Pay). Aram Creations has no access to your card details.")}</p>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("5. Τροποποίηση Όρων", "5. Changes to these terms")}</h4>
                <p>{t("Το εργαστήριο διατηρεί το δικαίωμα να ενημερώνει ή να τροποποιεί τους παρόντες όρους και τις τιμές των δημιουργιών οποτεδήποτε, με άμεση ισχύ από την ανάρτησή τους στον ιστότοπο.", "The studio may update these terms and product prices at any time. Changes take effect when posted on the site.")}</p>
              </section>
            </div>
          )}

          {/* CONTENT: PRIVACY */}
          {type === 'privacy' && (
            <div className="space-y-5">
              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("1. Αρχή Ελαχιστοποίησης & Σεβασμός Δεδομένων", "1. Data minimization and privacy")}</h4>
                <p>{t("Στο ", "At ")}<strong>Aram Creations</strong>{t(" σεβόμαστε απόλυτα την ιδιωτικότητά σας. Συλλέγουμε μόνο τα απολύτως αναγκαία προσωπικά στοιχεία που εισάγετε εσείς κατά την καταχώρηση της παραγγελίας σας:", " we respect your privacy. When you place an order, we collect only the information needed to fulfill it:")}</p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-stone-600">
                  <li>{t("Ονοματεπώνυμο", "Full name")}</li>
                  <li>{t("Διεύθυνση αποστολής (Οδός, Πόλη, Τ.Κ.)", "Delivery address (street, city, postal code)")}</li>
                  <li>{t("Τηλέφωνο επικοινωνίας", "Phone number")}</li>
                  <li>{t("Ηλεκτρονική διεύθυνση (Email)", "Email address")}</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("2. Σκοπός Επεξεργασίας των Στοιχείων", "2. How we use your information")}</h4>
                <p>{t("Τα παραπάνω στοιχεία χρησιμοποιούνται ", "We use this information ")}<strong>{t("αποκλειστικά και μόνο", "only")}</strong>{t(" για τους εξής σκοπούς:", " for the following purposes:")}</p>
                <div className="space-y-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-800 shrink-0 mt-0.5" />
                    <span>{t("Εκτέλεση, συσκευασία και αποστολή της παραγγελίας σας.", "Fulfilling, packing, and shipping your order.")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-800 shrink-0 mt-0.5" />
                    <span>{t("Κοινοποίηση στη συνεργαζόμενη υπηρεσία ταχυμεταφοράς (BOX NOW ή Courier) ώστε να παραδοθεί το δέμα και να σας σταλεί ο κωδικός εντοπισμού ή ο κωδικός θυρίδας.", "Sharing delivery details with BOX NOW or the courier so they can deliver your parcel and send you a tracking or locker code.")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-800 shrink-0 mt-0.5" />
                    <span>{t("Επικοινωνία μαζί σας σε περίπτωση ανάγκης διευκρίνισης για την παραγγελία σας (π.χ. προσαρμογή μεγέθους).", "Contacting you if your order needs clarification, for example about sizing.")}</span>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("3. Μη Κοινοποίηση σε Τρίτους & Spam-Free Πολιτική", "3. Advertising and sharing")}</h4>
                <p>{t("Τα στοιχεία σας ", "Your information ")}<strong>{t("δεν πωλούνται, δεν παραχωρούνται, δεν ενοικιάζονται", "is never sold, shared, or rented")}</strong>{t(" σε διαφημιστικές πλατφόρμες και δεν χρησιμοποιούνται ποτέ για αυτόματες ενοχλητικές διαφημίσεις (spam).", " to advertising platforms or used for automated spam.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("4. Cookies & Αποθήκευση", "4. Cookies and storage")}</h4>
                <p>{t("Ο ιστότοπος χρησιμοποιεί αποκλειστικά τεχνικά απαραίτητα cookies συνεδρίας (session cookies / local storage) για τη διατήρηση των προϊόντων στο καλάθι αγορών σας. Δεν χρησιμοποιούμε επεμβατικά cookies παρακολούθησης προφίλ.", "The site uses only technically necessary session cookies or local storage to keep items in your shopping bag. We do not use invasive profiling cookies.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("5. Δικαιώματα Διαγραφής (GDPR)", "5. Right to erasure (GDPR)")}</h4>
                <p>{t("Έχετε ανά πάσα στιγμή το δικαίωμα να ζητήσετε ενημέρωση ή πλήρη διαγραφή των στοιχείων επικοινωνίας σας από τα αρχεία του εργαστηρίου, στέλνοντας ένα απλό μήνυμα στο email: ", "You may ask for information about your contact details or request their full deletion from the studio’s records at any time. Email: ")}<strong>aristeaamnta@gmail.com</strong>.
                </p>
              </section>
            </div>
          )}

          {/* CONTENT: RETURNS & SHIPPING */}
          {type === 'returns' && (
            <div className="space-y-5">
              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("1. Προετοιμασία & Αποστολή Δημιουργιών", "1. Preparing and shipping your order")}</h4>
                <p>{t("Κάθε δημιουργία και αντικείμενο κατασκευάζεται και προετοιμάζεται με τη μέγιστη προσοχή και συσκευάζεται σε ασφαλή συσκευασία δώρου:", "Each piece is made and prepared with care, then packed securely in gift packaging.")}</p>
                <p className="text-stone-600">{t("Οι παραγγελίες δρομολογούνται προς αποστολή άμεσα μόλις ολοκληρωθεί η προετοιμασία τους. Μόλις παραδοθεί το δέμα στη συνεργαζόμενη υπηρεσία ταχυμεταφορών, λαμβάνετε άμεσα τον αριθμό εντοπισμού ή τον κωδικό θυρίδας.", "Orders are sent as soon as they are ready. You’ll receive your tracking number or locker code when the parcel is handed to the delivery provider.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("2. Τρόποι Παράδοσης & Κόστη", "2. Delivery methods and costs")}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-stone-900 text-[11px]">
                      <Truck className="w-3.5 h-3.5 text-stone-800" />
                      <span>BOX NOW Locker 24/7</span>
                    </div>
                    <p className="text-[11px] text-stone-600">{t("Βασικό κόστος από 2,50 € • Παραλαβή 24/7 σε θυρίδα της επιλογής σας σε όλη την Ελλάδα.", "From €2.50 · Pick up 24/7 at a locker of your choice in Greece.")}</p>
                    <p className="text-[11px] font-bold text-emerald-700">{t("Δωρεάν για παραγγελίες από 45,00 € και άνω.", "Free for orders of €45.00 or more.")}</p>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-stone-900 text-[11px]">
                      <Truck className="w-3.5 h-3.5 text-stone-800" />
                      <span>Courier (ACS / Speedex)</span>
                    </div>
                    <p className="text-[11px] text-stone-600">{t("Βασικό κόστος από 4,00 € • Παράδοση στην πόρτα σας.", "From €4.00 · Delivery to your door.")}</p>
                    <p className="text-[11px] font-bold text-emerald-700">{t("Δωρεάν για παραγγελίες από 50,00 € και άνω.", "Free for orders of €50.00 or more.")}</p>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 pt-1 leading-relaxed">{t("*Τα αναγραφόμενα κόστη αφορούν βασικές διαστάσεις δεμάτων/θυρίδων. Για ογκώδη αντικείμενα ή μεγαλύτερες θυρίδες, τα κόστη διαμορφώνονται αντίστοιχα κατά την ολοκλήρωση της παραγγελίας.", "*These rates apply to standard parcels and lockers. Larger items or lockers may change the cost shown at checkout.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("3. Δικαίωμα Υπαναχώρησης (14 Ημερολογιακές Ημέρες)", "3. Right of withdrawal (14 calendar days)")}</h4>
                <p>{t("Έχετε το δικαίωμα να υπαναχωρήσετε από την αγορά σας εντός ", "You have the right to withdraw from your purchase within ")}<strong>{t("14 ημερολογιακών ημερών", "14 calendar days")}</strong>{t(" από την ημερομηνία παραλαβής της παραγγελίας, εφόσον το προϊόν διατηρείται στην αρχική του κατάσταση, αχρησιμοποίητο και στην πλήρη αρχική του συσκευασία.", " of receiving your order, provided the item remains unused and in its original condition and complete original packaging.")}</p>
              </section>

              <section className="space-y-2.5 bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 text-amber-950">
                <h4 className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
                  <span>{t("Σημαντικές Εξαιρέσεις από το Δικαίωμα Επιστροφής", "Important exceptions to returns")}</span>
                </h4>
                <p className="text-[11px] text-amber-900 leading-relaxed">{t("Βάσει της νομοθεσίας και για την προστασία των καταναλωτών και του εργαστηρίου, ", "Under applicable law and to protect customers and the studio, ")}<strong>{t("δεν γίνονται δεκτές επιστροφές", "returns are not accepted")}</strong>{t(" στις εξής περιπτώσεις:", " in the following cases:")}</p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-900 font-medium">
                  <li>
                    <strong>{t("Σκουλαρίκια:", "Earrings:")}</strong>{t(" Για αυστηρούς λόγους προστασίας της υγείας και υγιεινής, τα σκουλαρίκια δεν επιστρέφονται εφόσον έχει ανοιχτεί η συσκευασία τους.", " For health and hygiene reasons, earrings cannot be returned once their packaging has been opened.")}</li>
                  <li>
                    <strong>{t("Ειδικές / Custom Παραγγελίες:", "Custom orders:")}</strong>{t(" Δημιουργίες και αντικείμενα που κατασκευάστηκαν κατόπιν παραγγελίας με προσωποποιημένη επιγραφή, συγκεκριμένη προσαρμογή μεγέθους ή ειδικό σχέδιο της δικής σας επιθυμίας.", " Pieces made to order with a personalized inscription, a specific size adjustment, or a design of your choice.")}</li>
                  <li>
                    <strong>{t("Προϊόντα που έχουν φορεθεί, χρησιμοποιηθεί ή φέρουν σημάδια φθοράς.", "Items that have been worn or used, or show signs of wear.")}</strong>
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("4. Διαδικασία Επιστροφής & Επιστροφή Χρημάτων", "4. Returns and refunds")}</h4>
                <p>{t("Για να εκκινήσετε επιστροφή, επικοινωνήστε προηγουμένως στο ", "To start a return, first email ")}<strong>aristeaamnta@gmail.com</strong>{t(" αναφέροντας τον αριθμό της παραγγελίας σας.", " with your order number.")}</p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-stone-600">
                  <li>{t("Τα έξοδα αποστολής για την επιστροφή του προϊόντος βαρύνουν τον αγοραστή.", "The buyer pays return shipping costs.")}</li>
                  <li>{t("Μόλις παραληφθεί και ελεγχθεί το επιστραφέν αντικείμενο / δημιουργία, η επιστροφή του αντιτίμου πραγματοποιείται εντός 5–7 εργάσιμων ημερών μέσω της αρχικής μεθόδου πληρωμής (επιστροφή στην κάρτα σας μέσω Stripe).", "Once the returned item has been received and inspected, we issue a refund within 5–7 business days to your original payment method, including card refunds through Stripe.")}</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">{t("5. Ελαττωματικό Προϊόν ή Φθορά κατά τη Μεταφορά", "5. Defects or damage in transit")}</h4>
                <p>{t("Στην εξαιρετικά σπάνια περίπτωση που κάποιο δέμα φτάσει με ζημιά ή ελάττωμα, επικοινωνήστε μαζί μας εντός 48 ωρών από την παραλαβή στο ", "If a parcel arrives damaged or defective, email us within 48 hours of receipt at ")}<strong>aristeaamnta@gmail.com</strong>{t(" με φωτογραφία του αντικειμένου, και θα φροντίσουμε για την άμεση αντικατάστασή του χωρίς καμία επιβάρυνσή σας.", " with a photograph of the item. We’ll arrange a prompt replacement at no cost to you.")}</p>
              </section>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="text-[11px] text-stone-500 font-sans">{t("Επικοινωνία: aristeaamnta@gmail.com • Ελλάδα", "Contact: aristeaamnta@gmail.com · Greece")}</div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition"
          >
            Εντάξει, κατάλαβα
          </button>
        </div>
      </div>
    </div>
  );
};

