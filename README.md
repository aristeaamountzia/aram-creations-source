# Aram Creations

Πηγαίος κώδικας για το κύριο Shop, το Portfolio και το Back Office του [aramcreationsofficial.netlify.app](https://aramcreationsofficial.netlify.app).

## Τοπική εκτέλεση

```bash
pnpm install
pnpm dev
```

## Έλεγχος και build

```bash
pnpm lint
pnpm build
```

Το Netlify χρησιμοποιεί το `netlify.toml` και το API endpoint βρίσκεται στο `netlify/functions/api.ts`. Οι κανόνες Firebase είναι στα `firestore.rules` και `storage.rules`. Μεταβλητές περιβάλλοντος, όπως `GEMINI_API_KEY`, ρυθμίζονται στις υπηρεσίες και δεν αποθηκεύονται στο αποθετήριο.

## Κατάλογος και ασφαλής δημοσίευση

Η συλλογή `jewelry` είναι ο πλήρης εσωτερικός κατάλογος. Shop και καλάθι διαβάζουν τη `shopCatalog`, η οποία περιέχει μόνο τα επιτρεπόμενα δημόσια πεδία. Κόστος, αποθήκη, δεσμεύσεις παραγγελιών, αρχικά αρχεία και κρυφά media αποκλείονται από την προβολή `src/lib/public-catalog.ts`.

Ο Firebase publisher `publishShopCatalog` ενημερώνει την προβολή για κάθε εγγραφή/διαγραφή του εσωτερικού καταλόγου, ανεξάρτητα από την προέλευση της αλλαγής. Διαβάζει την τρέχουσα κατάσταση μέσα σε συναλλαγή ώστε καθυστερημένα ή επαναλαμβανόμενα events να μην επαναφέρουν παλιότερα δεδομένα. Η ενημέρωση είναι ασύγχρονη· ο έλεγχος τιμών και διαθεσιμότητας στο checkout χρησιμοποιεί πάντα τον εσωτερικό κατάλογο. Likes/views περνούν από περιορισμένο server endpoint με αποφυγή διπλής καταμέτρησης και όριο αιτημάτων.

Κατά την πρώτη μετάβαση απαιτείται η εξής σειρά, ώστε το δημόσιο site να έχει δεδομένα πριν αλλάξει συλλογή:

1. `npm ci --prefix functions/catalog` και `firebase deploy --only functions:catalog --project aramcreations-e1529`.
2. Με τοπικά διαπιστευτήρια εκτός Git: `npx tsx scripts/sync-public-catalog.ts --project=aramcreations-e1529`.
3. Προσωρινοί κανόνες που επιτρέπουν ανάγνωση και των δύο καταλόγων, κατόπιν δημοσίευση του νέου Netlify build.
4. Επιβεβαίωση Shop/καλαθιού και εγκατάσταση των τελικών `firestore.rules` που κλείνουν τη δημόσια πρόσβαση στη `jewelry`.

Οι εντολές αφορούν αποκλειστικά τη βάση `(default)`. Οι άλλες βάσεις του project δεν αποτελούν μέρος αυτής της εφαρμογής. Επόμενες αλλαγές μόνο στο frontend δεν χρειάζονται επανάληψη της αρχικής μετάβασης. Η Function απαιτεί ενεργό billing και καταναλώνει Firestore/Functions πόρους ανά ενημέρωση.

Τα backups καταλόγου αποθηκεύουν εγγραφές και συνδέσμους media, όχι αντίγραφα των ίδιων των αρχείων ή πλήρες backup παραγγελιών/ιστορικού. Ο καθαρισμός επανελέγχει τις αναφορές και διατηρεί αρχεία που χρειάζονται το πρόσφατο ιστορικό και οι τρέχουσες εγγραφές. Αποφύγετε παράλληλη επαναφορά/upload κατά τη διαγραφή: Firestore και Storage δεν υποστηρίζουν κοινή ατομική συναλλαγή.

## Δομή Back Office

Η `BackOfficeView.tsx` συντονίζει τις ενότητες του Back Office. Στον φάκελο `src/components/backoffice/` βρίσκονται:

- `useCatalogHistory.ts` και `CatalogHistoryDialog.tsx`: τοπική αναίρεση/επαναφορά, ιστορικό cloud και εμφάνιση εκδόσεων. Η επαναφορά περνά από τον κοινό μηχανισμό `src/lib/catalog-history.ts`, που προστατεύει ενεργές παραγγελίες και νεότερες αλλαγές.
- `useVintedReviews.ts` και `VintedReviewsSettings.tsx`: συνδρομή στις αξιολογήσεις, συγχρονισμός με admin token και εμφάνιση προόδου/σφαλμάτων.
- `image-processing.ts`: συμπίεση εικόνων με διατήρηση αναλογιών και αμετάβλητων GIF.
- `catalog-config.ts` και `icons.tsx`: προεπιλογές/επιλογές καταλόγου και υπάρχοντα εικονίδια.

Τα δύο hooks παραμένουν στο επίπεδο της `BackOfficeView`, ακόμη και όταν τα αντίστοιχα παράθυρα είναι κλειστά. Έτσι διατηρούνται οι συνδρομές, τα badges, οι εκκρεμείς συγχρονισμοί και η κατάσταση αναίρεσης κατά την εναλλαγή ενοτήτων. Οι νέες ενότητες ελέγχονται από το `npm run lint` χωρίς `@ts-nocheck`.

## AI Back Office

Το AI Back Office δέχεται `GEMINI_API_KEY` ή `GOOGLE_API_KEY` για Gemini. Από προεπιλογή χρησιμοποιεί Gemini· προαιρετικά, μπορείς να ορίσεις `OPENAI_API_KEY` και `AI_PROVIDER=auto` για fallback στο OpenAI αν αποτύχει το Gemini. Με `AI_PROVIDER=gemini` ή `AI_PROVIDER=openai` επιλέγεις έναν πάροχο, ενώ τα `AI_PROVIDER_ORDER`, `GEMINI_MODEL`, `GEMINI_MODEL_ORDER`, `OPENAI_MODEL` και `OPENAI_MODEL_ORDER` ρυθμίζουν τη σειρά παρόχων/μοντέλων. Οι διαθέσιμες ρυθμίσεις και τα προεπιλεγμένα μοντέλα υπάρχουν στο `.env.example`.

Για τοπική εκτέλεση, πρόσθεσε τις τιμές στο `.env` και επανεκκίνησε τον server. Στο Netlify, όρισε τις αντίστοιχες μεταβλητές στα environment variables που είναι διαθέσιμα στις Functions και κάνε νέο deploy. Το προαιρετικό `AI_BACKOFFICE_SECRET` είναι συμβατό με τον παλιότερο κωδικό `AI_ACCESS_CODE`· η σύνδεση ως Firebase admin αρκεί. Αν έχεις ενεργοποιήσει OpenAI fallback, τα δεδομένα και οι εικόνες Back Office μπορεί να σταλούν στην OpenAI όταν αποτύχει το Gemini. Μην προσθέσεις ποτέ πραγματικό key ή secret στο αποθετήριο ή στον κώδικα του frontend.
