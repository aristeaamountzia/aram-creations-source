# Σχέδιο μετάβασης και ασφαλούς επαναφοράς — δεν έχει εγκριθεί για εκτέλεση

## Προϋποθέσεις

1. Επιβεβαίωση από το dashboard του Netlify του production branch, branch deploys και previews. Κανένα preview αυτού του branch δεν πρέπει να δείχνει στο πραγματικό Firebase. Επιβεβαίωση Node 22, IAM υπηρεσίας, Storage CORS για signed PUT με content-type και x-goog-if-generation-match, ορίων upload/streaming και λειτουργίας ranges στον πραγματικό hosting adapter.
2. Επιβεβαίωση Firebase admin claim ή επαληθευμένου owner email πριν περιοριστούν οι κανόνες. Καταγραφή όλων των νόμιμων writers/importers· οι μελλοντικές εγγραφές καταλόγου πρέπει να περνούν από τον gateway. Οι απευθείας admin SDK writers παρακάμπτουν rules και χρειάζονται ελεγχόμενη άδεια και συγχρονισμό.
3. Inventory όλων των owned media paths/tokens και εναλλακτικών αναφορών. Τα αρχεία που χρησιμοποιούν πολλά προϊόντα πρέπει να έχουν σωστό δημόσιο derivative ανά προβολή. Έλεγχος external links και μεγεθών χωρίς αποκάλυψη μυστικών. Καταγραφή ελλειπόντων αρχείων· ένα τέτοιο σφάλμα διακόπτει την αντίστοιχη δημοσίευση και δεν πρέπει να αγνοηθεί.
4. Αναφορά προϊόντων με notes ή ελλιπή description για ανθρώπινο review. Καμία αυτόματη αντιγραφή notes→description. Raw πεδία και IDs δεν μετατρέπονται. Η έγκριση δημόσιας εκδοχής διατηρεί ιδιωτικό before/after ιστορικό.
5. Ειδικός έλεγχος browser cache: το νέο cart καθαρίζει τα παλιά πλήρη προϊόντα, αλλά ήδη αποθηκευμένα admin drafts/cache σε συσκευές χρειάζονται τοπικό έλεγχο και ασφαλή καθαρισμό. Δεν προτείνεται διαγραφή πρωτοτύπων ή ιστορικού για αυτόν τον σκοπό.

## Πραγματικό μόνιμο backup — απαραίτητο πριν τη μετάβαση

Το rotating JSON backup δεν επαρκεί και το fixture restore δεν είναι έτοιμη υπηρεσία disaster recovery.

- Προστατευμένος ιδιωτικός προορισμός ανεξάρτητος από τις περιστρεφόμενες θέσεις, immutable μοναδικό ID ανά run, περιορισμένα δικαιώματα writer, retention/lock και δεύτερο ανεξάρτητο αντίγραφο.
- Συνεπές Firestore snapshot μέσω managed export ή εγκεκριμένου παγώματος εγγραφών. Απλή σειριακή απαρίθμηση εγγράφων όσο γίνονται αγορές δεν είναι συνεπές snapshot.
- Πλήρης κάλυψη προϊόντων/portfolio/settings, orders/reservations/notifications, history με όλα τα parts, public projections, private reviews, operation/media journals, πρωτοτύπων και derivatives. Auth/claims, rules, indexes, code commit και configuration versions καταγράφονται χωριστά. Μυστικά παραμένουν στον προστατευμένο μηχανισμό μυστικών.
- Media bytes, paths, content types, generations και provenance ανακλήσεων. Tokens και credentials στο backup θεωρούνται ευαίσθητα· δεν μπαίνουν στο repository ή δημόσια αναφορά.
- Manifest με counts και SHA-256 ανά αρχείο, download από τον πραγματικό προορισμό, επαλήθευση όλων των bytes και δοκιμή restore σε ξεχωριστό απομονωμένο project. Σύγκριση όλων των πεδίων/τύπων και references, όχι μόνο counts. Backup με αποτυχημένη επαλήθευση δεν εγκρίνεται.

Στο stage 2 εκτελείται ξανά create-only fixture backup/restore σε νέο namespace, με ιδιωτικά πεδία, projections και media bytes. Προστίθενται μεταγενέστερη παραγγελία και stock=7 πριν την επαναφορά και επιβεβαιώνεται ότι δεν αντικαθίστανται. Αυτό αποδεικνύει την απομονωμένη διαδικασία ελέγχου, όχι παραγωγική διάρκεια αποθήκευσης ή καθολική συνέπεια.

## Εγκεκριμένη μελλοντική διαδικασία — μικρά στάδια

