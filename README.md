# Aram Creations

Πηγαίος κώδικας για το κύριο Shop, το Portfolio και το Back Office του [aram-creations.netlify.app](https://aram-creations.netlify.app).

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

## AI Back Office

Το AI Back Office δέχεται `GEMINI_API_KEY` ή `GOOGLE_API_KEY` για Gemini. Από προεπιλογή χρησιμοποιεί Gemini· προαιρετικά, μπορείς να ορίσεις `OPENAI_API_KEY` και `AI_PROVIDER=auto` για fallback στο OpenAI αν αποτύχει το Gemini. Με `AI_PROVIDER=gemini` ή `AI_PROVIDER=openai` επιλέγεις έναν πάροχο, ενώ τα `AI_PROVIDER_ORDER`, `GEMINI_MODEL`, `GEMINI_MODEL_ORDER`, `OPENAI_MODEL` και `OPENAI_MODEL_ORDER` ρυθμίζουν τη σειρά παρόχων/μοντέλων. Οι διαθέσιμες ρυθμίσεις και τα προεπιλεγμένα μοντέλα υπάρχουν στο `.env.example`.

Για τοπική εκτέλεση, πρόσθεσε τις τιμές στο `.env` και επανεκκίνησε τον server. Στο Netlify, όρισε τις αντίστοιχες μεταβλητές στα environment variables που είναι διαθέσιμα στις Functions και κάνε νέο deploy. Το προαιρετικό `AI_BACKOFFICE_SECRET` είναι συμβατό με τον παλιότερο κωδικό `AI_ACCESS_CODE`· η σύνδεση ως Firebase admin αρκεί. Αν έχεις ενεργοποιήσει OpenAI fallback, τα δεδομένα και οι εικόνες Back Office μπορεί να σταλούν στην OpenAI όταν αποτύχει το Gemini. Μην προσθέσεις ποτέ πραγματικό key ή secret στο αποθετήριο ή στον κώδικα του frontend.
