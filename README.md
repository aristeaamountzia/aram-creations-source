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