1. Προετοιμασία υποψήφιων κανόνων, παραγωγικού code bundle και deterministic migration manifest σε απομονωμένο πραγματικό test project. Δοκιμή ανώνυμης πρόσβασης, admin, τιμών/availability, αποκλεισμού tokens, aliases και αποτυχίας/retry. Προστατευμένο preview μόνο με test configuration.
2. Παρουσίαση αποτελεσμάτων, verified backup και migration/rollback manifest για έγκριση. Κάθε πραγματική ανάκληση token ή αλλαγή παραγωγικού κανόνα απαιτεί αυτή την έγκριση.
3. Εγκεκριμένο maintenance/write window: παύση checkout/imports/background writers, έλεγχος ενεργών δεσμεύσεων και emails ώστε να μην επαναληφθούν. Λήψη τελικού συνεπούς backup και επαλήθευση πριν την πρώτη αλλαγή. Το UI-only κλείσιμο checkout δεν αρκεί· οι server writers πρέπει να σταματήσουν επίσης.
4. Συντονισμένη αλλαγή code/rules και δημόσιων read paths μέσα στο ίδιο παράθυρο. Ο κατάλογος μπορεί προσωρινά να είναι κενός ή κλειστός μέχρι να ολοκληρωθεί η προβολή· απαγορεύεται fallback στα ιδιωτικά canonical δεδομένα. Ενεργοποίηση `ARAM_PRIVACY_RELEASE_ENABLED` μόνο για τον εγκεκριμένο μηχανισμό. Υποψήφιοι κανόνες από tests/stage2 προάγονται μόνο μετά από ξεχωριστή έγκριση, όχι με το test script.
5. Reconcile/publication με ledger και επαλήθευση ανά προϊόν. Δημιουργία private derivatives, ανάκληση εγκεκριμένων source tokens και atomic projection. Οι ανακλήσεις Storage είναι ξεχωριστές από τη Firestore transaction: αποτυχία μπορεί να αφήσει ιδιωτικό token ήδη ανακλημένο χωρίς commit προβολής. Ο publisher αποτυγχάνει κλειστά και το admin preview χρησιμοποιεί authenticated πρόσβαση· απαιτείται retry και παρακολούθηση του manifest πριν επανέλθει η δημόσια εξυπηρέτηση. Έλεγχος counts, raw notes/description, IDs, τιμών, αποθέματος, παραγγελιών και πλήρους admin/export/history round trip.
6. Ανώνυμοι έλεγχοι πραγματικών read paths και παλιών URLs χωρίς δημιουργία πραγματικής παραγγελίας. Επανέναρξη writers μόνο μετά την επαλήθευση. Παρακολούθηση reconcile errors/cleanup/jobs, χρόνων και κόστους. Η τρέχουσα απλή ανακατασκευή όλου του καταλόγου κάθε πέντε λεπτά χρειάζεται μέτρηση πριν την παραγωγή, καθώς δημιουργεί νέα media derivatives/receipts.

Δεν αλλάζει η πολιτική αποθέματος, τα ιστορικά snapshots παραγγελιών ή οι επιλογές χρωμάτων/υλικών. Δεν αποστέλλονται δοκιμαστικά πραγματικά emails.

## Επαναφορά

- Πρώτα διακοπή νέων συγχρονισμών/writers και capture της τρέχουσας κατάστασης. Διάγνωση αν αφορά code, projection ή canonical πεδία.
- Διατήρηση ιδιωτικών canonical rules και token revocations. **Δεν γίνεται επιστροφή στο παλιό UI που διάβαζε δημόσια τα πλήρη jewelry/settings ούτε επαναφορά ανακλημένων public tokens.** Σε έκτακτο πρόβλημα χρησιμοποιείται ασφαλής maintenance έκδοση ή προηγούμενη ασφαλής public-projection έκδοση.
- Προβολές ανακατασκευάζονται από τα τρέχοντα canonical δεδομένα, αφού αποκατασταθεί ο publisher. Δεν αποκαθίστανται παλιά stock/availability από backup.
- Αν χρειάζεται αναστροφή συγκεκριμένου ελεγχόμενου canonical πεδίου, χρησιμοποιείται before/after journal και transactional compare με την αναμενόμενη μετατρεμμένη τιμή. Σύγκρουση ή ενεργή δέσμευση παραπέμπεται για έλεγχο. Απαγορεύεται wholesale restore προϊόντων πάνω σε live δεδομένα.
- Μεταγενέστερες orders, πληρωμές, stock/reservations και notification outbox δεν επανεγγράφονται από παλιό backup. Full disaster recovery εκτελείται σε νέο απομονωμένο namespace/project με ξεχωριστό σχέδιο replay νόμιμων μεταγενέστερων συναλλαγών πριν οποιοδήποτε cutover.
- Ιδιωτικά πρωτότυπα που διατηρήθηκαν χρησιμοποιούνται για rebuilding derivatives και authenticated admin χρήση. Physical purge και η πολιτική retention παραμένουν ξεχωριστή εργασία.
