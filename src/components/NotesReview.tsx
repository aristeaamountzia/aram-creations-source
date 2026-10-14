import React, { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { runTransaction } from '../lib/catalog-write';
import { persistHistory } from '../lib/catalog-history';
import { db } from '../firebase';
export function NotesReview({ id }: { id: string }) {
  const [product, setProduct] = useState<any>({}), [publicText, setPublicText] = useState(''), [internalText, setInternalText] = useState(''), [message, setMessage] = useState('');
  useEffect(() => onSnapshot(doc(db, 'jewelry', id), snap => { const data = snap.data() || {}; setProduct(data); setPublicText(data.notesReview?.publicDescription ?? data.description ?? ''); setInternalText(data.internalNotes ?? ''); }), [id]);
  async function save(state: string) {
    try {
      const ref = doc(db, 'jewelry', id);
      let before: any;
      await runTransaction(db, async tx => { const current = await tx.get(ref); if (!current.exists()) throw Error('Το προϊόν διαγράφηκε.'); const data = current.data(); if (data.notes !== product.notes || data.description !== product.description) throw Error('Τα κείμενα άλλαξαν. Έλεγξέ τα ξανά.'); before = data; tx.update(ref, { internalNotes: internalText, notesReview: { state, publicDescription: publicText } }); });
      const after = (await getDoc(ref)).data();
      await persistHistory(db, { id, collection: 'jewelry', type: 'NOTES_REVIEW', timestamp: new Date().toISOString(), before, after });
      setMessage(state === 'approved' ? 'Η δημόσια εκδοχή εγκρίθηκε. Τα αρχικά notes/description διατηρήθηκαν.' : 'Ο έλεγχος παραμένει σε εκκρεμότητα.');
    } catch (error: any) { setMessage(error.message); }
  }
  return <section className="my-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4" aria-label="Έλεγχος περιγραφής και σημειώσεων">
    <h3 className="font-bold">Έλεγχος δημόσιου κειμένου / εσωτερικών σημειώσεων</h3>
    <p className="text-xs">Τα αρχικά πεδία διατηρούνται. Καμία σημείωση δεν δημοσιεύεται αυτόματα.</p>
    <details><summary>Αρχικά κείμενα</summary><p className="whitespace-pre-wrap">description: {product.description || '(κενό)'}</p><p className="whitespace-pre-wrap">notes: {product.notes || '(κενό)'}</p></details>
    <label className="block">Δημόσια εκδοχή μετά τον έλεγχο<textarea className="block w-full border p-2" value={publicText} onChange={e => setPublicText(e.target.value)} /></label>
    <label className="block">Ξεχωριστές εσωτερικές σημειώσεις<textarea className="block w-full border p-2" value={internalText} onChange={e => setInternalText(e.target.value)} /></label>
    <button type="button" className="rounded border bg-white px-3 py-2" onClick={() => void save('approved')}>Έγκριση δημόσιας εκδοχής</button>
    <button type="button" className="ml-2 rounded border bg-white px-3 py-2" onClick={() => void save('pending')}>Επιστροφή σε εκκρεμότητα</button>
    <p role="status">{message}</p>
  </section>;
}
