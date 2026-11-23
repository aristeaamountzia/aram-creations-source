import copy from './sites-english-copy.json';
import { isGreekText, type PublicLocale } from './public-locale';

type Translation = { title?: string[]; description?: string[] };
const products: Record<string, Translation> = copy.products;
const terms: Record<string, string> = {
  ...copy.dictionary,
  'όλα': 'All',
  'διαθέσιμο': 'Available',
  'μη διαθέσιμο': 'Unavailable',
  'πουλήθηκε': 'Sold',
  'εκτός αποθέματος': 'Out of stock',
  'κατόπιν παραγγελίας': 'Made to order',
  'βραχιόλια': 'Bracelets',
  'δαχτυλίδια': 'Rings',
  'χειροποίητα κοσμήματα': 'Handmade jewelry',
  'νέα συλλογή': 'New collection',
  'καρφίτσες': 'Brooches',
  'θήκες κινητών': 'Phone cases',
  'αληθινά αποξηραμένα άνθη': 'Real dried flowers',
  'αλυσίδα από ανοξείδωτο ατσάλι': 'Stainless steel chain',
  'φύλλα χρυσού 24κ': '24K gold leaf',
  'υγρό γυαλί uv': 'UV resin',
  'υποαλλεργικό ατσάλι 316l': 'Hypoallergenic 316L steel',
  'βότσαλα πάρου': 'Paros pebbles',
  'ημιπολύτιμοι λίθοι': 'Semiprecious stones',
  'γκρι': 'Gray',
  'τυρκουάζ': 'Turquoise',
  'μαύρη τουρμαλίνη': 'Black tourmaline',
  'ασήμι 925 επιμεταλλωμένο': '925 silver plated',
  'χρωστικές αλκοόλης': 'Alcohol inks',
  'ατσάλι': 'Steel',
  'βαθύ μπλε': 'Deep blue',
  'θήκη σιλικόνης tpu': 'TPU case',
  'υγρό γυαλί ανθεκτικό στις πτώσεις': 'Impact-resistant clear resin',
  'σε εξέλιξη': 'In progress',
  'ολοκληρωμένο': 'Completed',
  'πανεπιστημιακό έργο': 'University project',
  'ιδιωτική συλλογή': 'Private collection',
  'σε εξέλιξη (wip)': 'Work in progress',
  'έκθεση bauhaus': 'Bauhaus exhibition',
  'προσωπική συλλογή': 'Personal collection',
  'ξύλινες δημιουργίες (laser cut)': 'Laser-cut wooden pieces',
  'υπό κατασκευή': 'In production',
};

const canonical = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('el');

export function textFingerprint(value: string) {
  let hash = 2166136261;
  for (const character of canonical(value)) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  return (hash >>> 0).toString(36);
}

interface PublicCopy {
  id: string;
  name?: string;
  title?: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
}

export function localizedName(item: PublicCopy, locale: PublicLocale) {
  const original = item.name || item.title || '';
  if (locale === 'el') return original;
  const saved = products[item.id]?.title;
  return item.titleEn?.trim() || (saved?.[0] === textFingerprint(original) ? saved[1] : original);
}

export function localizedDescription(item: PublicCopy, locale: PublicLocale) {
  const original = item.description || '';
  if (locale === 'el') return original;
  const saved = products[item.id]?.description;
  return item.descriptionEn?.trim() || (saved?.[0] === textFingerprint(original) ? saved[1] : original);
}

export function localizedTerm(term: string, locale: PublicLocale) {
  if (locale === 'el') return term;
  const key = canonical(term);
  return Object.hasOwn(terms, key) ? terms[key] : term;
}

export const publicTextLanguage = (value: string, locale: PublicLocale) =>
  locale === 'en' && isGreekText(value) ? 'el' : undefined;
