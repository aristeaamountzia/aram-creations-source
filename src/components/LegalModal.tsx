import React, { useEffect } from 'react';
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
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (type) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [type]);

  if (!type) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200"
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
              <h3 className="text-base font-bold text-stone-900 tracking-tight" style={{ fontFamily: 'Jura, sans-serif' }}>
                {type === 'terms' && 'Όροι Χρήσης & Συναλλαγών'}
                {type === 'privacy' && 'Πολιτική Απορρήτου & Δεδομένων (GDPR)'}
                {type === 'returns' && 'Πολιτική Αποστολών & Επιστροφών'}
              </h3>
              <p className="text-[11px] text-stone-500 font-sans">
                Aram Creations • Χειροποίητες Δημιουργίες & Κοσμήματα
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Κλείσιμο παραθύρου"
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
              <span>Όροι Χρήσης</span>
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
              <span>Πολιτική Απορρήτου</span>
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
              <span>Αποστολές & Επιστροφές</span>
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-stone-700 leading-relaxed font-sans">
          
          {/* CONTENT: TERMS */}
          {type === 'terms' && (
            <div className="space-y-5">
              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  1. Ταυτότητα Εργαστηρίου & Δημιουργού
                </h4>
                <p>
                  Ο διαδικτυακός χώρος <strong>aram.creations</strong> αποτελεί ανεξάρτητο καλλιτεχνικό εργαστήριο χειροποίητων κοσμημάτων και εικαστικών δημιουργιών (δημιουργός: Αρίστεα Μουντζιά), με έδρα τον Βόλο Μαγνησίας. Η περιήγηση στον ιστότοπο και η υποβολή παραγγελίας συνεπάγεται την πλήρη αποδοχή των παρακάτω όρων.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  2. Χειροποίητος & Μοναδικός Χαρακτήρας Προϊόντων
                </h4>
                <p>
                  Όλα τα κοσμήματα και τα έργα κατασκευάζονται στο χέρι με φυσικά στοιχεία, πραγματικά αποξηραμένα άνθη, ημιπολύτιμους λίθους, υγρό γυαλί / ρητίνη, ασήμι 925 και υποαλλεργικό ανοξείδωτο ατσάλι.
                </p>
                <p className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-stone-600">
                  Λόγω της φυσικής προέλευσης των υλικών και της χειροποίητης φύσης της διαδικασίας, κάθε κομμάτι είναι μοναδικό. Ενδέχεται να υφίστανται ανεπαίσθητες φυσικές διαφοροποιήσεις σε σχέση με τη φωτογραφία του καταλόγου, στοιχείο που υπογραμμίζει την αυθεντικότητά του.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  3. Πνευματική Ιδιοκτησία & Προστασία Σχεδίων
                </h4>
                <p>
                  Όλα τα πρωτότυπα σχέδια κοσμημάτων, τα γλυπτά, οι φωτογραφίες, τα γραφικά, τα κείμενα και τα λογότυπα που εμφανίζονται στο Aram Creations αποτελούν πνευματική ιδιοκτησία της δημιουργού και προστατεύονται από τις ελληνικές και διεθνείς διατάξεις περί πνευματικής ιδιοκτησίας. Απαγορεύεται αυστηρά οποιαδήποτε αντιγραφή, αναπαραγωγή ή εμπορική χρήση χωρίς προηγούμενη έγγραφη άδεια.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  4. Τρόποι Πληρωμής & Ασφάλεια Συναλλαγών
                </h4>
                <p>
                  Οι πληρωμές στο κατάστημά μας πραγματοποιούνται με απόλυτη διαφάνεια και ασφάλεια:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-1 text-stone-600">
                  <li>
                    <strong>Πληρωμή με Κάρτα / Ψηφιακά Πορτοφόλια:</strong> Διεκπεραιώνεται με κρυπτογράφηση TLS 256-bit μέσω της διεθνούς πλατφόρμας <strong>Stripe</strong> (Visa, Mastercard, Maestro, Apple Pay, Google Pay, Revolut Pay). Το Aram Creations δεν έχει καμία πρόσβαση στα στοιχεία της κάρτας σας.
                  </li>
                  <li>
                    <strong>IRIS Payments:</strong> Άμεση μεταφορά από λογαριασμό σε λογαριασμό μέσω του κινητού σας (χωρίς τραπεζικές χρεώσεις) με αναγραφή του αριθμού παραγγελίας.
                  </li>
                  <li>
                    <strong>Τραπεζική Κατάθεση:</strong> Απευθείας μεταφορά στον τραπεζικό λογαριασμό του εργαστηρίου.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  5. Τροποποίηση Όρων
                </h4>
                <p>
                  Το εργαστήριο διατηρεί το δικαίωμα να ενημερώνει ή να τροποποιεί τους παρόντες όρους και τις τιμές των δημιουργιών οποτεδήποτε, με άμεση ισχύ από την ανάρτησή τους στον ιστότοπο.
                </p>
              </section>
            </div>
          )}

          {/* CONTENT: PRIVACY */}
          {type === 'privacy' && (
            <div className="space-y-5">
              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  1. Αρχή Ελαχιστοποίησης & Σεβασμός Δεδομένων
                </h4>
                <p>
                  Στο <strong>Aram Creations</strong> σεβόμαστε απόλυτα την ιδιωτικότητά σας. Συλλέγουμε μόνο τα απολύτως αναγκαία προσωπικά στοιχεία που εισάγετε εσείς κατά την καταχώρηση της παραγγελίας σας:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-stone-600">
                  <li>Ονοματεπώνυμο</li>
                  <li>Διεύθυνση αποστολής (Οδός, Πόλη, Τ.Κ.)</li>
                  <li>Τηλέφωνο επικοινωνίας</li>
                  <li>Ηλεκτρονική διεύθυνση (Email)</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  2. Σκοπός Επεξεργασίας των Στοιχείων
                </h4>
                <p>
                  Τα παραπάνω στοιχεία χρησιμοποιούνται <strong>αποκλειστικά και μόνο</strong> για τους εξής σκοπούς:
                </p>
                <div className="space-y-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-800 shrink-0 mt-0.5" />
                    <span>Εκτέλεση, συσκευασία και αποστολή της παραγγελίας σας.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-800 shrink-0 mt-0.5" />
                    <span>Κοινοποίηση στη συνεργαζόμενη υπηρεσία ταχυμεταφοράς (BOX NOW ή Courier) ώστε να παραδοθεί το δέμα και να σας σταλεί ο κωδικός εντοπισμού ή ο κωδικός θυρίδας.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-800 shrink-0 mt-0.5" />
                    <span>Επικοινωνία μαζί σας σε περίπτωση ανάγκης διευκρίνισης για την παραγγελία σας (π.χ. προσαρμογή μεγέθους).</span>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  3. Μη Κοινοποίηση σε Τρίτους & Spam-Free Πολιτική
                </h4>
                <p>
                  Τα στοιχεία σας <strong>δεν πωλούνται, δεν παραχωρούνται, δεν ενοικιάζονται</strong> σε διαφημιστικές πλατφόρμες και δεν χρησιμοποιούνται ποτέ για αυτόματες ενοχλητικές διαφημίσεις (spam).
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  4. Cookies & Αποθήκευση
                </h4>
                <p>
                  Ο ιστότοπος χρησιμοποιεί αποκλειστικά τεχνικά απαραίτητα cookies συνεδρίας (session cookies / local storage) για τη διατήρηση των προϊόντων στο καλάθι αγορών σας. Δεν χρησιμοποιούμε επεμβατικά cookies παρακολούθησης προφίλ.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  5. Δικαιώματα Διαγραφής (GDPR)
                </h4>
                <p>
                  Έχετε ανά πάσα στιγμή το δικαίωμα να ζητήσετε ενημέρωση ή πλήρη διαγραφή των στοιχείων επικοινωνίας σας από τα αρχεία του εργαστηρίου, στέλνοντας ένα απλό μήνυμα στο email: <strong>aristeaamnta@gmail.com</strong>.
                </p>
              </section>
            </div>
          )}

          {/* CONTENT: RETURNS & SHIPPING */}
          {type === 'returns' && (
            <div className="space-y-5">
              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  1. Χρόνοι Προετοιμασίας & Αποστολής
                </h4>
                <p>
                  Κάθε κόσμημα ετοιμάζεται με προσοχή και συσκευάζεται σε προστατευτική συσκευασία δώρου:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-1 text-stone-600">
                  <li>
                    <strong>Ετοιμοπαράδοτα κομμάτια:</strong> Αποστολή εντός 1–2 εργάσιμων ημερών.
                  </li>
                  <li>
                    <strong>Χειροποίητα κατόπιν παραγγελίας:</strong> Χρόνος δημιουργίας 2–4 εργάσιμες ημέρες πριν την αποστολή.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  2. Τρόποι Παράδοσης & Κόστη
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-stone-900 text-[11px]">
                      <Truck className="w-3.5 h-3.5 text-stone-800" />
                      <span>BOX NOW Locker 24/7</span>
                    </div>
                    <p className="text-[11px] text-stone-600">
                      Κόστος 2,50 € • Παραλαβή 24/7 σε θυρίδα της επιλογής σας σε όλη την Ελλάδα.
                    </p>
                    <p className="text-[11px] font-bold text-emerald-700">
                      Δωρεάν για παραγγελίες από 45,00 € και άνω.
                    </p>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-stone-900 text-[11px]">
                      <Truck className="w-3.5 h-3.5 text-stone-800" />
                      <span>Courier (ACS / Speedex)</span>
                    </div>
                    <p className="text-[11px] text-stone-600">
                      Κόστος 4,00 € • Παράδοση στην πόρτα σας (1–3 εργάσιμες ημέρες).
                    </p>
                    <p className="text-[11px] font-bold text-emerald-700">
                      Δωρεάν για παραγγελίες από 50,00 € και άνω.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  3. Δικαίωμα Υπαναχώρησης (14 Ημερολογιακές Ημέρες)
                </h4>
                <p>
                  Έχετε το δικαίωμα να υπαναχωρήσετε από την αγορά σας εντός <strong>14 ημερολογιακών ημερών</strong> από την ημερομηνία παραλαβής της παραγγελίας, εφόσον το προϊόν διατηρείται στην αρχική του κατάσταση, αχρησιμοποίητο και στην πλήρη αρχική του συσκευασία.
                </p>
              </section>

              <section className="space-y-2.5 bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 text-amber-950">
                <h4 className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
                  <span>Σημαντικές Εξαιρέσεις από το Δικαίωμα Επιστροφής</span>
                </h4>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Βάσει της νομοθεσίας και για την προστασία των καταναλωτών και του εργαστηρίου, <strong>δεν γίνονται δεκτές επιστροφές</strong> στις εξής περιπτώσεις:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-900 font-medium">
                  <li>
                    <strong>Σκουλαρίκια:</strong> Για αυστηρούς λόγους προστασίας της υγείας και υγιεινής, τα σκουλαρίκια δεν επιστρέφονται εφόσον έχει ανοιχτεί η συσκευασία τους.
                  </li>
                  <li>
                    <strong>Ειδικές / Custom Παραγγελίες:</strong> Κοσμήματα που δημιουργήθηκαν με προσωποποιημένη επιγραφή, συγκεκριμένη προσαρμογή μεγέθους ή ειδικό σχέδιο κατόπιν δικής σας επιθυμίας.
                  </li>
                  <li>
                    <strong>Προϊόντα που έχουν φορεθεί, χρησιμοποιηθεί ή φέρουν σημάδια φθοράς.</strong>
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  4. Διαδικασία Επιστροφής & Επιστροφή Χρημάτων
                </h4>
                <p>
                  Για να εκκινήσετε επιστροφή, επικοινωνήστε προηγουμένως στο <strong>aristeaamnta@gmail.com</strong> αναφέροντας τον αριθμό της παραγγελίας σας.
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-stone-600">
                  <li>Τα έξοδα αποστολής για την επιστροφή του προϊόντος βαρύνουν τον αγοραστή.</li>
                  <li>
                    Μόλις παραληφθεί και ελεγχθεί το επιστραφέν κόσμημα, η επιστροφή του αντιτίμου πραγματοποιείται εντός 5–7 εργάσιμων ημερών μέσω της αρχικής μεθόδου πληρωμής (επιστροφή στην κάρτα μέσω Stripe ή τραπεζική κατάθεση).
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  5. Ελαττωματικό Προϊόν ή Φθορά κατά τη Μεταφορά
                </h4>
                <p>
                  Στην εξαιρετικά σπάνια περίπτωση που κάποιο δέμα φτάσει με ζημιά ή ελάττωμα, επικοινωνήστε μαζί μας εντός 48 ωρών από την παραλαβή στο <strong>aristeaamnta@gmail.com</strong> με φωτογραφία του αντικειμένου, και θα φροντίσουμε για την άμεση αντικατάστασή του χωρίς καμία επιβάρυνσή σας.
                </p>
              </section>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="text-[11px] text-stone-500 font-sans">
            Επικοινωνία: aristeaamnta@gmail.com • Βόλος
          </div>
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

