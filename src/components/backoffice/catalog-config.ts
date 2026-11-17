import { DEFAULT_DESIGN_STUDIO } from '../../lib/design-studio';
import { DEFAULT_PORTFOLIO_DESIGN } from '../../lib/portfolio-settings';
import { isSoldItem } from '../../lib/stock-edit';

export const BASE_CATEGORIES = ['Κολιέ', 'Δαχτυλίδια', 'Σκουλαρίκια', 'Βραχιόλια', 'Καρφίτσες', 'Σετ', 'Θήκες Κινητών'];
export const BASE_STATUSES = ['Διαθέσιμο', 'Κρατημένο', 'Πουλήθηκε', 'Μη διαθέσιμο', 'Δωρίστηκε', 'Προσωπική Συλλογή', 'Υπό Κατασκευή'];
export const BASE_MATERIALS = ['Υγρό Γυαλί', 'Αποξηραμένα Άνθη', 'Φύλλα Χρυσού', 'Ασήμι 925', 'Ορείχαλκος', 'Ακρυλικά Χρώματα'];
export const BASE_PLATFORMS = ['Vinted', 'Wix', 'Instagram', 'Facebook', 'TikTok', 'Etsy', 'Φυσικό Κατάστημα'];
export const BASE_COLORS = ['Διάφανο', 'Μαύρο', 'Λευκό', 'Χρυσό', 'Ασημί', 'Κόκκινο', 'Μπλε', 'Πράσινο', 'Ροζ', 'Μωβ', 'Κίτρινο', 'Πολύχρωμο'];
export const COLOR_SWATCHES = {
    'Διάφανο': '#f8fafc', 'Μαύρο': '#171717', 'Λευκό': '#f8fafc', 'Χρυσό': '#c9a35e',
    'Ασημί': '#cbd5e1', 'Κόκκινο': '#b91c1c', 'Μπλε': '#2563eb', 'Πράσινο': '#2f855a',
    'Ροζ': '#ec9fb4', 'Μωβ': '#8b5cf6', 'Κίτρινο': '#eab308', 'Πολύχρωμο': '#d1d5db'
};
export const DEFAULT_SHOP_SETTINGS = {
    fontFamily: 'Jura',
    primaryColor: '#18181b',
    bgColor: '#fafaf9',
    textColor: '#18181b',
    heroBgColor: '#0c0a09',
    heroTitleColor: '#ffffff',
    heroSubtitleColor: '#a1a1aa',
    heroTitleSize: 'text-3xl md:text-4xl',
    borderRadius: '0.75rem',
    heroTitle: 'Χειροποίητες Δημιουργίες',
    heroSubtitle: 'Μοναδικές δημιουργίες από μια μεγάλη γκάμα υλικών και τεχνικών. Κάθε κομμάτι είναι φτιαγμένο στο χέρι με αγάπη.',
    heroVideoUrl: '',
    portfolioHeroVideoUrl: '',
    portfolioDesign: DEFAULT_PORTFOLIO_DESIGN,
    designStudio: DEFAULT_DESIGN_STUDIO,
    announcementEnabled: false,
    announcementText: '',
    announcementLink: '',
    catalogDensity: 'comfortable',
    colorPalette: COLOR_SWATCHES,
    categoryOrder: [...BASE_CATEGORIES, 'Άλλα'],
    fallbackLinks: {
        'Vinted': '', 'Wix': '', 'Instagram': '', 'Facebook': '', 'TikTok': '', 'Etsy': ''
    },
    aiAssistant: {
        backofficeEndpoint: ''
    },
    shippingSettings: {
        boxnowPrice: 2.50,
        boxnowFreeThreshold: 45.00,
        courierPrice: 4.00,
        courierFreeThreshold: 50.00,
        customNotes: ''
    }
};
export const MINIMAL_SHOP_SETTINGS = {
    ...DEFAULT_SHOP_SETTINGS,
    primaryColor: '#111111',
    bgColor: '#ffffff',
    textColor: '#111111',
    heroBgColor: '#ffffff',
    heroTitleColor: '#111111',
    heroSubtitleColor: '#57534e',
    borderRadius: '0.5rem',
    heroTitleSize: 'text-2xl md:text-3xl'
};
export const isAvailableItem = (item) => item.status === 'Διαθέσιμο' && (item.stock === undefined || item.stock === null || Number(item.stock) > 0);
export const isUnavailableItem = (item) => !isAvailableItem(item) && !isSoldItem(item);
export const splitTags = (value) => value.split(',').map(v => v.trim()).filter(Boolean);
export const mergeUnique = (current = [], incoming = []) => Array.from(new Set([...current, ...incoming].filter(Boolean)));
export const getEffectiveQty = (item) => Math.max(Number(item.stock || 0), 1);
export const readStoredList = (key) => {
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value.filter(Boolean) : [];
    } catch (err) {
        return [];
    }
};
export const writeStoredList = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(Array.from(new Set((value || []).filter(Boolean)))));
    } catch (err) {}
};
export const normalizeForMatch = (value = '') => value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[._\-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export const CATEGORY_KEYWORD_HINTS = {
    'Κολιέ': ['κολιε', 'περιδεραιο', 'μενταγιον', 'αλυσιδα', 'λαιμου', 'necklace', 'pendant', 'choker', 'chain', 'collar'],
    'Σκουλαρίκια': ['σκουλαρ', 'κρικοι', 'καρφωτα', 'αυτια', 'earring', 'earrings', 'studs', 'hoops', 'dangles', 'ear cuff'],
    'Βραχιόλια': ['βραχιολ', 'χειροπεδα', 'bracelet', 'bangle', 'cuff'],
    'Δαχτυλίδια': ['δαχτυλ', 'δαχτυλιδι', 'ring', 'rings'],
    'Καρφίτσες': ['καρφιτ', 'παραμανα', 'brooch', 'pin', 'lapel pin'],
    'Θήκες Κινητών': ['θηκη', 'κινητο', 'κινητου', 'τηλεφωνο', 'phone case', 'mobile case', 'case', 'phone', 'mobile'],
    'Σετ': ['σετ', 'ζευγαρι', 'σετακι', 'set', 'combo', 'pair', 'bundle'],
    'Μπρελόκ': ['μπρελοκ', 'κλειδια', 'keychain', 'key ring', 'keyring'],
    'Γούρια': ['γουρι', 'τυχερο', 'charm', 'lucky charm', 'good luck'],
    'Διακοσμητικά': ['διακοσμητικ', 'στολιδι', 'decor', 'decoration', 'ornament'],
    'Σελιδοδείκτες': ['σελιδοδεικ', 'bookmark', 'book mark'],
    'Μαγνητάκια': ['μαγνητ', 'magnet', 'fridge magnet']
};
