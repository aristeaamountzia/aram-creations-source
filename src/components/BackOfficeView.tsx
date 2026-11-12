// @ts-nocheck
import { sanitizeVintedDescription as stripVintedCondition } from '../lib/vinted-sanitizer';
import { ImageLightbox } from './ImageLightbox';
import { CatalogControls } from './CatalogControls';
import { PortfolioDesignSettings } from './PortfolioDesignSettings';
import { DesignStudioSettings } from './DesignStudioSettings';
import { DEFAULT_DESIGN_STUDIO } from '../lib/design-studio';
import { DEFAULT_PORTFOLIO_DESIGN, normalizePortfolioDesign, validatePortfolioDesign } from '../lib/portfolio-settings';
import { PortfolioHero, portfolioHeroVideoUrl, isKnownUnplayableHevcHeroUrl, TRANSCODED_HERO_H264_PATH } from './PortfolioHero';
import { Check, X, Star, BadgeCheck, RefreshCw, MessageSquare, ExternalLink, CornerDownRight } from 'lucide-react';
import React, { useState, useMemo, useEffect, useRef } from "react";
import { persistHistory, loadHistory, restoreHistory } from '../lib/catalog-history';
import { notifyOperationSuccess, notifyOperationError } from '../lib/sound-notifications';
import { CatalogBackups } from './CatalogBackups';
import { CatalogExcelExport } from './CatalogExcelExport';
import { FirebaseMediaCleanup } from './FirebaseMediaCleanup';
import { OrdersManager } from './OrdersManager';
import { VintedRefresh } from './VintedRefresh';
import { MediaDownload } from './MediaDownload';
import { MediaManager } from './media/MediaManager';
import { useMediaUpload } from './media/useMediaUpload';
import { VideoUploadStatus } from './VideoUploadStatus';
import { prepareVideoUpload } from '../lib/video-compression';
import { inferVideoContentType, VIDEO_UPLOAD_HELP } from '../lib/video-policy';
import { editableBlob } from '../lib/media-files';
import { validateMediaFile, validatePreparedMedia, verifyStoredMedia } from '../lib/media-validation';
import { vintedSourceUrl } from '../lib/vinted-refresh';
import { findVintedImportDuplicate } from '../lib/vinted-import';
import { buildCsv, downloadCsv } from '../lib/csv-export';
import { db, auth, storage } from "../firebase";
import {
  collection,
  doc,
  writeBatch,
  onSnapshot,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy, limit, getDoc
} from "firebase/firestore";
import {
  ref as firebaseRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { ART_ITEMS } from "../data";
import { PortfolioManager } from './PortfolioManager';

interface BackOfficeViewProps {
  onExit?: () => void;
}

        const IconPlus = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>;
        const IconSettings = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>;
        const IconTrash = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>;
        const IconEdit = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>;
        const IconEye = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>;
        const IconX = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>;
        const IconImage = () => <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>;
        const IconGrid = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>;
        const IconList = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>;
        const IconBox = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>;
        const IconDownload = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>;
        const IconClone = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>;
        const IconBolt = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>;
        const IconExternalLink = () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>;
        const IconGripVertical = () => <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M8 5v.01M8 12v.01M8 19v.01"></path></svg>;
        const IconUndo = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>;
        const IconCheck = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>;

        const BASE_CATEGORIES = ['Κολιέ', 'Δαχτυλίδια', 'Σκουλαρίκια', 'Βραχιόλια', 'Καρφίτσες', 'Σετ', 'Θήκες Κινητών'];
        const BASE_STATUSES = ['Διαθέσιμο', 'Κρατημένο', 'Πουλήθηκε', 'Μη διαθέσιμο', 'Δωρίστηκε', 'Προσωπική Συλλογή', 'Υπό Κατασκευή'];
        const BASE_MATERIALS = ['Υγρό Γυαλί', 'Αποξηραμένα Άνθη', 'Φύλλα Χρυσού', 'Ασήμι 925', 'Ορείχαλκος', 'Ακρυλικά Χρώματα'];
        const BASE_PLATFORMS = ['Vinted', 'Wix', 'Instagram', 'Facebook', 'TikTok', 'Etsy', 'Φυσικό Κατάστημα'];
        const BASE_COLORS = ['Διάφανο', 'Μαύρο', 'Λευκό', 'Χρυσό', 'Ασημί', 'Κόκκινο', 'Μπλε', 'Πράσινο', 'Ροζ', 'Μωβ', 'Κίτρινο', 'Πολύχρωμο'];
        const COLOR_SWATCHES = {
            'Διάφανο': '#f8fafc', 'Μαύρο': '#171717', 'Λευκό': '#f8fafc', 'Χρυσό': '#c9a35e',
            'Ασημί': '#cbd5e1', 'Κόκκινο': '#b91c1c', 'Μπλε': '#2563eb', 'Πράσινο': '#2f855a',
            'Ροζ': '#ec9fb4', 'Μωβ': '#8b5cf6', 'Κίτρινο': '#eab308', 'Πολύχρωμο': '#d1d5db'
        };
        const DEFAULT_SHOP_SETTINGS = {
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
        const MINIMAL_SHOP_SETTINGS = {
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
        const isSoldItem = (item) => item.status === 'Πουλήθηκε';
        const isAvailableItem = (item) => item.status === 'Διαθέσιμο' && (item.stock === undefined || item.stock === null || Number(item.stock) > 0);
        const isUnavailableItem = (item) => !isAvailableItem(item) && !isSoldItem(item);
        const splitTags = (value) => value.split(',').map(v => v.trim()).filter(Boolean);
        const mergeUnique = (current = [], incoming = []) => Array.from(new Set([...current, ...incoming].filter(Boolean)));
        const getEffectiveQty = (item) => Math.max(Number(item.stock || 0), 1);
        const readStoredList = (key) => {
            try {
                const value = JSON.parse(localStorage.getItem(key) || '[]');
                return Array.isArray(value) ? value.filter(Boolean) : [];
            } catch (err) {
                return [];
            }
        };
        const writeStoredList = (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(Array.from(new Set((value || []).filter(Boolean)))));
            } catch (err) {}
        };
        const normalizeForMatch = (value = '') => value
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[._\-_/]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const CATEGORY_KEYWORD_HINTS = {
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

        // --- ΣΥΝΑΡΤΗΣΗ ΑΥΤΟΜΑΤΗΣ ΣΥΜΠΙΕΣΗΣ ΕΙΚΟΝΩΝ ---
        const compressImage = async (file) => {
            const detected = await validateMediaFile(file, 'image');
            // Canvas converts animated GIFs into one still frame. Keep GIFs intact.
            if (detected.mime === 'image/gif') {
                if (file.size > 30 * 1024 * 1024) throw new Error('Το GIF πρέπει να είναι έως 30 MB.');
                return file;
            }
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('Δεν διαβάστηκε η εικόνα.'));
                reader.onabort = () => reject(new Error('Η ανάγνωση εικόνας ακυρώθηκε.'));
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.onerror = () => reject(new Error('Δεν άνοιξε η εικόνα. Επίλεξε έγκυρο JPG, PNG, WebP, AVIF ή GIF.'));
                    img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const max_size = 1200;

                        if (width > height) {
                            if (width > max_size) {
                                height *= max_size / width;
                                width = max_size;
                            }
                        } else {
                            if (height > max_size) {
                                width *= max_size / height;
                                height = max_size;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) { reject(new Error('Δεν ξεκίνησε η επεξεργασία εικόνας.')); return; }
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);

                        canvas.toBlob((blob) => {
                            if (!blob?.size) { reject(new Error('Δεν δημιουργήθηκε έγκυρη εικόνα.')); return; }
                            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        }, 'image/jpeg', 0.8);
                    };
                };
            });
        };

        const compressImageBlob = async (blob, maxSize = 1400, quality = 0.85) => {
            if (!blob || !/^image\//i.test(blob.type || '')) return blob;
            if (blob.type === 'image/gif') return blob;

            return new Promise((resolve, reject) => {
                const objectUrl = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    try {
                        let width = img.naturalWidth || img.width;
                        let height = img.naturalHeight || img.height;
                        const ratio = Math.min(1, maxSize / Math.max(width, height));
                        width = Math.max(1, Math.round(width * ratio));
                        height = Math.max(1, Math.round(height * ratio));

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob((compressedBlob) => {
                            URL.revokeObjectURL(objectUrl);
                            resolve(compressedBlob || blob);
                        }, 'image/jpeg', quality);
                    } catch (err) {
                        URL.revokeObjectURL(objectUrl);
                        reject(new Error('Δεν συμπιέστηκε η εικόνα.'));
                    }
                };
                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('Η εικόνα δεν αποκωδικοποιείται.'));
                };
                img.src = objectUrl;
            });
        };

        export const BackOfficeView: React.FC<BackOfficeViewProps> = ({ onExit }) => {
            const [activeCollection, setActiveCollection] = useState<'jewelry' | 'portfolio' | 'orders'>('jewelry');
            const [firebaseReady, setFirebaseReady] = useState(false);
            const [authReady, setAuthReady] = useState(false);
            const [currentUser, setCurrentUser] = useState(null);
            const [adminEmail, setAdminEmail] = useState('');
            const [adminPassword, setAdminPassword] = useState('');
            const [isAdminClaim, setIsAdminClaim] = useState(false);
            const [isLoggingIn, setIsLoggingIn] = useState(false);
            const [loginError, setLoginError] = useState('');
            const [jewelryList, setJewelryList] = useState([]);
            const [isLoading, setIsLoading] = useState(true);
            const [catalogLoadError, setCatalogLoadError] = useState('');
            const [catalogRetryKey, setCatalogRetryKey] = useState(0);
            const [settingsLoadError, setSettingsLoadError] = useState('');
            const [isSaving, setIsSaving] = useState(false);
            const [undoStack, setUndoStack] = useState([]);
            const [redoStack, setRedoStack] = useState([]);
            const [showUndoToast, setShowUndoToast] = useState(false);
            const [showRedoToast, setShowRedoToast] = useState(false);
            const [versionHistory, setVersionHistory] = useState(() => {
                try {
                    const stored = JSON.parse(localStorage.getItem('aram_version_history') || '[]');
                    return Array.isArray(stored) ? stored : [];
                } catch (err) {
                    return [];
                }
            });
            const [isHistoryOpen, setIsHistoryOpen] = useState(false);
            const [historySaveError, setHistorySaveError] = useState('');
            useEffect(() => {
                if (!firebaseReady || !currentUser) return;
                return onSnapshot(query(collection(db, 'catalogHistory'), orderBy('timestamp', 'desc'), limit(100)), snapshot => {
                    setVersionHistory(previous => {
                        const cloud = snapshot.docs.map(row => row.data());
                        const signatures = new Set(cloud.map(row => `${row.timestamp}|${row.type}|${row.id}`));
                        return [...cloud, ...previous.filter(row => !row.cloudId && !signatures.has(`${row.timestamp}|${row.type}|${row.id}`))].sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0,200);
                    });
                }, () => setHistorySaveError('Δεν φορτώθηκε το ιστορικό από το cloud.'));
            }, [firebaseReady, currentUser]);

            const [statsFilter, setStatsFilter] = useState('all');
            const [uploadProgress, setUploadProgress] = useState(0);
            const [uploadStatus, setUploadStatus] = useState('');
            const [mediaPreparing, setMediaPreparing] = useState(false);
            const [videoProgress, setVideoProgress] = useState(null);
            const [videoCompressing, setVideoCompressing] = useState(false);
            const videoAbort = useRef(null);
            useEffect(() => () => videoAbort.current?.abort(), []);
            const prepareLocalVideo = async (file, options?: { stripAudio?: boolean }) => {
                const controller = new AbortController();
                videoAbort.current = controller;
                setVideoCompressing(true);
                try { return await prepareVideoUpload(file, setVideoProgress, controller.signal, options); }
                catch (error) { setVideoProgress({ text: error.message }); throw error; }
                finally { setVideoCompressing(false); videoAbort.current = null; }
            };

            const [customCategories, setCustomCategories] = useState(() => readStoredList('aram_custom_categories'));
            const [customCollections, setCustomCollections] = useState(() => readStoredList('aram_custom_collections'));
            const [customStatuses, setCustomStatuses] = useState(() => readStoredList('aram_custom_statuses'));
            const [customMaterials, setCustomMaterials] = useState(() => readStoredList('aram_custom_materials'));
            const [customPlatforms, setCustomPlatforms] = useState(() => readStoredList('aram_custom_platforms'));
            const [customColors, setCustomColors] = useState(() => readStoredList('aram_custom_colors'));
            const [statusOptionOrder, setStatusOptionOrder] = useState(() => readStoredList('aram_status_option_order'));
            const [collectionOptionOrder, setCollectionOptionOrder] = useState(() => readStoredList('aram_collection_option_order'));
            const [platformOptionOrder, setPlatformOptionOrder] = useState(() => readStoredList('aram_platform_option_order'));
            const [colorOptionOrder, setColorOptionOrder] = useState(() => readStoredList('aram_color_option_order'));
            const [materialOptionOrder, setMaterialOptionOrder] = useState(() => readStoredList('aram_material_option_order'));
            const [hiddenCategoryOptions, setHiddenCategoryOptions] = useState(() => readStoredList('aram_hidden_category_options'));
            const [hiddenStatusOptions, setHiddenStatusOptions] = useState(() => readStoredList('aram_hidden_status_options'));
            const [hiddenCollectionOptions, setHiddenCollectionOptions] = useState(() => readStoredList('aram_hidden_collection_options'));
            const [hiddenPlatformOptions, setHiddenPlatformOptions] = useState(() => readStoredList('aram_hidden_platform_options'));
            const [hiddenColorOptions, setHiddenColorOptions] = useState(() => readStoredList('aram_hidden_color_options'));
            const [hiddenMaterialOptions, setHiddenMaterialOptions] = useState(() => readStoredList('aram_hidden_material_options'));
            const [draggedFieldOption, setDraggedFieldOption] = useState(null);

            // --- SHOP SETTINGS STATE (ΠΛΗΡΕΣ) ---
            const [shopSettings, setShopSettings] = useState(DEFAULT_SHOP_SETTINGS);
            const [heroUploadStatus, setHeroUploadStatus] = useState('');
            const [portfolioHeroUploadStatus, setPortfolioHeroUploadStatus] = useState('');
            const [isSavingSettings, setIsSavingSettings] = useState(false);
            const [activeSettingsTab, setActiveSettingsTab] = useState('design');
            const [settingsSuccessMessage, setSettingsSuccessMessage] = useState('');
            const [activeFieldFilter, setActiveFieldFilter] = useState('all');
            const [draggedCategoryIdx, setDraggedCategoryIdx] = useState(null);
            const [smartSuggestions, setSmartSuggestions] = useState(null);
            const [selectedItemIds, setSelectedItemIds] = useState([]);
            const [selectionAnchorId, setSelectionAnchorId] = useState(null);
            const [lassoRect, setLassoRect] = useState(null);

            // --- VINTED REVIEWS STATE ---
            const [vintedReviewsData, setVintedReviewsData] = useState({
                stats: {
                    memberId: '231329281',
                    login: 'aramcreations',
                    feedbackCount: 10,
                    positiveFeedbackCount: 10,
                    ratingScore: 5.0,
                    itemCount: 106,
                    lastUpdated: ''
                },
                reviews: []
            });
            const [isSyncingVintedReviews, setIsSyncingVintedReviews] = useState(false);
            const [vintedSyncStep, setVintedSyncStep] = useState('');
            const [vintedSyncPercent, setVintedSyncPercent] = useState(0);
            const [vintedSyncError, setVintedSyncError] = useState(null);
            const [vintedSyncSuccess, setVintedSyncSuccess] = useState(null);

            useEffect(() => {
                const unsubscribe = onSnapshot(doc(db, 'settings', 'vinted_reviews'), (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        setVintedReviewsData(prev => ({
                            stats: data.stats || prev.stats,
                            reviews: Array.isArray(data.reviews) ? data.reviews : prev.reviews
                        }));
                    }
                }, () => {});
                return () => unsubscribe();
            }, []);

            const handleSyncVintedReviews = async () => {
                setIsSyncingVintedReviews(true);
                setVintedSyncError(null);
                setVintedSyncSuccess(null);
                setVintedSyncPercent(15);
                setVintedSyncStep('1/3: Σύνδεση με Vinted (@aramcreations)...');

                try {
                    setVintedSyncPercent(45);
                    setVintedSyncStep('2/3: Ανάκτηση κριτικών και βαθμολογιών...');
                    
                    const response = await fetch('/api/vinted-reviews/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ memberId: '231329281' })
                    });
                    
                    const payload = await response.json().catch(() => null);
                    
                    if (!response.ok || !payload?.ok) {
                        throw new Error(payload?.error || `Σφάλμα απόκρισης server (${response.status})`);
                    }

                    setVintedSyncPercent(85);
                    setVintedSyncStep('3/3: Ενημέρωση και αποθήκευση στο Firestore...');
                    
                    setVintedReviewsData({
                        stats: payload.stats,
                        reviews: payload.reviews
                    });
                    
                    setVintedSyncPercent(100);
                    setVintedSyncStep('Ολοκληρώθηκε επιτυχώς!');
                    setVintedSyncSuccess(`Συγχρονίστηκαν ${payload.reviews.length} αξιολογήσεις με βαθμολογία ${payload.stats.ratingScore || 5.0}!`);
                    notifyOperationSuccess('Συγχρονισμός Vinted', `Συγχρονίστηκαν ${payload.reviews.length} αξιολογήσεις με βαθμολογία ${payload.stats.ratingScore || 5.0}!`);
                } catch (err) {
                    setVintedSyncError(err.message || 'Αποτυχία συγχρονισμού αξιολογήσεων Vinted');
                    notifyOperationError('Σφάλμα Συγχρονισμού Vinted', err.message || 'Αποτυχία συγχρονισμού αξιολογήσεων Vinted');
                } finally {
                    setIsSyncingVintedReviews(false);
                }
            };
            const lassoStartRef = useRef(null);
            const lassoBaseSelectionRef = useRef([]);
            const productGridRef = useRef(null);
            const [isBulkOpen, setIsBulkOpen] = useState(false);
            const [bulkTab, setBulkTab] = useState('fields');
            const [bulkDraft, setBulkDraft] = useState({
                category: '',
                collection: '',
                shopPlacement: '',
                status: '',
                price: '',
                materials: [],
                colors: [],
                notes: ''
            });
            const [bulkFindText, setBulkFindText] = useState('');
            const [bulkReplaceText, setBulkReplaceText] = useState('');
            const [bulkFindScopes, setBulkFindScopes] = useState({
                name: true,
                notes: true,
                materials: false,
                colors: false,
                collection: false
            });
            const [bulkCaseSensitive, setBulkCaseSensitive] = useState(false);
            const [bulkWholeWord, setBulkWholeWord] = useState(false);
            const [bulkStock, setBulkStock] = useState('');
            const [bulkPriceAdjustmentMode, setBulkPriceAdjustmentMode] = useState('none');
            const [bulkPriceAdjustmentValue, setBulkPriceAdjustmentValue] = useState('');
            const [bulkTagMode, setBulkTagMode] = useState('append');

            const [searchQuery, setSearchQuery] = useState('');
            const [selectedCategory, setSelectedCategory] = useState('Όλα');
            const [selectedColor, setSelectedColor] = useState('Όλα');
            const [sortBy, setSortBy] = useState('shop_order');
            const [viewMode, setViewMode] = useState('grid');
            const [draggedProductId, setDraggedProductId] = useState(null);
            const [dragOverProductId, setDragOverProductId] = useState(null);

            const [isAddOpen, setIsAddOpen] = useState(false);
            const [isDetailOpen, setIsDetailOpen] = useState(false);
            const [isSettingsOpen, setIsSettingsOpen] = useState(false);
            const [activeFormTab, setActiveFormTab] = useState('form-basic');
            useEffect(() => { setVideoProgress(null); }, [isAddOpen, isSettingsOpen]);


            const [currentItem, setCurrentItem] = useState(null);
            const [isEditMode, setIsEditMode] = useState(false);
            const [activeDetailMediaIdx, setActiveDetailMediaIdx] = useState(0);

            const [formName, setFormName] = useState('');
            const [formCategory, setFormCategory] = useState('Κολιέ');
            const [formCollection, setFormCollection] = useState('');
            const [formStatus, setFormStatus] = useState('Διαθέσιμο');
            const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
            const [formPrice, setFormPrice] = useState('');
            const [formOriginalPrice, setFormOriginalPrice] = useState('');
            const [formCost, setFormCost] = useState('');
            const [formStock, setFormStock] = useState(1);
            const [formShopOrder, setFormShopOrder] = useState(0);
            const [formManualLikes, setFormManualLikes] = useState(0);
            const [formManualViews, setFormManualViews] = useState(0);
            const [formWeight, setFormWeight] = useState('');
            const [formDimensions, setFormDimensions] = useState('');
            const [formStorage, setFormStorage] = useState('');
            const [isCustomStorage, setIsCustomStorage] = useState(false);
            const [formMaterials, setFormMaterials] = useState([]);
            const [newMaterialInput, setNewMaterialInput] = useState('');
            const [formColorsArr, setFormColorsArr] = useState([]);
            const [newColorInput, setNewColorInput] = useState('');
            const [newColorHex, setNewColorHex] = useState('#c9a35e');

            const [formPurchaseLinks, setFormPurchaseLinks] = useState([]);
            const [newPurchaseSite, setNewPurchaseSite] = useState('Vinted');
            const [newPurchaseUrl, setNewPurchaseUrl] = useState('');
            const [isCustomPurchaseSite, setIsCustomPurchaseSite] = useState(false);

            const [formPostedPlatforms, setFormPostedPlatforms] = useState([]);
            const [newPostedSite, setNewPostedSite] = useState('Instagram');
            const [newPostedUrl, setNewPostedUrl] = useState('');
            const [newPostedVisible, setNewPostedVisible] = useState(false);
            const [isCustomPostedSite, setIsCustomPostedSite] = useState(false);

            const [formShopMediaList, setFormShopMediaList] = useState([]);
            const [formPrivateMediaList, setFormPrivateMediaList] = useState([]);
            const { prepareFiles: prepareEditorMediaFiles } = useMediaUpload({
                prepareImage: compressImage,
                prepareVideo: prepareLocalVideo
            });

            const closeItemEditor = () => {
                for (const media of [...formShopMediaList, ...formPrivateMediaList]) {
                    for (const candidate of [media?.url, media?.restoreBackup?.url]) {
                        if (typeof candidate === 'string' && candidate.startsWith('blob:')) URL.revokeObjectURL(candidate);
                    }
                }
                setIsAddOpen(false);
            };

            const [formNotes, setFormNotes] = useState('');
            const [aiProductPrompt, setAiProductPrompt] = useState('');
            const [aiProductDraft, setAiProductDraft] = useState(null);
            const [isAiProductWorking, setIsAiProductWorking] = useState(false);
            const [aiProductError, setAiProductError] = useState('');
            const [aiAccessCode, setAiAccessCode] = useState(() => {
                try {
                    return sessionStorage.getItem('aram_backoffice_ai_secret') || '';
                } catch (err) {
                    return '';
                }
            });
            const [showAiAccessCode, setShowAiAccessCode] = useState(false);
            const [isVintedImportOpen, setIsVintedImportOpen] = useState(false);

            // Global Escape key listener for all modals
            useEffect(() => {
                const handleKeyDown = (e: KeyboardEvent) => {
                    if (e.key === 'Escape') {
                        if (imageEditorTarget && !isApplyingImageEdit) { closeImageEditor(); return; }
                        if (isDetailOpen) { setIsDetailOpen(false); return; }
                        if (isBulkOpen) { setIsBulkOpen(false); return; }
                        if (isVintedImportOpen) { setIsVintedImportOpen(false); return; }
                        if (isSettingsOpen && !mediaPreparing && !isSavingSettings) { setIsSettingsOpen(false); return; }
                        if (isAddOpen && !isSaving && !mediaPreparing) { closeItemEditor(); return; }
                        if (isHistoryOpen) { setIsHistoryOpen(false); return; }
                    }
                };
                window.addEventListener('keydown', handleKeyDown);
                return () => window.removeEventListener('keydown', handleKeyDown);
            }, [isAddOpen, isBulkOpen, isSettingsOpen, isDetailOpen, isHistoryOpen, isVintedImportOpen, isSaving, mediaPreparing, isSavingSettings, formShopMediaList, formPrivateMediaList]);
            const [vintedLinksText, setVintedLinksText] = useState('');
            const [vintedImportItems, setVintedImportItems] = useState([]);
            const [vintedImportStatus, setVintedImportStatus] = useState('');
            const [vintedImportError, setVintedImportError] = useState('');
            const [isVintedImportWorking, setIsVintedImportWorking] = useState(false);
            const [isRefreshingSelectedVintedItems, setIsRefreshingSelectedVintedItems] = useState(false);
            const [vintedRefreshResult, setVintedRefreshResult] = useState(null);
            const [copyVintedImages, setCopyVintedImages] = useState(true);
            const [vintedPricingSettings, setVintedPricingSettings] = useState(() => {
                const defaults = { buyerFixed: 0.70, buyerPercent: 5, shippingMin: 1.55, rounding: 'up_050' };
                try {
                    const saved = JSON.parse(localStorage.getItem('aram_vinted_fee_settings') || 'null');
                    return saved && typeof saved === 'object' ? { ...defaults, ...saved } : defaults;
                } catch {
                    return defaults;
                }
            });
            const [vintedPreviewImage, setVintedPreviewImage] = useState(null);
            const [imageEditorTarget, setImageEditorTarget] = useState(null);
            const [imageEditorError, setImageEditorError] = useState('');
            const [imageEditorSettings, setImageEditorSettings] = useState({ rotate: 0, zoom: 1, panX: 0, panY: 0, brightness: 100, contrast: 100, cropAspect: 'square' });
            const [imageEditorImageInfo, setImageEditorImageInfo] = useState({ width: 0, height: 0 });
            const [isApplyingImageEdit, setIsApplyingImageEdit] = useState(false);
            const imageEditorDragRef = useRef(null);
            const productDragAutoScrollRef = useRef({ frame: null, speed: 0 });

            const [isCustomCategory, setIsCustomCategory] = useState(false);
            const [isCustomCollection, setIsCustomCollection] = useState(false);
            const [isCustomStatus, setIsCustomStatus] = useState(false);

            const lastAction = undoStack[undoStack.length - 1] || null;
            const redoAction = redoStack[redoStack.length - 1] || null;

            const pushVersionHistory = (entry) => {
                const historyEntry = {
                    ...entry,
                    localId: crypto.randomUUID(),
                    timestamp: new Date().toISOString()
                };
                void persistHistory(db, historyEntry).catch(() => setHistorySaveError('Η αλλαγή έγινε, αλλά το ιστορικό δεν αποθηκεύτηκε στο cloud. Κράτησε ένα backup.'));
                setVersionHistory(prev => {
                    const next = [historyEntry, ...prev].slice(0, 200);
                    try {
                        localStorage.setItem('aram_version_history', JSON.stringify(next));
                    } catch (err) {}
                    return next;
                });
            };

            const buildHistoryEntryFromAction = (action, typeOverride) => {
                const actionType = typeOverride || action.type || 'ACTION';
                const base = {
                    type: actionType,
                    id: action.id || '',
                    name: action.name || action.message || 'Ενέργεια backoffice',
                    message: action.message || 'Ενέργεια backoffice'
                };

                if (action.type === 'DELETE') {
                    return {
                        ...base,
                        name: action.data?.name || base.name,
                        before: action.data || null,
                        after: null
                    };
                }

                if (action.type === 'UPDATE') {
                    return {
                        ...base,
                        before: action.oldData || action.data || null,
                        after: { ...(action.oldData || {}), ...(action.newData || action.data || {}) }
                    };
                }

                if (action.type === 'BULK_UPDATE') {
                    return {
                        ...base,
                        before: (action.items || []).map(item => ({ id: item.id, ...(item.oldData || {}) })),
                        after: (action.items || []).map(item => ({ id: item.id, ...(item.oldData || {}), ...(item.newData || {}) }))
                    };
                }

                if (action.type === 'BULK_DELETE') {
                    return {
                        ...base,
                        before: (action.items || []).map(item => ({ ...(item.data || item), id: item.id || item.data?.id })),
                        after: null
                    };
                }

                return base;
            };

            const pushUndoAction = (action, shouldLogHistory = true) => {
                setUndoStack(prev => [...prev, action].slice(-20));
                setRedoStack([]);
                setShowUndoToast(true);
                setShowRedoToast(false);
                if (shouldLogHistory && action.type !== 'DELETE') pushVersionHistory(buildHistoryEntryFromAction(action));
            };

            const stripClientId = (data = {}) => {
                const { id, ...docData } = data;
                return docData;
            };

            useEffect(() => {
                const checkFirebase = () => {
                    if (db && storage && auth && collection && setDoc && onAuthStateChanged) {
                        setFirebaseReady(true);
                        const loadingEl = document.getElementById("loading-message"); if (loadingEl) loadingEl.style.display = "none";
                    } else {
                        setTimeout(checkFirebase, 50);
                    }
                };
                checkFirebase();
            }, []);

            useEffect(() => {
                if (!firebaseReady) return;
                let authVersion = 0;
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    const version = ++authVersion;
                    setAuthReady(false);
                    setCurrentUser(user || null);
                    if (!user) {
                        setIsAdminClaim(false);
                        setJewelryList([]);
                        setIsLoading(false);
                        setAuthReady(true);
                        return;
                    }
                    user.getIdTokenResult(true).then((tokenResult) => {
                        if (version !== authVersion) return;
                        setIsAdminClaim(tokenResult.claims.admin === true || user.email?.toLowerCase() === 'aristeaamnta@gmail.com');
                    }).catch((error) => {
                        if (version !== authVersion) return;
                        console.error('Could not verify admin claim:', error);
                        setIsAdminClaim(false);
                    }).finally(() => {
                        if (version === authVersion) setAuthReady(true);
                    });
                });
                return () => { authVersion++; unsubscribe(); };
            }, [firebaseReady]);

            useEffect(() => writeStoredList('aram_custom_categories', customCategories), [customCategories]);
            useEffect(() => writeStoredList('aram_custom_collections', customCollections), [customCollections]);
            useEffect(() => writeStoredList('aram_custom_statuses', customStatuses), [customStatuses]);
            useEffect(() => writeStoredList('aram_custom_materials', customMaterials), [customMaterials]);
            useEffect(() => writeStoredList('aram_custom_platforms', customPlatforms), [customPlatforms]);
            useEffect(() => writeStoredList('aram_custom_colors', customColors), [customColors]);
            useEffect(() => writeStoredList('aram_status_option_order', statusOptionOrder), [statusOptionOrder]);
            useEffect(() => writeStoredList('aram_collection_option_order', collectionOptionOrder), [collectionOptionOrder]);
            useEffect(() => writeStoredList('aram_platform_option_order', platformOptionOrder), [platformOptionOrder]);
            useEffect(() => writeStoredList('aram_color_option_order', colorOptionOrder), [colorOptionOrder]);
            useEffect(() => writeStoredList('aram_material_option_order', materialOptionOrder), [materialOptionOrder]);
            useEffect(() => writeStoredList('aram_hidden_category_options', hiddenCategoryOptions), [hiddenCategoryOptions]);
            useEffect(() => writeStoredList('aram_hidden_status_options', hiddenStatusOptions), [hiddenStatusOptions]);
            useEffect(() => writeStoredList('aram_hidden_collection_options', hiddenCollectionOptions), [hiddenCollectionOptions]);
            useEffect(() => writeStoredList('aram_hidden_platform_options', hiddenPlatformOptions), [hiddenPlatformOptions]);
            useEffect(() => writeStoredList('aram_hidden_color_options', hiddenColorOptions), [hiddenColorOptions]);
            useEffect(() => writeStoredList('aram_hidden_material_options', hiddenMaterialOptions), [hiddenMaterialOptions]);

            useEffect(() => {
                if (!showUndoToast) return;
                const timer = setTimeout(() => setShowUndoToast(false), 6500);
                return () => clearTimeout(timer);
            }, [showUndoToast, lastAction?.message]);

            useEffect(() => {
                if (!showRedoToast) return;
                const timer = setTimeout(() => setShowRedoToast(false), 6500);
                return () => clearTimeout(timer);
            }, [showRedoToast, redoAction?.message]);

            useEffect(() => {
                if (!firebaseReady || !currentUser) return;
                setIsLoading(true);
                setCatalogLoadError('');
                const q = query(collection(db, "jewelry"), orderBy("createdAt", "desc"));
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const fetchedItems = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                    setJewelryList(fetchedItems);
                    setCatalogLoadError('');
                    setIsLoading(false);
                }, (error) => {
                    console.error('Could not load jewelry catalog:', error);
                    setCatalogLoadError(error?.message || 'Δεν ήταν δυνατή η φόρτωση του καταλόγου.');
                    setIsLoading(false);
                });
                return () => unsubscribe();
            }, [firebaseReady, currentUser, catalogRetryKey]);

            // Ανάκτηση των ρυθμίσεων Shop Design
            useEffect(() => {
                if (!firebaseReady || !currentUser) return;
                const settingsDocRef = doc(db, "settings", "shop");
                const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
                    setSettingsLoadError('');
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (Array.isArray(data.customFields?.customCategories)) setCustomCategories(data.customFields.customCategories);
                        if (Array.isArray(data.customFields?.customCollections)) setCustomCollections(data.customFields.customCollections);
                        if (Array.isArray(data.customFields?.customStatuses)) setCustomStatuses(data.customFields.customStatuses);
                        if (Array.isArray(data.customFields?.customMaterials)) setCustomMaterials(data.customFields.customMaterials);
                        if (Array.isArray(data.customFields?.customPlatforms)) setCustomPlatforms(data.customFields.customPlatforms);
                        if (Array.isArray(data.customFields?.customColors)) setCustomColors(data.customFields.customColors);
                        if (Array.isArray(data.customFields?.statusOptionOrder)) setStatusOptionOrder(data.customFields.statusOptionOrder);
                        if (Array.isArray(data.customFields?.collectionOptionOrder)) setCollectionOptionOrder(data.customFields.collectionOptionOrder);
                        if (Array.isArray(data.customFields?.platformOptionOrder)) setPlatformOptionOrder(data.customFields.platformOptionOrder);
                        if (Array.isArray(data.customFields?.colorOptionOrder)) setColorOptionOrder(data.customFields.colorOptionOrder);
                        if (Array.isArray(data.customFields?.materialOptionOrder)) setMaterialOptionOrder(data.customFields.materialOptionOrder);
                        if (Array.isArray(data.customFields?.hiddenCategoryOptions)) setHiddenCategoryOptions(data.customFields.hiddenCategoryOptions);
                        if (Array.isArray(data.customFields?.hiddenStatusOptions)) setHiddenStatusOptions(data.customFields.hiddenStatusOptions);
                        if (Array.isArray(data.customFields?.hiddenCollectionOptions)) setHiddenCollectionOptions(data.customFields.hiddenCollectionOptions);
                        if (Array.isArray(data.customFields?.hiddenPlatformOptions)) setHiddenPlatformOptions(data.customFields.hiddenPlatformOptions);
                        if (Array.isArray(data.customFields?.hiddenColorOptions)) setHiddenColorOptions(data.customFields.hiddenColorOptions);
                        if (Array.isArray(data.customFields?.hiddenMaterialOptions)) setHiddenMaterialOptions(data.customFields.hiddenMaterialOptions);
                        setShopSettings(prev => ({
                            visualTheme: data.visualTheme === 'classic' ? 'classic' : 'atelier',
                            fontFamily: data.fontFamily || prev.fontFamily,
                            primaryColor: data.primaryColor || prev.primaryColor,
                            bgColor: data.bgColor || prev.bgColor,
                            textColor: data.textColor || prev.textColor,
                            heroBgColor: data.heroBgColor || prev.heroBgColor,
                            heroTitleColor: data.heroTitleColor || prev.heroTitleColor,
                            heroSubtitleColor: data.heroSubtitleColor || prev.heroSubtitleColor,
                            heroTitleSize: data.heroTitleSize || prev.heroTitleSize,
                            borderRadius: data.borderRadius !== undefined ? data.borderRadius : prev.borderRadius,
                            heroTitle: data.heroTitle || prev.heroTitle,
                            heroSubtitle: data.heroSubtitle || prev.heroSubtitle,
                            heroVideoUrl: data.heroVideoUrl || '',
                            portfolioHeroVideoUrl: data.portfolioHeroVideoUrl || '',
                            portfolioDesign: normalizePortfolioDesign(data.portfolioDesign),
                            announcementEnabled: Boolean(data.announcementEnabled),
                            announcementText: data.announcementText || '',
                            announcementLink: data.announcementLink || '',
                            catalogDensity: ['compact', 'comfortable', 'spacious'].includes(data.catalogDensity) ? data.catalogDensity : 'comfortable',
                            colorPalette: { ...prev.colorPalette, ...(data.colorPalette || {}) },
                            categoryOrder: data.categoryOrder || prev.categoryOrder,
                            fallbackLinks: { ...prev.fallbackLinks, ...(data.fallbackLinks || {}) },
                            aiAssistant: { ...prev.aiAssistant, ...(data.aiAssistant || {}) },
                            designStudio: data.designStudio || prev.designStudio || DEFAULT_DESIGN_STUDIO
                        }));
                    }
                }, (error) => {
                    console.error('Could not load shop settings:', error);
                    setSettingsLoadError(error?.message || 'Δεν ήταν δυνατή η φόρτωση των ρυθμίσεων Shop.');
                });
                return () => unsubscribe();
            }, [firebaseReady, currentUser]);

            useEffect(() => {
                if (isAddOpen && !isEditMode && !isSaving) {
                    const timer = setTimeout(() => {
                        localStorage.setItem('aram_draft', JSON.stringify({
                            formName,
                            formCategory,
                            formCollection,
                            formStatus,
                            formDate,
                            formPrice,
                            formCost,
                            formStock,
                            formWeight,
                            formDimensions,
                            formStorage,
                            formNotes,
                            formMaterials,
                            formColorsArr,
                            formPurchaseLinks,
                            formPostedPlatforms
                        }));
                    }, 1000);
                    return () => clearTimeout(timer);
                }
            }, [formName, formCategory, formCollection, formStatus, formDate, formPrice, formCost, formStock, formWeight, formDimensions, formStorage, formNotes, formMaterials, formColorsArr, formPurchaseLinks, formPostedPlatforms, isAddOpen, isEditMode, isSaving]);

            const handleSaveSettings = async () => {
                setIsSavingSettings(true);
                setSettingsSuccessMessage('');
                try {
                    const settingsRef = doc(db, "settings", "shop");
                    if (shopSettings.portfolioHeroVideoUrl && shopSettings.portfolioHeroVideoUrl.trim() && !portfolioHeroVideoUrl(shopSettings.portfolioHeroVideoUrl)) {
                        throw new Error('Εισάγετε έγκυρο σύνδεσμο http ή https για το βίντεο Hero του Portfolio.');
                    }
                    if (shopSettings.heroVideoUrl && shopSettings.heroVideoUrl.trim() && !portfolioHeroVideoUrl(shopSettings.heroVideoUrl)) {
                        throw new Error('Εισάγετε έγκυρο σύνδεσμο http ή https για το βίντεο Hero του Shop.');
                    }
                    validatePortfolioDesign(normalizePortfolioDesign(shopSettings.portfolioDesign));
                    const beforeSettings = (await getDoc(settingsRef)).data() || {};
                    const ds = shopSettings.designStudio || DEFAULT_DESIGN_STUDIO;
                    const savedSettings = {
                        ...shopSettings,
                        designStudio: ds,
                        bgColor: ds.pageBackground || shopSettings.bgColor,
                        textColor: ds.ink || shopSettings.textColor,
                        primaryColor: ds.accent || shopSettings.primaryColor,
                        fontFamily: ds.fontFamily || shopSettings.fontFamily,
                        borderRadius: ds.cardRadius || shopSettings.borderRadius,
                        heroTitleColor: ds.heroTitleInk || shopSettings.heroTitleColor,
                        heroSubtitleColor: ds.heroBodyInk || shopSettings.heroSubtitleColor,
                        customFields: { customCategories, customCollections, customStatuses, customMaterials, customPlatforms, customColors, statusOptionOrder, collectionOptionOrder, platformOptionOrder, colorOptionOrder, materialOptionOrder, hiddenCategoryOptions, hiddenStatusOptions, hiddenCollectionOptions, hiddenPlatformOptions, hiddenColorOptions, hiddenMaterialOptions }
                    };
                    await setDoc(settingsRef, savedSettings, { merge: true });
                    pushVersionHistory({
                        type: 'SETTINGS_UPDATE',
                        id: 'settings/shop',
                        name: 'Ρυθμίσεις Συστήματος',
                        message: 'Επιτυχής ενημέρωση ρυθμίσεων συστήματος και εμφάνισης.',
                        collection: 'settings',
                        before: beforeSettings,
                        after: { ...beforeSettings, ...savedSettings }
                    });
                    setSettingsSuccessMessage('Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς! Οι αλλαγές εφαρμόστηκαν άμεσα.');
                    notifyOperationSuccess('Αποθήκευση Ρυθμίσεων', 'Οι ρυθμίσεις του καταστήματος αποθηκεύτηκαν επιτυχώς.');
                    setTimeout(() => setSettingsSuccessMessage(''), 5000);
                } catch (err) {
                    notifyOperationError('Σφάλμα Ρυθμίσεων', err.message || String(err));
                    alert("Σφάλμα κατά την αποθήκευση των ρυθμίσεων: " + (err.message || err));
                } finally {
                    setIsSavingSettings(false);
                }
            };

            const handleHeroVideoUpload = async (file, section = 'shop') => {
                if (!file || mediaPreparing) return;
                const isPortfolioHero = section === 'portfolio';
                const setStatus = isPortfolioHero ? setPortfolioHeroUploadStatus : setHeroUploadStatus;
                setMediaPreparing(true);
                setStatus('');
                setVideoProgress(null);
                try {
                    const prepared = await prepareLocalVideo(file, { stripAudio: true });
                    const validated = await validatePreparedMedia(prepared, 'video');
                    setStatus('Ανέβασμα συμπιεσμένου βίντεο...');
                    const safeName = prepared.name.replace(/[^a-zA-Z0-9._-]/g, '') || 'hero-video.mp4';
                    const fileRef = firebaseRef(storage, `jewelry/hero/${section}/${Date.now()}-${safeName}`);
                    const task = uploadBytesResumable(fileRef, prepared, {
                        contentType: validated.mime,
                        cacheControl: 'public, max-age=31536000, immutable'
                    });
                    await new Promise((resolve, reject) => task.on(
                        'state_changed',
                        (snapshot) => {
                            const pct = snapshot.totalBytes > 0 ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
                            setStatus(`Ανέβασμα συμπιεσμένου βίντεο: ${pct}%`);
                            setVideoProgress({ text: `Ανέβασμα Hero στο Cloud... ${pct}%`, percent: pct });
                        },
                        reject,
                        resolve
                    ));
                    let url;
                    try {
                        url = await getDownloadURL(task.snapshot.ref);
                        await verifyStoredMedia(url, 'video');
                    } catch (verificationError) {
                        await deleteObject(task.snapshot.ref).catch(() => undefined);
                        throw verificationError;
                    }
                    setVideoProgress({ text: 'Το βίντεο ανέβηκε επιτυχώς (100%).', percent: 100 });
                    setShopSettings(prev => ({ ...prev, [isPortfolioHero ? 'portfolioHeroVideoUrl' : 'heroVideoUrl']: url }));
                    setStatus(`Το βίντεο ανέβηκε. Πάτησε Αποθήκευση ρυθμίσεων για να εμφανιστεί στο ${isPortfolioHero ? 'Portfolio' : 'Shop'}.`);
                    notifyOperationSuccess('Βίντεο Hero', `Το βίντεο ανέβηκε επιτυχώς για το ${isPortfolioHero ? 'Portfolio' : 'Shop'}.`);
                } catch (error) {
                    setStatus(`Αποτυχία ανεβάσματος: ${error.message}`);
                    notifyOperationError('Σφάλμα Ανεβάσματος Βίντεο', error.message);
                } finally { setMediaPreparing(false); }
            };

            const handleResetTheme = (mode) => {
                const base = mode === 'minimal' ? MINIMAL_SHOP_SETTINGS : DEFAULT_SHOP_SETTINGS;
                setShopSettings({
                    ...base,
                    portfolioHeroVideoUrl: shopSettings.portfolioHeroVideoUrl || '',
                    portfolioDesign: shopSettings.portfolioDesign || DEFAULT_PORTFOLIO_DESIGN,
                    categoryOrder: shopSettings.categoryOrder?.length ? shopSettings.categoryOrder : base.categoryOrder,
                    fallbackLinks: { ...base.fallbackLinks, ...(shopSettings.fallbackLinks || {}) },
                    aiAssistant: { ...base.aiAssistant, ...(shopSettings.aiAssistant || {}) },
                    designStudio: shopSettings.designStudio || DEFAULT_DESIGN_STUDIO
                });
            };

            const updateAssistantSetting = (key, value) => {
                setShopSettings(prev => ({
                    ...prev,
                    aiAssistant: {
                        ...DEFAULT_SHOP_SETTINGS.aiAssistant,
                        ...(prev.aiAssistant || {}),
                        [key]: value
                    }
                }));
            };

            const getStatusColor = (status) => {
                if (status === 'Διαθέσιμο') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
                if (status === 'Πουλήθηκε') return 'bg-rose-100 text-rose-700 border border-rose-200';
                if (status === 'Υπό Κατασκευή') return 'bg-amber-100 text-amber-700 border border-amber-200';
                if (status === 'Δωρίστηκε') return 'bg-blue-100 text-blue-700 border border-blue-200';
                return 'bg-stone-100 text-stone-600 border border-stone-200';
            };

            const getStatsSegment = (item) => {
                if (statsFilter === 'available') return isAvailableItem(item);
                if (statsFilter === 'unavailable') return isUnavailableItem(item);
                if (statsFilter === 'sold') return isSoldItem(item);
                return true;
            };

            const getStatsQuantity = (item) => {
                if (statsFilter === 'available') return Number(item.stock || 0);
                if (statsFilter === 'sold') return getEffectiveQty(item);
                return getEffectiveQty(item);
            };

            const dashboardStats = useMemo(() => {
                let count = 0;
                let value = 0;
                let profit = 0;

                jewelryList.forEach(item => {
                    if (!getStatsSegment(item)) return;
                    const qty = getStatsQuantity(item);
                    count += qty;
                    value += (Number(item.price || 0)) * qty;
                    profit += (Number(item.price || 0) - Number(item.cost || 0)) * qty;
                });

                return { count, value, profit };
            }, [jewelryList, statsFilter]);

            const statsCopy = {
                available: { count: 'Διαθεσιμο Αποθεμα', value: 'Αξια Αποθεματος', profit: 'Εκτιμωμενο Κερδος' },
                unavailable: { count: 'Μη Διαθεσιμα Τεμαχια', value: 'Δεσμευμενη Αξια', profit: 'Εκτιμωμενο Κερδος' },
                sold: { count: 'Πωληθεντα Προιοντα', value: 'Εσοδα Πωληθεντων', profit: 'Καθαρο Κερδος' },
                all: { count: 'Συνολικα Τεμαχια', value: 'Συνολικη Αξια', profit: 'Συνολικο Κερδος' }
            }[statsFilter] || {};

            const assistantSettings = useMemo(() => ({
                ...DEFAULT_SHOP_SETTINGS.aiAssistant,
                ...(shopSettings.aiAssistant || {})
            }), [shopSettings.aiAssistant]);

            const getBackofficeAiEndpoint = () => {
                const configuredEndpoint = (assistantSettings.backofficeEndpoint || '').trim();
                const isHostedAdmin = window.location.protocol !== 'file:';
                const isLocalEndpoint = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(configuredEndpoint);
                if (isHostedAdmin && (!configuredEndpoint || isLocalEndpoint)) {
                    return '/api/backoffice-ai';
                }
                return configuredEndpoint;
            };

            const handleAiAccessCodeChange = (value) => {
                setAiAccessCode(value);
                try {
                    if (value) sessionStorage.setItem('aram_backoffice_ai_secret', value);
                    else sessionStorage.removeItem('aram_backoffice_ai_secret');
                } catch (err) {}
            };

            const getAiImageMediaCandidates = () => ([
                ...formPrivateMediaList.map(media => ({ ...media, aiSource: 'back-office-only' })),
                ...formShopMediaList.map(media => ({ ...media, aiSource: 'shop' }))
            ]).filter(media => media.type !== 'video' && media.url);

            const getFormProductPayload = () => {
                const imageMedia = getAiImageMediaCandidates();
                const mainMedia = imageMedia[0] || null;
                return {
                    name: formName,
                    category: formCategory,
                    collection: '',
                    status: formStatus,
                    creationDate: formDate,
                    price: formPrice,
                    cost: formCost,
                    stock: formStock,
                    weight: formWeight,
                    dimensions: formDimensions,
                    storage: formStorage,
                    materials: formMaterials,
                    colors: formColorsArr,
                    notes: formNotes,
                    purchaseLinks: formPurchaseLinks,
                    postedPlatforms: formPostedPlatforms,
                    mainImageName: mainMedia?.fileObj?.name || mainMedia?.fileName || '',
                    privateImageNames: formPrivateMediaList
                        .filter(media => media.type !== 'video')
                        .map(media => media.fileObj?.name || media.fileName || '')
                        .filter(Boolean),
                    hasImage: Boolean(mainMedia?.url),
                    privateImageCount: formPrivateMediaList.filter(media => media.type !== 'video').length
                };
            };

            const mediaToAiImageDataUrl = async (media) => {
                if (!media?.url) return '';
                let loaded = null;
                try {
                    loaded = await loadEditableImage(media);
                    const img = loaded.img;
                    const canvas = document.createElement('canvas');
                    const ratio = Math.min(768 / img.width, 768 / img.height, 1);
                    canvas.width = Math.max(Math.round(img.width * ratio), 1);
                    canvas.height = Math.max(Math.round(img.height * ratio), 1);
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    }
                    return canvas.toDataURL('image/jpeg', 0.78);
                } catch { return ''; }
                finally { loaded?.cleanup?.(); }
            };
            const getAiImageDataUrls = async () => {
                const mediaItems = getAiImageMediaCandidates().slice(0, 3);
                const dataUrls = await Promise.all(mediaItems.map(mediaToAiImageDataUrl));
                return dataUrls.filter(Boolean);
            };

            const getAiImageDataUrl = async () => {
                const dataUrls = await getAiImageDataUrls();
                return dataUrls[0] || '';
            };

            const normalizeAiList = (value) => {
                if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
                if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
                return [];
            };

            const normalizeAiDraft = (data = {}) => {
                const suggestion = data.suggestion || data.product || data;
                return {
                    title: suggestion.title || suggestion.name || '',
                    description: suggestion.description || suggestion.notes || '',
                    shortDescription: suggestion.shortDescription || '',
                    category: suggestion.category || '',
                    collection: '',
                    status: suggestion.status || '',
                    colors: normalizeAiList(suggestion.colors),
                    materials: normalizeAiList(suggestion.materials),
                    tags: normalizeAiList(suggestion.tags || suggestion.seoKeywords),
                    instagramCaption: suggestion.instagramCaption || '',
                    altText: suggestion.altText || '',
                    raw: suggestion
                };
            };

            const handleBackofficeAiGenerate = async (task = 'full') => {
                const endpoint = getBackofficeAiEndpoint();
                if (!endpoint) {
                    setAiProductError('Προσθέστε πρώτα Back-office AI endpoint στις ρυθμίσεις AI.');
                    setIsSettingsOpen(true);
                    setActiveSettingsTab('assistant');
                    return;
                }

                setIsAiProductWorking(true);
                setAiProductError('');
                try {
                    const imageDataUrls = await getAiImageDataUrls();
                    const imageDataUrl = imageDataUrls[0] || '';
                    const headers = { 'Content-Type': 'application/json' };
                    const signedInUser = currentUser || auth?.currentUser || null;
                    if (signedInUser?.getIdToken) headers.Authorization = `Bearer ${await signedInUser.getIdToken()}`;
                    if (aiAccessCode.trim()) headers['X-Aram-AI-Secret'] = aiAccessCode.trim();
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            mode: 'backoffice_product',
                            task,
                            language: 'el',
                            prompt: aiProductPrompt,
                            product: getFormProductPayload(),
                            options: {
                                categories: allFormCategories,
                                statuses: allFormStatuses,
                                materials: allAvailableMaterials,
                                colors: allAvailableColors,
                                platforms: allAvailablePlatforms
                            },
                            imageDataUrl,
                            imageDataUrls
                        })
                    });
                    const responseText = await response.text();
                    let data = {};
                    try {
                        data = JSON.parse(responseText);
                    } catch (err) {
                        data = { error: responseText };
                    }
                    if (!response.ok) throw new Error(data.error || data.message || 'Το AI endpoint δεν απάντησε σωστά.');
                    setAiProductDraft(normalizeAiDraft(data));
                } catch (err) {
                    setAiProductError(err.message || 'Αποτυχία AI πρότασης.');
                } finally {
                    setIsAiProductWorking(false);
                }
            };

            const applyAiCategory = (value) => {
                const trimmed = (value || '').trim();
                if (!trimmed) return;
                setFormCategory(trimmed);
                setIsCustomCategory(!allFormCategories.includes(trimmed));
            };

            const applyAiCollection = (value) => {
                const trimmed = (value || '').trim();
                if (!trimmed) return;
                setFormCollection(trimmed);
                setIsCustomCollection(Boolean(trimmed) && !allCollections.includes(trimmed));
            };

            const applyAiStatus = (value) => {
                const trimmed = (value || '').trim();
                if (!trimmed) return;
                setFormStatus(trimmed);
                setIsCustomStatus(!allFormStatuses.includes(trimmed));
            };

            const applyAiProductDraft = (fillOnly = false) => {
                if (!aiProductDraft) return;
                if (aiProductDraft.title && (!fillOnly || !formName.trim())) setFormName(aiProductDraft.title);
                if (aiProductDraft.description && (!fillOnly || !formNotes.trim())) setFormNotes(aiProductDraft.description);
                if (aiProductDraft.category && (!fillOnly || !formCategory.trim())) applyAiCategory(aiProductDraft.category);
                if (aiProductDraft.status && (!fillOnly || !formStatus.trim())) applyAiStatus(aiProductDraft.status);
                if (aiProductDraft.colors.length && (!fillOnly || formColorsArr.length === 0)) {
                    const nextColors = fillOnly ? aiProductDraft.colors : mergeUnique(formColorsArr, aiProductDraft.colors);
                    setFormColorsArr(nextColors.slice(0, 8));
                    rememberCustomValues({ colors: nextColors });
                }
                if (aiProductDraft.materials.length && (!fillOnly || formMaterials.length === 0)) {
                    const nextMaterials = fillOnly ? aiProductDraft.materials : mergeUnique(formMaterials, aiProductDraft.materials);
                    setFormMaterials(nextMaterials.slice(0, 8));
                    rememberCustomValues({ materials: nextMaterials });
                }
            };

            const countValues = (values = []) => values.reduce((acc, value) => {
                if (value) acc[value] = (acc[value] || 0) + 1;
                return acc;
            }, {});

            const orderOptions = (options, order) => {
                return [...options].sort((a, b) => {
                    const indexA = order.indexOf(a);
                    const indexB = order.indexOf(b);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.localeCompare(b, 'el');
                });
            };

            const sortByUsage = (options, counts, order) => {
                return [...options].sort((a, b) => {
                    const countDiff = (counts[b] || 0) - (counts[a] || 0);
                    if (countDiff !== 0) return countDiff;
                    const indexA = order.indexOf(a);
                    const indexB = order.indexOf(b);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.localeCompare(b, 'el');
                });
            };

            const categoryUsageCounts = useMemo(() => countValues(jewelryList.map(item => item.category)), [jewelryList]);
            const statusUsageCounts = useMemo(() => countValues(jewelryList.map(item => item.status)), [jewelryList]);
            const collectionUsageCounts = useMemo(() => countValues(jewelryList.map(item => item.collection)), [jewelryList]);
            const platformUsageCounts = useMemo(() => {
                return countValues(jewelryList.flatMap(item => [
                    ...(item.purchaseLinks || item.productLinks || []).map(link => link.site),
                    ...(item.postedPlatforms || []).map(platform => platform.site),
                    ...(item.platforms || [])
                ]));
            }, [jewelryList]);

            const allFormCategories = useMemo(() => {
                const embedded = jewelryList.map(item => item.category);
                const order = shopSettings.categoryOrder || [];
                return sortByUsage(Array.from(new Set([...BASE_CATEGORIES, ...customCategories, ...order, ...embedded])).filter(cat => cat && !hiddenCategoryOptions.includes(cat)), categoryUsageCounts, order);
            }, [jewelryList, customCategories, hiddenCategoryOptions, shopSettings.categoryOrder, categoryUsageCounts]);

            const settingsCategoryOptions = useMemo(() => {
                const embedded = jewelryList.map(item => item.category);
                const order = shopSettings.categoryOrder || [];
                return orderOptions(Array.from(new Set([...BASE_CATEGORIES, ...customCategories, ...order, ...embedded])).filter(cat => cat && !hiddenCategoryOptions.includes(cat)), order);
            }, [jewelryList, customCategories, hiddenCategoryOptions, shopSettings.categoryOrder]);

            const allFilterCategories = useMemo(() => {
                const embedded = jewelryList.map(item => item.category);
                const order = shopSettings.categoryOrder || [];
                return Array.from(new Set([...BASE_CATEGORIES, ...customCategories, ...order, ...embedded]))
                    .filter(cat => cat && !hiddenCategoryOptions.includes(cat))
                    .sort((a, b) => {
                        const indexA = order.indexOf(a);
                        const indexB = order.indexOf(b);
                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                        if (indexA !== -1) return -1;
                        if (indexB !== -1) return 1;
                        return a.localeCompare(b, 'el');
                    });
            }, [jewelryList, customCategories, hiddenCategoryOptions, shopSettings.categoryOrder]);

            const allFormStatuses = useMemo(() => {
                const embedded = jewelryList.map(item => item.status);
                return sortByUsage(Array.from(new Set([...BASE_STATUSES, ...customStatuses, ...embedded])).filter(status => status && !hiddenStatusOptions.includes(status)), statusUsageCounts, statusOptionOrder.length ? statusOptionOrder : BASE_STATUSES);
            }, [jewelryList, customStatuses, hiddenStatusOptions, statusUsageCounts, statusOptionOrder]);

            const settingsStatusOptions = useMemo(() => {
                const embedded = jewelryList.map(item => item.status);
                return orderOptions(Array.from(new Set([...BASE_STATUSES, ...customStatuses, ...embedded])).filter(status => status && !hiddenStatusOptions.includes(status)), statusOptionOrder.length ? statusOptionOrder : BASE_STATUSES);
            }, [jewelryList, customStatuses, hiddenStatusOptions, statusOptionOrder]);

            const allCollections = useMemo(() => {
                const embedded = jewelryList.map(item => item.collection);
                return sortByUsage(Array.from(new Set([...customCollections, ...embedded])).filter(collection => collection && !hiddenCollectionOptions.includes(collection)), collectionUsageCounts, collectionOptionOrder);
            }, [jewelryList, customCollections, hiddenCollectionOptions, collectionUsageCounts, collectionOptionOrder]);

            const settingsCollectionOptions = useMemo(() => {
                const embedded = jewelryList.map(item => item.collection);
                return orderOptions(Array.from(new Set([...customCollections, ...embedded])).filter(collection => collection && !hiddenCollectionOptions.includes(collection)), collectionOptionOrder);
            }, [jewelryList, customCollections, hiddenCollectionOptions, collectionOptionOrder]);

            const colorUsageCounts = useMemo(() => {
                return jewelryList.flatMap(item => item.colors || []).reduce((acc, color) => {
                    if (color) acc[color] = (acc[color] || 0) + 1;
                    return acc;
                }, {});
            }, [jewelryList]);

            const materialUsageCounts = useMemo(() => {
                return jewelryList.flatMap(item => item.materials || []).reduce((acc, material) => {
                    if (material) acc[material] = (acc[material] || 0) + 1;
                    return acc;
                }, {});
            }, [jewelryList]);

            const allMaterialOptions = useMemo(() => {
                const embedded = jewelryList.flatMap(item => item.materials || []);
                return Array.from(new Set([...BASE_MATERIALS, ...customMaterials, ...embedded]))
                    .filter(mat => mat && mat !== 'Εποξική Ρητίνη' && !hiddenMaterialOptions.includes(mat));
            }, [jewelryList, customMaterials, hiddenMaterialOptions]);

            const settingsMaterialOptions = useMemo(() => orderOptions(allMaterialOptions, materialOptionOrder), [allMaterialOptions, materialOptionOrder]);
            const allAvailableMaterials = useMemo(() => sortByUsage(settingsMaterialOptions, materialUsageCounts, materialOptionOrder), [settingsMaterialOptions, materialUsageCounts, materialOptionOrder]);
            const settingsPlatformOptions = useMemo(() => orderOptions(Array.from(new Set([...BASE_PLATFORMS, ...customPlatforms])).filter(platform => platform && !hiddenPlatformOptions.includes(platform)), platformOptionOrder.length ? platformOptionOrder : BASE_PLATFORMS), [customPlatforms, hiddenPlatformOptions, platformOptionOrder]);
            const allAvailablePlatforms = useMemo(() => sortByUsage(settingsPlatformOptions, platformUsageCounts, platformOptionOrder.length ? platformOptionOrder : BASE_PLATFORMS), [settingsPlatformOptions, platformUsageCounts, platformOptionOrder]);

            const allColorOptions = useMemo(() => {
                const embedded = jewelryList.flatMap(item => item.colors || []);
                return Array.from(new Set([...BASE_COLORS, ...customColors, ...embedded]))
                    .filter(color => color && !hiddenColorOptions.includes(color));
            }, [jewelryList, customColors, hiddenColorOptions]);

            const settingsColorOptions = useMemo(() => orderOptions(allColorOptions, colorOptionOrder), [allColorOptions, colorOptionOrder]);
            const allAvailableColors = useMemo(() => sortByUsage(settingsColorOptions, colorUsageCounts, colorOptionOrder), [settingsColorOptions, colorUsageCounts, colorOptionOrder]);
            const getColorSwatch = (color) => shopSettings.colorPalette?.[color] || COLOR_SWATCHES[color] || '#d6d3d1';

            const allFilterColors = useMemo(() => {
                return allAvailableColors;
            }, [allAvailableColors]);

            const allStorages = useMemo(() => {
                return Array.from(new Set(jewelryList.map(item => item.storage))).filter(Boolean).sort();
            }, [jewelryList]);

            const duplicateNameInfo = useMemo(() => {
                const normalizedName = normalizeForMatch(formName);
                if (!normalizedName) return null;
                const duplicate = jewelryList.find(item => {
                    if (isEditMode && currentItem?.id === item.id) return false;
                    return normalizeForMatch(item.name) === normalizedName;
                });
                if (!duplicate) return null;
                const baseName = formName.trim();
                const firstColor = formColorsArr[0] || '';
                const firstMaterial = formMaterials[0] || '';
                const suggestionParts = [
                    formCategory && `${baseName} - ${formCategory}`,
                    firstColor && `${baseName} σε ${firstColor}`,
                    firstMaterial && `${baseName} με ${firstMaterial}`,
                    formCollection && `${baseName} | ${formCollection}`,
                    `${baseName} #${jewelryList.filter(item => normalizeForMatch(item.name).startsWith(normalizedName)).length + 1}`
                ].filter(Boolean);
                return {
                    duplicate,
                    suggestions: Array.from(new Set(suggestionParts)).filter(name => normalizeForMatch(name) !== normalizedName).slice(0, 4)
                };
            }, [formName, formCategory, formCollection, formColorsArr, formMaterials, jewelryList, isEditMode, currentItem]);

            const rememberCustomValues = ({ category = formCategory, collection = formCollection, colors = formColorsArr, materials = formMaterials } = {}) => {
                const cat = category.trim();
                if (cat && !BASE_CATEGORIES.includes(cat) && !customCategories.includes(cat)) setCustomCategories(prev => [...prev, cat]);
                const col = collection.trim();
                if (col && !customCollections.includes(col)) setCustomCollections(prev => [...prev, col]);
                colors.forEach(color => {
                    if (color && !BASE_COLORS.includes(color) && !customColors.includes(color)) setCustomColors(prev => [...prev, color]);
                });
                materials.forEach(material => {
                    if (material && !BASE_MATERIALS.includes(material) && !customMaterials.includes(material)) setCustomMaterials(prev => [...prev, material]);
                });
            };

            const getSmartSignalText = (fileName = '') => {
                return [
                    formName,
                    formNotes,
                    newMaterialInput,
                    newColorInput,
                    fileName
                ].filter(Boolean).join(' ');
            };

            const getCategoryMatchRules = () => {
                return allFormCategories.map(category => {
                    const normalizedCategory = normalizeForMatch(category);
                    const directWords = normalizedCategory.split(' ').filter(word => word.length > 2);
                    const matchingHint = Object.entries(CATEGORY_KEYWORD_HINTS).find(([baseCategory]) => {
                        const normalizedBase = normalizeForMatch(baseCategory);
                        const baseWords = normalizedBase.split(' ').filter(word => word.length > 3);
                        const categoryWords = normalizedCategory.split(' ').filter(word => word.length > 3);
                        return normalizedCategory.includes(normalizedBase) ||
                            normalizedBase.includes(normalizedCategory) ||
                            baseWords.some(baseWord => categoryWords.some(categoryWord => categoryWord.includes(baseWord) || baseWord.includes(categoryWord)));
                    });
                    const hintWords = matchingHint ? matchingHint[1].map(normalizeForMatch) : [];
                    return {
                        category,
                        words: Array.from(new Set([normalizedCategory, ...directWords, ...hintWords].filter(word => word.length > 2)))
                    };
                });
            };

            const findCategoryByHints = (hints, rules) => {
                for (const hint of hints) {
                    const normalizedHint = normalizeForMatch(hint);
                    const match = rules.find(rule => {
                        const normalizedCategory = normalizeForMatch(rule.category);
                        return normalizedCategory.includes(normalizedHint) || rule.words.some(word => word.includes(normalizedHint) || normalizedHint.includes(word));
                    });
                    if (match) return match.category;
                }
                return '';
            };

            const detectCategoryFromSignals = (text, imageHints = []) => {
                const normalizedText = normalizeForMatch(text);
                const rules = getCategoryMatchRules();
                const textMatch = rules.find(rule => rule.words.some(word => normalizedText.includes(word)));
                if (textMatch) return textMatch.category;
                return findCategoryByHints(imageHints, rules);
            };

            const detectColorsFromSignals = (text) => {
                const normalizedText = normalizeForMatch(text);
                return allAvailableColors.filter(color => {
                    const normalizedColor = normalizeForMatch(color);
                    return normalizedColor.length > 2 && normalizedText.includes(normalizedColor);
                }).slice(0, 4);
            };

            const buildSmartDescription = (suggestions = {}) => {
                const colors = mergeUnique(formColorsArr, suggestions.colors || []).slice(0, 3);
                const materials = formMaterials.slice(0, 3);
                const materialText = materials.length ? materials.join(', ').toLowerCase() : 'επιλεγμένα υλικά';
                const colorText = colors.length ? colors.join(', ').toLowerCase() : 'φυσικές αποχρώσεις';
                return `Χειροποίητη δημιουργία από ${materialText} σε αποχρώσεις του ${colorText}. Κάθε κομμάτι είναι φτιαγμένο εξ ολοκλήρου στο χέρι και είναι μοναδικό.`;
            };

            const extractImageCategoryHints = (data, size) => {
                const corners = [
                    [0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]
                ];
                const bg = corners.reduce((acc, [x, y]) => {
                    const idx = (y * size + x) * 4;
                    return [acc[0] + data[idx], acc[1] + data[idx + 1], acc[2] + data[idx + 2]];
                }, [0, 0, 0]).map(value => value / corners.length);
                let minX = size, minY = size, maxX = 0, maxY = 0, total = 0, left = 0, right = 0, center = 0;

                for (let y = 0; y < size; y += 2) {
                    for (let x = 0; x < size; x += 2) {
                        const idx = (y * size + x) * 4;
                        if (data[idx + 3] < 120) continue;
                        const distance = Math.abs(data[idx] - bg[0]) + Math.abs(data[idx + 1] - bg[1]) + Math.abs(data[idx + 2] - bg[2]);
                        if (distance < 45) continue;
                        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                        total += 1;
                        if (x < size * 0.38) left += 1;
                        else if (x > size * 0.62) right += 1;
                        else center += 1;
                    }
                }

                if (total < 35) return [];
                const width = Math.max(maxX - minX + 1, 1);
                const height = Math.max(maxY - minY + 1, 1);
                const aspect = height / width;
                const fillRatio = total / ((width / 2) * (height / 2));
                const hasTwoSideClusters = left > total * 0.25 && right > total * 0.25 && center < total * 0.28;
                const hints = [];

                if (hasTwoSideClusters) hints.push('Σκουλαρίκια');
                if (aspect > 1.35 && fillRatio > 0.45) hints.push('Θήκες Κινητών');
                if (aspect > 1.18 && fillRatio <= 0.45) hints.push('Κολιέ');
                if (aspect < 0.78) hints.push('Βραχιόλια');
                if (aspect >= 0.78 && aspect <= 1.18 && fillRatio < 0.45) hints.push('Δαχτυλίδια');

                return hints;
            };

            const colorNameFromRgb = (r, g, b) => {
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const delta = max - min;
                if (max > 232 && delta < 28) return 'Λευκό';
                if (max < 45) return 'Μαύρο';
                if (delta < 24) return 'Ασημί';
                let hue = 0;
                if (max === r) hue = ((g - b) / delta) % 6;
                else if (max === g) hue = (b - r) / delta + 2;
                else hue = (r - g) / delta + 4;
                hue = Math.round(hue * 60);
                if (hue < 0) hue += 360;
                if (r > 190 && g > 130 && b < 85) return 'Χρυσό';
                if (hue < 18 || hue >= 340) return 'Κόκκινο';
                if (hue < 45) return 'Κίτρινο';
                if (hue < 78) return 'Χρυσό';
                if (hue < 165) return 'Πράσινο';
                if (hue < 245) return 'Μπλε';
                if (hue < 292) return 'Μωβ';
                return 'Ροζ';
            };

            const analyzeImageForSmartTags = async (previewUrl, fileName = '') => {
                let temporaryUrl = '';
                if (/^https:/i.test(previewUrl)) {
                    try { temporaryUrl = URL.createObjectURL(await editableBlob({ url: previewUrl })); previewUrl = temporaryUrl; }
                    catch { return { colors: detectColorsFromSignals(getSmartSignalText(fileName)), category: detectCategoryFromSignals(getSmartSignalText(fileName)), source: fileName }; }
                }
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
                        try {
                            const canvas = document.createElement('canvas');
                            const size = 80;
                            canvas.width = size;
                            canvas.height = size;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, size, size);
                            const data = ctx.getImageData(0, 0, size, size).data;
                            const counts = {};
                            for (let i = 0; i < data.length; i += 16) {
                                const alpha = data[i + 3];
                                if (alpha < 120) continue;
                                const name = colorNameFromRgb(data[i], data[i + 1], data[i + 2]);
                                counts[name] = (counts[name] || 0) + 1;
                            }
                            const imageColors = Object.entries(counts)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 3)
                                .map(([name]) => name);
                            const imageHints = extractImageCategoryHints(data, size);
                            const category = detectCategoryFromSignals(getSmartSignalText(fileName), imageHints);
                            const colors = mergeUnique(detectColorsFromSignals(getSmartSignalText(fileName)), imageColors);
                            resolve({ colors, category, source: fileName || 'κύρια εικόνα', imageHints });
                        } catch (err) {
                            resolve({
                                colors: detectColorsFromSignals(getSmartSignalText(fileName)),
                                category: detectCategoryFromSignals(getSmartSignalText(fileName)),
                                source: fileName || 'κύρια εικόνα',
                                imageHints: []
                            });
                        }
                    };
                    img.onerror = () => { if (temporaryUrl) URL.revokeObjectURL(temporaryUrl); resolve({ colors: detectColorsFromSignals(getSmartSignalText(fileName)), category: detectCategoryFromSignals(getSmartSignalText(fileName)), source: fileName || 'κύρια εικόνα', imageHints: [] }); };
                    img.src = previewUrl;
                });
            };

            const refreshSmartSuggestionsFromMain = async (shopMediaList = formShopMediaList, privateMediaList = formPrivateMediaList) => {
                const mainMedia = [
                    ...privateMediaList.map(media => ({ ...media, smartSource: 'back-office file' })),
                    ...shopMediaList.map(media => ({ ...media, smartSource: 'shop image' }))
                ].find(media => media.type !== 'video' && media.url);
                if (!mainMedia?.url) {
                    const fallbackSuggestions = {
                        colors: detectColorsFromSignals(getSmartSignalText('')),
                        category: detectCategoryFromSignals(getSmartSignalText('')),
                        source: 'στοιχεία φόρμας',
                        imageHints: []
                    };
                    setSmartSuggestions({
                        ...fallbackSuggestions,
                        description: buildSmartDescription(fallbackSuggestions)
                    });
                    return fallbackSuggestions;
                }
                const fileName = mainMedia.fileObj?.name || mainMedia.fileName || mainMedia.smartSource || 'κύρια εικόνα';
                const suggestions = await analyzeImageForSmartTags(mainMedia.url, fileName);
                const nextSuggestions = {
                    ...suggestions,
                    description: buildSmartDescription(suggestions)
                };
                setSmartSuggestions(nextSuggestions);
                return nextSuggestions;
            };

            const handleRefreshSmartSuggestions = async () => {
                rememberCustomValues({ category: formCategory, colors: formColorsArr, materials: formMaterials });
                await refreshSmartSuggestionsFromMain(formShopMediaList, formPrivateMediaList);
            };

            useEffect(() => {
                if (!smartSuggestions) return;
                const nextCategory = detectCategoryFromSignals(getSmartSignalText(smartSuggestions.source), smartSuggestions.imageHints || []);
                const nextColors = mergeUnique(smartSuggestions.colors || [], detectColorsFromSignals(getSmartSignalText(smartSuggestions.source)));
                const nextDescription = buildSmartDescription({ ...smartSuggestions, category: nextCategory, colors: nextColors });
                if (nextCategory !== smartSuggestions.category || nextColors.join('|') !== (smartSuggestions.colors || []).join('|') || nextDescription !== smartSuggestions.description) {
                    setSmartSuggestions(prev => prev ? {
                        ...prev,
                        category: nextCategory,
                        colors: nextColors,
                        description: nextDescription
                    } : prev);
                }
            }, [formName, formNotes, formCategory, formColorsArr, formMaterials, newMaterialInput, newColorInput, allFormCategories, allAvailableColors, smartSuggestions?.source]);

            const handleFileSelectShop = async (files) => {
                if (mediaPreparing) return;
                setMediaPreparing(true); setVideoProgress(null);
                setUploadStatus('Επεξεργασία και συμπίεση αρχείων...');
                try {
                const { items: newMedia, errors } = await prepareEditorMediaFiles(files, true);
                const smartCandidate = !isEditMode && formShopMediaList.length === 0 && newMedia[0]?.type === 'image'
                    ? newMedia[0]
                    : null;
                setFormShopMediaList(prev => [...prev, ...newMedia]);
                if (smartCandidate) {
                    setUploadStatus('Ανάλυση κύριας εικόνας...');
                    const suggestions = await analyzeImageForSmartTags(smartCandidate.url, smartCandidate.fileName);
                    if (suggestions.colors.length || suggestions.category) {
                        setSmartSuggestions({
                            ...suggestions,
                            description: buildSmartDescription(suggestions)
                        });
                    }
                }
                if (errors.length) {
                    setVideoProgress({ text: errors.join('\n') });
                    notifyOperationError('Σφάλμα αρχείων', errors.join('\n'));
                }
                } catch (error) {
                    const message = error.message || 'Αποτυχία προετοιμασίας αρχείων.';
                    setVideoProgress({ text: message });
                    notifyOperationError('Σφάλμα αρχείων', message);
                } finally { setUploadStatus(''); setMediaPreparing(false); }
            };

            const handleRemoveShopMedia = (idx) => {
                if (formShopMediaList[idx].isNew) URL.revokeObjectURL(formShopMediaList[idx].url);
                const nextList = formShopMediaList.filter((_, i) => i !== idx);
                setFormShopMediaList(nextList);
                if (idx === 0) refreshSmartSuggestionsFromMain(nextList);
            };

            const handleFileSelectPrivate = async (files) => {
                if (mediaPreparing) return;
                setMediaPreparing(true); setVideoProgress(null);
                setUploadStatus('Επεξεργασία και συμπίεση αρχείων...');
                try {
                const { items: newMedia, errors } = await prepareEditorMediaFiles(files, false);
                const smartCandidate = newMedia.find(media => media.type === 'image');
                const nextPrivateMediaList = [...formPrivateMediaList, ...newMedia];
                setFormPrivateMediaList(nextPrivateMediaList);
                if (smartCandidate) {
                    setUploadStatus('Ανάλυση εικόνας back-office...');
                    await refreshSmartSuggestionsFromMain(formShopMediaList, nextPrivateMediaList);
                }
                if (errors.length) {
                    setVideoProgress({ text: errors.join('\n') });
                    notifyOperationError('Σφάλμα αρχείων', errors.join('\n'));
                }
                } catch (error) {
                    const message = error.message || 'Αποτυχία προετοιμασίας αρχείων.';
                    setVideoProgress({ text: message });
                    notifyOperationError('Σφάλμα αρχείων', message);
                } finally { setUploadStatus(''); setMediaPreparing(false); }
            };

            const handleRemovePrivateMedia = (idx) => {
                if (formPrivateMediaList[idx].isNew) URL.revokeObjectURL(formPrivateMediaList[idx].url);
                const nextPrivateMediaList = formPrivateMediaList.filter((_, i) => i !== idx);
                setFormPrivateMediaList(nextPrivateMediaList);
                refreshSmartSuggestionsFromMain(formShopMediaList, nextPrivateMediaList);
            };

            const getImageEditorList = (scope) => scope === 'private' ? formPrivateMediaList : formShopMediaList;
            const imageEditorMedia = imageEditorTarget?.directMedia || (imageEditorTarget ? (getImageEditorList(imageEditorTarget.scope)?.[imageEditorTarget.index] || formShopMediaList?.[0] || formPrivateMediaList?.[0]) : null);
            const isAnimatedGifMedia = (media) => media?.fileObj?.type === 'image/gif' || /\.gif(?:$|[?#])/i.test(media?.url || '');
            const IMAGE_EDITOR_ASPECTS = {
                square: { label: '1:1', ratio: 1, width: 1400, height: 1400 },
                portrait: { label: '4:5', ratio: 4 / 5, width: 1120, height: 1400 },
                landscape: { label: '4:3', ratio: 4 / 3, width: 1400, height: 1050 }
            };

            const getImageEditorAspect = (key = imageEditorSettings.cropAspect) => IMAGE_EDITOR_ASPECTS[key] || IMAGE_EDITOR_ASPECTS.square;
            const clampImageEditorZoom = (value) => Math.max(1, Math.min(4, Number(value) || 1));

            const handleOpenImageEditor = (url?: string) => {
                const targetUrl = url || formShopMediaList?.[0]?.url || formPrivateMediaList?.[0]?.url || currentItem?.imageUrl || currentItem?.image || currentItem?.mediaList?.[0]?.url;
                if (!targetUrl) {
                    alert('Δεν βρέθηκε εικόνα για επεξεργασία.');
                    return;
                }
                const shopIndex = formShopMediaList?.findIndex(m => m.url === targetUrl);
                if (shopIndex !== undefined && shopIndex >= 0) {
                    openImageEditor('shop', shopIndex);
                    return;
                }
                const privIndex = formPrivateMediaList?.findIndex(m => m.url === targetUrl);
                if (privIndex !== undefined && privIndex >= 0) {
                    openImageEditor('private', privIndex);
                    return;
                }
                const newEntry = { url: targetUrl, type: 'image', showInShop: true, isNew: false };
                setFormShopMediaList(prev => (prev && prev.length > 0) ? [newEntry, ...prev] : [newEntry]);
                setImageEditorError('');
                setImageEditorTarget({ scope: 'shop', index: 0, directMedia: newEntry });
                setImageEditorImageInfo({ width: 0, height: 0 });
                setImageEditorSettings({ rotate: 0, zoom: 1, panX: 0, panY: 0, brightness: 100, contrast: 100, cropAspect: 'square' });
            };

            const openImageEditor = (scope, index) => {
                const list = getImageEditorList(scope);
                const media = list?.[index] || formShopMediaList?.[0] || formPrivateMediaList?.[0] || (modalPreviewMedia ? { url: modalPreviewMedia, type: 'image', showInShop: true } : null);
                if (!media || media.type === 'video') return;
                if (isAnimatedGifMedia(media)) {
                    alert('Τα GIF διατηρούν την κίνησή τους. Η επεξεργασία με crop ή φίλτρα θα τα μετέτρεπε σε στατική εικόνα, γι\' αυτό δεν εφαρμόζεται.');
                    return;
                }
                setImageEditorError('');
                setImageEditorTarget({ scope, index: Math.max(0, index), directMedia: media });
                setImageEditorImageInfo({ width: 0, height: 0 });
                setImageEditorSettings({ rotate: 0, zoom: 1, panX: 0, panY: 0, brightness: 100, contrast: 100, cropAspect: 'square' });
            };

            const closeImageEditor = () => {
                if (isApplyingImageEdit) return;
                setImageEditorTarget(null);
            };

            const getImageEditorPanBounds = (settings = imageEditorSettings, info = imageEditorImageInfo) => {
                const aspect = getImageEditorAspect(settings.cropAspect);
                const rotate = ((settings.rotate % 360) + 360) % 360;
                const swap = rotate === 90 || rotate === 270;
                const width = Math.max(1, Number(info.width) || 1);
                const height = Math.max(1, Number(info.height) || 1);
                const imageRatio = swap ? height / width : width / height;
                const cropRatio = aspect.ratio;
                const baseWidth = imageRatio >= cropRatio ? imageRatio / cropRatio : 1;
                const baseHeight = imageRatio >= cropRatio ? 1 : cropRatio / imageRatio;
                const zoom = clampImageEditorZoom(settings.zoom);
                return {
                    x: Math.max(0, (baseWidth * zoom - 1) * 50),
                    y: Math.max(0, (baseHeight * zoom - 1) * 50)
                };
            };

            const clampImageEditorPan = (settings, info = imageEditorImageInfo) => {
                const bounds = getImageEditorPanBounds(settings, info);
                return {
                    ...settings,
                    zoom: clampImageEditorZoom(settings.zoom),
                    panX: Math.max(-bounds.x, Math.min(bounds.x, Number(settings.panX) || 0)),
                    panY: Math.max(-bounds.y, Math.min(bounds.y, Number(settings.panY) || 0))
                };
            };

            const getImageEditorPreviewStyle = () => {
                const aspect = getImageEditorAspect();
                const rotate = ((imageEditorSettings.rotate % 360) + 360) % 360;
                const swap = rotate === 90 || rotate === 270;
                const width = Math.max(1, Number(imageEditorImageInfo.width) || 1);
                const height = Math.max(1, Number(imageEditorImageInfo.height) || 1);
                const imageRatio = swap ? height / width : width / height;
                const cropRatio = aspect.ratio;
                const fillsWide = imageRatio >= cropRatio;
                const baseWidth = fillsWide ? `${(imageRatio / cropRatio) * 100}%` : '100%';
                const baseHeight = fillsWide ? '100%' : `${(cropRatio / imageRatio) * 100}%`;
                const clamped = clampImageEditorPan(imageEditorSettings);
                return {
                    width: baseWidth,
                    height: baseHeight,
                    left: `calc(50% + ${clamped.panX}%)`,
                    top: `calc(50% + ${clamped.panY}%)`,
                    transform: `translate(-50%, -50%) rotate(${imageEditorSettings.rotate}deg) scale(${clamped.zoom})`,
                    filter: `brightness(${imageEditorSettings.brightness}%) contrast(${imageEditorSettings.contrast}%)`,
                    touchAction: 'none'
                };
            };

            const startImageEditorDrag = (event) => {
                if (isApplyingImageEdit) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture?.(event.pointerId);
                imageEditorDragRef.current = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    panX: imageEditorSettings.panX || 0,
                    panY: imageEditorSettings.panY || 0
                };
            };

            const moveImageEditorDrag = (event) => {
                const drag = imageEditorDragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const next = {
                    ...imageEditorSettings,
                    panX: drag.panX + ((event.clientX - drag.startX) / Math.max(rect.width, 1)) * 100,
                    panY: drag.panY + ((event.clientY - drag.startY) / Math.max(rect.height, 1)) * 100
                };
                setImageEditorSettings(clampImageEditorPan(next));
            };

            const stopImageEditorDrag = (event) => {
                if (imageEditorDragRef.current?.pointerId === event.pointerId) {
                    imageEditorDragRef.current = null;
                }
            };

            const loadEditableImage = async (media) => {
                const blob = await editableBlob(media);
                const url = URL.createObjectURL(blob);
                try {
                    const img = await new Promise((resolve, reject) => {
                        const nextImg = new Image();
                        nextImg.onload = () => resolve(nextImg);
                        nextImg.onerror = () => reject(new Error('Το αρχείο δεν είναι έγκυρη στατική εικόνα.'));
                        nextImg.src = url;
                    });
                    return { img, cleanup: () => URL.revokeObjectURL(url) };
                } catch (error) { URL.revokeObjectURL(url); throw error; }
            };
            const applyImageEditor = async () => {
                if (!imageEditorTarget || !imageEditorMedia || isApplyingImageEdit) return;
                setImageEditorError('');
                setIsApplyingImageEdit(true);
                let loadedImage = null;
                try {
                    loadedImage = await loadEditableImage(imageEditorMedia);
                    const img = loadedImage.img;
                    const rotate = ((imageEditorSettings.rotate % 360) + 360) % 360;
                    const swap = rotate === 90 || rotate === 270;
                    const sourceWidth = img.naturalWidth || img.width;
                    const sourceHeight = img.naturalHeight || img.height;
                    const aspect = getImageEditorAspect(imageEditorSettings.cropAspect);
                    const clampedSettings = clampImageEditorPan(imageEditorSettings, { width: sourceWidth, height: sourceHeight });
                    const zoom = clampImageEditorZoom(clampedSettings.zoom);
                    const rotatedWidth = swap ? sourceHeight : sourceWidth;
                    const rotatedHeight = swap ? sourceWidth : sourceHeight;
                    const canvas = document.createElement('canvas');
                    canvas.width = aspect.width;
                    canvas.height = aspect.height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.filter = `brightness(${imageEditorSettings.brightness}%) contrast(${imageEditorSettings.contrast}%)`;
                    ctx.translate(
                        canvas.width / 2 + (canvas.width * (clampedSettings.panX || 0)) / 100,
                        canvas.height / 2 + (canvas.height * (clampedSettings.panY || 0)) / 100
                    );
                    ctx.rotate((rotate * Math.PI) / 180);
                    const coverScale = Math.max(canvas.width / rotatedWidth, canvas.height / rotatedHeight) * zoom;
                    ctx.scale(coverScale, coverScale);
                    ctx.drawImage(img, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);

                    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
                    if (!blob) throw new Error('Δεν μπόρεσα να αποθηκεύσω την επεξεργασμένη εικόνα.');
                    const originalName = imageEditorMedia.fileObj?.name || imageEditorMedia.fileName || 'edited-image.jpg';
                    const editedName = originalName.replace(/\.[^/.]+$/, '') + '-edited.jpg';
                    const editedFile = new File([blob], editedName, { type: 'image/jpeg', lastModified: Date.now() });
                    const editedUrl = URL.createObjectURL(editedFile);
                    const updateList = (list) => {
                        if (!list || list.length === 0) {
                            return [{
                                url: editedUrl,
                                type: 'image',
                                fileObj: editedFile,
                                fileName: editedName,
                                isNew: true,
                                edited: true,
                                originalUrl: imageEditorMedia.url
                            }];
                        }
                        return list.map((media, index) => {
                            if (index !== imageEditorTarget.index) return media;
                        const restoreBackup = media.restoreBackup || (media.originalUrl ? {
                            url: media.originalUrl,
                            type: media.originalType || media.type || 'image',
                            fileObj: null,
                            fileName: media.originalFileName || originalName,
                            isNew: false
                        } : {
                            url: media.url,
                            type: media.type || 'image',
                            fileObj: media.fileObj || null,
                            fileName: media.fileName || originalName,
                            isNew: Boolean(media.isNew)
                        });
                        if (media.restoreBackup && media.isNew && media.url?.startsWith('blob:')) URL.revokeObjectURL(media.url);
                        return {
                            ...media,
                            url: editedUrl,
                            type: 'image',
                            fileObj: editedFile,
                            fileName: editedName,
                            isNew: true,
                            edited: true,
                            restoreBackup,
                            originalUrl: media.originalUrl || (!restoreBackup.isNew ? restoreBackup.url : ''),
                            originalType: media.originalType || restoreBackup.type || 'image',
                            originalFileName: media.originalFileName || restoreBackup.fileName || originalName
                        };
                    });

                    };
                    if (imageEditorTarget.scope === 'private') {
                        const nextList = updateList(formPrivateMediaList);
                        setFormPrivateMediaList(nextList);
                        await refreshSmartSuggestionsFromMain(formShopMediaList, nextList);
                    } else {
                        const nextList = updateList(formShopMediaList);
                        setFormShopMediaList(nextList);
                        await refreshSmartSuggestionsFromMain(nextList, formPrivateMediaList);
                    }
                    setImageEditorTarget(null);
                } catch (err) {
                    setImageEditorError(err.message || 'Σφάλμα επεξεργασίας εικόνας.');
                } finally {
                    if (loadedImage?.cleanup) loadedImage.cleanup();
                    setIsApplyingImageEdit(false);
                }
            };

            const canRestoreMediaOriginal = (media) => Boolean(media?.restoreBackup || media?.originalUrl);

            const handleRestoreEditedMedia = async (scope, index) => {
                const sourceList = getImageEditorList(scope);
                const media = sourceList[index];
                if (!canRestoreMediaOriginal(media)) return;
                const restoredFields = media.restoreBackup ? {
                    url: media.restoreBackup.url,
                    type: media.restoreBackup.type || 'image',
                    fileObj: media.restoreBackup.fileObj || null,
                    fileName: media.restoreBackup.fileName || media.fileName,
                    isNew: Boolean(media.restoreBackup.isNew)
                } : {
                    url: media.originalUrl,
                    type: media.originalType || media.type || 'image',
                    fileObj: null,
                    fileName: media.originalFileName || media.fileName,
                    isNew: false
                };
                const nextList = sourceList.map((item, itemIndex) => {
                    if (itemIndex !== index) return item;
                    if (item.isNew && item.url?.startsWith('blob:') && item.url !== restoredFields.url) URL.revokeObjectURL(item.url);
                    const restored = {
                        ...item,
                        ...restoredFields,
                        edited: false
                    };
                    delete restored.restoreBackup;
                    delete restored.originalUrl;
                    delete restored.originalType;
                    delete restored.originalFileName;
                    return restored;
                });

                if (scope === 'private') {
                    setFormPrivateMediaList(nextList);
                    await refreshSmartSuggestionsFromMain(formShopMediaList, nextList);
                } else {
                    setFormShopMediaList(nextList);
                    await refreshSmartSuggestionsFromMain(nextList, formPrivateMediaList);
                }
            };

            const handleDragOver = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
            };

            const handleDragTagStart = (e, idx, type) => {
                e.dataTransfer.setData("idx", idx);
                e.dataTransfer.setData("type", type);
            };

            const handleDropTag = (e, targetIdx, type) => {
                e.preventDefault();
                if (e.dataTransfer.getData("type") !== type) return;
                const sourceIdx = parseInt(e.dataTransfer.getData("idx"), 10);
                if (Number.isNaN(sourceIdx) || sourceIdx === targetIdx) return;
                if (type === 'color') {
                    const next = [...formColorsArr];
                    const [moved] = next.splice(sourceIdx, 1);
                    next.splice(targetIdx, 0, moved);
                    setFormColorsArr(next);
                } else if (type === 'material') {
                    const next = [...formMaterials];
                    const [moved] = next.splice(sourceIdx, 1);
                    next.splice(targetIdx, 0, moved);
                    setFormMaterials(next);
                }
            };

            const handleFieldOptionDragStart = (e, type, value) => {
                setDraggedFieldOption({ type, value });
                e.dataTransfer.effectAllowed = "move";
            };

            const getFieldOptionsForType = (type) => {
                if (type === 'category') return settingsCategoryOptions;
                if (type === 'status') return settingsStatusOptions;
                if (type === 'collection') return settingsCollectionOptions;
                if (type === 'platform') return settingsPlatformOptions;
                if (type === 'color') return settingsColorOptions;
                return settingsMaterialOptions;
            };

            const getFieldOrderForType = (type) => {
                if (type === 'category') return shopSettings.categoryOrder || [];
                if (type === 'status') return statusOptionOrder;
                if (type === 'collection') return collectionOptionOrder;
                if (type === 'platform') return platformOptionOrder;
                if (type === 'color') return colorOptionOrder;
                return materialOptionOrder;
            };

            const setFieldOrderForType = (type, nextOrder) => {
                if (type === 'category') {
                    setShopSettings(prev => ({ ...prev, categoryOrder: nextOrder }));
                    if (firebaseReady) setDoc(doc(db, "settings", "shop"), { categoryOrder: nextOrder }, { merge: true }).catch(() => {});
                } else if (type === 'status') {
                    setStatusOptionOrder(nextOrder);
                } else if (type === 'collection') {
                    setCollectionOptionOrder(nextOrder);
                } else if (type === 'platform') {
                    setPlatformOptionOrder(nextOrder);
                } else if (type === 'color') {
                    setColorOptionOrder(nextOrder);
                } else {
                    setMaterialOptionOrder(nextOrder);
                }
            };

            const handleFieldOptionDrop = (e, type, targetValue) => {
                e.preventDefault();
                if (!draggedFieldOption || draggedFieldOption.type !== type || draggedFieldOption.value === targetValue) return;
                const options = getFieldOptionsForType(type);
                const currentOrder = getFieldOrderForType(type);
                const normalizedOrder = orderOptions(Array.from(new Set([...currentOrder, ...options])), currentOrder);
                const fromIndex = normalizedOrder.indexOf(draggedFieldOption.value);
                const toIndex = normalizedOrder.indexOf(targetValue);
                if (fromIndex === -1 || toIndex === -1) return;
                const nextOrder = [...normalizedOrder];
                const [moved] = nextOrder.splice(fromIndex, 1);
                nextOrder.splice(toIndex, 0, moved);
                setFieldOrderForType(type, nextOrder);
                setDraggedFieldOption(null);
            };

            const handleHideFieldOption = (type, value) => {
                if (type === 'category') {
                    setHiddenCategoryOptions(prev => prev.includes(value) ? prev : [...prev, value]);
                    setCustomCategories(prev => prev.filter(category => category !== value));
                    if (formCategory === value) setFormCategory(BASE_CATEGORIES[0] || '');
                } else if (type === 'status') {
                    setHiddenStatusOptions(prev => prev.includes(value) ? prev : [...prev, value]);
                    setCustomStatuses(prev => prev.filter(status => status !== value));
                    if (formStatus === value) setFormStatus(BASE_STATUSES[0] || '');
                } else if (type === 'collection') {
                    setHiddenCollectionOptions(prev => prev.includes(value) ? prev : [...prev, value]);
                    setCustomCollections(prev => prev.filter(collection => collection !== value));
                    if (formCollection === value) setFormCollection('');
                } else if (type === 'platform') {
                    setHiddenPlatformOptions(prev => prev.includes(value) ? prev : [...prev, value]);
                    setCustomPlatforms(prev => prev.filter(platform => platform !== value));
                    setFormPurchaseLinks(prev => prev.filter(link => link.site !== value));
                    setFormPostedPlatforms(prev => prev.filter(platform => platform.site !== value));
                } else if (type === 'color') {
                    setHiddenColorOptions(prev => prev.includes(value) ? prev : [...prev, value]);
                    setCustomColors(prev => prev.filter(color => color !== value));
                    setFormColorsArr(prev => prev.filter(color => color !== value));
                } else {
                    setHiddenMaterialOptions(prev => prev.includes(value) ? prev : [...prev, value]);
                    setCustomMaterials(prev => prev.filter(material => material !== value));
                    setFormMaterials(prev => prev.filter(material => material !== value));
                }
            };

            const handleRestoreFieldOption = (type, value) => {
                if (type === 'category') setHiddenCategoryOptions(prev => prev.filter(category => category !== value));
                else if (type === 'status') setHiddenStatusOptions(prev => prev.filter(status => status !== value));
                else if (type === 'collection') setHiddenCollectionOptions(prev => prev.filter(collection => collection !== value));
                else if (type === 'platform') setHiddenPlatformOptions(prev => prev.filter(platform => platform !== value));
                else if (type === 'color') setHiddenColorOptions(prev => prev.filter(color => color !== value));
                else setHiddenMaterialOptions(prev => prev.filter(material => material !== value));
            };

            const handleSortFieldOptionsByUsage = (type) => {
                const options = getFieldOptionsForType(type);
                const order = getFieldOrderForType(type);
                const counts = type === 'category' ? categoryUsageCounts
                    : type === 'status' ? statusUsageCounts
                    : type === 'collection' ? collectionUsageCounts
                    : type === 'platform' ? platformUsageCounts
                    : type === 'color' ? colorUsageCounts
                    : materialUsageCounts;
                setFieldOrderForType(type, sortByUsage(options, counts, order));
            };

            const handleAddMaterial = (mat) => {
                const trimmed = mat.trim();
                if (trimmed && !formMaterials.includes(trimmed)) {
                    setFormMaterials([...formMaterials, trimmed]);
                    if (!BASE_MATERIALS.includes(trimmed) && !customMaterials.includes(trimmed)) setCustomMaterials(prev => [...prev, trimmed]);
                    setHiddenMaterialOptions(prev => prev.filter(material => material !== trimmed));
                    setMaterialOptionOrder(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
                    setNewMaterialInput('');
                }
            };

            const handleAddColor = (col, hex = '') => {
                const trimmed = col.trim();
                if (trimmed && !formColorsArr.includes(trimmed)) {
                    setFormColorsArr([...formColorsArr, trimmed]);
                    if (!BASE_COLORS.includes(trimmed) && !customColors.includes(trimmed)) setCustomColors(prev => [...prev, trimmed]);
                    setHiddenColorOptions(prev => prev.filter(color => color !== trimmed));
                    setColorOptionOrder(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
                    if (hex) {
                        const nextPalette = { ...(shopSettings.colorPalette || {}), [trimmed]: hex };
                        setShopSettings(prev => ({ ...prev, colorPalette: { ...(prev.colorPalette || {}), [trimmed]: hex } }));
                        setDoc(doc(db, 'settings', 'shop'), { colorPalette: nextPalette }, { merge: true })
                            .catch(() => alert('Το χρώμα προστέθηκε στο προϊόν, αλλά δεν αποθηκεύτηκε στην κοινή παλέτα.'));
                    }
                    setNewColorInput('');
                }
            };

            const handleAddPurchaseLink = () => {
                const siteTrimmed = newPurchaseSite.trim();
                if (!siteTrimmed) return;

                setFormPurchaseLinks([...formPurchaseLinks, { site: siteTrimmed, url: newPurchaseUrl.trim() }]);

                if (!BASE_PLATFORMS.includes(siteTrimmed) && !customPlatforms.includes(siteTrimmed)) {
                    setCustomPlatforms(prev => [...prev, siteTrimmed]);
                }

                setNewPurchaseSite('Vinted');
                setNewPurchaseUrl('');
                setIsCustomPurchaseSite(false);
            };

            const handleAddPostedPlatform = () => {
                const siteTrimmed = newPostedSite.trim();
                if (!siteTrimmed) return;

                if (!formPostedPlatforms.some(p => p.site === siteTrimmed && p.url === newPostedUrl.trim())) {
                    setFormPostedPlatforms([...formPostedPlatforms, { site: siteTrimmed, url: newPostedUrl.trim(), showInShop: newPostedVisible }]);
                    if (!BASE_PLATFORMS.includes(siteTrimmed) && !customPlatforms.includes(siteTrimmed)) {
                        setCustomPlatforms(prev => [...prev, siteTrimmed]);
                    }
                }

                setNewPostedSite('Instagram');
                setNewPostedUrl('');
                setNewPostedVisible(false);
                setIsCustomPostedSite(false);
            };

            const ensureShopCategoryOrder = async (category) => {
                const cat = category.trim();
                if (!cat) return shopSettings.categoryOrder || [];
                const currentOrder = shopSettings.categoryOrder?.length ? shopSettings.categoryOrder : DEFAULT_SHOP_SETTINGS.categoryOrder;
                if (currentOrder.includes(cat)) return currentOrder;
                const nextOrder = [...currentOrder, cat];
                setShopSettings(prev => ({ ...prev, categoryOrder: prev.categoryOrder?.includes(cat) ? prev.categoryOrder : [...(prev.categoryOrder || []), cat] }));
                await setDoc(doc(db, "settings", "shop"), { categoryOrder: nextOrder }, { merge: true });
                return nextOrder;
            };

            const handleOpenAdd = () => {
                setIsEditMode(false);
                setCurrentItem(null);
                setIsDetailOpen(false);
                setIsCustomCategory(false); setIsCustomCollection(false); setIsCustomStatus(false); setIsCustomStorage(false);

                setFormName(''); setFormCategory('Κολιέ'); setFormCollection(''); setFormStatus('Διαθέσιμο'); setFormDate(new Date().toISOString().split('T')[0]);
                setFormPrice(''); setFormOriginalPrice(''); setFormCost(''); setFormStock(1); setFormShopOrder(0); setFormManualLikes(0); setFormManualViews(0); setFormWeight(''); setFormDimensions(''); setFormStorage('');
                setFormMaterials([]); setFormColorsArr([]); setNewMaterialInput(''); setNewColorInput('');

                setFormPurchaseLinks([]); setNewPurchaseSite('Vinted'); setNewPurchaseUrl(''); setIsCustomPurchaseSite(false);
                setFormPostedPlatforms([]); setNewPostedSite('Instagram'); setNewPostedUrl(''); setNewPostedVisible(false); setIsCustomPostedSite(false);

                setFormNotes('');
                setFormShopMediaList([]);
                setFormPrivateMediaList([]);
                setUploadProgress(0); setUploadStatus('');
                setSmartSuggestions(null);

                const draftStr = localStorage.getItem('aram_draft');
                if (draftStr) {
                    try {
                        const draft = JSON.parse(draftStr);
                        if (window.confirm('Υπάρχει αποθηκευμένο πρόχειρο. Θέλετε να το συνεχίσετε;')) {
                            setFormName(draft.formName || '');
                            setFormCategory(draft.formCategory || 'Κολιέ');
                            setFormCollection(draft.formCollection || '');
                            setFormStatus(draft.formStatus || 'Διαθέσιμο');
                            setFormDate(draft.formDate || new Date().toISOString().split('T')[0]);
                            setFormPrice(draft.formPrice || '');
                            setFormCost(draft.formCost || '');
                            setFormStock(draft.formStock || 1);
                            setFormShopOrder(0);
                            setFormWeight(draft.formWeight || '');
                            setFormDimensions(draft.formDimensions || '');
                            setFormStorage(draft.formStorage || '');
                            setFormNotes(draft.formNotes || '');
                            setFormMaterials(draft.formMaterials || []);
                            setFormColorsArr(draft.formColorsArr || []);
                            setFormPurchaseLinks(draft.formPurchaseLinks || []);
                            setFormPostedPlatforms(draft.formPostedPlatforms || []);
                        } else {
                            localStorage.removeItem('aram_draft');
                        }
                    } catch (err) {
                        localStorage.removeItem('aram_draft');
                    }
                }

                setIsAddOpen(true);
            };

            const handleOpenEdit = (item) => {
                setIsEditMode(true); setCurrentItem(item);
                setIsCustomCategory(false); setIsCustomCollection(false); setIsCustomStatus(false); setIsCustomStorage(false);

                setFormName(item.name || ''); setFormCategory(item.category || 'Κολιέ'); setFormCollection(item.collection || ''); setFormStatus(item.status || 'Διαθέσιμο'); setFormDate(item.creationDate || '');
                setFormPrice(item.price ? item.price.toString() : ''); setFormOriginalPrice(item.originalPrice ? item.originalPrice.toString() : ''); setFormCost(item.cost ? item.cost.toString() : ''); setFormStock(item.stock || 1); setFormShopOrder(item.shopOrder || 0); setFormManualLikes(Math.max(0, Number(item.shopFavorites ?? item.likes ?? 0) || 0)); setFormManualViews(Math.max(0, Number(item.views ?? item.viewCount ?? 0) || 0));
                setFormWeight(item.weight || ''); setFormDimensions(item.dimensions || ''); setFormStorage(item.storage || '');
                setFormMaterials(item.materials || []); setFormColorsArr(item.colors || []); setFormNotes(stripVintedCondition(item.notes || ''));

                const existingPurchaseLinks = item.purchaseLinks || item.productLinks || [];
                setFormPurchaseLinks(existingPurchaseLinks);
                setNewPurchaseSite('Vinted'); setNewPurchaseUrl(''); setIsCustomPurchaseSite(false);

                const existingPosted = item.postedPlatforms || (item.platforms ? item.platforms.map(p => ({ site: p, url: '', showInShop: true })) : []);
                setFormPostedPlatforms(existingPosted);
                setNewPostedSite('Instagram'); setNewPostedUrl(''); setNewPostedVisible(false); setIsCustomPostedSite(false);

                const existingMedia = item.mediaList || (item.imageUrl ? [{ url: item.imageUrl, type: item.fileType || 'image', showInShop: true }] : []);
                const shopMedia = existingMedia.filter(m => m.showInShop !== false).map(m => ({ ...m, isNew: false }));
                const privateMedia = existingMedia.filter(m => m.showInShop === false).map(m => ({ ...m, isNew: false }));

                setFormShopMediaList(shopMedia);
                setFormPrivateMediaList(privateMedia);

                setUploadProgress(0); setUploadStatus('');
                setSmartSuggestions(null);
                refreshSmartSuggestionsFromMain(shopMedia);
                setIsAddOpen(true);
            };

            const handleCloneItem = (item) => {
                setIsEditMode(false);
                setCurrentItem(null);
                setIsCustomCategory(false); setIsCustomCollection(false); setIsCustomStatus(false); setIsCustomStorage(false);

                setFormName(item.name ? item.name + ' (Αντίγραφο)' : '');
                setFormCategory(item.category || 'Κολιέ'); setFormCollection(item.collection || ''); setFormStatus(item.status || 'Διαθέσιμο'); setFormDate(item.creationDate || new Date().toISOString().split('T')[0]);
                setFormPrice(item.price ? item.price.toString() : ''); setFormOriginalPrice(item.originalPrice ? item.originalPrice.toString() : ''); setFormCost(item.cost ? item.cost.toString() : ''); setFormStock(item.stock || 1); setFormShopOrder(0);
                setFormWeight(item.weight || ''); setFormDimensions(item.dimensions || ''); setFormStorage(item.storage || '');
                setFormMaterials(item.materials || []); setFormColorsArr(item.colors || []); setFormNotes(item.notes || '');

                const existingPurchaseLinks = item.purchaseLinks || item.productLinks || [];
                setFormPurchaseLinks(existingPurchaseLinks);
                setNewPurchaseSite('Vinted'); setNewPurchaseUrl(''); setIsCustomPurchaseSite(false);

                const existingPosted = item.postedPlatforms || (item.platforms ? item.platforms.map(p => ({ site: p, url: '', showInShop: true })) : []);
                setFormPostedPlatforms(existingPosted);
                setNewPostedSite('Instagram'); setNewPostedUrl(''); setNewPostedVisible(false); setIsCustomPostedSite(false);

                setFormShopMediaList([]);
                setFormPrivateMediaList([]);
                setUploadProgress(0); setUploadStatus('');
                setSmartSuggestions(null);
                setIsAddOpen(true);
                setIsDetailOpen(false);
            };

            const handleQuickSold = async (e, item) => {
                e.stopPropagation();
                if (!window.confirm('Να σημειωθεί η δημιουργία ως Πουλημένη (Απόθεμα: 0);')) return;
                try {
                    const newData = {
                        status: 'Πουλήθηκε',
                        stock: 0,
                        updatedAt: serverTimestamp()
                    };
                    await updateDoc(doc(db, "jewelry", item.id), newData);
                    pushUndoAction({
                        type: 'UPDATE',
                        id: item.id,
                        oldData: { status: item.status, stock: item.stock },
                        newData,
                        message: 'Μαρκαρίστηκε ως Πουλημένο.'
                    });
                } catch(err) {
                    alert("Αποτυχία ενημέρωσης: " + err.message);
                }
            };

            const handleViewDetails = (item) => {
                setCurrentItem(item);
                setActiveDetailMediaIdx(0);
                setIsDetailOpen(true);
            };

            const exportToCSV = () => {
                const headers = ['Όνομα', 'Κατηγορία', 'Συλλογή', 'Κατάσταση', 'Απόθεμα', 'Τιμή Πώλησης (€)', 'Κόστος (€)', 'Χρώματα', 'Υλικά', 'Κωδ. Αποθήκευσης', 'Links Αγοράς', 'Πλατφόρμες Ανάρτησης', 'Κεντρική Φωτογραφία'];
                const rows = jewelryList.map(item => {
                    const linksStr = (item.purchaseLinks || item.productLinks || []).map(l => `${l.site}: ${l.url}`).join(' | ');
                    const postedStr = (item.postedPlatforms || []).map(p => `${p.site} ${p.url ? `(${p.url})` : ''} - [${p.showInShop ? 'Ορατό' : 'Κρυφό'}]`).join(' | ');
                    return [
                        item.name || '',
                        item.category || '',
                        item.collection || '',
                        item.status || '',
                        item.stock || 0,
                        item.price || 0,
                        item.cost || 0,
                        (item.colors || []).join(', '),
                        (item.materials || []).join(', '),
                        item.storage || '',
                        linksStr,
                        postedStr,
                        item.imageUrl || ''
                    ];
                });

                const csvString = buildCsv(headers, rows, ';');
                downloadCsv(csvString, `katalogos_aram_creations_${new Date().toISOString().split('T')[0]}.csv`);
                notifyOperationSuccess('Εξαγωγή CSV', `Ο κατάλογος (${jewelryList.length} προϊόντα) εξήχθη επιτυχώς σε CSV.`);
            };

            const splitVintedList = (value) => String(value || '')
                .split(/[;,]/)
                .map(part => part.trim())
                .filter(Boolean);

            const normalizeVintedPrice = (value) => {
                const cleaned = String(value || '').replace('€', '').replace(',', '.').replace(/[^\d.]/g, '');
                return cleaned ? Number(cleaned) : 0;
            };

            const parseVintedMoney = (value) => {
                const parsed = Number(String(value ?? '').replace('€', '').replace(',', '.').replace(/[^\d.-]/g, ''));
                return Number.isFinite(parsed) ? parsed : 0;
            };

            const calculateVintedAdjustedPrice = (basePrice, settings = vintedPricingSettings) => {
                const base = parseVintedMoney(basePrice);
                const total = base > 0
                    ? base + parseVintedMoney(settings.buyerFixed) + base * parseVintedMoney(settings.buyerPercent) / 100 + parseVintedMoney(settings.shippingMin)
                    : 0;
                const rounded = settings.rounding === 'none' ? Math.round(total * 100) / 100 : Math.ceil(total * 2) / 2;
                return Number(rounded.toFixed(2));
            };

            // Throttle consecutive product-page requests to reduce the chance of
            // Vinted rate-limiting a multi-link import. There is deliberately no
            // wait before the first request.
            const VINTED_REQUEST_DELAY_MS = 2000;
            const waitForVintedRequestWindow = () => new Promise(resolve => window.setTimeout(resolve, VINTED_REQUEST_DELAY_MS));

            const uniqueVintedUrls = (urls) => [...new Set((urls || [])
                .map(url => String(url || '').trim())
                .filter(Boolean))];

            const getVintedApis = () => {
                const isHostedAdmin = window.location.protocol !== 'file:' && !/^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname);
                const localApi = window.location.protocol === 'file:' ? 'http://127.0.0.1:3000' : '';
                return {
                    link: isHostedAdmin ? '/api/vinted-link' : `${localApi}/api/vinted-link`,
                    image: isHostedAdmin ? '/api/image-proxy' : `${localApi}/api/image-proxy`
                };
            };

            const previewVintedImageSrc = (url) => (/images\d*\.vinted\.net/i.test(url)
                ? `${getVintedApis().image}?url=${encodeURIComponent(url)}`
                : url);

            const mapVintedRowToAram = (row) => {
                const sourceUrl = String(row.url || '').trim();
                const condition = String(row.condition || '').trim();
                const description = String(row.description || '').trim();
                const imageUrls = uniqueVintedUrls([...(Array.isArray(row.photos) ? row.photos : []), ...(Array.isArray(row.images) ? row.images : []), ...splitVintedList(row.image_urls)])
                    .filter(url => !/logo|avatar|icon|placeholder|blur|thumbnail|sprite/i.test(url));
                const normalizedStatus = String(row.status || 'Διαθέσιμο').trim();
                const mediaList = imageUrls.map(imageUrl => ({
                    url: imageUrl,
                    type: 'image',
                    showInShop: true,
                    external: true,
                    source: 'vinted'
                }));

                return {
                    name: String(row.title || row.name || '').trim(),
                    description,
                    category: String(row.category || 'Άλλα').trim(),
                    collection: '',
                    status: String(row.status || 'Διαθέσιμο').trim(),
                    creationDate: new Date().toISOString().split('T')[0],
                    price: normalizeVintedPrice(row.price),
                    vintedBasePrice: normalizeVintedPrice(row.vintedBasePrice ?? row.price),
                    vintedPricing: row.vintedPricing || null,
                    vintedFavorites: Number(row.vintedFavorites ?? row.favorites ?? row.favoritesCount ?? 0) || 0,
                    vintedViews: Number(row.vintedViews ?? row.views ?? row.viewCount ?? 0) || 0,
                    cost: 0,
                    stock: normalizedStatus === 'Πουλήθηκε' ? 0 : Number(row.stock ?? 1),
                    shopOrder: 0,
                    weight: '',
                    dimensions: '',
                    storage: '',
                    materials: splitVintedList(Array.isArray(row.materials) ? row.materials.join(',') : row.materials),
                    colors: splitVintedList(Array.isArray(row.colors) ? row.colors.join(',') : row.colors),
                    platforms: sourceUrl ? ['Vinted'] : [],
                    productLinks: sourceUrl ? [{ site: 'Vinted', url: sourceUrl }] : [],
                    purchaseLinks: sourceUrl ? [{ site: 'Vinted', url: sourceUrl }] : [],
                    postedPlatforms: sourceUrl ? [{ site: 'Vinted', url: sourceUrl, showInShop: true }] : [],
                    notes: description || '',
                    imageUrl: mediaList[0]?.url || '',
                    images: imageUrls,
                    fileType: 'image',
                    mediaList,
                    media: mediaList,
                    sourcePlatform: 'vinted',
                    sourceId: String(row.vinted_id || row.id || '').trim(),
                    sourceUrl
                };
            };

            const updateVintedPreviewItem = (indexToUpdate, patch) => {
                setVintedImportItems(prev => prev.map((item, index) => (
                    index === indexToUpdate ? { ...item, ...patch } : item
                )));
            };

            const removeVintedPreviewMedia = (itemIndex, mediaIndex) => {
                setVintedImportItems(prev => prev.map((item, index) => {
                    if (index !== itemIndex) return item;
                    const mediaList = (item.mediaList || []).filter((_, idx) => idx !== mediaIndex);
                    return {
                        ...item,
                        mediaList,
                        media: mediaList,
                        imageUrl: mediaList[0]?.url || '',
                        fileType: mediaList[0]?.type || 'image'
                    };
                }));
            };

            const handleFetchVintedLinks = async () => {
                const links = uniqueVintedUrls(vintedLinksText
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(Boolean));

                if (!links.length) {
                    setVintedImportError('Βάλε πρώτα ένα ή περισσότερα Vinted links.');
                    return;
                }

                setIsVintedImportWorking(true);
                setVintedImportError('');
                const fetchedItems = [];
                const errors = [];
                const skippedDuplicates = [];

                try {
                    for (let index = 0; index < links.length; index += 1) {
                        const link = links[index];
                        const knownBeforeFetch = findVintedImportDuplicate(
                            { sourcePlatform: 'vinted', sourceUrl: link },
                            [...jewelryList, ...vintedImportItems, ...fetchedItems]
                        );
                        if (knownBeforeFetch) {
                            skippedDuplicates.push(knownBeforeFetch.item.name || knownBeforeFetch.item.title || link);
                            continue;
                        }
                        if (index > 0) await waitForVintedRequestWindow();
                        setVintedImportStatus(`Τραβάω στοιχεία από Vinted link ${index + 1}/${links.length}...`);
                        try {
                            const response = await fetch(`${getVintedApis().link}?url=${encodeURIComponent(link)}`);
                            const responseText = await response.text();
                            let data;
                            try { data = JSON.parse(responseText); }
                            catch { throw new Error(`Το API επέστρεψε μη έγκυρη απάντηση (HTTP ${response.status}).`); }
                            if (!response.ok || !data.ok) {
                                errors.push(`${link}: ${data.error || 'άγνωστο σφάλμα'}`);
                                continue;
                            }
                            const item = mapVintedRowToAram(data.item || {});
                            const basePrice = normalizeVintedPrice(data.item?.price);
                            const adjustedPrice = calculateVintedAdjustedPrice(basePrice);
                            item.vintedBasePrice = basePrice;
                            item.price = adjustedPrice;
                            item.vintedPricing = {
                                vintedBasePrice: basePrice,
                                buyerFixed: parseVintedMoney(vintedPricingSettings.buyerFixed),
                                buyerPercent: parseVintedMoney(vintedPricingSettings.buyerPercent),
                                shippingMin: parseVintedMoney(vintedPricingSettings.shippingMin),
                                estimatedTotal: basePrice + parseVintedMoney(vintedPricingSettings.buyerFixed) + basePrice * parseVintedMoney(vintedPricingSettings.buyerPercent) / 100 + parseVintedMoney(vintedPricingSettings.shippingMin),
                                sitePrice: adjustedPrice,
                                rounding: vintedPricingSettings.rounding,
                                parcelProfile: 'small_parcel_gr'
                            };
                            item.vintedFavorites = Number(data.item?.favorites ?? data.item?.favoritesCount ?? 0) || 0;
                            item.vintedViews = Number(data.item?.views ?? data.item?.viewCount ?? 0) || 0;
                            const duplicate = findVintedImportDuplicate(
                                item,
                                [...jewelryList, ...vintedImportItems, ...fetchedItems]
                            );
                            if (item.name && !duplicate) {
                                fetchedItems.push(item);
                            } else if (duplicate) {
                                skippedDuplicates.push(duplicate.item.name || duplicate.item.title || item.name || link);
                            } else if (!item.name) {
                                errors.push(`${link}: δεν βρέθηκε τίτλος καταχώρησης.`);
                            }
                        } catch (err) {
                            errors.push(`${link}: ${err.message || 'δεν απάντησε το Vinted importer'}.`);
                        }
                    }

                    setVintedImportItems(prev => [...prev, ...fetchedItems]);
                    const suffix = errors.length ? ` Σφάλματα: ${errors.join(' | ')}` : '';
                    const duplicateSummary = skippedDuplicates.length
                        ? ` Παραλείφθηκαν ${skippedDuplicates.length} ήδη υπάρχοντα: ${skippedDuplicates.join(', ')}.`
                        : '';
                    setVintedImportStatus(`Βρέθηκαν ${fetchedItems.length} νέα προϊόντα. Σύνολο preview: ${vintedImportItems.length + fetchedItems.length}.${duplicateSummary}${suffix}`);
                    if (errors.length) setVintedImportError(errors.join(' | '));
                } finally {
                    setIsVintedImportWorking(false);
                }
            };

            const getVintedSourceUrl = vintedSourceUrl;

            const extensionFromContentType = (contentType) => {
                if (/png/i.test(contentType || '')) return 'png';
                if (/webp/i.test(contentType || '')) return 'webp';
                if (/gif/i.test(contentType || '')) return 'gif';
                return 'jpg';
            };

            const uploadVintedExternalImage = async (imageUrl, item, mediaIndex) => {
                const response = await fetch(`${getVintedApis().image}?url=${encodeURIComponent(imageUrl)}`);
                if (!response.ok) {
                    throw new Error(`Δεν μπόρεσα να αντιγράψω εικόνα από Vinted (${response.status}).`);
                }

                const sourceBlob = await response.blob();
                await validateMediaFile(sourceBlob, 'image');
                const blob = await compressImageBlob(sourceBlob, 1400, 0.85);
                const validated = await validateMediaFile(blob, 'image');
                const ext = extensionFromContentType(blob.type);
                const safeName = String(item.sourceId || item.name || 'vinted-item')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .slice(0, 60) || 'vinted-item';
                const storagePath = `jewelry/vinted-imports/${Date.now()}-${safeName}-${mediaIndex + 1}.${ext}`;
                const storageRef = firebaseRef(storage, storagePath);
                const uploadTask = uploadBytesResumable(storageRef, blob, {
                    contentType: validated.mime,
                    cacheControl: 'public, max-age=31536000, immutable'
                });

                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', null, reject, resolve);
                });

                let downloadUrl;
                try {
                    downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    await verifyStoredMedia(downloadUrl, 'image');
                } catch (verificationError) {
                    await deleteObject(uploadTask.snapshot.ref).catch(() => undefined);
                    throw verificationError;
                }
                return {
                    media: {
                        url: downloadUrl,
                        type: 'image',
                        showInShop: true,
                        source: 'vinted',
                        originalUrl: imageUrl
                    },
                    storageRef: uploadTask.snapshot.ref
                };
            };

            const prepareVintedItemForImport = async (item, itemIndex, totalItems) => {
                const sourceMedia = item.mediaList || item.media || [];
                if (!copyVintedImages || !sourceMedia.length) {
                    return {
                        item: {
                            ...item,
                            mediaList: sourceMedia.map(media => ({ ...media, showInShop: media.showInShop !== false })),
                            media: sourceMedia.map(media => ({ ...media, showInShop: media.showInShop !== false })),
                            imageUrl: sourceMedia[0]?.url || item.imageUrl || ''
                        },
                        uploadedStorageRefs: []
                    };
                }

                const uploadedMedia = [];
                const uploadedStorageRefs = [];
                const copyWarnings = [];
                for (let mediaIndex = 0; mediaIndex < sourceMedia.length; mediaIndex += 1) {
                    const media = sourceMedia[mediaIndex];
                    if (!media?.url || media.url.includes('firebasestorage.googleapis.com')) {
                        uploadedMedia.push({ ...media, showInShop: media.showInShop !== false });
                        continue;
                    }

                    setVintedImportStatus(`Αντιγράφω εικόνα ${mediaIndex + 1}/${sourceMedia.length} για προϊόν ${itemIndex + 1}/${totalItems}...`);
                    try {
                        const uploaded = await uploadVintedExternalImage(media.url, item, mediaIndex);
                        uploadedMedia.push(uploaded.media);
                        uploadedStorageRefs.push(uploaded.storageRef);
                    } catch (err) {
                        copyWarnings.push(`εικόνα ${mediaIndex + 1}: ${err.message}`);
                        // Keep the listing usable when Firebase Storage temporarily rejects a copy.
                        uploadedMedia.push({ ...media, showInShop: media.showInShop !== false, external: true });
                    }
                }

                return {
                    item: {
                        ...item,
                        imageUrl: uploadedMedia[0]?.url || item.imageUrl || '',
                        fileType: uploadedMedia[0]?.type || item.fileType || 'image',
                        mediaList: uploadedMedia,
                        media: uploadedMedia,
                        notes: [
                            item.notes || '',
                            copyWarnings.length ? `Προσοχή: Δεν αντιγράφηκαν όλες οι Vinted εικόνες στο Firebase Storage (${copyWarnings.join('; ')}).` : ''
                        ].filter(Boolean).join('\n')
                    },
                    uploadedStorageRefs
                };
            };

            const handleImportVintedItems = async () => {
                if (!currentUser) {
                    setVintedImportError('Πρώτα κάνε σύνδεση στο Back Office.');
                    return;
                }
                if (!vintedImportItems.length) {
                    setVintedImportError('Πρώτα τράβηξε προϊόντα από Vinted links.');
                    return;
                }

                setIsVintedImportWorking(true);
                setVintedImportError('');
                let imported = 0;
                let skippedDuplicates = 0;
                let pendingImportStorageRefs = [];
                const importedInRun = [];

                try {
                    for (let index = 0; index < vintedImportItems.length; index += 1) {
                        const rawItem = vintedImportItems[index];
                        const duplicate = findVintedImportDuplicate(rawItem, [...jewelryList, ...importedInRun]);
                        if (duplicate) {
                            skippedDuplicates += 1;
                            setVintedImportStatus(`Import σε εξέλιξη: ${imported} νέα, ${skippedDuplicates} ήδη υπάρχοντα`);
                            continue;
                        }
                        if (!(Number(rawItem.price) > 0)) {
                            throw new Error(`Το προϊόν «${rawItem.name || index + 1}» δεν έχει έγκυρη τιμή. Συμπλήρωσε τιμή στην προεπισκόπηση.`);
                        }
                        if (!(rawItem.mediaList || []).length) {
                            throw new Error(`Το προϊόν «${rawItem.name || index + 1}» δεν έχει φωτογραφίες. Πρόσθεσε τουλάχιστον μία φωτογραφία ή αφαίρεσέ το από το preview.`);
                        }
                        const preparedImport = await prepareVintedItemForImport(rawItem, index, vintedImportItems.length);
                        const item = preparedImport.item;
                        pendingImportStorageRefs = preparedImport.uploadedStorageRefs;
                        if (copyVintedImages && !(item.mediaList || []).length) {
                            throw new Error(`Δεν αντιγράφηκαν φωτογραφίες για το προϊόν «${rawItem.name || index + 1}». Το προϊόν δεν αποθηκεύτηκε.`);
                        }
                        const catTrimmed = item.category?.trim() || 'Κολιέ';
                        await ensureShopCategoryOrder(catTrimmed);
                        rememberCustomValues({
                            category: catTrimmed,
                            colors: item.colors || [],
                            materials: item.materials || []
                        });

                        const { media, description, ...docItem } = item;
                        const itemData = {
                            ...docItem,
                            category: catTrimmed,
                            collection: '',
                            platforms: (item.postedPlatforms || []).map(platform => platform.site),
                            productLinks: item.purchaseLinks || [],
                            purchaseLinks: item.purchaseLinks || [],
                            postedPlatforms: item.postedPlatforms || [],
                            mediaList: item.mediaList || [],
                            images: (item.mediaList || []).map(mediaEntry => mediaEntry.url),
                            imageUrl: item.imageUrl || item.mediaList?.[0]?.url || '',
                            fileType: item.fileType || 'image',
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        const docRef = await addDoc(collection(db, 'jewelry'), itemData);
                        pendingImportStorageRefs = [];
                        pushVersionHistory({
                            type: 'ADD',
                            id: docRef.id,
                            name: itemData.name || 'Vinted προϊόν',
                            message: 'Import από Vinted',
                            before: null,
                            after: { ...itemData, id: docRef.id }
                        });
                        imported += 1;
                        importedInRun.push(rawItem);
                        setVintedImportStatus(`Import σε εξέλιξη: ${imported}/${vintedImportItems.length}`);
                    }

                    const skippedSummary = skippedDuplicates ? ` Παραλείφθηκαν ${skippedDuplicates} ήδη υπάρχοντα.` : '';
                    setVintedImportStatus(`Έτοιμο. Περάστηκαν ${imported} νέα προϊόντα στο Back Office.${skippedSummary}`);
                    setVintedImportItems([]);
                    setVintedLinksText('');
                    notifyOperationSuccess('Εισαγωγή από Vinted', `Περάστηκαν ${imported} νέα προϊόντα.${skippedSummary}`);
                } catch (err) {
                    if (pendingImportStorageRefs.length) {
                        await Promise.allSettled(pendingImportStorageRefs.map(storageRef => deleteObject(storageRef)));
                    }
                    setVintedImportError(`Σφάλμα import μετά από ${imported} προϊόντα: ${err.message}`);
                    notifyOperationError('Σφάλμα Εισαγωγής Vinted', err.message);
                } finally {
                    setIsVintedImportWorking(false);
                }
            };

            const removeVintedPreviewItem = (indexToRemove) => {
                setVintedImportItems(prev => prev.filter((_, index) => index !== indexToRemove));
            };

            const handleSaveItem = async (e) => {
                e.preventDefault();
                if (!formName.trim() || isSaving || mediaPreparing) return;

                const parsedPrice = formPrice === '' ? 0 : Number(formPrice);
                const parsedOriginalPrice = formOriginalPrice === '' ? null : Number(formOriginalPrice);
                const parsedCost = formCost === '' ? 0 : Number(formCost);
                const parsedStock = formStock === '' ? 1 : parseInt(formStock, 10);
                const parsedShopOrder = isEditMode && currentItem ? parseInt(formShopOrder || currentItem.shopOrder || 0, 10) : 0;
                if ([parsedPrice, parsedCost, parsedStock, parsedShopOrder].some(value => Number.isNaN(value)) || parsedPrice < 0 || parsedCost < 0 || parsedStock < 0 || parsedShopOrder < 0) {
                    alert("Ελέγξτε τιμή, κόστος και απόθεμα. Επιτρέπονται μόνο μη αρνητικοί αριθμοί.");
                    return;
                }

                const allFormMedia = [...formShopMediaList, ...formPrivateMediaList];
                if (allFormMedia.length === 0) return alert("Παρακαλώ προσθέστε τουλάχιστον 1 φωτογραφία ή βίντεο!");

                setIsSaving(true);
                setUploadProgress(0);
                setUploadStatus('Προετοιμασία...');
                const uploadedStorageRefs = [];
                let catalogSaved = false;

                try {
                    const catTrimmed = formCategory.trim() || 'Άλλο';
                    if (!BASE_CATEGORIES.includes(catTrimmed) && !customCategories.includes(catTrimmed)) {
                        setCustomCategories(prev => [...prev, catTrimmed]);
                    }
                    await ensureShopCategoryOrder(catTrimmed);

                    const statTrimmed = formStatus.trim() || 'Διαθέσιμο';
                    if (!BASE_STATUSES.includes(statTrimmed) && !customStatuses.includes(statTrimmed)) {
                        setCustomStatuses(prev => [...prev, statTrimmed]);
                    }

                    const colTrimmed = formCollection.trim();
                    rememberCustomValues({ category: catTrimmed, colors: formColorsArr, materials: formMaterials });

                    const finalMediaUrls = [];
                    const newFilesToUpload = allFormMedia.filter(m => m.isNew);
                    const originalFilesToUpload = allFormMedia.filter(m => m.restoreBackup?.isNew && m.restoreBackup?.fileObj);
                    const totalNewFiles = newFilesToUpload.length;
                    const totalOriginalFiles = originalFilesToUpload.length;
                    let filesUploadedCount = 0;
                    let originalFilesUploadedCount = 0;

                    const isFirebaseStorageUrl = (url = '') => /firebasestorage\.googleapis\.com|firebasestorage\.app/i.test(url);

                    const uploadMediaFile = async (fileObj, folder, statusLabel, countLabel) => {
                        const expectedKind = (await validateMediaFile(fileObj)).kind;
                        const validated = await validatePreparedMedia(fileObj, expectedKind);
                        const safeName = fileObj.name.replace(/[^a-zA-Z0-9.\-_]/g, '') || 'image.jpg';
                        const uniqueName = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '_' + safeName;
                        const storageRef = firebaseRef(storage, folder + '/' + uniqueName);
                        const uploadTask = uploadBytesResumable(storageRef, fileObj, {
                            contentType: validated.mime,
                            cacheControl: 'public, max-age=31536000, immutable'
                        });

                        await new Promise((resolve, reject) => {
                            uploadTask.on('state_changed',
                                (snapshot) => {
                                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                    setUploadProgress(progress);
                                    setUploadStatus(`${statusLabel} ${countLabel}... (${Math.round(progress)}%)`);
                                },
                                (error) => reject(error),
                                () => resolve()
                            );
                        });

                        let downloadUrl;
                        try {
                            downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                            await verifyStoredMedia(downloadUrl, expectedKind);
                        } catch (verificationError) {
                            await deleteObject(uploadTask.snapshot.ref).catch(() => undefined);
                            throw verificationError;
                        }
                        uploadedStorageRefs.push(uploadTask.snapshot.ref);
                        return downloadUrl;
                    };

                    const buildSavedMediaEntry = (media, url, originalUrl = '') => {
                        const entry = {
                            url,
                            type: media.type || 'image',
                            showInShop: media.showInShop !== false
                        };
                        const restoreUrl = originalUrl || media.originalUrl || '';
                        if (restoreUrl && restoreUrl !== url) {
                            entry.originalUrl = restoreUrl;
                            entry.originalType = media.originalType || media.restoreBackup?.type || media.type || 'image';
                            entry.originalFileName = media.originalFileName || media.restoreBackup?.fileName || media.fileName || '';
                            entry.edited = true;
                        }
                        return entry;
                    };

                    for (const media of allFormMedia) {
                        if (!media.isNew) {
                            finalMediaUrls.push(buildSavedMediaEntry(media, media.url));
                        } else {
                            filesUploadedCount++;
                            const downloadUrl = await uploadMediaFile(media.fileObj, 'jewelry', 'Ανέβασμα αρχείου', `${filesUploadedCount} από ${totalNewFiles}`);
                            let originalUrl = media.originalUrl || '';
                            if (!originalUrl && media.restoreBackup?.isNew && media.restoreBackup?.fileObj) {
                                originalFilesUploadedCount++;
                                originalUrl = await uploadMediaFile(media.restoreBackup.fileObj, 'jewelry/originals', 'Ανέβασμα αρχικής εικόνας για επαναφορά', `${originalFilesUploadedCount} από ${totalOriginalFiles}`);
                            } else if (!originalUrl && media.restoreBackup?.url && !media.restoreBackup.isNew && !/^(blob:|data:)/i.test(media.restoreBackup.url)) {
                                originalUrl = media.restoreBackup.url;
                            }
                            finalMediaUrls.push(buildSavedMediaEntry(media, downloadUrl, originalUrl));
                        }
                    }

                    setUploadStatus('Αποθήκευση στοιχείων...');
                    setUploadProgress(100);

                    if (isEditMode && currentItem) {
                    }

                    const mainImage = finalMediaUrls.find(m => m.showInShop) || finalMediaUrls[0] || { url: '', type: 'image' };
                    const sanitizedPurchaseLinks = formPurchaseLinks.map(l => ({ site: l.site || '', url: l.url || '' }));
                    const sanitizedPostedPlatforms = formPostedPlatforms.map(p => ({ site: p.site || '', url: p.url || '', showInShop: p.showInShop !== false }));

                    const itemData = {
                        name: formName.trim(),
                        category: catTrimmed,
                        collection: colTrimmed,
                        status: statTrimmed,
                        creationDate: formDate,
                        price: parsedPrice,
                        originalPrice: parsedOriginalPrice && parsedOriginalPrice > parsedPrice ? parsedOriginalPrice : null,
                        cost: parsedCost,
                        stock: parsedStock,
                        shopOrder: parsedShopOrder,
                        shopFavorites: Math.max(0, Math.trunc(Number(formManualLikes) || 0)),
                        likes: Math.max(0, Math.trunc(Number(formManualLikes) || 0)),
                        views: Math.max(0, Math.trunc(Number(formManualViews) || 0)),
                        viewCount: Math.max(0, Math.trunc(Number(formManualViews) || 0)),
                        weight: formWeight.trim(),
                        dimensions: formDimensions.trim(),
                        storage: formStorage.trim(),
                        materials: formMaterials,
                        colors: formColorsArr,
                        platforms: sanitizedPostedPlatforms.map(p => p.site),
                        productLinks: sanitizedPurchaseLinks,
                        purchaseLinks: sanitizedPurchaseLinks,
                        postedPlatforms: sanitizedPostedPlatforms,
                        notes: stripVintedCondition(formNotes.trim()),
                        imageUrl: mainImage.url,
                        fileType: mainImage.type,
                        mediaList: finalMediaUrls,
                        ...(formStatus === 'Διαθέσιμο' && parsedStock >= 1 ? { checkoutReservations: {} } : {}),
                        updatedAt: serverTimestamp()
                    };

                    if (isEditMode && currentItem) {
                        await updateDoc(doc(db, "jewelry", currentItem.id), itemData);
                        catalogSaved = true;
                        const originalMedia = currentItem.mediaList || (currentItem.imageUrl ? [{ url: currentItem.imageUrl, type: currentItem.fileType || 'image' }] : []);
                        const finalMediaReferences = new Set(finalMediaUrls.flatMap(media => [media.url, media.originalUrl].filter(Boolean)));
                        try {
                            const originalMedia = currentItem.mediaList || (currentItem.imageUrl ? [{ url: currentItem.imageUrl, type: currentItem.fileType || 'image' }] : []);
                            for (const mediaUrl of new Set(originalMedia.flatMap(media => [media.url, media.originalUrl].filter(Boolean)))) {
                                if (!finalMediaReferences.has(mediaUrl) && isFirebaseStorageUrl(mediaUrl)) {
                                    await deleteObject(firebaseRef(storage, mediaUrl));
                                }
                            }
                        } catch (cleanupError) {
                            console.warn('Το προϊόν αποθηκεύτηκε, αλλά δεν καθαρίστηκαν όλα τα παλιά αρχεία:', cleanupError);
                        }
                        pushVersionHistory({
                            type: 'UPDATE',
                            id: currentItem.id,
                            name: formName.trim(),
                            message: 'Επεξεργασία προϊόντος',
                            before: currentItem,
                            after: { ...itemData, id: currentItem.id }
                        });
                    } else {
                        itemData.createdAt = serverTimestamp();
                        const docRef = await addDoc(collection(db, "jewelry"), itemData);
                        catalogSaved = true;
                        pushVersionHistory({
                            type: 'ADD',
                            id: docRef.id,
                            name: formName.trim(),
                            message: 'Νέα καταχώρηση',
                            before: null,
                            after: { ...itemData, id: docRef.id }
                        });
                    }

                    localStorage.removeItem('aram_draft');
                    closeItemEditor();
                    notifyOperationSuccess(
                        isEditMode ? 'Ενημέρωση Προϊόντος' : 'Νέο Προϊόν',
                        `Το προϊόν «${formName.trim()}» αποθηκεύτηκε επιτυχώς.`
                    );
                } catch (err) {
                    if (!catalogSaved && uploadedStorageRefs.length) {
                        await Promise.allSettled(uploadedStorageRefs.map(storageRef => deleteObject(storageRef)));
                    }
                    notifyOperationError('Σφάλμα Αποθήκευσης', err.message);
                    alert("Σφάλμα κατά την αποθήκευση: " + err.message);
                } finally {
                    setIsSaving(false);
                    setUploadStatus('');
                    setUploadProgress(0);
                }
            };

            const handleDeleteItem = async (id, mediaArr, fallbackUrl) => {
                const itemForUndo = jewelryList.find(item => item.id === id) || null;
                if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή τη δημιουργία;')) return;
                try {
                    await deleteDoc(doc(db, "jewelry", id));
                    if (itemForUndo) {
                        pushUndoAction({
                            type: 'DELETE',
                            id,
                            data: itemForUndo,
                            message: 'Διαγράφηκε το "' + (itemForUndo.name || 'προϊόν') + '"'
                        });
                        pushVersionHistory({
                            type: 'DELETE',
                            id,
                            name: itemForUndo.name || 'προϊόν',
                            message: 'Διαγραφή προϊόντος',
                            before: itemForUndo,
                            after: null
                        });
                    }
                    if (!itemForUndo) {
                        const targets = mediaArr || (fallbackUrl ? [{ url: fallbackUrl }] : []);
                        for (const t of targets) {
                            if (t.url && t.url.includes('firebasestorage.googleapis.com')) {
                                const fileRef = firebaseRef(storage, t.url);
                                await deleteObject(fileRef).catch(err => console.warn("Σφάλμα διαγραφής αρχείου:", err));
                            }
                        }
                    }
                    if (isDetailOpen && currentItem && currentItem.id === id) setIsDetailOpen(false);
                    notifyOperationSuccess('Διαγραφή Προϊόντος', `Το προϊόν ${itemForUndo?.name ? `«${itemForUndo.name}» ` : ''}διαγράφηκε επιτυχώς.`);
                } catch (err) {
                    notifyOperationError('Σφάλμα Διαγραφής', err.message);
                    alert("Αποτυχία διαγραφής: " + err.message);
                }
            };

            const filteredAndSortedJewelry = useMemo(() => {
                let sourceList = jewelryList;
                if (activeCollection === "portfolio") {
                    const customPortfolio = jewelryList.filter(item => item.category !== "jewelry" && item.category !== "Κοσμήματα");
                    if (customPortfolio.length > 0) {
                        sourceList = customPortfolio;
                    } else {
                        sourceList = (ART_ITEMS || []).map((art) => ({
                            id: art.id || String(Math.random()),
                            name: art.title || art.name || "Έργο Portfolio",
                            category: art.category || "Resin Art",
                            collection: art.year || "Portfolio Wix",
                            status: "Διαθέσιμο",
                            price: 0,
                            cost: 0,
                            stock: 1,
                            shopOrder: 0,
                            creationDate: art.year || "2024",
                            materials: [art.medium || "Art Work"],
                            colors: [],
                            shopMedia: art.images ? art.images.map((img) => ({ url: img, type: "image", showInShop: true })) : [{ url: art.imageUrl || art.image, type: "image", showInShop: true }],
                            privateMedia: [],
                            notes: art.description || "",
                            purchaseLinks: [],
                            postedPlatforms: []
                        }));
                    }
                }

                let pool = sourceList.filter(item => {
                    const term = searchQuery.toLowerCase();
                    const matchesStatsTab = getStatsSegment(item);
                    const matchesSearch = (item.name || '').toLowerCase().includes(term) ||
                        (item.collection && item.collection.toLowerCase().includes(term)) ||
                        (item.storage && item.storage.toLowerCase().includes(term)) ||
                        (item.materials && item.materials.some(m => m.toLowerCase().includes(term))) ||
                        (item.colors && item.colors.some(c => c.toLowerCase().includes(term))) ||
                        (item.platforms && item.platforms.some(p => p.toLowerCase().includes(term)));

                    const matchesCategory = selectedCategory === 'Όλα' || item.category === selectedCategory;
                    const matchesColor = selectedColor === 'Όλα' || (item.colors && item.colors.includes(selectedColor));

                    return matchesStatsTab && matchesSearch && matchesCategory && matchesColor;
                });

                pool.sort((a, b) => {
                    if (sortBy === 'entry_new') return b.createdAt?.seconds - a.createdAt?.seconds || b.id.localeCompare(a.id);
                    if (sortBy === 'entry_old') return a.createdAt?.seconds - b.createdAt?.seconds || a.id.localeCompare(b.id);
                    if (sortBy === 'shop_order') return (b.shopOrder || 0) - (a.shopOrder || 0) || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                    if (sortBy === 'date_made_new') return new Date(b.creationDate) - new Date(a.creationDate);
                    if (sortBy === 'date_made_old') return new Date(a.creationDate) - new Date(b.creationDate);
                    if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'el');
                    if (sortBy === 'name_desc') return b.name.localeCompare(a.name, 'el');
                    return 0;
                });

                return pool;
            }, [jewelryList, searchQuery, selectedCategory, selectedColor, sortBy, statsFilter]);

            const selectedItems = useMemo(() => {
                return jewelryList.filter(item => selectedItemIds.includes(item.id));
            }, [jewelryList, selectedItemIds]);

            const visibleItemIds = useMemo(() => filteredAndSortedJewelry.map(item => item.id), [filteredAndSortedJewelry]);

                        const selectItem = (id, shiftKey = false) => {
                const anchor = selectionAnchorId || (selectedItemIds.length > 0 ? selectedItemIds[selectedItemIds.length - 1] : null);
                if (shiftKey && anchor) {
                    const start = visibleItemIds.indexOf(anchor);
                    const end = visibleItemIds.indexOf(id);
                    if (start >= 0 && end >= 0) {
                        const min = Math.min(start, end);
                        const max = Math.max(start, end);
                        const range = visibleItemIds.slice(min, max + 1);
                        setSelectedItemIds(prev => Array.from(new Set([...prev, ...range])));
                        return;
                    }
                }
                setSelectedItemIds(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
                setSelectionAnchorId(id);
            };

            const handleProductSelectionClick = (event, id) => {
                const target = event.target as HTMLElement;
                if (target.closest('button, input, label, a, select, textarea, [data-no-lasso]')) return;
                if (event.shiftKey) {
                    event.preventDefault();
                    selectItem(id, true);
                    return;
                }
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    selectItem(id, false);
                    return;
                }
            };

            const finishLassoSelection = () => {
                lassoStartRef.current = null;
                setLassoRect(null);
            };

            const handleLassoStart = (event: React.PointerEvent<HTMLDivElement>) => {
                if (event.button !== 0) return;
                const target = event.target as HTMLElement;
                if (target.closest('button, input, select, textarea, label, a, [data-no-lasso], [data-product-id]')) return;

                const startX = event.clientX;
                const startY = event.clientY;
                const baseSelection = event.shiftKey ? [...selectedItemIds] : [];
                if (!event.shiftKey) setSelectedItemIds([]);

                let isDragging = false;

                const onPointerMove = (e: PointerEvent) => {
                    const dx = Math.abs(e.clientX - startX);
                    const dy = Math.abs(e.clientY - startY);
                    if (!isDragging && (dx > 4 || dy > 4)) {
                        isDragging = true;
                    }
                    if (!isDragging) return;

                    const minX = Math.min(startX, e.clientX);
                    const maxX = Math.max(startX, e.clientX);
                    const minY = Math.min(startY, e.clientY);
                    const maxY = Math.max(startY, e.clientY);

                    setLassoRect({ left: minX, top: minY, width: maxX - minX, height: maxY - minY });

                    const touchedIds: string[] = [];
                    const cardNodes = document.querySelectorAll('[data-product-id]');
                    cardNodes.forEach((node) => {
                        const rect = node.getBoundingClientRect();
                        if (rect.left < maxX && rect.right > minX && rect.top < maxY && rect.bottom > minY) {
                            const pid = (node as HTMLElement).dataset.productId;
                            if (pid) touchedIds.push(pid);
                        }
                    });
                    setSelectedItemIds(Array.from(new Set([...baseSelection, ...touchedIds])));
                };

                const onPointerUp = () => {
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                    window.removeEventListener('pointercancel', onPointerUp);
                    setLassoRect(null);
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerUp);
            };

            const handleLassoMove = (_event: React.PointerEvent<HTMLDivElement>) => {
                // Tracking handled via window pointermove
            };

            const selectVisibleItems = () => {
                setSelectedItemIds(prev => Array.from(new Set([...prev, ...visibleItemIds])));
            };

            const clearBulkSelection = () => {
                setSelectedItemIds([]);
                setIsBulkOpen(false);
                setBulkDraft({ category: '', collection: '', shopPlacement: '', status: '', price: '', materials: [], colors: [], notes: '' });
                setBulkFindText('');
                setBulkReplaceText('');
                setBulkStock('');
                setBulkPriceAdjustmentMode('none');
                setBulkPriceAdjustmentValue('');
            };

            const bulkMaterials = Array.isArray(bulkDraft.materials) ? bulkDraft.materials : splitTags(bulkDraft.materials || '');
            const bulkColors = Array.isArray(bulkDraft.colors) ? bulkDraft.colors : splitTags(bulkDraft.colors || '');
            const shopOrderedJewelry = useMemo(() => {
                return [...jewelryList].sort((a, b) => {
                    return (b.shopOrder || 0) - (a.shopOrder || 0) || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                });
            }, [jewelryList]);

            const toggleBulkTag = (field, value) => {
                setBulkDraft(prev => {
                    const current = Array.isArray(prev[field]) ? prev[field] : splitTags(prev[field] || '');
                    const next = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
                    return { ...prev, [field]: next };
                });
            };

            const clearBulkTags = (field) => {
                setBulkDraft(prev => ({ ...prev, [field]: [] }));
            };

            const getShopOrderedList = () => {
                return shopOrderedJewelry;
            };

            const buildShopOrderUpdates = (reordered) => {
                return reordered.map((product, idx) => {
                    const nextShopOrder = (reordered.length - idx) * 10;
                    return {
                        id: product.id,
                        oldData: { shopOrder: product.shopOrder || 0 },
                        newData: { shopOrder: nextShopOrder }
                    };
                }).filter(update => update.oldData.shopOrder !== update.newData.shopOrder);
            };

            const getGroupShopOrderUpdates = ({ movingIds, placement, targetId }) => {
                const shopList = getShopOrderedList();
                const movingSet = new Set(movingIds || []);
                const moving = shopList.filter(item => movingSet.has(item.id));
                if (!moving.length) return [];
                if (targetId && movingSet.has(targetId)) return [];

                const remaining = shopList.filter(item => !movingSet.has(item.id));
                let insertIndex = 0;

                if (targetId) {
                    const targetIndexInOriginal = shopList.findIndex(item => item.id === targetId);
                    const firstMovingIndex = shopList.findIndex(item => movingSet.has(item.id));
                    const targetIndexInRemaining = remaining.findIndex(item => item.id === targetId);
                    if (targetIndexInRemaining === -1 || firstMovingIndex === -1) return [];
                    insertIndex = targetIndexInOriginal > firstMovingIndex ? targetIndexInRemaining + 1 : targetIndexInRemaining;
                } else if (placement === 'top') {
                    insertIndex = 0;
                } else if (placement === 'bottom') {
                    insertIndex = remaining.length;
                } else {
                    const firstMovingIndex = shopList.findIndex(item => movingSet.has(item.id));
                    if (firstMovingIndex === -1) return [];
                    const currentInsertIndex = shopList.slice(0, firstMovingIndex).filter(item => !movingSet.has(item.id)).length;
                    insertIndex = placement === 'up'
                        ? Math.max(0, currentInsertIndex - 1)
                        : Math.min(remaining.length, currentInsertIndex + 1);
                }

                insertIndex = Math.max(0, Math.min(insertIndex, remaining.length));
                return buildShopOrderUpdates([
                    ...remaining.slice(0, insertIndex),
                    ...moving,
                    ...remaining.slice(insertIndex)
                ]);
            };

            const getBulkShopOrderUpdates = (placement) => {
                if (!placement) return [];
                return getGroupShopOrderUpdates({ movingIds: selectedItemIds, placement });
            };

            const isShopOrderMoveDisabled = (item, direction) => {
                const shopList = getShopOrderedList();
                const movingIds = selectedItemIds.includes(item.id) ? selectedItemIds : [item.id];
                const movingSet = new Set(movingIds);
                const firstMovingIndex = shopList.findIndex(product => movingSet.has(product.id));
                if (firstMovingIndex === -1) return true;
                const remaining = shopList.filter(product => !movingSet.has(product.id));
                const currentInsertIndex = shopList.slice(0, firstMovingIndex).filter(product => !movingSet.has(product.id)).length;
                return direction === 'up' ? currentInsertIndex === 0 : currentInsertIndex >= remaining.length;
            };


            const handleBulkFindAndReplace = async (isDeleteOnly = false) => {
                if (!bulkFindText.trim()) {
                    alert('Παρακαλώ εισάγετε λέξη ή φράση προς εντοπισμό.');
                    return;
                }
                if (selectedItems.length === 0) {
                    alert('Δεν έχουν επιλεγεί προϊόντα.');
                    return;
                }

                const searchTarget = bulkFindText;
                const replacement = isDeleteOnly ? '' : bulkReplaceText;

                let patternStr = searchTarget.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
                if (bulkWholeWord) {
                    patternStr = `\\b${patternStr}\\b`;
                }
                const flags = bulkCaseSensitive ? 'g' : 'gi';
                const regex = new RegExp(patternStr, flags);

                let matchCount = 0;
                const updatesList = [];

                const replaceInString = (val) => {
                    if (!val || typeof val !== 'string') return val;
                    let res = val.replace(regex, replacement);
                    if (isDeleteOnly) {
                        res = res.replace(/\s{2,}/g, ' ').trim();
                    }
                    return res;
                };

                selectedItems.forEach(item => {
                    const oldData = {};
                    const newData = {};
                    let changed = false;

                    if (bulkFindScopes.name && item.name) {
                        const nextName = replaceInString(item.name);
                        if (nextName !== item.name) {
                            oldData.name = item.name;
                            newData.name = nextName;
                            changed = true;
                            matchCount++;
                        }
                    }

                    if (bulkFindScopes.notes && item.notes) {
                        const nextNotes = replaceInString(item.notes);
                        if (nextNotes !== item.notes) {
                            oldData.notes = item.notes;
                            newData.notes = nextNotes;
                            changed = true;
                            matchCount++;
                        }
                    }

                    if (bulkFindScopes.collection && item.collection) {
                        const nextCol = replaceInString(item.collection);
                        if (nextCol !== item.collection) {
                            oldData.collection = item.collection;
                            newData.collection = nextCol;
                            changed = true;
                            matchCount++;
                        }
                    }

                    if (bulkFindScopes.materials && Array.isArray(item.materials)) {
                        const nextMats = item.materials
                            .map(m => replaceInString(m))
                            .filter(Boolean);
                        if (JSON.stringify(nextMats) !== JSON.stringify(item.materials)) {
                            oldData.materials = item.materials;
                            newData.materials = nextMats;
                            changed = true;
                            matchCount++;
                        }
                    }

                    if (bulkFindScopes.colors && Array.isArray(item.colors)) {
                        const nextCols = item.colors
                            .map(c => replaceInString(c))
                            .filter(Boolean);
                        if (JSON.stringify(nextCols) !== JSON.stringify(item.colors)) {
                            oldData.colors = item.colors;
                            newData.colors = nextCols;
                            changed = true;
                            matchCount++;
                        }
                    }

                    if (changed) {
                        updatesList.push({ id: item.id, oldData, newData });
                    }
                });

                if (updatesList.length === 0) {
                    alert(`Δεν εντοπίστηκε η λέξη "${searchTarget}" στα επιλεγμένα πεδία των ${selectedItems.length} προϊόντων.`);
                    return;
                }

                const actionLabel = isDeleteOnly ? 'Διαγραφή' : 'Αντικατάσταση';
                if (!window.confirm(`${actionLabel}: Εντοπίστηκαν ${matchCount} αντικαταστάσεις σε ${updatesList.length} προϊόντα. Θέλετε να εφαρμοστεί η αλλαγή;`)) {
                    return;
                }

                try {
                    const batch = writeBatch(db);
                    updatesList.forEach(u => {
                        batch.update(doc(db, "jewelry", u.id), {
                            ...u.newData,
                            updatedAt: serverTimestamp()
                        });
                    });
                    await batch.commit();

                    pushUndoAction({
                        type: 'BULK_UPDATE',
                        items: updatesList,
                        message: `${actionLabel} λέξης σε ${updatesList.length} προϊόντα.`
                    });

                    alert(`Ολοκληρώθηκε: Έγιναν ${matchCount} αλλαγές σε ${updatesList.length} προϊόντα.`);
                    notifyOperationSuccess('Αντικατάσταση Κειμένου', `Ολοκληρώθηκε: Έγιναν ${matchCount} αλλαγές σε ${updatesList.length} προϊόντα.`);
                    clearBulkSelection();
                } catch (err) {
                    notifyOperationError('Σφάλμα Αντικατάστασης', err.message || String(err));
                    alert('Σφάλμα κατά την αντικατάσταση: ' + (err.message || err));
                }
            };

            const handleBulkUpdate = async () => {
                if (selectedItems.length === 0) return;
                const updates = {};
                if (bulkDraft.category.trim()) updates.category = bulkDraft.category.trim();
                if (bulkDraft.collection.trim()) updates.collection = bulkDraft.collection.trim();
                if (bulkDraft.status.trim()) {
                    updates.status = bulkDraft.status.trim();
                    if (updates.status === 'Πουλήθηκε') updates.stock = 0;
                }
                if (bulkDraft.price !== '') {
                    const parsedBulkPrice = Number(bulkDraft.price);
                    if (Number.isNaN(parsedBulkPrice) || parsedBulkPrice < 0) {
                        alert("Η μαζική τιμή πρέπει να είναι μη αρνητικός αριθμός.");
                        return;
                    }
                    updates.price = parsedBulkPrice;
                }
                if (bulkStock !== '') {
                    const parsedStock = parseInt(bulkStock, 10);
                    if (!Number.isNaN(parsedStock) && parsedStock >= 0) {
                        updates.stock = parsedStock;
                        if (parsedStock === 0) updates.status = 'Πουλήθηκε';
                    }
                }
                if (bulkDraft.notes.trim()) updates.notes = bulkDraft.notes.trim();
                const shopOrderUpdates = getBulkShopOrderUpdates(bulkDraft.shopPlacement);
                if (Object.keys(updates).length === 0 && !bulkDraft.shopPlacement) {
                    alert("Συμπληρώστε τουλάχιστον ένα πεδίο για μαζική ενημέρωση.");
                    return;
                }
                if (Object.keys(updates).length === 0 && bulkDraft.shopPlacement && shopOrderUpdates.length === 0) {
                    alert("Η σειρά Shop δεν χρειάστηκε αλλαγή για τα επιλεγμένα προϊόντα.");
                    return;
                }

                const fields = Object.keys(updates);
                const bulkUpdateMap = new Map();
                const mergeBulkUpdate = (id, oldData, newData) => {
                    const existing = bulkUpdateMap.get(id) || { id, oldData: {}, newData: {} };
                    existing.oldData = { ...existing.oldData, ...oldData };
                    existing.newData = { ...existing.newData, ...newData };
                    bulkUpdateMap.set(id, existing);
                };

                // Process selected items with field updates, pricing adjustments, and tag additions/removals
                selectedItems.forEach(item => {
                    const itemUpdates = { ...updates };

                    // Handle price percentage or fixed amount adjustment
                    if (bulkPriceAdjustmentMode !== 'none' && bulkPriceAdjustmentValue !== '') {
                        const adjVal = Number(bulkPriceAdjustmentValue);
                        if (!Number.isNaN(adjVal) && adjVal > 0) {
                            const curPrice = Number(item.price) || 0;
                            let nextPrice = curPrice;
                            if (bulkPriceAdjustmentMode === 'percent_increase') {
                                nextPrice = Math.round((curPrice * (1 + adjVal / 100)) * 2) / 2;
                            } else if (bulkPriceAdjustmentMode === 'percent_decrease') {
                                nextPrice = Math.max(0, Math.round((curPrice * (1 - adjVal / 100)) * 2) / 2);
                            } else if (bulkPriceAdjustmentMode === 'fixed_increase') {
                                nextPrice = Math.round((curPrice + adjVal) * 2) / 2;
                            } else if (bulkPriceAdjustmentMode === 'fixed_decrease') {
                                nextPrice = Math.max(0, Math.round((curPrice - adjVal) * 2) / 2);
                            }
                            itemUpdates.price = nextPrice;
                        }
                    }

                    // Handle tag modes (append, remove, overwrite)
                    if (bulkMaterials.length > 0) {
                        const curMats = Array.isArray(item.materials) ? item.materials : [];
                        if (bulkTagMode === 'append') {
                            itemUpdates.materials = Array.from(new Set([...curMats, ...bulkMaterials]));
                        } else if (bulkTagMode === 'remove') {
                            itemUpdates.materials = curMats.filter(m => !bulkMaterials.includes(m));
                        } else {
                            itemUpdates.materials = bulkMaterials;
                        }
                    }

                    if (bulkColors.length > 0) {
                        const curCols = Array.isArray(item.colors) ? item.colors : [];
                        if (bulkTagMode === 'append') {
                            itemUpdates.colors = Array.from(new Set([...curCols, ...bulkColors]));
                        } else if (bulkTagMode === 'remove') {
                            itemUpdates.colors = curCols.filter(c => !bulkColors.includes(c));
                        } else {
                            itemUpdates.colors = bulkColors;
                        }
                    }

                    const itemFields = Object.keys(itemUpdates);
                    if (itemFields.length > 0) {
                        mergeBulkUpdate(
                            item.id,
                            Object.fromEntries(itemFields.map(field => [field, item[field] ?? (Array.isArray(itemUpdates[field]) ? [] : '')])),
                            itemUpdates
                        );
                    }
                });
                shopOrderUpdates.forEach(item => mergeBulkUpdate(item.id, item.oldData, item.newData));
                const undoItems = Array.from(bulkUpdateMap.values());

                try {
                    if (undoItems.length > 500) throw new Error('Επιτρέπονται έως 500 προϊόντα ανά μαζική ενέργεια.');
                    const batch = writeBatch(db);
                    undoItems.forEach(item => batch.update(doc(db, "jewelry", item.id), {
                        ...item.newData,
                        updatedAt: serverTimestamp()
                    }));
                    await batch.commit();
                    pushUndoAction({ type: 'BULK_UPDATE', items: undoItems, message: bulkDraft.shopPlacement ? 'Ενημερώθηκε η μαζική επεξεργασία και η σειρά Shop.' : 'Ενημερώθηκαν ' + selectedItems.length + ' προϊόντα.' });
                    if (updates.category && !BASE_CATEGORIES.includes(updates.category) && !customCategories.includes(updates.category)) setCustomCategories(prev => [...prev, updates.category]);
                    if (updates.colors) updates.colors.forEach(color => {
                        if (color && !BASE_COLORS.includes(color) && !customColors.includes(color)) setCustomColors(prev => [...prev, color]);
                    });
                    if (updates.materials) updates.materials.forEach(material => {
                        if (material && !BASE_MATERIALS.includes(material) && !customMaterials.includes(material)) setCustomMaterials(prev => [...prev, material]);
                    });
                    if (shopOrderUpdates.length) setSortBy('shop_order');
                    notifyOperationSuccess('Μαζική Ενημέρωση', `Ενημερώθηκαν ${selectedItems.length} προϊόντα επιτυχώς!`);
                    clearBulkSelection();
                } catch (err) {
                    notifyOperationError('Σφάλμα Μαζικής Ενημέρωσης', err.message);
                    alert("Αποτυχία μαζικής ενημέρωσης: " + err.message);
                }
            };

            const handleBulkDelete = async () => {
                if (selectedItems.length === 0) return;
                if (!window.confirm('Να διαγραφούν ' + selectedItems.length + ' επιλεγμένα προϊόντα;')) return;
                const itemsForUndo = selectedItems.map(item => ({ id: item.id, data: item }));
                try {
                    if (itemsForUndo.length > 500) throw new Error('Επιτρέπονται έως 500 προϊόντα ανά μαζική διαγραφή.');
                    const batch = writeBatch(db);
                    itemsForUndo.forEach(item => batch.delete(doc(db, "jewelry", item.id)));
                    await batch.commit();
                    pushUndoAction({ type: 'BULK_DELETE', items: itemsForUndo, message: 'Διαγράφηκαν ' + selectedItems.length + ' προϊόντα.' });
                    notifyOperationSuccess('Μαζική Διαγραφή', `Διαγράφηκαν ${selectedItems.length} προϊόντα επιτυχώς.`);
                    clearBulkSelection();
                } catch (err) {
                    notifyOperationError('Σφάλμα Μαζικής Διαγραφής', err.message);
                    alert("Αποτυχία μαζικής διαγραφής: " + err.message);
                }
            };

            const handleBulkDuplicate = async () => {
                if (selectedItems.length === 0) return;
                try {
                    if (selectedItems.length > 500) throw new Error('Επιτρέπονται έως 500 προϊόντα ανά μαζική αντιγραφή.');
                    const batch = writeBatch(db);
                    const duplicates = selectedItems.map(({ id, createdAt, updatedAt, ...item }) => {
                        const ref = doc(collection(db, 'jewelry'));
                        batch.set(ref, {
                            ...item,
                            name: `${item.name || 'Προϊόν'} (Αντίγραφο)`,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                        return { ...item, id: ref.id, name: `${item.name || 'Προϊόν'} (Αντίγραφο)` };
                    });
                    await batch.commit();
                    pushVersionHistory({
                        type: 'BULK_DUPLICATE',
                        id: '',
                        name: 'Μαζική αντιγραφή',
                        message: 'Αντιγράφηκαν ' + selectedItems.length + ' προϊόντα.',
                        before: selectedItems,
                        after: duplicates
                    });
                    notifyOperationSuccess('Μαζική Αντιγραφή', `Αντιγράφηκαν ${selectedItems.length} προϊόντα επιτυχώς!`);
                    clearBulkSelection();
                } catch (err) {
                    notifyOperationError('Σφάλμα Μαζικής Αντιγραφής', err.message);
                    alert("Αποτυχία μαζικής αντιγραφής: " + err.message);
                }
            };

            const handleUndo = async () => {
                if (!lastAction) return;
                try {
                    const original = buildHistoryEntryFromAction(lastAction);
                    await restoreHistory(db, original);
                    setUndoStack(prev => prev.slice(0, -1));
                    setRedoStack(prev => [...prev, lastAction].slice(-20));
                    setShowUndoToast(false);
                    setShowRedoToast(true);
                    pushVersionHistory({
                        ...buildHistoryEntryFromAction(lastAction, 'UNDO'), before: original.after || null, after: original.before || null,
                        message: 'Αναίρεση: ' + (lastAction.message || 'ενέργεια backoffice')
                    });
                    notifyOperationSuccess('Αναίρεση', 'Η ενέργεια αναιρέθηκε επιτυχώς.');
                } catch (err) {
                    alert("Σφάλμα αναίρεσης: " + err.message);
                }
            };

            const handleRedo = async () => {
                if (!redoAction) return;
                try {
                    const original = buildHistoryEntryFromAction(redoAction);
                    await restoreHistory(db, { ...original, before: original.after, after: original.before });
                    setRedoStack(prev => prev.slice(0, -1));
                    setUndoStack(prev => [...prev, redoAction].slice(-20));
                    setShowRedoToast(false);
                    setShowUndoToast(true);
                    pushVersionHistory({
                        ...buildHistoryEntryFromAction(redoAction, 'REDO'),
                        message: 'Επαναφορά: ' + (redoAction.message || 'ενέργεια backoffice')
                    });
                    notifyOperationSuccess('Επαναφορά', 'Η ενέργεια επανήλθε επιτυχώς.');
                } catch (err) {
                    alert("Σφάλμα επαναφοράς: " + err.message);
                }
            };

            const handleRestoreVersion = async (entry) => {
                if (!entry?.before || !entry.id) return;
                if (!window.confirm('Να επαναφερθεί αυτή η προηγούμενη έκδοση;')) return;
                try {
                    const loaded = await loadHistory(db, entry);
                    await restoreHistory(db, loaded);
                    pushVersionHistory({ type: 'HISTORY_RESTORE', collection: loaded.collection || 'jewelry', id: loaded.id, message: 'Επαναφορά προηγούμενης έκδοσης', before: loaded.after, after: loaded.before });
                    setIsHistoryOpen(false);
                } catch (err) {
                    alert("Αποτυχία επαναφοράς έκδοσης: " + err.message);
                }
            };

            const canRestoreHistoryEntry = (entry) => {
                if (entry?.cloudId) return entry.hasBefore || ['ADD', 'BULK_DUPLICATE'].includes(entry.type);
                if (!entry) return false;
                if ((entry.type === 'ADD' || entry.type === 'BULK_DUPLICATE') && (entry.after?.id || (Array.isArray(entry.after) && entry.after.length))) return true;
                if (entry.id && entry.before) return true;
                if (Array.isArray(entry.before) && entry.before.length) return true;
                return false;
            };

            const handleRestoreHistoryEntry = async (entry) => {
                if (!canRestoreHistoryEntry(entry)) {
                    alert('Δεν υπάρχουν αρκετά δεδομένα σε αυτή την εγγραφή ιστορικού για επαναφορά.');
                    return;
                }
                if (!window.confirm('Να γίνει επαναφορά αυτής της ενέργειας;')) return;
                try {
                    entry = await loadHistory(db, entry);
                    await restoreHistory(db, entry);
                    pushVersionHistory({
                        type: 'HISTORY_RESTORE',
                        collection: entry.collection || 'jewelry',
                        id: entry.id || '',
                        name: entry.name || 'Επαναφορά ιστορικού',
                        message: 'Έγινε επαναφορά από το ιστορικό: ' + (entry.message || entry.type || 'ενέργεια'),
                        before: entry.after || null,
                        after: entry.type === 'BULK_DUPLICATE' ? null : entry.before || null
                    });
                    setIsHistoryOpen(false);
                } catch (err) {
                    alert("Αποτυχία επαναφοράς ιστορικού: " + err.message);
                }
            };

            const handleReorderProducts = async ({ movingIds, placement, targetId }) => {
                const updates = getGroupShopOrderUpdates({ movingIds, placement, targetId });
                if (!updates.length) return;

                try {
                    if (updates.length > 500) throw new Error('Επιτρέπονται έως 500 προϊόντα ανά αλλαγή σειράς.');
                    const batch = writeBatch(db);
                    updates.forEach(update => batch.update(doc(db, "jewelry", update.id), {
                        ...update.newData,
                        updatedAt: serverTimestamp()
                    }));
                    await batch.commit();
                    pushUndoAction({ type: 'BULK_UPDATE', items: updates, message: movingIds?.length > 1 ? 'Άλλαξε μαζικά η σειρά εμφάνισης στο Shop.' : 'Άλλαξε η σειρά εμφάνισης στο Shop.' });
                    setSortBy('shop_order');
                } catch (err) {
                    alert("Αποτυχία αλλαγής σειράς: " + err.message);
                }
            };

            const handleMoveShopOrder = async (item, direction) => {
                const movingIds = selectedItemIds.includes(item.id) ? selectedItemIds : [item.id];
                await handleReorderProducts({ movingIds, placement: direction });
            };

            const stopProductDragAutoScroll = () => {
                const state = productDragAutoScrollRef.current;
                state.speed = 0;
                if (state.frame) {
                    cancelAnimationFrame(state.frame);
                    state.frame = null;
                }
            };

            const runProductDragAutoScroll = () => {
                const state = productDragAutoScrollRef.current;
                if (!state.speed) {
                    state.frame = null;
                    return;
                }
                window.scrollBy({ top: state.speed, left: 0, behavior: 'auto' });
                state.frame = requestAnimationFrame(runProductDragAutoScroll);
            };

            const handleProductDragAutoScroll = (event) => {
                if (!draggedProductId) return;
                const edgeSize = Math.min(140, Math.max(90, window.innerHeight * 0.16));
                const maxSpeed = 30;
                const distanceTop = event.clientY;
                const distanceBottom = window.innerHeight - event.clientY;
                let speed = 0;

                if (distanceTop < edgeSize) {
                    speed = -Math.ceil(((edgeSize - distanceTop) / edgeSize) * maxSpeed);
                } else if (distanceBottom < edgeSize) {
                    speed = Math.ceil(((edgeSize - distanceBottom) / edgeSize) * maxSpeed);
                }

                const state = productDragAutoScrollRef.current;
                state.speed = speed;
                if (!speed) {
                    stopProductDragAutoScroll();
                    return;
                }
                if (!state.frame) state.frame = requestAnimationFrame(runProductDragAutoScroll);
            };

            useEffect(() => {
                if (!draggedProductId) {
                    stopProductDragAutoScroll();
                    return;
                }

                const handleWindowDragOver = (event) => {
                    event.preventDefault();
                    handleProductDragAutoScroll(event);
                };
                const handleWindowDragEnd = () => stopProductDragAutoScroll();

                window.addEventListener('dragover', handleWindowDragOver, { passive: false });
                window.addEventListener('drop', handleWindowDragEnd);
                window.addEventListener('dragend', handleWindowDragEnd);

                return () => {
                    window.removeEventListener('dragover', handleWindowDragOver);
                    window.removeEventListener('drop', handleWindowDragEnd);
                    window.removeEventListener('dragend', handleWindowDragEnd);
                    stopProductDragAutoScroll();
                };
            }, [draggedProductId]);

            const handleProductDragStart = (event, item) => {
                setDraggedProductId(item.id);
                setDragOverProductId(null);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.id);
            };

            const handleProductDragOver = (event, item) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                handleProductDragAutoScroll(event);
                const movingIds = draggedProductId && selectedItemIds.includes(draggedProductId) ? selectedItemIds : [draggedProductId];
                if (movingIds.includes(item.id)) {
                    if (dragOverProductId) setDragOverProductId(null);
                    return;
                }
                if (dragOverProductId !== item.id) setDragOverProductId(item.id);
            };

            const handleProductDrop = async (event, targetItem) => {
                event.preventDefault();
                const sourceId = event.dataTransfer.getData('text/plain') || draggedProductId;
                stopProductDragAutoScroll();
                setDraggedProductId(null);
                setDragOverProductId(null);
                if (!sourceId || sourceId === targetItem.id) return;
                const movingIds = selectedItemIds.includes(sourceId) ? selectedItemIds : [sourceId];
                await handleReorderProducts({ movingIds, targetId: targetItem.id });
            };

            const handleProductDragEnd = () => {
                stopProductDragAutoScroll();
                setDraggedProductId(null);
                setDragOverProductId(null);
            };

            const renderFieldOptionManager = ({ type, title, options, counts, hiddenOptions, tone = 'stone' }) => {
                const isIndigo = tone === 'indigo';
                const panelClass = isIndigo ? 'border border-indigo-100 bg-indigo-50/40 rounded-xl p-4' : 'border border-stone-200 bg-stone-50 rounded-xl p-4';
                const titleClass = isIndigo ? 'text-sm font-black text-indigo-700 uppercase' : 'text-sm font-black text-stone-700 uppercase';
                const buttonClass = isIndigo ? 'px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition' : 'px-3 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-bold hover:bg-stone-100 transition';
                const countClass = isIndigo ? 'text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full' : 'text-[10px] font-black text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full';
                const itemClass = isIndigo ? 'flex items-center gap-2 bg-white border border-indigo-100 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing' : 'flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing';
                const restoreClass = isIndigo ? 'text-[11px] px-2 py-1 bg-white border border-indigo-100 rounded text-indigo-700' : 'text-[11px] px-2 py-1 bg-white border border-stone-200 rounded text-stone-700';

                return (
                    <div className={panelClass}>
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <h3 className={titleClass}>{title}</h3>
                            <button onClick={() => handleSortFieldOptionsByUsage(type)} className={buttonClass}>Συχνότερα πρώτα</button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {options.length === 0 && <span className="text-sm text-stone-400 italic px-1 py-2">Καμία καταχώρηση.</span>}
                            {options.map(option => (
                                <div
                                    key={option}
                                    draggable
                                    onDragStart={(e) => handleFieldOptionDragStart(e, type, option)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleFieldOptionDrop(e, type, option)}
                                    onDragEnd={() => setDraggedFieldOption(null)}
                                    className={itemClass}
                                >
                                    <IconGripVertical />
                                    {type === 'color' && (
                                        <span
                                            className="w-3.5 h-3.5 rounded-full border border-stone-300 shadow-2xs shrink-0"
                                            style={{ backgroundColor: getColorSwatch(option) }}
                                        />
                                    )}
                                    <span className="flex-1 text-sm font-bold text-stone-700">{option}</span>
                                    <span className={countClass}>{counts[option] || 0}</span>
                                    <button onClick={() => handleHideFieldOption(type, option)} className="text-red-500 hover:text-red-700" title="Αφαίρεση από προτάσεις"><IconTrash /></button>
                                </div>
                            ))}
                        </div>
                        {hiddenOptions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {hiddenOptions.map(option => (
                                    <button key={option} onClick={() => handleRestoreFieldOption(type, option)} className={restoreClass}>Επαναφορά {option}</button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            };

            const handleAdminLogin = async (event) => {
                event.preventDefault();
                setLoginError('');
                setIsLoggingIn(true);
                try {
                    await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
                    setAdminPassword('');
                } catch (err) {
                    setLoginError(err.message || 'Login failed.');
                } finally {
                    setIsLoggingIn(false);
                }
            };

            const handleAdminSignOut = async () => {
                await signOut(auth);
            };

            if (!firebaseReady || !authReady) return null;

            if (currentUser && !isAdminClaim) {
                return (
                    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-100">
                        <section role="alert" className="w-full max-w-md bg-white border border-amber-200 rounded-2xl shadow-xl p-6 space-y-3">
                            <h1 className="text-xl font-black text-stone-900">Δεν έχει δοθεί δικαίωμα διαχείρισης</h1>
                            <p className="text-sm text-stone-600">Ο λογαριασμός είναι συνδεδεμένος, αλλά δεν έχει το Firebase admin claim που απαιτείται για το Back Office.</p>
                            <button onClick={handleAdminSignOut} className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-bold">Αποσύνδεση</button>
                        </section>
                    </div>
                );
            }

            if (!currentUser) {
                return (
                    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-100">
                        <form onSubmit={handleAdminLogin} className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl shadow-xl p-6 space-y-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Aram Creations</p>
                                <h1 className="text-2xl font-black text-stone-900 mt-1">Secure Back Office</h1>
                                <p className="text-sm text-stone-500 mt-2">Συνδεσου με τον Firebase admin λογαριασμο σου.</p>
                            </div>
                            <label className="block">
                                <span className="text-xs font-bold text-stone-500 uppercase">Email</span>
                                <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} autoComplete="email" required className="mt-1 w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-stone-500" />
                            </label>
                            <label className="block">
                                <span className="text-xs font-bold text-stone-500 uppercase">Password</span>
                                <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoComplete="current-password" required className="mt-1 w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-stone-500" />
                            </label>
                            {loginError && <div className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">{loginError}</div>}
                            <button type="submit" disabled={isLoggingIn} className="w-full px-5 py-3 rounded-xl bg-stone-900 text-white font-black hover:bg-stone-800 disabled:opacity-50 transition">
                                {isLoggingIn ? 'Συνδεση...' : 'Συνδεση'}
                            </button>
                        </form>
                    </div>
                );
            }

            if (activeCollection === 'orders') return <OrdersManager onBack={() => setActiveCollection('jewelry')} />;
            if (activeCollection === 'portfolio') {
                return (
                    <PortfolioManager
                        onBack={() => setActiveCollection('jewelry')}
                        onNavigateOrders={() => setActiveCollection('orders')}
                        onOpenSettings={() => { setIsSettingsOpen(true); setActiveSettingsTab('portfolio'); }}
                        currentUser={currentUser}
                        onSignOut={handleAdminSignOut}
                    />
                );
            }

            return (
                <div className="backoffice-view min-h-screen p-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-20 relative">

                    <header className="backoffice-toolbar flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-5 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-200">
                        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Κατάλογος">
                            <button type="button" role="tab" aria-selected={false} onClick={() => setActiveCollection('orders')} className="px-3 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-bold">Παραγγελίες</button>
                            <button type="button" role="tab" aria-selected={activeCollection === 'jewelry'} onClick={() => { setActiveCollection('jewelry'); setSelectedCategory('Όλα'); setStatsFilter('all'); }} className={activeCollection === 'jewelry' ? 'px-3 py-2 rounded-lg bg-stone-900 text-white text-sm font-bold' : 'px-3 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-bold'}>Shop</button>
                            <button type="button" role="tab" aria-selected={activeCollection === 'portfolio'} onClick={() => { setActiveCollection('portfolio'); setSelectedCategory('Όλα'); setStatsFilter('all'); }} className={activeCollection === 'portfolio' ? 'px-3 py-2 rounded-lg bg-stone-900 text-white text-sm font-bold' : 'px-3 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-bold'}>Portfolio</button>
                        </div>
                        <div className="backoffice-actions flex flex-col gap-3 w-full lg:w-auto">
                            <div className="backoffice-primary-actions flex flex-wrap items-center justify-start lg:justify-end gap-3">
                                <button onClick={handleOpenAdd} className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-bold transition shadow-md">
                                    <IconPlus /> Νέα Καταχώρηση
                                </button>
                                <button onClick={() => setIsVintedImportOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-black transition shadow-sm" title="Import προϊόντων από Vinted links">
                                    Import Vinted
                                </button>
                                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 text-xs font-bold min-w-0">
                                    <span className="max-w-[190px] truncate">{currentUser.email}</span>
                                    <button onClick={handleAdminSignOut} className="text-emerald-900 underline underline-offset-2 whitespace-nowrap">Logout</button>
                                </div>
                            </div>
                            <div className="backoffice-utility-actions flex flex-wrap items-center justify-start lg:justify-end gap-2 pt-3 border-t border-stone-100">
                                <button onClick={handleUndo} disabled={!lastAction} className="flex items-center justify-center px-3 py-2 bg-stone-100 disabled:opacity-40 hover:bg-stone-200 text-stone-700 rounded-lg transition font-bold text-xs" title="Αναίρεση τελευταίας ενέργειας">
                                    <IconUndo /> <span className="ml-2">Undo</span>
                                </button>
                                <button onClick={handleRedo} disabled={!redoAction} className="flex items-center justify-center px-3 py-2 bg-stone-100 disabled:opacity-40 hover:bg-stone-200 text-stone-700 rounded-lg transition font-bold text-xs" title="Επαναφορά τελευταίας αναίρεσης">
                                    Redo
                                </button>
                                <button onClick={() => setIsHistoryOpen(true)} className="flex items-center justify-center px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition font-bold text-xs" title="Ιστορικό εκδόσεων">
                                    Ιστορικό
                                </button>
                                <FirebaseMediaCleanup />
                                <CatalogExcelExport />
                                <button onClick={exportToCSV} className="flex items-center justify-center px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition font-bold text-xs" title="Εξαγωγή CSV χωρίς ενσωματωμένες εικόνες">
                                    <IconDownload /> <span className="ml-2">CSV</span>
                                </button>
                                <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition" title="Διαχείριση Συστήματος & Εμφάνισης Shop">
                                    <IconSettings />
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-end mb-3 px-1 min-w-0">
                            <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">Στατιστικα Καταλογου</h3>
                            <div className="backoffice-stats-filter flex flex-wrap bg-stone-200/70 rounded-lg p-1 max-w-full">
                                <button onClick={() => setStatsFilter('available')} className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm ${statsFilter === 'available' ? 'bg-white text-stone-800' : 'text-stone-500 hover:text-stone-700 shadow-none'}`}>Διαθέσιμα</button>
                                <button onClick={() => setStatsFilter('unavailable')} className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm whitespace-nowrap ${statsFilter === 'unavailable' ? 'bg-white text-stone-800' : 'text-stone-500 hover:text-stone-700 shadow-none'}`}>Μη Διαθέσιμα</button>
                                <button onClick={() => setStatsFilter('sold')} className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm whitespace-nowrap ${statsFilter === 'sold' ? 'bg-white text-stone-800' : 'text-stone-500 hover:text-stone-700 shadow-none'}`}>Πωληθέντα</button>
                                <button onClick={() => setStatsFilter('all')} className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm ${statsFilter === 'all' ? 'bg-white text-stone-800' : 'text-stone-500 hover:text-stone-700 shadow-none'}`}>Συνολικά</button>
                            </div>
                        </div>
                        <div className="backoffice-stats-grid grid grid-cols-3 gap-3 sm:gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{statsCopy.count}</span>
                                <span className="text-xl sm:text-2xl font-black text-stone-950">{dashboardStats.count}</span>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{statsCopy.value}</span>
                                <span className="text-xl sm:text-2xl font-black text-stone-950">{dashboardStats.value.toFixed(2)}€</span>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{statsCopy.profit}</span>
                                <span className="text-xl sm:text-2xl font-black text-stone-950">{dashboardStats.profit.toFixed(2)}€</span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                      <CatalogControls label="Φίλτρα Back Office Shop" search={searchQuery} onSearch={setSearchQuery}
                        placeholder="Αναζήτηση (όνομα, συλλογή, υλικό, χρώμα)..."
                        categories={[{ id: 'Όλα', label: 'Όλες οι Κατηγορίες' }, ...allFilterCategories.map(category => ({ id: category, label: category }))]}
                        selectedCategory={selectedCategory} onCategory={setSelectedCategory}
                        actions={<>
                        <select className="px-4 py-2 border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:border-stone-400 text-sm" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
                            <option value="Όλα">Όλα τα Χρώματα</option>
                            {allFilterColors.map(col => <option key={col} value={col}>{col}</option>)}
                        </select>
                        <select className="px-4 py-2 border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:border-stone-400 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="entry_new">Νεότερα</option>
                            <option value="entry_old">Παλαιότερα</option>
                            <option value="shop_order">Σειρά Shop</option>
                            <option value="date_made_new">Ημ. Κατασκευής (Νεότερα)</option>
                            <option value="date_made_old">Ημ. Κατασκευής (Pαλαιότερα)</option>
                            <option value="name_asc">Όνομα (Α-Ω)</option>
                            <option value="name_desc">Όνομα (Ω-Α)</option>
                        </select>
                        <div className="flex border border-stone-200 rounded-lg overflow-hidden md:ml-auto">
                            <button onClick={() => setViewMode('grid')} className={`p-2 transition ${viewMode === 'grid' ? 'bg-stone-200 text-stone-800' : 'bg-white text-stone-400 hover:text-stone-600'}`}><IconGrid /></button>
                            <button onClick={() => setViewMode('list')} className={`p-2 transition ${viewMode === 'list' ? 'bg-stone-200 text-stone-800' : 'bg-white text-stone-400 hover:text-stone-600'}`}><IconList /></button>
                        </div>
                        </>} />
                    </div>

                    <div className="mb-6 bg-white border border-stone-200 rounded-xl shadow-sm p-3 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm font-bold text-stone-700 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-stone-300" checked={visibleItemIds.length > 0 && visibleItemIds.every(id => selectedItemIds.includes(id))} onChange={(e) => e.target.checked ? selectVisibleItems() : setSelectedItemIds(prev => prev.filter(id => !visibleItemIds.includes(id)))} />
                                Επιλογή ορατών
                            </label>
                            <span className="text-xs text-stone-400 font-bold">{selectedItemIds.length} επιλεγμένα</span>
                            <span className="text-[11px] text-stone-500">Shift + κλικ: συνεχόμενη επιλογή · σύρε σε κενό χώρο: επιλογή με πλαίσιο</span>
                        </div>
                        {selectedItemIds.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <VintedRefresh statuses={allFormStatuses} items={selectedItems} sourceUrl={getVintedSourceUrl} endpoint={getVintedApis().link} pricing={(basePrice) => ({
                                    vintedBasePrice: basePrice,
                                    buyerFixed: parseVintedMoney(vintedPricingSettings.buyerFixed),
                                    buyerPercent: parseVintedMoney(vintedPricingSettings.buyerPercent),
                                    shippingMin: parseVintedMoney(vintedPricingSettings.shippingMin),
                                    estimatedTotal: basePrice + parseVintedMoney(vintedPricingSettings.buyerFixed) + basePrice * parseVintedMoney(vintedPricingSettings.buyerPercent) / 100 + parseVintedMoney(vintedPricingSettings.shippingMin),
                                    sitePrice: calculateVintedAdjustedPrice(basePrice),
                                    rounding: vintedPricingSettings.rounding,
                                    parcelProfile: 'small_parcel_gr'
                                })} />
                                <button onClick={() => setIsBulkOpen(true)} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 transition">Μαζική επεξεργασία</button>
                                <button onClick={handleBulkDuplicate} className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-bold hover:bg-stone-200 transition">Αντιγραφή</button>
                                <button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition">Διαγραφή</button>
                                <button onClick={clearBulkSelection} className="px-4 py-2 bg-white border border-stone-200 text-stone-500 rounded-lg text-xs font-bold hover:bg-stone-50 transition">Καθαρισμός</button>
                            </div>
                        )}
                    </div>
                    {vintedRefreshResult && (
                        <div role={vintedRefreshResult.error ? 'alert' : 'status'} className={`mb-5 rounded-lg border px-4 py-3 text-xs font-bold ${vintedRefreshResult.error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                            {vintedRefreshResult.message}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center p-20 font-medium text-stone-400">Φόρτωση δεδομένων από το Cloud...</div>
                    ) : catalogLoadError ? (
                        <div role="alert" className="text-center p-10 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                            <p className="font-bold">Δεν φορτώθηκε ο κατάλογος.</p>
                            <p className="text-sm mt-1">{catalogLoadError}</p>
                            <button onClick={() => setCatalogRetryKey((key) => key + 1)} className="mt-4 px-4 py-2 rounded-lg bg-rose-700 text-white text-sm font-bold hover:bg-rose-800">
                                Δοκιμή ξανά
                            </button>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'grid' && (
                                <div ref={productGridRef} onPointerDown={handleLassoStart} className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 select-none p-3 sm:p-4 bg-stone-50/50 rounded-2xl border border-stone-200/60">
                                    {lassoRect && <div aria-hidden="true" className="pointer-events-none fixed z-[9999] border-2 border-emerald-500 bg-emerald-400/20 rounded shadow-sm" style={{ left: `${lassoRect.left}px`, top: `${lassoRect.top}px`, width: `${lassoRect.width}px`, height: `${lassoRect.height}px` }} />}
                                    {filteredAndSortedJewelry.map((item) => {
                                        const isSold = isSoldItem(item);
                                        const isBulkDragged = draggedProductId && selectedItemIds.includes(draggedProductId) && selectedItemIds.includes(item.id);
                                        return (
                                        <div
                                            key={item.id}
                                            data-product-id={item.id}
                                            draggable
                                            onClick={(event) => handleProductSelectionClick(event, item.id)}
                                            onDragStart={(event) => handleProductDragStart(event, item)}
                                            onDragOver={(event) => handleProductDragOver(event, item)}
                                            onDrop={(event) => handleProductDrop(event, item)}
                                            onDragEnd={handleProductDragEnd}
                                            className={`group bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition relative cursor-grab active:cursor-grabbing ${selectedItemIds.includes(item.id) ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'} ${dragOverProductId === item.id ? 'ring-2 ring-amber-400 border-amber-300 shadow-lg' : ''} ${draggedProductId === item.id || isBulkDragged ? 'opacity-60 scale-[0.99]' : ''} ${isSold ? 'opacity-80' : ''}`}
                                        >
                                            <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden relative">
                                                <label onClick={(e) => e.stopPropagation()} className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-lg p-1 shadow-sm cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 rounded border-stone-300 accent-stone-900 cursor-pointer" checked={selectedItemIds.includes(item.id)} onClick={(event) => { event.stopPropagation(); selectItem(item.id, event.shiftKey); }} onChange={() => {}} />
                                                </label>
                                                {item.imageUrl ? (
                                                    item.fileType === 'video' ? (
                                                        <video src={item.imageUrl} referrerPolicy="no-referrer" className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} muted loop autoPlay playsInline />
                                                    ) : (
                                                        <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={item.imageUrl} className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} alt={item.name} />
                                                    )
                                                ) : <IconImage />}

                                                {item.mediaList && item.mediaList.length > 1 && (
                                                    <div className="absolute top-2 right-2 bg-stone-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                        {item.mediaList.length} αρχεία
                                                    </div>
                                                )}
                                                <div className="absolute bottom-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'up'); }} disabled={isShopOrderMoveDisabled(item, 'up')} className="bg-white/95 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow" title="Πιο πάνω στο Shop">↑</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'down'); }} disabled={isShopOrderMoveDisabled(item, 'down')} className="bg-white/95 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow" title="Πιο κάτω στο Shop">↓</button>
                                                </div>
                                                <div className="absolute bottom-2 left-2 bg-white/90 text-stone-600 text-[10px] font-black px-2 py-1 rounded shadow-sm border border-stone-200 opacity-0 group-hover:opacity-100 transition-opacity">Σύρε</div>

                                                {item.stock > 1 && !isSold && (
                                                    <div className="absolute top-10 left-2 bg-stone-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow flex items-center gap-1">
                                                        <IconBox /> Απόθεμα: {item.stock}
                                                    </div>
                                                )}
                                                {isSold && (
                                                    <div className="absolute inset-0 bg-white/35 flex items-center justify-center">
                                                        <span className="bg-stone-900/80 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">Μη διαθέσιμο</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{item.category}</span>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusColor(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                                <h3 className={`font-bold text-lg leading-tight mb-1 ${isSold ? 'text-stone-500 line-through' : 'text-stone-800'}`}>{item.name}</h3>
                                                {item.collection && <p className="text-xs text-stone-500 italic mb-2">{item.collection}</p>}

                                                <div className="flex flex-wrap gap-1 mb-4 mt-auto pt-2">
                                                    {item.colors?.slice(0, 2).map((col, i) => <span key={i} className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 uppercase font-bold">{col}</span>)}
                                                    {item.materials?.slice(0, 2).map((mat, i) => <span key={i} className="text-[10px] bg-stone-50 text-stone-600 px-1.5 py-0.5 rounded border border-stone-200">{mat}</span>)}
                                                </div>

                                                <div className="flex justify-between items-center pt-3 border-t border-stone-100">
                                                    <span className={`font-bold ${isSold ? 'text-stone-400' : 'text-stone-900'}`}>{item.price ? `${item.price}€` : '-'}</span>
                                                    <div className="flex gap-1">
                                                        {!isSold && (
                                                            <button type="button" onClick={(e) => handleQuickSold(e, item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Γρήγορη Πώληση"><IconBolt /></button>
                                                        )}
                                                        <button type="button" onClick={() => handleCloneItem(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded-lg transition" title="Αντιγραφή"><IconClone /></button>
                                                        <button type="button" onClick={() => handleViewDetails(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded-lg transition" title="Προβολή"><IconEye /></button>
                                                        <button type="button" onClick={() => handleOpenEdit(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded-lg transition" title="Επεξεργασία"><IconEdit /></button>
                                                        <button type="button" onClick={() => handleDeleteItem(item.id, item.mediaList, item.imageUrl)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition" title="Διαγραφή"><IconTrash /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            )}

                            {viewMode === 'list' && (
                                <div onPointerDown={handleLassoStart} className="flex flex-col gap-3 p-3 sm:p-4 bg-stone-50/50 rounded-2xl border border-stone-200/60 select-none">
                                    {filteredAndSortedJewelry.map((item) => {
                                        const isSold = isSoldItem(item);
                                        const isBulkDragged = draggedProductId && selectedItemIds.includes(draggedProductId) && selectedItemIds.includes(item.id);
                                        return (
                                        <div
                                            key={item.id}
                                            data-product-id={item.id}
                                            draggable
                                            onClick={(event) => handleProductSelectionClick(event, item.id)}
                                            onDragStart={(event) => handleProductDragStart(event, item)}
                                            onDragOver={(event) => handleProductDragOver(event, item)}
                                            onDrop={(event) => handleProductDrop(event, item)}
                                            onDragEnd={handleProductDragEnd}
                                            className={`flex flex-col md:flex-row items-start md:items-center p-3 bg-white border rounded-xl shadow-sm gap-4 transition hover:bg-stone-50 cursor-grab active:cursor-grabbing ${selectedItemIds.includes(item.id) ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'} ${dragOverProductId === item.id ? 'ring-2 ring-amber-400 border-amber-300 shadow-lg' : ''} ${draggedProductId === item.id || isBulkDragged ? 'opacity-60 scale-[0.99]' : ''} ${isSold ? 'opacity-80' : ''}`}
                                        >
                                            <div className="hidden md:flex h-10 w-6 items-center justify-center text-stone-300 font-black select-none">::</div>
                                            <label onClick={(e) => e.stopPropagation()} className="flex items-center justify-center p-2 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 rounded border-stone-300 accent-stone-900 cursor-pointer" checked={selectedItemIds.includes(item.id)} onClick={(event) => { event.stopPropagation(); selectItem(item.id, event.shiftKey); }} onChange={() => {}} />
                                            </label>
                                            <div className="w-16 h-16 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-200 relative">
                                                {item.imageUrl ? (
                                                    item.fileType === 'video' ? (
                                                        <video src={item.imageUrl} referrerPolicy="no-referrer" className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} muted />
                                                    ) : (
                                                        <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={item.imageUrl} className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} alt={item.name} />
                                                    )
                                                ) : <IconImage />}
                                                {item.stock > 1 && !isSold && <div className="absolute bottom-0 right-0 bg-stone-900 text-white text-[9px] px-1 font-bold rounded-tl">{item.stock}x</div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-bold truncate ${isSold ? 'text-stone-500 line-through' : 'text-stone-800'}`}>{item.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${getStatusColor(item.status)}`}>{item.status}</span>
                                                    <span className="text-xs font-bold text-stone-500 uppercase">{item.category}</span>
                                                </div>
                                            </div>
                                            <div className="hidden lg:flex flex-wrap gap-1 flex-1">
                                                {item.colors?.slice(0, 1).map((col, i) => <span key={i} className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-1 rounded border border-indigo-100 uppercase font-bold">{col}</span>)}
                                                {item.materials?.slice(0, 1).map((mat, i) => <span key={i} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-1 rounded border border-stone-200">{mat}</span>)}
                                                {item.storage && <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200">{item.storage}</span>}
                                            </div>
                                            <div className={`font-bold md:w-20 md:text-right ${isSold ? 'text-stone-400' : 'text-stone-900'}`}>
                                                {item.price ? `${item.price}€` : '-'}
                                            </div>
                                            <div className="flex gap-1 mt-3 md:mt-0 w-full md:w-auto justify-end border-t border-stone-100 md:border-none pt-3 md:pt-0">
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'up'); }} disabled={isShopOrderMoveDisabled(item, 'up')} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-amber-700 disabled:text-stone-300 hover:bg-amber-50 rounded-lg transition" title="Πιο πάνω στο Shop">↑</button>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'down'); }} disabled={isShopOrderMoveDisabled(item, 'down')} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-amber-700 disabled:text-stone-300 hover:bg-amber-50 rounded-lg transition" title="Πιο κάτω στο Shop">↓</button>
                                                {!isSold && (
                                                    <button type="button" onClick={(e) => handleQuickSold(e, item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Γρήγορη Πώληση"><IconBolt /></button>
                                                )}
                                                <button type="button" onClick={() => handleCloneItem(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Αντιγραφή"><IconClone /></button>
                                                <button type="button" onClick={() => handleViewDetails(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Προβολή"><IconEye /></button>
                                                <button type="button" onClick={() => handleOpenEdit(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Επεξεργασία"><IconEdit /></button>
                                                <button type="button" onClick={() => handleDeleteItem(item.id, item.mediaList, item.imageUrl)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition" title="Διαγραφή"><IconTrash /></button>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            )}
                        </>
                    )}

                    {isBulkOpen && (
                        <div
                            onClick={(e) => { if (e.target === e.currentTarget) setIsBulkOpen(false); }}
                            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 cursor-pointer overflow-y-auto"
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-stone-200 cursor-default animate-fade-in"
                            >
                                {/* Header */}
                                <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between gap-4 shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex -space-x-2 overflow-hidden shrink-0">
                                            {selectedItems.slice(0, 5).map((item) => (
                                                <div key={item.id} className="w-10 h-10 rounded-lg border-2 border-white bg-stone-200 overflow-hidden shadow-sm">
                                                    {item.imageUrl ? <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-stone-300">ARAM</div>}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-base sm:text-lg font-black text-stone-800 leading-tight">Μαζική επεξεργασία</h2>
                                            <p className="text-xs font-bold text-stone-500">{selectedItems.length} επιλεγμένα προϊόντα</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsBulkOpen(false)} className="text-stone-400 hover:text-stone-800 bg-white p-2 rounded-lg border border-stone-200" title="Κλείσιμο (Esc)"><IconX /></button>
                                </div>

                                {/* Navigation Tabs */}
                                <div className="px-5 py-2.5 border-b border-stone-200 bg-stone-50/90 flex flex-wrap items-center gap-2 shrink-0">
                                    {[
                                        ['fields', 'Βασικά Στοιχεία'],
                                        ['search_replace', 'Εντοπισμός & Αντικατάσταση'],
                                        ['pricing', 'Τιμές & Απόθεμα'],
                                        ['tags', 'Χρώματα & Υλικά']
                                    ].map(([tabId, label]) => (
                                        <button
                                            key={tabId}
                                            type="button"
                                            onClick={() => setBulkTab(tabId)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition border shadow-xs ${
                                                bulkTab === tabId
                                                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                                                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {/* Body - Smooth Scroll */}
                                <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
                                    {bulkTab === 'fields' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Μετακίνηση κατηγορίας</label>
                                                    <select className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none" value={bulkDraft.category} onChange={e => setBulkDraft({...bulkDraft, category: e.target.value})}>
                                                        <option value="">Καμία αλλαγή</option>
                                                        {allFormCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Συλλογή</label>
                                                    <select className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none" value={bulkDraft.collection} onChange={e => setBulkDraft({...bulkDraft, collection: e.target.value})}>
                                                        <option value="">Καμία αλλαγή</option>
                                                        {allCollections.map(col => <option key={col} value={col}>{col}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Κατάσταση</label>
                                                    <select className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none" value={bulkDraft.status} onChange={e => setBulkDraft({...bulkDraft, status: e.target.value})}>
                                                        <option value="">Καμία αλλαγή</option>
                                                        {allFormStatuses.map(stat => <option key={stat} value={stat}>{stat}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Απόθεμα (τεμάχια)</label>
                                                    <input type="number" min="0" step="1" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none" value={bulkStock} onChange={e => setBulkStock(e.target.value)} placeholder="Καμία αλλαγή" />
                                                </div>
                                            </div>

                                            <div className="border border-amber-100 bg-amber-50/60 rounded-xl p-4">
                                                <label className="block text-xs font-bold text-amber-800 mb-1">Σειρά εμφάνισης στο Shop</label>
                                                <select className="w-full border border-amber-200 rounded-lg px-4 py-2.5 bg-white outline-none" value={bulkDraft.shopPlacement} onChange={e => setBulkDraft({...bulkDraft, shopPlacement: e.target.value})}>
                                                    <option value="">Καμία αλλαγή</option>
                                                    <option value="top">Μετακίνηση στην αρχή του Shop</option>
                                                    <option value="up">Μετακίνηση μία θέση πάνω</option>
                                                    <option value="down">Μετακίνηση μία θέση κάτω</option>
                                                    <option value="bottom">Μετακίνηση στο τέλος του Shop</option>
                                                </select>
                                                <p className="mt-2 text-[11px] font-medium text-amber-700">Μετακινεί μαζί τα επιλεγμένα προϊόντα κρατώντας την ίδια σειρά μεταξύ τους.</p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-stone-600 mb-1">Σημειώσεις / Περιγραφή</label>
                                                <textarea className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none h-24 resize-y text-sm" value={bulkDraft.notes} onChange={e => setBulkDraft({...bulkDraft, notes: e.target.value})} placeholder="Καμία αλλαγή (ή εισάγετε νέες σημειώσεις για όλα)"></textarea>
                                            </div>
                                        </div>
                                    )}

                                    {bulkTab === 'search_replace' && (
                                        <div className="space-y-5 bg-stone-50/50 p-4 sm:p-5 rounded-xl border border-stone-200">
                                            <div>
                                                <h3 className="text-sm font-black text-stone-900 mb-1">Μαζικός Εντοπισμός & Αντικατάσταση / Διαγραφή</h3>
                                                <p className="text-xs text-stone-500">Εντοπίστε λέξεις ή φράσεις στα επιλεγμένα προϊόντα και αντικαταστήστε τις ή διαγράψτε τις αυτόματα.</p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-700 mb-1">Λέξη / Φράση προς εύρεση *</label>
                                                    <input
                                                        type="text"
                                                        value={bulkFindText}
                                                        onChange={e => setBulkFindText(e.target.value)}
                                                        className="w-full border border-stone-300 rounded-lg px-3.5 py-2.5 bg-white outline-none focus:border-stone-900 text-sm font-medium"
                                                        placeholder="π.χ. παλιό κείμενο, ορχιδέα..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-700 mb-1">Αντικατάσταση με</label>
                                                    <input
                                                        type="text"
                                                        value={bulkReplaceText}
                                                        onChange={e => setBulkReplaceText(e.target.value)}
                                                        className="w-full border border-stone-300 rounded-lg px-3.5 py-2.5 bg-white outline-none focus:border-stone-900 text-sm font-medium"
                                                        placeholder="Αφήστε κενό για απλή διαγραφή"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <span className="block text-xs font-bold text-stone-700 mb-2">Πεδία εφαρμογής:</span>
                                                <div className="flex flex-wrap gap-3">
                                                    {[
                                                        ['name', 'Τίτλος / Όνομα'],
                                                        ['notes', 'Σημειώσεις / Περιγραφή'],
                                                        ['materials', 'Υλικά'],
                                                        ['colors', 'Χρώματα'],
                                                        ['collection', 'Συλλογή']
                                                    ].map(([field, label]) => (
                                                        <label key={field} className="flex items-center gap-1.5 text-xs font-medium text-stone-700 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-stone-200">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(bulkFindScopes[field])}
                                                                onChange={e => setBulkFindScopes(prev => ({ ...prev, [field]: e.target.checked }))}
                                                                className="accent-stone-900"
                                                            />
                                                            <span>{label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-4 text-xs">
                                                <label className="flex items-center gap-1.5 cursor-pointer text-stone-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={bulkCaseSensitive}
                                                        onChange={e => setBulkCaseSensitive(e.target.checked)}
                                                        className="accent-stone-900"
                                                    />
                                                    <span>Ταίριασμα πεζών/κεφαλαίων</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer text-stone-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={bulkWholeWord}
                                                        onChange={e => setBulkWholeWord(e.target.checked)}
                                                        className="accent-stone-900"
                                                    />
                                                    <span>Μόνο ολόκληρη λέξη</span>
                                                </label>
                                            </div>

                                            <div className="flex flex-wrap gap-3 pt-2 border-t border-stone-200">
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkFindAndReplace(false)}
                                                    className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                                                >
                                                    Αντικατάσταση στα {selectedItems.length} επιλεγμένα
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkFindAndReplace(true)}
                                                    className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                                >
                                                    Διαγραφή λέξης από τα επιλεγμένα
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {bulkTab === 'pricing' && (
                                        <div className="space-y-5">
                                            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                                <h3 className="text-sm font-black text-emerald-900 mb-1">Άμεση Τιμολόγηση</h3>
                                                <p className="text-xs text-emerald-700 mb-3">Ορίστε συγκεκριμένη σταθερή τιμή για όλα τα επιλεγμένα προϊόντα.</p>
                                                <label className="block text-xs font-bold text-stone-700 mb-1">Νέα Τιμή (€)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full sm:w-60 border border-stone-200 rounded-lg px-4 py-2.5 bg-white outline-none focus:border-stone-900 text-sm font-bold"
                                                    value={bulkDraft.price}
                                                    onChange={e => setBulkDraft({...bulkDraft, price: e.target.value})}
                                                    placeholder="π.χ. 25.00"
                                                />
                                            </div>

                                            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-3">
                                                <h3 className="text-sm font-black text-amber-900">Μαζική Προσαρμογή Τιμών (+/- % ή €)</h3>
                                                <p className="text-xs text-amber-700">Αυξήστε ή μειώστε τις υφιστάμενες τιμές κάθε προϊόντος κατά ποσοστό ή σταθερό ποσό.</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-700 mb-1">Τρόπος προσαρμογής</label>
                                                        <select
                                                            value={bulkPriceAdjustmentMode}
                                                            onChange={e => setBulkPriceAdjustmentMode(e.target.value)}
                                                            className="w-full border border-stone-200 rounded-lg px-3 py-2 bg-white text-xs font-bold outline-none"
                                                        >
                                                            <option value="none">Χωρίς σχετική προσαρμογή</option>
                                                            <option value="percent_increase">Αύξηση κατά ποσοστό (%)</option>
                                                            <option value="percent_decrease">Μείωση κατά ποσοστό (%)</option>
                                                            <option value="fixed_increase">Αύξηση κατά σταθερό ποσό (€)</option>
                                                            <option value="fixed_decrease">Μείωση κατά σταθερό ποσό (€)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-700 mb-1">Ποσό / Ποσοστό</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            disabled={bulkPriceAdjustmentMode === 'none'}
                                                            value={bulkPriceAdjustmentValue}
                                                            onChange={e => setBulkPriceAdjustmentValue(e.target.value)}
                                                            placeholder="π.χ. 10 ή 5"
                                                            className="w-full border border-stone-200 rounded-lg px-3 py-2 bg-white text-xs font-bold outline-none disabled:bg-stone-100"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {bulkTab === 'tags' && (
                                        <div className="space-y-5">
                                            <div className="flex flex-wrap items-center gap-4 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700">
                                                <span>Λειτουργία ετικετών:</span>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="radio" name="bulkTagMode" value="append" checked={bulkTagMode === 'append'} onChange={() => setBulkTagMode('append')} />
                                                    <span>Προσθήκη</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="radio" name="bulkTagMode" value="remove" checked={bulkTagMode === 'remove'} onChange={() => setBulkTagMode('remove')} />
                                                    <span>Αφαίρεση</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="radio" name="bulkTagMode" value="overwrite" checked={bulkTagMode === 'overwrite'} onChange={() => setBulkTagMode('overwrite')} />
                                                    <span>Πλήρης αντικατάσταση</span>
                                                </label>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between gap-3 mb-2">
                                                    <label className="block text-xs font-bold text-indigo-700">Χρώματα</label>
                                                    {bulkColors.length > 0 && (
                                                        <button type="button" onClick={() => clearBulkTags('colors')} className="text-[11px] font-bold text-stone-500 hover:text-stone-900">Καθαρισμός</button>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl max-h-36 overflow-auto">
                                                    {allAvailableColors.map(col => {
                                                        const isSelected = bulkColors.includes(col);
                                                        return (
                                                            <button key={col} type="button" onClick={() => toggleBulkTag('colors', col)} className={`text-[11px] px-2.5 py-1 rounded-md border font-bold transition ${isSelected ? 'bg-indigo-700 border-indigo-700 text-white shadow-sm' : 'bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-100'}`}>
                                                                <span className="inline-flex items-center gap-1">{isSelected ? <Check className="w-3 h-3 stroke-[2.5]" /> : '+ '}{col}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between gap-3 mb-2">
                                                    <label className="block text-xs font-bold text-stone-700">Υλικά</label>
                                                    {bulkMaterials.length > 0 && (
                                                        <button type="button" onClick={() => clearBulkTags('materials')} className="text-[11px] font-bold text-stone-500 hover:text-stone-900">Καθαρισμός</button>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 p-3 bg-stone-50 border border-stone-100 rounded-xl max-h-36 overflow-auto">
                                                    {allAvailableMaterials.map(mat => {
                                                        const isSelected = bulkMaterials.includes(mat);
                                                        return (
                                                            <button key={mat} type="button" onClick={() => toggleBulkTag('materials', mat)} className={`text-[11px] px-2.5 py-1 rounded-md border font-bold transition ${isSelected ? 'bg-stone-900 border-stone-900 text-white shadow-sm' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'}`}>
                                                                <span className="inline-flex items-center gap-1">{isSelected ? <Check className="w-3 h-3 stroke-[2.5]" /> : '+ '}{mat}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer (sticky) */}
                                <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-3 shrink-0">
                                    <button onClick={clearBulkSelection} className="text-xs font-bold text-stone-500 hover:text-stone-800 transition">Ακύρωση & Αποεπιλογή</button>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setIsBulkOpen(false)} className="px-5 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs sm:text-sm font-bold hover:bg-stone-100 transition">Κλείσιμο</button>
                                        <button onClick={handleBulkUpdate} className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-stone-800 transition shadow-md">Εφαρμογή στα {selectedItems.length}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isAddOpen && (
                        <div
                            onClick={(e) => {
                                if (e.target === e.currentTarget && !isSaving && !mediaPreparing) {
                                    closeItemEditor();
                                }
                            }}
                            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 cursor-pointer overflow-y-auto"
                        >

                            {isSaving && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-6 rounded-2xl">
                                    <div className="w-full max-w-sm text-center">
                                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold">CSV</div>
                                        <h3 className="font-bold text-stone-800 mb-4">{uploadStatus || 'Προετοιμασία...'}</h3>
                                        <div className="w-full bg-stone-200 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                                            <div className="bg-emerald-500 h-3 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                        <p className="text-xl font-black text-emerald-600">{Math.round(uploadProgress)}%</p>
                                        <p className="text-xs text-stone-500 mt-6 font-medium">Παρακαλώ μην κλείσετε το παράθυρο, ο συγχρονισμός είναι σε εξέλιξη...</p>
                                    </div>
                                </div>
                            )}

                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl relative border border-stone-200 cursor-default animate-fade-in"
                            >
                                {(() => {
                                    const modalPreviewMedia = formShopMediaList?.[0]?.url || currentItem?.imageUrl || currentItem?.mediaList?.[0]?.url || formPrivateMediaList?.[0]?.url;
                                    const modalPreviewType = formShopMediaList?.[0]?.type || currentItem?.fileType || (modalPreviewMedia?.includes('.mp4') ? 'video' : 'image');
                                    return (
                                        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between gap-4 bg-stone-50 rounded-t-2xl shrink-0">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                {modalPreviewMedia ? (
                                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-stone-200 bg-stone-100 overflow-hidden shrink-0 shadow-sm relative group">
                                                        {modalPreviewType === 'video' ? (
                                                            <video src={modalPreviewMedia} referrerPolicy="no-referrer" className="w-full h-full object-cover" muted playsInline />
                                                        ) : (
                                                            <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={modalPreviewMedia} alt="" className="w-full h-full object-cover" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-[10px] text-white font-bold">Προεπισκόπηση</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-dashed border-stone-300 bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                                                        
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                                                            {isEditMode ? 'Επεξεργασία Προϊόντος' : 'Νέα Καταχώρηση'}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-stone-200/80 text-stone-700">
                                                            {formCategory || currentItem?.category || 'Κόσμημα'}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(formStatus || currentItem?.status || 'Διαθέσιμο')}`}>
                                                            {formStatus || currentItem?.status || 'Διαθέσιμο'}
                                                        </span>
                                                        {formPrice && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                {formPrice}€
                                                            </span>
                                                        )}
                                                        {currentItem?.id && (
                                                            <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">
                                                                #{currentItem.id.slice(0, 6)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h2 className="text-base sm:text-lg font-black text-stone-900 leading-tight truncate">
                                                        {formName || currentItem?.name || (isEditMode ? 'Επεξεργασία υπάρχουσας καταχώρησης' : 'Νέα καταχώρηση καταλόγου')}
                                                    </h2>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {modalPreviewMedia && modalPreviewType !== 'video' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenImageEditor(modalPreviewMedia)}
                                                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-100 transition shadow-sm"
                                                        title="Επεξεργασία εικόνας στο ενσωματωμένο studio"
                                                    >
                                                        <span className="hidden md:inline">Επεξεργασία εικόνας</span>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={mediaPreparing || isSaving}
                                                    onClick={closeItemEditor}
                                                    className="text-stone-400 hover:text-stone-800 bg-white p-2 rounded-lg border border-stone-200 transition shadow-sm"
                                                    title="Κλείσιμο (Esc)"
                                                >
                                                    <IconX />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="px-5 py-2.5 border-b border-stone-200 bg-stone-50/90 flex flex-wrap items-center gap-2 shrink-0">
                                    {[
                                        ['form-basic', 'Βασικά'],
                                        ['form-pricing', 'Τιμές'],
                                        ['form-tags', 'Χρώματα / Υλικά'],
                                        ['form-links', 'Links'],
                                        ['form-shop-media', 'Εικόνες Shop'],
                                        ['form-private-media', 'Αρχείο'],
                                        ['form-ai', 'AI Studio']
                                    ].map(([id, label]) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => {
                                                setActiveFormTab(id);
                                                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }}
                                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition border shadow-xs ${
                                                activeFormTab === id
                                                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                                                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {videoProgress && <div className="px-5 py-2 shrink-0"><VideoUploadStatus value={videoProgress} busy={videoCompressing} onCancel={() => videoAbort.current?.abort()} /></div>}
                                <div className="overflow-y-auto p-6 flex-1">
                                    <form id="jewelry-form" onSubmit={handleSaveItem} className="flex flex-col gap-8">
                                        <section id="form-ai" className="order-last scroll-mt-4 rounded-2xl border border-stone-200 bg-stone-50/60 p-4 shadow-xs">
                                            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-3 mb-4">
                                                        <div>
                                                            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">AI Studio Back-office</h3>
                                                            <p className="text-xs text-stone-500 font-medium">Δημιουργεί τίτλους, περιγραφές, χρώματα, υλικά, tags και captions από τα στοιχεία της φόρμας.</p>
                                                        </div>
                                                        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${getBackofficeAiEndpoint() ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {getBackofficeAiEndpoint() ? 'Endpoint ορισμένο' : 'Λείπει endpoint'}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3 mb-3">
                                                        <textarea
                                                            className="w-full border border-stone-200 rounded-lg px-4 py-3 h-24 bg-white focus:border-stone-400 outline-none resize-none text-sm"
                                                            value={aiProductPrompt}
                                                            onChange={e => setAiProductPrompt(e.target.value)}
                                                            placeholder="Προαιρετική οδηγία: π.χ. πιο minimal ύφος, ιδέα για δώρο, περιγραφή για Instagram, πιο luxury τόνος..."
                                                        />
                                                        <div className="space-y-2">
                                                            <div className="relative">
                                                                <input
                                                                    type={showAiAccessCode ? 'text' : 'password'}
                                                                    className="w-full border border-stone-200 rounded-lg pl-3 pr-10 py-2 bg-white focus:border-stone-400 outline-none text-sm"
                                                                    value={aiAccessCode}
                                                                    onChange={e => handleAiAccessCodeChange(e.target.value)}
                                                                    placeholder="AI access code"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowAiAccessCode(prev => !prev)}
                                                                    className="absolute inset-y-0 right-0 px-3 text-stone-400 hover:text-stone-700"
                                                                    title={showAiAccessCode ? 'Κρύψε τον κωδικό' : 'Δείξε τον κωδικό'}
                                                                    aria-label={showAiAccessCode ? 'Κρύψε τον κωδικό AI' : 'Δείξε τον κωδικό AI'}
                                                                >
                                                                    <IconEye />
                                                                </button>
                                                            </div>
                                                            <p className="text-[10px] leading-relaxed text-stone-500">Ο κωδικός μένει σε αυτό το browser session και δεν γράφεται στο HTML ή στο Firebase.</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button type="button" onClick={() => handleBackofficeAiGenerate('full')} disabled={isAiProductWorking} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 disabled:opacity-50 transition shadow-xs">Πλήρης πρόταση</button>
                                                            <button type="button" onClick={() => handleBackofficeAiGenerate('title')} disabled={isAiProductWorking} className="px-4 py-2 bg-white border border-stone-200 text-stone-800 rounded-lg text-xs font-bold hover:bg-stone-100 disabled:opacity-50 transition">Τίτλος</button>
                                                            <button type="button" onClick={() => handleBackofficeAiGenerate('description')} disabled={isAiProductWorking} className="px-4 py-2 bg-white border border-stone-200 text-stone-800 rounded-lg text-xs font-bold hover:bg-stone-100 disabled:opacity-50 transition">Περιγραφή</button>
                                                            <button type="button" onClick={() => handleBackofficeAiGenerate('tags')} disabled={isAiProductWorking} className="px-4 py-2 bg-white border border-stone-200 text-stone-800 rounded-lg text-xs font-bold hover:bg-stone-100 disabled:opacity-50 transition">Χρώματα / Υλικά</button>
                                                            
                                                        </div>

                                                        {isAiProductWorking && (
                                                            <div className="space-y-1 bg-stone-100 p-2.5 rounded-lg border border-stone-200">
                                                                <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                                                                    <span>Το AI επεξεργάζεται τα στοιχεία της δημιουργίας...</span>
                                                                    
                                                                </div>
                                                                <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                                                                    <div className="bg-stone-900 h-1.5 rounded-full animate-pulse w-full"></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {aiProductError && (
                                                        <div className="mt-3 border border-rose-200 bg-rose-50 text-rose-800 rounded-xl p-3.5 text-xs space-y-2">
                                                            <div className="font-bold flex items-center gap-1.5 text-rose-800">
                                                                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                                                                <span>{aiProductError}</span>
                                                            </div>
                                                            {aiProductError.includes('GEMINI_API_KEY') && (
                                                                <div className="p-2.5 bg-white/80 rounded-lg border border-rose-100 text-stone-700 space-y-1.5">
                                                                    <p className="font-bold text-stone-800">Οδηγός Ενεργοποίησης Google Gemini AI:</p>
                                                                    <ol className="list-decimal list-inside space-y-1 text-stone-600">
                                                                        <li>Αποκτήστε κλειδί API από το <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-bold text-stone-900">Google AI Studio</a>.</li>
                                                                        <li>Προσθέστε στο περιβάλλον Netlify / <code>.env</code> τη μεταβλητή: <code>GEMINI_API_KEY=το_κλειδί_σας</code>.</li>
                                                                    </ol>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="lg:w-80 bg-white border border-stone-200 rounded-xl p-3 min-h-[160px]">
                                                    <div className="flex items-center justify-between gap-2 mb-3">
                                                        <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">Πρόταση AI</h4>
                                                        {aiProductDraft && (
                                                            <div className="flex gap-1">
                                                                <button type="button" onClick={() => applyAiProductDraft(true)} className="px-2 py-1 bg-stone-100 text-stone-800 border border-stone-200 rounded text-[10px] font-bold">Κενά</button>
                                                                <button type="button" onClick={() => applyAiProductDraft(false)} className="px-2 py-1 bg-stone-900 text-white rounded text-[10px] font-bold">Εφαρμογή</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!aiProductDraft ? (
                                                        <p className="text-xs text-stone-400 italic leading-relaxed">Οι προτάσεις θα εμφανιστούν εδώ πριν εφαρμοστούν στη φόρμα.</p>
                                                    ) : (
                                                        <div className="space-y-2 text-xs">
                                                            {aiProductDraft.title && <div><span className="font-black text-stone-500">Τίτλος:</span> <span className="text-stone-800">{aiProductDraft.title}</span></div>}
                                                            {aiProductDraft.category && <div><span className="font-black text-stone-500">Κατηγορία:</span> <span className="text-stone-800">{aiProductDraft.category}</span></div>}
                                                            {aiProductDraft.colors.length > 0 && <div><span className="font-black text-stone-500">Χρώματα:</span> <span className="text-stone-800">{aiProductDraft.colors.join(', ')}</span></div>}
                                                            {aiProductDraft.materials.length > 0 && <div><span className="font-black text-stone-500">Υλικά:</span> <span className="text-stone-800">{aiProductDraft.materials.join(', ')}</span></div>}
                                                            {aiProductDraft.description && <p className="border-t border-violet-50 pt-2 leading-relaxed text-stone-700">{aiProductDraft.description}</p>}
                                                            {aiProductDraft.instagramCaption && <p className="border-t border-violet-50 pt-2 leading-relaxed text-stone-500">{aiProductDraft.instagramCaption}</p>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </section>

                                        <section id="form-basic" className="scroll-mt-4">
                                            <h3 className="text-sm font-black text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Βασικα Στοιχεια</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Όνομα Δημιουργίας *</label>
                                                    <input required type="text" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formName} onChange={e => setFormName(e.target.value)} />
                                                    {duplicateNameInfo && (
                                                        <div className="mt-2 border border-amber-200 bg-amber-50 rounded-xl p-3">
                                                            <p className="text-xs font-bold text-amber-800">Υπάρχει ήδη καταχώρηση με αυτό το όνομα: {duplicateNameInfo.duplicate.name}</p>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {duplicateNameInfo.suggestions.map(suggestion => (
                                                                    <button key={suggestion} type="button" onClick={() => setFormName(suggestion)} className="px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-800 hover:bg-amber-100 transition">
                                                                        {suggestion}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Κατηγορία *</label>
                                                    {isCustomCategory ? (
                                                        <div className="flex gap-2">
                                                            <input type="text" required className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="Νέα κατηγορία..." autoFocus />
                                                            <button type="button" onClick={() => { setIsCustomCategory(false); setFormCategory('Κολιέ'); }} className="px-3 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-lg font-bold">X</button>
                                                        </div>
                                                    ) : (
                                                        <select required className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formCategory} onChange={e => {
                                                            if (e.target.value === 'NEW_CUSTOM') { setIsCustomCategory(true); setFormCategory(''); }
                                                            else { setFormCategory(e.target.value); }
                                                        }}>
                                                            <option value="" disabled>Επιλέξτε...</option>
                                                            {allFormCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">+ Προσθήκη Νέας...</option>
                                                        </select>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Ονομασία Συλλογής</label>
                                                    {isCustomCollection ? (
                                                        <div className="flex gap-2">
                                                            <input type="text" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formCollection} onChange={e => setFormCollection(e.target.value)} placeholder="Νέα συλλογή..." autoFocus />
                                                            <button type="button" onClick={() => { setIsCustomCollection(false); setFormCollection(''); }} className="px-3 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-lg font-bold">X</button>
                                                        </div>
                                                    ) : (
                                                        <select className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formCollection} onChange={e => {
                                                            if (e.target.value === 'NEW_CUSTOM') { setIsCustomCollection(true); setFormCollection(''); }
                                                            else { setFormCollection(e.target.value); }
                                                        }}>
                                                            <option value="">(Χωρίς Συλλογή)</option>
                                                            {allCollections.map(col => <option key={col} value={col}>{col}</option>)}
                                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">+ Προσθήκη Νέας...</option>
                                                        </select>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Κατάσταση *</label>
                                                    {isCustomStatus ? (
                                                        <div className="flex gap-2">
                                                            <input type="text" required className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formStatus} onChange={e => setFormStatus(e.target.value)} placeholder="Νέα κατάσταση..." autoFocus />
                                                            <button type="button" onClick={() => { setIsCustomStatus(false); setFormStatus('Διαθέσιμο'); }} className="px-3 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-lg font-bold">X</button>
                                                        </div>
                                                    ) : (
                                                        <select required className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formStatus} onChange={e => {
                                                            if (e.target.value === 'NEW_CUSTOM') { setIsCustomStatus(true); setFormStatus(''); }
                                                            else { setFormStatus(e.target.value); }
                                                        }}>
                                                            {allFormStatuses.map(stat => <option key={stat} value={stat}>{stat}</option>)}
                                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">+ Προσθήκη Νέας...</option>
                                                        </select>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Ημερομηνία Κατασκευής</label>
                                                    <input type="date" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formDate} onChange={e => setFormDate(e.target.value)} />
                                                </div>
                                            </div>
                                        </section>

                                        <section id="form-pricing" className="scroll-mt-4">
                                            <h3 className="text-sm font-black text-emerald-600/70 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Οικονομικα & Αποθεμα</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Τιμή Πώλησης (€)</label>
                                                    <input type="number" step="any" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="block text-xs font-bold text-stone-600">Αρχική Τιμή (€)</label>
                                                        {Number(formOriginalPrice) > Number(formPrice) && Number(formPrice) > 0 && (
                                                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                                                -{Math.round(((Number(formOriginalPrice) - Number(formPrice)) / Number(formOriginalPrice)) * 100)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <input type="number" step="any" placeholder="π.χ. 24.00 (προαιρετικό)" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formOriginalPrice} onChange={e => setFormOriginalPrice(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Κόστος Υλικών (€)</label>
                                                    <input type="number" step="any" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formCost} onChange={e => setFormCost(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Χειροκίνητα Likes</label>
                                                    <input type="number" min="0" step="1" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formManualLikes} onChange={e => setFormManualLikes(Math.max(0, Number(e.target.value) || 0))} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Χειροκίνητες Προβολές</label>
                                                    <input type="number" min="0" step="1" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formManualViews} onChange={e => setFormManualViews(Math.max(0, Number(e.target.value) || 0))} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Απόθεμα (Τεμ.)</label>
                                                    <input type="number" min="0" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formStock} onChange={e => setFormStock(e.target.value)} />
                                                </div>
                                            </div>
                                        </section>

                                        <section id="form-storage" className="scroll-mt-4">
                                            <h3 className="text-sm font-black text-amber-600/70 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Διαστασεις & Αποθηκευση</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Βάρος</label>
                                                    <input type="text" placeholder="π.χ. 15g" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none" value={formWeight} onChange={e => setFormWeight(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Διαστάσεις</label>
                                                    <input type="text" placeholder="π.χ. 4x3 cm" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none" value={formDimensions} onChange={e => setFormDimensions(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-600 mb-1">Κωδ. Αποθήκευσης</label>
                                                    {isCustomStorage ? (
                                                        <div className="flex gap-2">
                                                            <input type="text" placeholder="π.χ. Κουτί Α2" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none" value={formStorage} onChange={e => setFormStorage(e.target.value)} autoFocus />
                                                            <button type="button" onClick={() => { setIsCustomStorage(false); setFormStorage(''); }} className="px-3 bg-stone-200 hover:bg-stone-300 rounded-lg font-bold text-stone-600 transition">X</button>
                                                        </div>
                                                    ) : (
                                                        <select className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none" value={formStorage} onChange={e => { if (e.target.value === 'NEW_CUSTOM') { setIsCustomStorage(true); setFormStorage(''); } else setFormStorage(e.target.value); }}>
                                                            <option value="">Χωρίς αποθήκευση</option>
                                                            {allStorages.map(storage => <option key={storage} value={storage}>{storage}</option>)}
                                                            <option value="NEW_CUSTOM">+ Νέος κωδικός...</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </div>
                                        </section>

                                        <section id="form-tags" className="scroll-mt-4">
                                            <h3 className="text-sm font-black text-indigo-500/70 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Χρωματα & Υλικα</h3>

                                            <div className="mb-6">
                                                <label className="block text-xs font-bold text-stone-600 mb-2">Κύρια Χρώματα</label>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {allAvailableColors.map(col => (
                                                        <button key={col} type="button" onClick={() => handleAddColor(col)} className="text-[11px] px-2.5 py-1 bg-white rounded-md hover:bg-indigo-50 border border-indigo-100 font-bold text-indigo-700 flex items-center gap-1.5">
                                                            <span className="w-3 h-3 rounded-full border border-stone-300" style={{ backgroundColor: getColorSwatch(col) }}></span>+ {col}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2 mb-2">
                                                    <input type="text" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none" placeholder="Νέο χρώμα..." value={newColorInput} onChange={e => setNewColorInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddColor(newColorInput, newColorHex); } }} />
                                                    <input type="color" className="h-10 w-12 rounded-lg border border-stone-200 bg-white p-1 cursor-pointer" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} title="Επίλεξε ακριβή απόχρωση" aria-label="Επίλεξε ακριβή απόχρωση" />
                                                    <button type="button" onClick={() => handleAddColor(newColorInput, newColorHex)} className="bg-stone-800 text-white px-4 rounded-lg text-xs font-bold">Προσθήκη</button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 p-2 bg-indigo-50/30 rounded-lg min-h-[44px] border border-indigo-50">
                                                    {formColorsArr.map((col, idx) => (
                                                        <span key={idx} draggable onDragStart={(e) => handleDragTagStart(e, idx, 'color')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropTag(e, idx, 'color')} className="bg-white border border-indigo-200 text-xs px-2 py-1 rounded-md flex items-center gap-1.5 font-bold text-indigo-800 shadow-sm uppercase cursor-grab"><span className="w-3 h-3 rounded-full border border-stone-300" style={{ backgroundColor: getColorSwatch(col) }}></span>{col} <button type="button" onClick={() => setFormColorsArr(formColorsArr.filter((_, i) => i !== idx))} className="text-red-500"><IconX /></button></span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <label className="block text-xs font-bold text-stone-600 mb-2">Υλικά Κατασκευής</label>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {allAvailableMaterials.map(mat => (
                                                        <button key={mat} type="button" onClick={() => handleAddMaterial(mat)} className="text-[11px] px-2.5 py-1 bg-stone-100 rounded-md hover:bg-stone-200 border border-stone-200 font-medium text-stone-600">+ {mat}</button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2 mb-2">
                                                    <input type="text" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none" placeholder="Νέο υλικό..." value={newMaterialInput} onChange={e => setNewMaterialInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddMaterial(newMaterialInput); } }} />
                                                    <button type="button" onClick={() => handleAddMaterial(newMaterialInput)} className="bg-stone-800 text-white px-4 rounded-lg text-xs font-bold">Προσθήκη</button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 p-2 bg-stone-50 rounded-lg min-h-[44px] border border-stone-100">
                                                    {formMaterials.map((mat, idx) => (
                                                        <span key={idx} draggable onDragStart={(e) => handleDragTagStart(e, idx, 'material')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropTag(e, idx, 'material')} className="bg-white border border-stone-200 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-medium shadow-sm cursor-grab">{mat} <button type="button" onClick={() => setFormMaterials(formMaterials.filter((_, i) => i !== idx))} className="text-red-500"><IconX /></button></span>
                                                    ))}
                                                </div>
                                            </div>
                                        </section>

                                        <section id="form-links" className="scroll-mt-4">
                                            <h3 className="text-sm font-black text-blue-500/70 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Links & Αναρτησεις</h3>

                                            <div>
                                                <label className="block text-xs font-bold text-stone-600 mb-2">Λινκ Αγοράς (Πού μπορεί να το αγοράσει ο πελάτης)</label>
                                                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                                    {isCustomPurchaseSite ? (
                                                        <div className="flex gap-1 w-full sm:w-1/3">
                                                            <input type="text" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:bg-white outline-none transition" placeholder="π.χ. E-shop μου..." value={newPurchaseSite} onChange={e => setNewPurchaseSite(e.target.value)} autoFocus />
                                                            <button type="button" onClick={() => {setIsCustomPurchaseSite(false); setNewPurchaseSite('Vinted');}} className="px-3 bg-stone-200 hover:bg-stone-300 rounded-lg font-bold text-stone-600 transition">X</button>
                                                        </div>
                                                    ) : (
                                                        <select className="w-full sm:w-1/3 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none transition" value={newPurchaseSite} onChange={e => {
                                                            if (e.target.value === 'NEW_CUSTOM') { setIsCustomPurchaseSite(true); setNewPurchaseSite(''); }
                                                            else { setNewPurchaseSite(e.target.value); }
                                                        }}>
                                                            {allAvailablePlatforms.map(plat => <option key={plat} value={plat}>{plat}</option>)}
                                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">+ Άλλη Πλατφόρμα...</option>
                                                        </select>
                                                    )}

                                                    <input type="url" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none transition" placeholder="Επικόλληση Link (https://...)" value={newPurchaseUrl} onChange={e => setNewPurchaseUrl(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddPurchaseLink(); } }} />
                                                    <button type="button" onClick={handleAddPurchaseLink} className="bg-stone-800 hover:bg-stone-700 text-white px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition">Προσθήκη</button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 p-2 bg-blue-50/30 rounded-lg min-h-[44px] border border-blue-50">
                                                    {formPurchaseLinks.length === 0 && <span className="text-xs text-stone-400 italic flex items-center">Κανένα link αγοράς δεν έχει προστεθεί.</span>}
                                                    {formPurchaseLinks.map((linkObj, idx) => (
                                                        <span key={idx} className="bg-white border border-blue-200 text-xs px-2 py-1 rounded-md flex items-center gap-1.5 font-bold text-blue-800 shadow-sm max-w-full">
                                                            {linkObj.site}
                                                            {linkObj.url && <a href={linkObj.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title={linkObj.url}><IconExternalLink /></a>}
                                                            <button type="button" onClick={() => setFormPurchaseLinks(formPurchaseLinks.filter((_, i) => i !== idx))} className="text-red-500 ml-1"><IconX /></button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mb-2">
                                                <label className="block text-xs font-bold text-stone-600 mb-2">Πού έχει αναρτηθεί (Για δικό σου έλεγχο)</label>

                                                <div className="flex flex-col lg:flex-row gap-2 mb-2 lg:items-center">
                                                    {isCustomPostedSite ? (
                                                        <div className="flex gap-1 w-full lg:w-1/4">
                                                            <input type="text" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:bg-white outline-none transition" placeholder="π.χ. TikTok..." value={newPostedSite} onChange={e => setNewPostedSite(e.target.value)} autoFocus />
                                                            <button type="button" onClick={() => {setIsCustomPostedSite(false); setNewPostedSite('Instagram');}} className="px-3 bg-stone-200 hover:bg-stone-300 rounded-lg font-bold text-stone-600 transition">X</button>
                                                        </div>
                                                    ) : (
                                                        <select className="w-full lg:w-1/4 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none transition" value={newPostedSite} onChange={e => {
                                                            if (e.target.value === 'NEW_CUSTOM') { setIsCustomPostedSite(true); setNewPostedSite(''); }
                                                            else { setNewPostedSite(e.target.value); }
                                                        }}>
                                                            {allAvailablePlatforms.map(plat => <option key={plat} value={plat}>{plat}</option>)}
                                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">+ Άλλη Πλατφόρμα...</option>
                                                        </select>
                                                    )}

                                                    <input type="url" className="w-full lg:flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none transition" placeholder="Link ανάρτησης (προαιρετικό)..." value={newPostedUrl} onChange={e => setNewPostedUrl(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddPostedPlatform(); } }} />

                                                    <div className="flex gap-2 w-full lg:w-auto">
                                                        <label className="flex items-center justify-center gap-2 text-sm font-medium text-stone-700 cursor-pointer flex-1 lg:flex-none bg-stone-50 border border-stone-200 px-3 py-2 rounded-lg hover:bg-white transition whitespace-nowrap">
                                                            <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer" checked={newPostedVisible} onChange={e => setNewPostedVisible(e.target.checked)} />
                                                            Ορατό στο Shop
                                                        </label>
                                                        <button type="button" onClick={handleAddPostedPlatform} className="bg-stone-800 hover:bg-stone-700 text-white px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition">Προσθήκη</button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2 p-2 bg-stone-50 rounded-lg min-h-[44px] border border-stone-100">
                                                    {formPostedPlatforms.length === 0 && <span className="text-xs text-stone-400 italic flex items-center">Δεν έχει σημειωθεί πού αναρτήθηκε.</span>}
                                                    {formPostedPlatforms.map((platObj, idx) => (
                                                        <span key={idx} className="bg-white border border-stone-200 text-xs px-2 py-1 rounded-md flex items-center gap-1.5 font-bold text-stone-700 shadow-sm max-w-full">
                                                            {platObj.site}
                                                            {platObj.url && <a href={platObj.url} target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-800" title={platObj.url}><IconExternalLink /></a>}
                                                            {platObj.showInShop ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded ml-1" title="Θα φαίνεται στο Shop">Ορατό</span> : <span className="text-[10px] bg-stone-200 text-stone-500 px-1 rounded ml-1" title="Κρυφό από το Shop">Κρυφό</span>}
                                                            <button type="button" onClick={() => setFormPostedPlatforms(formPostedPlatforms.filter((_, i) => i !== idx))} className="text-red-500 ml-1"><IconX /></button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </section>

                                        <section id="form-shop-media" className="scroll-mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/55 p-4 shadow-sm">
                                            <h3 className="text-sm font-black text-emerald-500 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Εικονες / Βιντεο (Βιτρινα Shop)</h3>
                                            <MediaManager
                                                items={formShopMediaList}
                                                variant="shop"
                                                uploadLabel="Αυτά τα αρχεία θα φαίνονται στον πελάτη (Οι εικόνες και τα βίντεο συμπιέζονται αυτόματα. Αρχικό βίντεο έως 1 GB / 10 λεπτά, τελικό έως 30 MB)."
                                                inputClassName="w-full border border-emerald-300 rounded-lg px-4 py-2.5 bg-white cursor-pointer"
                                                disabled={mediaPreparing || isSaving}
                                                downloadName={formName || 'aram-media'}
                                                orderingHelp="Σύρετε ή επιλέξτε εικόνα ή βίντεο για κεντρικό αρχείο προϊόντος. Το πρώτο αρχείο θα είναι το κεντρικό στο Shop."
                                                onFiles={handleFileSelectShop}
                                                onChange={setFormShopMediaList}
                                                onReorder={(items, fromIndex, toIndex) => {
                                                    if (fromIndex === 0 || toIndex === 0) refreshSmartSuggestionsFromMain(items);
                                                }}
                                                canEdit={media => media.type !== 'video' && !isAnimatedGifMedia(media)}
                                                canRestore={canRestoreMediaOriginal}
                                                onEdit={idx => openImageEditor('shop', idx)}
                                                onRestore={idx => handleRestoreEditedMedia('shop', idx)}
                                                onRemove={handleRemoveShopMedia}
                                            >
                                                <button type="button" onClick={handleRefreshSmartSuggestions} className="mt-2 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition">
                                                    Ανανέωση smart suggestions από τη φόρμα
                                                </button>
                                                {smartSuggestions && (
                                                    <div className="mt-3 border border-emerald-100 bg-emerald-50/60 rounded-xl p-3 flex flex-wrap gap-2 items-center">
                                                        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                            <div>
                                                                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 mr-1">Smart suggestions</span>
                                                                <p className="text-[11px] text-emerald-700/70 font-medium">{smartSuggestions.source}</p>
                                                            </div>
                                                            {smartSuggestions.description && (
                                                                <button type="button" onClick={() => setFormNotes(smartSuggestions.description)} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition">
                                                                    Χρήση περιγραφής
                                                                </button>
                                                            )}
                                                            <button type="button" onClick={handleRefreshSmartSuggestions} className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition">
                                                                Ανανέωση
                                                            </button>
                                                        </div>
                                                        {smartSuggestions.category && (
                                                            <button type="button" onClick={() => { setFormCategory(smartSuggestions.category); setIsCustomCategory(false); }} className="px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition">
                                                                {smartSuggestions.category}
                                                            </button>
                                                        )}
                                                        {smartSuggestions.colors.map(color => (
                                                            <button key={color} type="button" onClick={() => handleAddColor(color)} className="px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition">
                                                                {color}
                                                            </button>
                                                        ))}
                                                        {smartSuggestions.description && (
                                                            <p className="w-full text-xs text-emerald-900/75 bg-white/70 border border-emerald-100 rounded-lg p-3 leading-relaxed">{smartSuggestions.description}</p>
                                                        )}
                                                    </div>
                                                )}

                                            </MediaManager>
                                        </section>

                                        <section id="form-private-media" className="mt-6 scroll-mt-4 rounded-2xl border border-stone-300 bg-stone-100/70 p-4">
                                            <h3 className="text-sm font-black text-stone-500 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Αρχειο (Μονο για το Back-Office)</h3>
                                            <MediaManager
                                                items={formPrivateMediaList}
                                                variant="private"
                                                uploadLabel="Προσωπικές φωτογραφίες και βίντεο που μένουν κρυφά"
                                                uploadHelp={VIDEO_UPLOAD_HELP}
                                                disabled={mediaPreparing || isSaving}
                                                downloadName={formName || 'aram-private-media'}
                                                onFiles={handleFileSelectPrivate}
                                                onChange={setFormPrivateMediaList}
                                                onReorder={items => refreshSmartSuggestionsFromMain(formShopMediaList, items)}
                                                canEdit={media => media.type !== 'video' && !isAnimatedGifMedia(media)}
                                                canRestore={canRestoreMediaOriginal}
                                                onEdit={idx => openImageEditor('private', idx)}
                                                onRestore={idx => handleRestoreEditedMedia('private', idx)}
                                                onRemove={handleRemovePrivateMedia}
                                            />
                                            <div>
                                                <label className="block text-xs font-bold text-stone-600 mb-1">Περιγραφή / σημειώσεις προϊόντος</label>
                                                <textarea className="w-full border border-stone-200 rounded-lg px-4 py-3 h-24 bg-white focus:bg-white outline-none resize-none" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Περιγραφή που μπορείς να επεξεργαστείς πριν εμφανιστεί στο shop..."></textarea>
                                            </div>
                                        </section>

                                    </form>
                                </div>
                                <div className="p-5 border-t border-stone-100 bg-white rounded-b-2xl flex justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                                    <button type="button" onClick={closeItemEditor} className="px-6 py-2.5 bg-stone-100 text-stone-700 rounded-lg font-bold hover:bg-stone-200 transition" disabled={isSaving || mediaPreparing}>Ακύρωση</button>
                                    <button type="submit" form="jewelry-form" className="px-8 py-2.5 bg-stone-900 text-white rounded-lg font-bold hover:bg-stone-800 transition shadow-lg flex items-center gap-2" disabled={isSaving || mediaPreparing}>
                                        Αποθήκευση
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {imageEditorTarget && imageEditorMedia && (
                        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 z-[80]">
                            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
                                <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-black text-stone-900">Editor εικόνας</h2>{imageEditorError && <p role="alert" className="mt-2 text-sm text-rose-700">{imageEditorError}</p>}
                                        <p className="text-xs font-bold text-stone-500">Ρύθμισε τη φωτογραφία πριν αποθηκευτεί στο προϊόν.</p>
                                    </div>
                                    <button type="button" onClick={closeImageEditor} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-600 transition">
                                        <IconX />
                                    </button>
                                </div>

                                <div className="p-4 md:p-5 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 overflow-y-auto">
                                    <div className="min-h-[320px] md:min-h-[560px] bg-stone-100 rounded-xl border border-stone-200 overflow-hidden flex items-center justify-center p-4">
                                        <div
                                            className="relative w-full bg-white overflow-hidden rounded-xl border-2 border-stone-900/80 shadow-sm cursor-grab active:cursor-grabbing select-none touch-none"
                                            style={{
                                                aspectRatio: `${getImageEditorAspect().width} / ${getImageEditorAspect().height}`,
                                                maxWidth: getImageEditorAspect().ratio < 1 ? '430px' : '640px'
                                            }}
                                            onPointerDown={startImageEditorDrag}
                                            onPointerMove={moveImageEditorDrag}
                                            onPointerUp={stopImageEditorDrag}
                                            onPointerCancel={stopImageEditorDrag}
                                        >
                                            <img
                                                src={imageEditorMedia.url}
                                                alt=""
                                                referrerPolicy="no-referrer" draggable={false}
                                                onLoad={(e) => {
                                                    const nextInfo = { width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight };
                                                    setImageEditorImageInfo(nextInfo);
                                                    setImageEditorSettings(prev => clampImageEditorPan(prev, nextInfo));
                                                }}
                                                className="absolute max-w-none select-none"
                                                style={getImageEditorPreviewStyle()}
                                            />
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/70 shadow-[1px_0_0_rgba(0,0,0,0.25)]"></div>
                                                <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/70 shadow-[1px_0_0_rgba(0,0,0,0.25)]"></div>
                                                <div className="absolute top-1/3 left-0 right-0 border-t border-white/70 shadow-[0_1px_0_rgba(0,0,0,0.25)]"></div>
                                                <div className="absolute top-2/3 left-0 right-0 border-t border-white/70 shadow-[0_1px_0_rgba(0,0,0,0.25)]"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => setImageEditorSettings(prev => clampImageEditorPan({ ...prev, rotate: prev.rotate - 90, panX: 0, panY: 0 }))} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-sm font-black transition">
                                                Περιστροφή -
                                            </button>
                                            <button type="button" onClick={() => setImageEditorSettings(prev => clampImageEditorPan({ ...prev, rotate: prev.rotate + 90, panX: 0, panY: 0 }))} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-sm font-black transition">
                                                Περιστροφή +
                                            </button>
                                        </div>

                                        <div>
                                            <span className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-2">Κάδρο crop</span>
                                            <div className="grid grid-cols-3 gap-2">
                                                {Object.entries(IMAGE_EDITOR_ASPECTS).map(([key, aspect]) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => setImageEditorSettings(prev => clampImageEditorPan({ ...prev, cropAspect: key, panX: 0, panY: 0 }))}
                                                        className={`px-3 py-2 rounded-lg text-xs font-black border transition ${imageEditorSettings.cropAspect === key ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'}`}
                                                    >
                                                        {aspect.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <label className="block">
                                            <span className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
                                                <span>Zoom</span>
                                                <span>{imageEditorSettings.zoom.toFixed(1)}x</span>
                                            </span>
                                            <input type="range" min="1" max="4" step="0.05" value={imageEditorSettings.zoom} onChange={e => setImageEditorSettings(prev => clampImageEditorPan({ ...prev, zoom: Number(e.target.value) }))} className="w-full accent-stone-900" />
                                        </label>

                                        <label className="block">
                                            <span className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
                                                <span>Θέση αριστερά / δεξιά</span>
                                                <span>{Math.round(clampImageEditorPan(imageEditorSettings).panX || 0)}%</span>
                                            </span>
                                            <input type="range" min={-getImageEditorPanBounds().x} max={getImageEditorPanBounds().x} step="1" value={clampImageEditorPan(imageEditorSettings).panX || 0} onChange={e => setImageEditorSettings(prev => clampImageEditorPan({ ...prev, panX: Number(e.target.value) }))} className="w-full accent-stone-900" />
                                        </label>

                                        <label className="block">
                                            <span className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
                                                <span>Θέση πάνω / κάτω</span>
                                                <span>{Math.round(clampImageEditorPan(imageEditorSettings).panY || 0)}%</span>
                                            </span>
                                            <input type="range" min={-getImageEditorPanBounds().y} max={getImageEditorPanBounds().y} step="1" value={clampImageEditorPan(imageEditorSettings).panY || 0} onChange={e => setImageEditorSettings(prev => clampImageEditorPan({ ...prev, panY: Number(e.target.value) }))} className="w-full accent-stone-900" />
                                        </label>

                                        <label className="block">
                                            <span className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
                                                <span>Φωτεινότητα</span>
                                                <span>{imageEditorSettings.brightness}%</span>
                                            </span>
                                            <input type="range" min="60" max="150" step="1" value={imageEditorSettings.brightness} onChange={e => setImageEditorSettings(prev => ({ ...prev, brightness: Number(e.target.value) }))} className="w-full accent-stone-900" />
                                        </label>

                                        <label className="block">
                                            <span className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
                                                <span>Contrast</span>
                                                <span>{imageEditorSettings.contrast}%</span>
                                            </span>
                                            <input type="range" min="60" max="160" step="1" value={imageEditorSettings.contrast} onChange={e => setImageEditorSettings(prev => ({ ...prev, contrast: Number(e.target.value) }))} className="w-full accent-stone-900" />
                                        </label>

                                        <button type="button" onClick={() => setImageEditorSettings({ rotate: 0, zoom: 1, panX: 0, panY: 0, brightness: 100, contrast: 100, cropAspect: 'square' })} className="w-full px-4 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm font-bold hover:bg-stone-50 transition">
                                            Reset
                                        </button>

                                        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold text-amber-900 leading-relaxed">
                                            Η αλλαγή εφαρμόζεται στο αρχείο που θα ανέβει. Αν την εφαρμόσεις, θα εμφανιστεί κουμπί επαναφοράς στην εικόνα.
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-stone-100 bg-stone-50 flex flex-col sm:flex-row justify-end gap-3">
                                    <button type="button" onClick={closeImageEditor} className="px-6 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm font-bold hover:bg-stone-100 transition" disabled={isApplyingImageEdit}>
                                        Άκυρο
                                    </button>
                                    <button type="button" onClick={applyImageEditor} className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-black hover:bg-stone-800 transition disabled:opacity-50" disabled={isApplyingImageEdit}>
                                        {isApplyingImageEdit ? 'Εφαρμογή...' : 'Εφαρμογή στην εικόνα'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isDetailOpen && currentItem && (
                        <div
                            onClick={(e) => { if (e.target === e.currentTarget) setIsDetailOpen(false); }}
                            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 cursor-pointer overflow-y-auto"
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-stone-200 cursor-default animate-fade-in"
                            >

                                <div className="w-full md:w-1/2 p-3 md:p-4 bg-stone-50 border-r border-stone-100 flex flex-col justify-center relative">
                                    <div className="aspect-[4/5] md:aspect-square w-full rounded-xl overflow-hidden bg-white flex items-center justify-center relative shadow-inner border border-stone-100">
                                        {(() => {
                                            const currentMediaArray = currentItem.mediaList || (currentItem.imageUrl ? [{ url: currentItem.imageUrl, type: currentItem.fileType || 'image', showInShop: true }] : []);
                                            const activeMedia = currentMediaArray[activeDetailMediaIdx] || currentMediaArray[0];

                                            if (!activeMedia) return <IconImage />;
                                            return (
                                                <>
                                                    {activeMedia.type === 'video' ? (
                                                        <video src={activeMedia.url} key={activeMedia.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                                                    ) : (
                                                        <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={activeMedia.url} key={activeMedia.url} className="w-full h-full object-cover" alt={currentItem.name} />
                                                    )}
                                                    {activeMedia.showInShop === false && (
                                                        <div className="absolute top-2 right-2 bg-stone-800 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-lg">
                                                            Κρυφό
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                        <button onClick={() => setIsDetailOpen(false)} className="absolute top-2 left-2 md:hidden p-1.5 bg-white/90 rounded-full text-stone-800 shadow-md"><IconX /></button>
                                    </div>

                                    {(() => {
                                        const currentMediaArray = currentItem.mediaList || (currentItem.imageUrl ? [{ url: currentItem.imageUrl, type: currentItem.fileType || 'image', showInShop: true }] : []);
                                        if (currentMediaArray.length <= 1) return null;
                                        return (
                                            <div className="flex gap-2 mt-3 overflow-x-auto p-1 max-w-full justify-center">
                                                {currentMediaArray.map((m, idx) => (
                                                    <button key={idx} onClick={() => setActiveDetailMediaIdx(idx)} className={`w-12 h-12 rounded-md overflow-hidden flex-shrink-0 border-2 transition relative ${activeDetailMediaIdx === idx ? 'border-amber-400 scale-105 shadow-md' : 'border-stone-200 opacity-70 hover:opacity-100'}`}>
                                                        {m.type === 'video' ? (
                                                            <div className="w-full h-full bg-stone-800 flex items-center justify-center text-[10px]">VIDEO</div>
                                                        ) : (
                                                            <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={m.url} className="w-full h-full object-cover" />
                                                        )}
                                                        {m.showInShop === false && <span className="absolute top-0 right-0 bg-stone-900/90 text-white text-[8px] p-0.5 rounded-bl"></span>}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })()}

                                    <MediaDownload media={(currentItem.mediaList || [{ url: currentItem.imageUrl, type: currentItem.fileType }])[activeDetailMediaIdx] || { url: currentItem.imageUrl }} name={currentItem.name || 'aram-media'} className="absolute top-12 right-3 z-10" />
                                    {currentItem.stock > 1 && <div className="absolute bottom-6 left-6 bg-stone-900/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5"><IconBox /> Απόθεμα: {currentItem.stock} τμχ</div>}
                                </div>

                                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col max-h-[85vh] overflow-y-auto relative bg-white">
                                    <div className="absolute top-6 right-6 hidden md:flex gap-2">
                                        <button onClick={() => handleCloneItem(currentItem)} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 transition" title="Αντιγραφή"><IconClone /></button>
                                        <button onClick={() => setIsDetailOpen(false)} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 transition" title="Κλείσιμο"><IconX /></button>
                                    </div>

                                    <div className="mb-6 pr-20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusColor(currentItem.status)}`}>
                                                {currentItem.status}
                                            </span>
                                            <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">{currentItem.category} {currentItem.collection && `| ${currentItem.collection}`}</p>
                                        </div>
                                        <h2 className="text-2xl font-black text-stone-900 leading-tight mb-2">{currentItem.name}</h2>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-stone-500 mb-1">Τιμη Πωλησης</p>
                                            <p className="text-xl font-black text-emerald-800">{currentItem.price ? `${currentItem.price}€` : '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-stone-500 mb-1">Εκτιμωμενο Κερδος</p>
                                            <p className="text-xl font-black text-emerald-600">
                                                {(currentItem.price && currentItem.cost) ? `${(currentItem.price - currentItem.cost).toFixed(2)}€` : '-'}
                                            </p>
                                        </div>
                                        {currentItem.cost > 0 && <div className="col-span-2 text-[10px] text-stone-500 font-medium mt-[-5px]">Κόστος υλικών: {currentItem.cost}€</div>}
                                    </div>

                                    <div className="flex flex-wrap gap-x-6 gap-y-3 mb-6 text-sm">
                                        {currentItem.creationDate && <div className="flex flex-col"><span className="text-[10px] font-bold text-stone-400 uppercase">Ημ. Κατασκευης</span><span className="font-medium text-stone-800">{currentItem.creationDate}</span></div>}
                                        {currentItem.weight && <div className="flex flex-col"><span className="text-[10px] font-bold text-stone-400 uppercase">Βαρος</span><span className="font-medium text-stone-800">{currentItem.weight}</span></div>}
                                        {currentItem.dimensions && <div className="flex flex-col"><span className="text-[10px] font-bold text-stone-400 uppercase">Διαστασεις</span><span className="font-medium text-stone-800">{currentItem.dimensions}</span></div>}
                                        {currentItem.storage && <div className="flex flex-col"><span className="text-[10px] font-bold text-stone-400 uppercase">Αποθηκευση</span><span className="font-medium text-amber-700 bg-amber-50 px-2 rounded">{currentItem.storage}</span></div>}
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        {currentItem.colors && currentItem.colors.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] font-bold text-stone-400 uppercase mb-2">Χρωματα</h4>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {currentItem.colors.map((col, i) => <span key={col} className="bg-indigo-50 border border-indigo-100 text-xs px-3 py-1.5 rounded font-bold text-indigo-700 uppercase">{col}</span>)}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="text-[10px] font-bold text-stone-400 uppercase mb-2">Υλικα</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {currentItem.materials?.map((mat, i) => <span key={i} className="bg-stone-100 border border-stone-200 text-xs px-3 py-1.5 rounded font-medium text-stone-700">{mat}</span>)}
                                                {(!currentItem.materials || currentItem.materials.length === 0) && <span className="text-xs text-stone-400 italic">Δεν έχουν καταγραφεί υλικά.</span>}
                                            </div>
                                        </div>

                                        {(currentItem.purchaseLinks?.length > 0 || currentItem.postedPlatforms?.length > 0) && (
                                            <div className="mb-4">
                                                {currentItem.purchaseLinks?.length > 0 && (
                                                    <div className="mb-3">
                                                        <h4 className="text-[10px] font-bold text-stone-400 uppercase mb-2">Links Αγορας</h4>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {currentItem.purchaseLinks.map((link, i) => (
                                                                <span key={i} className="bg-blue-50 border border-blue-100 text-xs px-2 py-1 rounded flex items-center gap-1 font-bold text-blue-700">
                                                                    {link.site} {link.url && <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-800"><IconExternalLink /></a>}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {currentItem.postedPlatforms?.length > 0 && (
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-stone-400 uppercase mb-2">Που εχει αναρτηθει</h4>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {currentItem.postedPlatforms.map((plat, i) => (
                                                                <span key={i} className="bg-stone-100 border border-stone-200 text-xs px-2 py-1 rounded flex items-center gap-1 font-bold text-stone-700">
                                                                    {plat.site}
                                                                    {plat.url && <a href={plat.url} target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-800 ml-1"><IconExternalLink /></a>}
                                                                    {plat.showInShop ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded ml-1" title="Ορατό στο Shop">Ορατό</span> : <span className="text-[10px] bg-stone-200 text-stone-500 px-1 rounded ml-1" title="Κρυφό από το Shop">Κρυφό</span>}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {currentItem.notes && (
                                        <div className="mb-8">
                                            <h4 className="text-[10px] font-bold text-stone-400 uppercase mb-2">Σημειωσεις</h4>
                                            <p className="text-sm text-stone-700 bg-stone-50 p-4 rounded-xl border border-stone-100 whitespace-pre-wrap">{stripVintedCondition(currentItem.notes)}</p>
                                        </div>
                                    )}

                                    <div className="mt-auto flex justify-between items-center pt-4 border-t border-stone-100">
                                        <button onClick={() => handleDeleteItem(currentItem.id, currentItem.mediaList, currentItem.imageUrl)} className="text-rose-500 text-sm font-bold hover:text-rose-700 transition">Διαγραφή</button>
                                        <button onClick={() => { setIsDetailOpen(false); handleOpenEdit(currentItem); }} className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition shadow-md">Επεξεργασία</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ΝΕΟ SETTINGS PANEL ΜΕ ΚΑΡΤΕΛΕΣ (Shop Design) */}
                    {isSettingsOpen && (
                        <div
                            onClick={(e) => {
                                if (e.target === e.currentTarget && !mediaPreparing && !isSavingSettings) {
                                    setIsSettingsOpen(false);
                                }
                            }}
                            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 cursor-pointer overflow-y-auto"
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-stone-200 cursor-default animate-fade-in"
                            >
                                <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-sm">
                                            <IconSettings />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-lg font-black text-stone-900 leading-tight">Διαχείριση Συστήματος & Εμφάνισης</h2>
                                                <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Aram Admin</span>
                                            </div>
                                            <p className="text-xs text-stone-500 mt-0.5">Ενιαίο Design Studio, περιεχόμενο Shop, Portfolio, προτάσεις πεδίων και AI Back Office.</p>
                                        </div>
                                    </div>
                                    <button
                                        disabled={mediaPreparing || isSavingSettings}
                                        onClick={() => setIsSettingsOpen(false)}
                                        className="text-stone-400 hover:text-stone-800 bg-white p-2 rounded-xl border border-stone-200 disabled:opacity-40 transition shadow-sm"
                                        title="Κλείσιμο (Esc)"
                                    >
                                        <IconX />
                                    </button>
                                </div>

                                <div className="flex flex-wrap border-b border-stone-200 bg-stone-50 px-4 pt-2 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setActiveSettingsTab('design')}
                                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                                            activeSettingsTab === 'design'
                                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                                        }`}
                                    >
                                        <span>Design Studio</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                            activeSettingsTab === 'design' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                                        }`}>Όλο το Site</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSettingsTab('shop')}
                                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                                            activeSettingsTab === 'shop'
                                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                                        }`}
                                    >
                                        <span>Βιτρίνα Shop</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                            activeSettingsTab === 'shop' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                                        }`}>Σελίδα Shop</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSettingsTab('portfolio')}
                                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                                            activeSettingsTab === 'portfolio'
                                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                                        }`}
                                    >
                                        <span>Portfolio</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                            activeSettingsTab === 'portfolio' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                                        }`}>Σελίδα Έργων</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSettingsTab('fields')}
                                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                                            activeSettingsTab === 'fields'
                                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                                        }`}
                                    >
                                        <span>Προσαρμοσμένα Πεδία</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                            activeSettingsTab === 'fields' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                                        }`}>Φόρμες</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSettingsTab('assistant')}
                                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                                            activeSettingsTab === 'assistant'
                                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                                        }`}
                                    >
                                        <span>AI Back Office</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                            activeSettingsTab === 'assistant' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                                        }`}>Βοηθός AI</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSettingsTab('reviews')}
                                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                                            activeSettingsTab === 'reviews'
                                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                                        }`}
                                    >
                                        <span>Αξιολογήσεις Vinted</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                            activeSettingsTab === 'reviews' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                                        }`}>${vintedReviewsData.stats.feedbackCount || 10} Κριτικές</span>
                                    </button>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                    {settingsSuccessMessage && (
                                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs"><Check className="w-3 h-3 stroke-[2.5]" /></span>
                                                <span>{settingsSuccessMessage}</span>
                                            </div>
                                            <button onClick={() => setSettingsSuccessMessage(null)} aria-label="Κλείσιμο" className="text-emerald-600 hover:text-emerald-900 font-bold text-xs p-1"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                    )}

                                    {settingsLoadError && (
                                        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800">
                                            Προσοχή: Δεν ήταν δυνατή η φόρτωση των αποθηκευμένων ρυθμίσεων Shop. Εμφανίζονται οι τοπικές προεπιλογές: {settingsLoadError}
                                        </div>
                                    )}

                                    {activeSettingsTab === 'design' && (
                                        <div className="animate-fade-in space-y-6">
                                            <div className="rounded-2xl border border-violet-200 bg-linear-to-r from-violet-50 to-purple-50 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-stone-900"></span>
                                                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">Ενιαία Οπτική Ταυτότητα (Global Identity)</h3>
                                                    </div>
                                                    <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                                                        Τα θέματα, η παλέτα χρωμάτων, οι γραμματοσειρές και οι στρογγυλάδες που ρυθμίζονται παρακάτω εφαρμόζονται αυτόματα σε ολόκληρο το κατάστημα: <strong>τόσο στο Shop (#shop) όσο και στο Portfolio (#portfolio)</strong>.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-2 rounded-xl border border-stone-200 shadow-2xs">
                                                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">Ενεργό:</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-4 h-4 rounded-full border border-stone-300 shadow-2xs" style={{ backgroundColor: shopSettings.designStudio?.pageBackground || '#fafaf9' }} title={`Φόντο: ${shopSettings.designStudio?.pageBackground || '#fafaf9'}`} />
                                                        <span className="w-4 h-4 rounded-full border border-stone-300 shadow-2xs" style={{ backgroundColor: shopSettings.designStudio?.accent || '#18181b' }} title={`Accent: ${shopSettings.designStudio?.accent || '#18181b'}`} />
                                                        <span className="w-4 h-4 rounded-full border border-stone-300 shadow-2xs" style={{ backgroundColor: shopSettings.designStudio?.ink || '#18181b' }} title={`Κείμενο: ${shopSettings.designStudio?.ink || '#18181b'}`} />
                                                        <span className="text-xs font-bold text-stone-700 ml-1">{shopSettings.designStudio?.fontFamily?.split(',')[0]?.replace(/'/g, '') || 'Jura'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <DesignStudioSettings
                                                value={shopSettings.designStudio}
                                                onChange={value => setShopSettings(prev => ({ ...prev, designStudio: value }))}
                                            />
                                        </div>
                                    )}

                                    {activeSettingsTab === 'shop' && (
                                        <div className="animate-fade-in space-y-6">
                                            <div className="rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-teal-50 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                                        <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wider">Περιεχόμενο & Hero Βιτρίνας Shop</h3>
                                                    </div>
                                                    <p className="text-xs text-emerald-800 leading-relaxed max-w-2xl">
                                                        Οι ρυθμίσεις αυτής της καρτέλας αφορούν αποκλειστικά τη δημόσια σελίδα του καταστήματος (<strong>#shop</strong>): τον κεντρικό τίτλο, το βίντεο καλωσορίσματος, την ανακοίνωση κορυφής και τη σειρά των κατηγοριών.
                                                    </p>
                                                </div>
                                                <span className="text-[10px] font-black bg-emerald-200/80 text-emerald-900 px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0">Μόνο για το #shop</span>
                                            </div>

                                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
                                                <div className="border-b border-stone-100 pb-3">
                                                    <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">1. Κεντρικός Τίτλος & Υπότιτλος Hero</h3>
                                                    <p className="text-xs text-stone-500 mt-0.5">Το κείμενο που υποδέχεται τους επισκέπτες στην κορυφή του καταστήματος.</p>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold text-stone-700 mb-1">Κεντρικός Τίτλος Shop</label>
                                                        <input
                                                            type="text"
                                                            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-900 transition outline-none text-sm font-bold text-stone-900"
                                                            value={shopSettings.heroTitle}
                                                            onChange={e => setShopSettings({ ...shopSettings, heroTitle: e.target.value })}
                                                            placeholder="π.χ. Χειροποίητα Κοσμήματα με Ψυχή"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-700 mb-1">Μέγεθος Τίτλου</label>
                                                        <select
                                                            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-900 transition outline-none text-sm font-bold text-stone-800"
                                                            value={shopSettings.heroTitleSize}
                                                            onChange={e => setShopSettings({ ...shopSettings, heroTitleSize: e.target.value })}
                                                        >
                                                            <option value="text-2xl md:text-3xl">Μικρό (2xl)</option>
                                                            <option value="text-3xl md:text-4xl">Κανονικό (3xl)</option>
                                                            <option value="text-4xl md:text-5xl">Μεγάλο (4xl)</option>
                                                            <option value="text-5xl md:text-6xl">Πολύ Μεγάλο (5xl)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-700 mb-1">Υπότιτλος / Περιγραφή Shop</label>
                                                    <textarea
                                                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-900 transition outline-none text-xs text-stone-700 h-20 resize-none leading-relaxed"
                                                        value={shopSettings.heroSubtitle}
                                                        onChange={e => setShopSettings({ ...shopSettings, heroSubtitle: e.target.value })}
                                                        placeholder="Σύντομη περιγραφή του εργαστηρίου που εμφανίζεται κάτω από τον τίτλο..."
                                                    />
                                                </div>
                                            </section>

                                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
                                                <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">2. Βίντεο Hero Shop</h3>
                                                        <p className="text-xs text-stone-500 mt-0.5">Εμφανίζεται ως ατμοσφαιρικό βίντεο φόντου στην κορυφή του καταστήματος.</p>
                                                    </div>
                                                    <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-1 rounded-md">Αυτόματη επανάληψη (Muted)</span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-700 mb-1">Σύνδεσμος αρχείου βίντεο (Direct URL)</label>
                                                        <input
                                                            type="url"
                                                            placeholder="https://.../video.mp4"
                                                            value={shopSettings.heroVideoUrl || ''}
                                                            onChange={e => setShopSettings(prev => ({ ...prev, heroVideoUrl: e.target.value }))}
                                                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                                        />
                                                        <p className="text-[10px] text-stone-400 mt-1">Απευθείας σύνδεσμος MP4 / WebM ή σύνδεσμος αποθήκευσης Firebase.</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-700 mb-1">Ανέβασμα νέου βίντεο από υπολογιστή</label>
                                                        <input
                                                            type="file"
                                                            accept="video/*"
                                                            disabled={mediaPreparing}
                                                            aria-label="Ανέβασμα βίντεο Hero"
                                                            onChange={e => {
                                                                const file = e.target.files?.[0];
                                                                e.target.value = '';
                                                                if (file) handleHeroVideoUpload(file, 'shop');
                                                            }}
                                                            className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-900 file:text-white hover:file:bg-stone-800 cursor-pointer"
                                                        />
                                                        <p className="text-[10px] text-stone-400 mt-1">{VIDEO_UPLOAD_HELP}</p>
                                                    </div>
                                                </div>

                                                <VideoUploadStatus value={videoProgress} busy={videoCompressing} onCancel={() => videoAbort.current?.abort()} />
                                                {heroUploadStatus && <p role="status" className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">{heroUploadStatus}</p>}

                                                {shopSettings.heroVideoUrl && (
                                                    <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center gap-4">
                                                        <video src={portfolioHeroVideoUrl(shopSettings.heroVideoUrl)} controls muted preload="metadata" referrerPolicy="no-referrer" className="max-h-36 w-full sm:w-64 rounded-xl bg-black object-cover shadow-xs" />
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <MediaDownload media={{ url: portfolioHeroVideoUrl(shopSettings.heroVideoUrl), type: 'video' }} name="aram-hero-video" />
                                                            {isKnownUnplayableHevcHeroUrl(shopSettings.heroVideoUrl) && (
                                                                <button
                                                                    type="button"
                                                                    disabled={mediaPreparing || isSavingSettings}
                                                                    onClick={async () => {
                                                                        const res = await fetch(TRANSCODED_HERO_H264_PATH);
                                                                        const blob = await res.blob();
                                                                        const h264File = new File([blob], '2026-11-04-145207521-h264.mp4', { type: 'video/mp4' });
                                                                        await handleHeroVideoUpload(h264File, 'shop');
                                                                    }}
                                                                    className="rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-2 text-xs font-bold transition"
                                                                >
                                                                    Αποθήκευση H.264 στο Cloud
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                disabled={mediaPreparing || isSavingSettings}
                                                                onClick={() => {
                                                                    setShopSettings(prev => ({ ...prev, heroVideoUrl: '' }));
                                                                    setHeroUploadStatus('Το βίντεο αφαιρέθηκε. Πατήστε Αποθήκευση Ρυθμίσεων για να εφαρμοστεί.');
                                                                }}
                                                                className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 text-xs font-bold transition"
                                                            >
                                                                Αφαίρεση βίντεο
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </section>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
                                                    <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-3">
                                                        <div>
                                                            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">3. Ανακοίνωση Κορυφής</h3>
                                                            <p className="text-xs text-stone-500 mt-0.5">Μπάρα ενημέρωσης πάνω από το κεντρικό μενού.</p>
                                                        </div>
                                                        <label className="inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={shopSettings.announcementEnabled}
                                                                onChange={e => setShopSettings({ ...shopSettings, announcementEnabled: e.target.checked })}
                                                            />
                                                            <span className="relative w-11 h-6 bg-stone-200 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5 shadow-2xs"></span>
                                                        </label>
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        <div>
                                                            <label className="block text-xs font-bold text-stone-700 mb-1">Κείμενο ανακοίνωσης</label>
                                                            <input
                                                                type="text"
                                                                maxLength="140"
                                                                placeholder="π.χ. Δωρεάν μεταφορικά για παραγγελίες άνω των 50€!"
                                                                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                                                value={shopSettings.announcementText}
                                                                onChange={e => setShopSettings({ ...shopSettings, announcementText: e.target.value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-stone-700 mb-1">Προαιρετικός σύνδεσμος</label>
                                                            <input
                                                                type="url"
                                                                placeholder="https://..."
                                                                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                                                value={shopSettings.announcementLink}
                                                                onChange={e => setShopSettings({ ...shopSettings, announcementLink: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </section>

                                                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
                                                    <div className="border-b border-stone-100 pb-3">
                                                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">4. Πυκνότητα Προϊόντων</h3>
                                                        <p className="text-xs text-stone-500 mt-0.5">Καθορίζει τον αέρα και την απόσταση ανάμεσα στις κάρτες προϊόντων.</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                                        {[
                                                            ['comfortable', 'Άνετη (Comfortable)', 'Περισσότερος αέρας ανάμεσα στις κάρτες'],
                                                            ['compact', 'Πυκνή (Compact)', 'Πιο συμπαγής διάταξη, ιδανική για πολλά προϊόντα']
                                                        ].map(([value, label, desc]) => (
                                                            <button
                                                                key={value}
                                                                type="button"
                                                                onClick={() => setShopSettings(prev => ({ ...prev, catalogDensity: value }))}
                                                                className={`p-3 border rounded-xl text-left transition ${
                                                                    shopSettings.catalogDensity === value
                                                                        ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                                                                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-white'
                                                                }`}
                                                            >
                                                                <span className="block text-xs font-black">{label}</span>
                                                                <span className="block text-[10px] mt-0.5 opacity-75">{desc}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </section>
                                            </div>

                                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
                                                <div className="border-b border-stone-100 pb-3">
                                                    <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">5. Σειρά Κατηγοριών στο Μενού Shop</h3>
                                                    <p className="text-xs text-stone-500 mt-0.5">Σύρετε τις κατηγορίες για να αλλάξετε τη σειρά που εμφανίζονται στο μενού πλοήγησης. (Η επιλογή «Όλη η Συλλογή» παραμένει πάντα πρώτη).</p>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                                    {shopSettings.categoryOrder.map((cat, idx) => (
                                                        <div
                                                            key={cat}
                                                            draggable
                                                            onDragStart={(e) => { setDraggedCategoryIdx(idx); e.dataTransfer.effectAllowed = "move"; }}
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                if (draggedCategoryIdx === null || draggedCategoryIdx === idx) return;
                                                                const newOrder = [...shopSettings.categoryOrder];
                                                                const itemToMove = newOrder[draggedCategoryIdx];
                                                                newOrder.splice(draggedCategoryIdx, 1);
                                                                newOrder.splice(idx, 0, itemToMove);
                                                                setShopSettings({ ...shopSettings, categoryOrder: newOrder });
                                                                setDraggedCategoryIdx(null);
                                                            }}
                                                            className="flex items-center gap-2 bg-stone-50 hover:bg-white border border-stone-200 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing transition shadow-2xs"
                                                        >
                                                            <IconGripVertical />
                                                            <span className="text-xs font-black text-stone-800 flex-1 truncate">{cat}</span>
                                                            <span className="text-[10px] font-bold text-stone-400 bg-white px-2 py-0.5 rounded-md border border-stone-200">{idx + 1}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>

                                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
                                                <div className="border-b border-stone-100 pb-3">
                                                    <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">6. Εξωτερικοί Σύνδεσμοι Προφίλ (Fallback Links)</h3>
                                                    <p className="text-xs text-stone-500 mt-0.5">Αν ένα προϊόν δεν διαθέτει δικό του άμεσο σύνδεσμο αγοράς, ο πελάτης ανακατευθύνεται εδώ.</p>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                                                    {Object.keys(shopSettings.fallbackLinks).map(platform => (
                                                        <div key={platform} className="space-y-1">
                                                            <label className="text-xs font-bold text-stone-700 capitalize">{platform}</label>
                                                            <input
                                                                type="url"
                                                                placeholder={`https://${platform.toLowerCase()}...`}
                                                                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                                                value={shopSettings.fallbackLinks[platform]}
                                                                onChange={e => setShopSettings({
                                                                    ...shopSettings,
                                                                    fallbackLinks: { ...shopSettings.fallbackLinks, [platform]: e.target.value }
                                                                })}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>

                                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
                                                <div className="border-b border-stone-100 pb-3">
                                                    <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">7. Έξοδα Αποστολής & Μεταφορικά (Checkout)</h3>
                                                    <p className="text-xs text-stone-500 mt-0.5">
                                                        Ρυθμίστε τα κόστη και τα όρια δωρεάν αποστολής που εφαρμόζονται στο ταμείο για BoxNow και Courier.
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                                                        <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">BOX NOW Locker 24/7</h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-stone-700 mb-1">Βασικό Κόστος (€)</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.10"
                                                                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white text-stone-900 font-bold outline-none"
                                                                    value={shopSettings.shippingSettings?.boxnowPrice ?? 2.5}
                                                                    onChange={e => setShopSettings(prev => ({
                                                                        ...prev,
                                                                        shippingSettings: {
                                                                            ...(prev.shippingSettings || {}),
                                                                            boxnowPrice: parseFloat(e.target.value) || 0
                                                                        }
                                                                    }))}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-stone-700 mb-1">Όριο Δωρεάν (€)</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="1"
                                                                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white text-stone-900 font-bold outline-none"
                                                                    value={shopSettings.shippingSettings?.boxnowFreeThreshold ?? 45}
                                                                    onChange={e => setShopSettings(prev => ({
                                                                        ...prev,
                                                                        shippingSettings: {
                                                                            ...(prev.shippingSettings || {}),
                                                                            boxnowFreeThreshold: parseFloat(e.target.value) || 0
                                                                        }
                                                                    }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                                                        <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">Courier (ACS / Speedex)</h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-stone-700 mb-1">Βασικό Κόστος (€)</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.10"
                                                                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white text-stone-900 font-bold outline-none"
                                                                    value={shopSettings.shippingSettings?.courierPrice ?? 4.0}
                                                                    onChange={e => setShopSettings(prev => ({
                                                                        ...prev,
                                                                        shippingSettings: {
                                                                            ...(prev.shippingSettings || {}),
                                                                            courierPrice: parseFloat(e.target.value) || 0
                                                                        }
                                                                    }))}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-stone-700 mb-1">Όριο Δωρεάν (€)</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="1"
                                                                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white text-stone-900 font-bold outline-none"
                                                                    value={shopSettings.shippingSettings?.courierFreeThreshold ?? 50}
                                                                    onChange={e => setShopSettings(prev => ({
                                                                        ...prev,
                                                                        shippingSettings: {
                                                                            ...(prev.shippingSettings || {}),
                                                                            courierFreeThreshold: parseFloat(e.target.value) || 0
                                                                        }
                                                                    }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-700 mb-1">Σημείωση / Επισήμανση Μεταφορικών (για ογκώδη αντικείμενα ή μεγαλύτερες θυρίδες)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="π.χ. *Τα παραπάνω κόστη αφορούν βασικές θυρίδες. Για ογκώδη αντικείμενα ενδέχεται να υπάρξει προσαρμογή."
                                                        className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                                        value={shopSettings.shippingSettings?.customNotes || ''}
                                                        onChange={e => setShopSettings(prev => ({
                                                            ...prev,
                                                            shippingSettings: {
                                                                ...(prev.shippingSettings || {}),
                                                                customNotes: e.target.value
                                                            }
                                                        }))}
                                                    />
                                                </div>
                                            </section>
                                        </div>
                                    )}

                                    {activeSettingsTab === 'portfolio' && (
                                        <div className="animate-fade-in space-y-6">
                                            <div className="rounded-2xl border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                                                        <h3 className="text-sm font-black text-amber-950 uppercase tracking-wider">Περιεχόμενο & Hero Σελίδας Portfolio</h3>
                                                    </div>
                                                    <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                                                        Οι ρυθμίσεις αυτής της καρτέλας αφορούν αποκλειστικά το Portfolio (<strong>#portfolio</strong>): τίτλους έκθεσης, κουμπί επικοινωνίας, βίντεο φόντου και τις κατηγορίες έργων.
                                                    </p>
                                                </div>
                                                <span className="text-[10px] font-black bg-amber-200/80 text-amber-900 px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0">Μόνο για το #portfolio</span>
                                            </div>

                                            <PortfolioDesignSettings
                                                value={shopSettings.portfolioDesign}
                                                onChange={value => setShopSettings(prev => ({ ...prev, portfolioDesign: value }))}
                                            />

                                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
                                                <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">Βίντεο Hero Portfolio</h3>
                                                        <p className="text-xs text-stone-500 mt-0.5">Εμφανίζεται πίσω από τον τίτλο στο Portfolio, χωρίς ήχο και σε συνεχή επανάληψη.</p>
                                                    </div>
                                                    <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-1 rounded-md">Αυτόματη επανάληψη (Muted)</span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="portfolio-hero-video-url" className="block text-xs font-bold text-stone-700 mb-1">Σύνδεσμος αρχείου βίντεο (Direct URL)</label>
                                                        <input
                                                            id="portfolio-hero-video-url"
                                                            type="url"
                                                            placeholder="https://.../video.mp4"
                                                            disabled={mediaPreparing || isSavingSettings}
                                                            value={shopSettings.portfolioHeroVideoUrl || ''}
                                                            onChange={e => setShopSettings(prev => ({ ...prev, portfolioHeroVideoUrl: e.target.value }))}
                                                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                                        />
                                                        <p className="text-[10px] text-stone-400 mt-1">Δέχεται YouTube, Vimeo, απευθείας MP4/WebM ή Firebase Storage URL.</p>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="portfolio-hero-video-file" className="block text-xs font-bold text-stone-700 mb-1">Ανέβασμα από υπολογιστή</label>
                                                        <input
                                                            id="portfolio-hero-video-file"
                                                            type="file"
                                                            accept="video/*"
                                                            disabled={mediaPreparing || isSavingSettings}
                                                            aria-label="Ανέβασμα βίντεο Hero Portfolio"
                                                            onChange={e => {
                                                                const file = e.target.files?.[0];
                                                                e.target.value = '';
                                                                if (file) handleHeroVideoUpload(file, 'portfolio');
                                                            }}
                                                            className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-900 file:text-white hover:file:bg-stone-800 cursor-pointer"
                                                        />
                                                        <p className="text-[10px] text-stone-400 mt-1">{VIDEO_UPLOAD_HELP}</p>
                                                    </div>
                                                </div>

                                                <VideoUploadStatus value={videoProgress} busy={videoCompressing} onCancel={() => videoAbort.current?.abort()} />
                                                {portfolioHeroUploadStatus && <p role="status" className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">{portfolioHeroUploadStatus}</p>}

                                                {shopSettings.portfolioHeroVideoUrl && (
                                                    <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center gap-4">
                                                        <video src={portfolioHeroVideoUrl(shopSettings.portfolioHeroVideoUrl)} controls muted preload="metadata" referrerPolicy="no-referrer" className="max-h-36 w-full sm:w-64 rounded-xl bg-black object-cover shadow-xs" />
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <MediaDownload media={{ url: portfolioHeroVideoUrl(shopSettings.portfolioHeroVideoUrl), type: 'video' }} name="aram-portfolio-hero-video" />
                                                            {isKnownUnplayableHevcHeroUrl(shopSettings.portfolioHeroVideoUrl) && (
                                                                <button
                                                                    type="button"
                                                                    disabled={mediaPreparing || isSavingSettings}
                                                                    onClick={async () => {
                                                                        const res = await fetch(TRANSCODED_HERO_H264_PATH);
                                                                        const blob = await res.blob();
                                                                        const h264File = new File([blob], '2026-11-04-145207521-h264.mp4', { type: 'video/mp4' });
                                                                        await handleHeroVideoUpload(h264File, 'portfolio');
                                                                    }}
                                                                    className="rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-2 text-xs font-bold transition"
                                                                >
                                                                    Αποθήκευση H.264 στο Cloud
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                disabled={mediaPreparing || isSavingSettings}
                                                                onClick={() => {
                                                                    setShopSettings(prev => ({ ...prev, portfolioHeroVideoUrl: '' }));
                                                                    setPortfolioHeroUploadStatus('Το βίντεο αφαιρέθηκε από την προεπισκόπηση. Πάτησε Αποθήκευση Ρυθμίσεων για να εφαρμοστεί.');
                                                                }}
                                                                className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 text-xs font-bold transition"
                                                            >
                                                                Αφαίρεση βίντεο
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </section>

                                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
                                                <div className="border-b border-stone-100 pb-3">
                                                    <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">Ζωντανή Προεπισκόπηση Hero Portfolio</h3>
                                                    <p className="text-xs text-stone-500 mt-0.5">Έτσι εμφανίζεται ο κεντρικός τομέας του Portfolio στους επισκέπτες.</p>
                                                </div>
                                                <div className="overflow-hidden rounded-xl border border-stone-200 shadow-xs">
                                                    <PortfolioHero
                                                        design={normalizePortfolioDesign(shopSettings.portfolioDesign)}
                                                        videoUrl={shopSettings.portfolioHeroVideoUrl}
                                                        itemCount={0}
                                                        categoryCount={0}
                                                        videoCount={0}
                                                        onContactArtist={() => {}}
                                                        showContact={false}
                                                        showStats={false}
                                                    />
                                                </div>
                                            </section>
                                        </div>
                                    )}

                                    {activeSettingsTab === 'fields' && (
                                        <div className="animate-fade-in space-y-6">
                                            <div className="rounded-2xl border border-sky-200 bg-linear-to-r from-sky-50 to-blue-50 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                                                        <h3 className="text-sm font-black text-sky-950 uppercase tracking-wider">Προτάσεις Φορμών Καταχώρησης Back Office</h3>
                                                    </div>
                                                    <p className="text-xs text-sky-800 leading-relaxed max-w-2xl">
                                                        Διαχειριστείτε τις έτοιμες προτάσεις (dropdowns και chips) που εμφανίζονται όταν καταχωρείτε ή επεξεργάζεστε προϊόντα. Σύρετε για αναδιάταξη, ταξινομήστε με ένα κλικ τα συχνότερα πρώτα ή κρύψτε όσα δεν επιθυμείτε.
                                                    </p>
                                                </div>
                                                <span className="text-[10px] font-black bg-sky-200/80 text-sky-900 px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0">Μόνο για το Back Office</span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-200 pb-3">
                                                {[
                                                    ['all', 'Όλα τα πεδία', null],
                                                    ['color', 'Χρώματα', settingsColorOptions.length],
                                                    ['material', 'Υλικά', settingsMaterialOptions.length],
                                                    ['category', 'Κατηγορίες', settingsCategoryOptions.length],
                                                    ['collection', 'Συλλογές', settingsCollectionOptions.length],
                                                    ['status', 'Καταστάσεις', settingsStatusOptions.length],
                                                    ['platform', 'Πλατφόρμες', settingsPlatformOptions.length]
                                                ].map(([filterKey, filterLabel, count]) => (
                                                    <button
                                                        key={filterKey}
                                                        type="button"
                                                        onClick={() => setActiveFieldFilter(filterKey)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                                            activeFieldFilter === filterKey
                                                                ? 'bg-stone-900 text-white shadow-2xs'
                                                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                                                        }`}
                                                    >
                                                        <span>{filterLabel}</span>
                                                        {count !== null && (
                                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeFieldFilter === filterKey ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'}`}>
                                                                {count}
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                {(activeFieldFilter === 'all' || activeFieldFilter === 'color') && (
                                                    renderFieldOptionManager({
                                                        type: 'color',
                                                        title: 'Χρώματα Προϊόντων',
                                                        options: settingsColorOptions,
                                                        counts: colorUsageCounts,
                                                        hiddenOptions: hiddenColorOptions,
                                                        tone: 'indigo'
                                                    })
                                                )}

                                                {(activeFieldFilter === 'all' || activeFieldFilter === 'material') && (
                                                    renderFieldOptionManager({
                                                        type: 'material',
                                                        title: 'Υλικά Προϊόντων',
                                                        options: settingsMaterialOptions,
                                                        counts: materialUsageCounts,
                                                        hiddenOptions: hiddenMaterialOptions
                                                    })
                                                )}

                                                {(activeFieldFilter === 'all' || activeFieldFilter === 'category') && (
                                                    renderFieldOptionManager({
                                                        type: 'category',
                                                        title: 'Κατηγορίες Προϊόντων',
                                                        options: settingsCategoryOptions,
                                                        counts: categoryUsageCounts,
                                                        hiddenOptions: hiddenCategoryOptions
                                                    })
                                                )}

                                                {(activeFieldFilter === 'all' || activeFieldFilter === 'collection') && (
                                                    renderFieldOptionManager({
                                                        type: 'collection',
                                                        title: 'Συλλογές',
                                                        options: settingsCollectionOptions,
                                                        counts: collectionUsageCounts,
                                                        hiddenOptions: hiddenCollectionOptions
                                                    })
                                                )}

                                                {(activeFieldFilter === 'all' || activeFieldFilter === 'status') && (
                                                    renderFieldOptionManager({
                                                        type: 'status',
                                                        title: 'Καταστάσεις Διαθεσιμότητας',
                                                        options: settingsStatusOptions,
                                                        counts: statusUsageCounts,
                                                        hiddenOptions: hiddenStatusOptions
                                                    })
                                                )}

                                                {(activeFieldFilter === 'all' || activeFieldFilter === 'platform') && (
                                                    renderFieldOptionManager({
                                                        type: 'platform',
                                                        title: 'Πλατφόρμες Πώλησης',
                                                        options: settingsPlatformOptions,
                                                        counts: platformUsageCounts,
                                                        hiddenOptions: hiddenPlatformOptions
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeSettingsTab === 'assistant' && (
                                        <div className="animate-fade-in space-y-6">
                                            <div className="rounded-2xl border border-purple-200 bg-linear-to-r from-purple-50 to-fuchsia-50 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                                        <h3 className="text-sm font-black text-purple-950 uppercase tracking-wider">AI Assistant Φόρμας Back Office</h3>
                                                    </div>
                                                    <p className="text-xs text-purple-800 leading-relaxed max-w-2xl">
                                                        Αυτή η ρύθμιση αφορά <strong>αποκλειστικά τον βοηθό τεχνητής νοημοσύνης μέσα στη φόρμα καταχώρησης προϊόντων</strong> (για αυτόματη δημιουργία τίτλων, περιγραφών και tags). Δεν εμφανίζεται δημόσιο AI bot στους πελάτες του shop.
                                                    </p>
                                                </div>
                                                <span className="text-[10px] font-black bg-purple-200/80 text-purple-900 px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0">Μόνο για το Back Office</span>
                                            </div>

                                            <section className="border border-stone-200 rounded-2xl p-5 bg-white shadow-2xs space-y-4">
                                                <div className="flex items-start gap-3 border-b border-stone-100 pb-3">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                                        <IconBolt />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">Back-office AI Endpoint</h3>
                                                        <p className="text-xs text-stone-500 mt-0.5">Διεύθυνση του serverless function που εκτελεί τις κλήσεις προς τα μοντέλα AI.</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <input
                                                        type="url"
                                                        placeholder="Άστο κενό για χρήση του /api/backoffice-ai ή βάλε http://127.0.0.1:3000/api/backoffice-ai για τοπικό server"
                                                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-900 transition outline-none text-xs font-mono text-stone-800"
                                                        value={assistantSettings.backofficeEndpoint || ''}
                                                        onChange={e => updateAssistantSetting('backofficeEndpoint', e.target.value)}
                                                    />
                                                    <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
                                                        Όταν παραμένει κενό, χρησιμοποιείται αυτόματα το ενσωματωμένο Netlify / Express endpoint <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700">/api/backoffice-ai</code>.
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
                                                        <p className="text-xs font-black text-stone-800 uppercase tracking-wider">Πού δουλεύει</p>
                                                        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">Μέσα στη φόρμα προϊόντος για δημιουργία τίτλων, περιγραφών, χρωμάτων, υλικών, tags και Instagram captions.</p>
                                                    </div>
                                                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
                                                        <p className="text-xs font-black text-stone-800 uppercase tracking-wider">Εικόνες & Όραση</p>
                                                        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">Αναλύει τις ανεβασμένες φωτογραφίες του κοσμήματος για αυτόματη ανίχνευση υλικών, χρωμάτων και λεπτομερειών.</p>
                                                    </div>
                                                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
                                                        <p className="text-xs font-black text-stone-800 uppercase tracking-wider"> Ασφάλεια & Πρόσβαση</p>
                                                        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">Προστατεύεται με Firebase authentication και admin email check. Κανένα API key δεν εκτίθεται στο δημόσιο frontend.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4.5 space-y-1.5">
                                                <p className="text-xs font-black text-amber-900 uppercase tracking-wider">Οδηγός Αντιμετώπισης Σφαλμάτων</p>
                                                <p className="text-xs text-amber-800 leading-relaxed">
                                                    • <strong>Σφάλμα 503</strong>: Ελέγξτε τα <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">GEMINI_API_KEY</code> και <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">AI_PROVIDER</code> στα environment variables του Netlify (ή στο τοπικό αρχείο <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">.env</code>).<br />
                                                    • <strong>Σφάλμα 401</strong>: Απαιτείται ενεργή σύνδεση με λογαριασμό διαχειριστή στο Back Office.
                                                </p>
                                            </section>
                                        </div>
                                    )}

                                    {activeSettingsTab === 'reviews' && (
                                        <div className="animate-fade-in space-y-6">
                                            <div className="rounded-2xl border border-teal-200 bg-linear-to-r from-teal-50 to-emerald-50 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                                                        <h3 className="text-sm font-black text-teal-950 uppercase tracking-wider">Αξιολογήσεις & Φήμη Vinted</h3>
                                                    </div>
                                                    <p className="text-xs text-teal-800 leading-relaxed max-w-2xl">
                                                        Διαχείριση και αυτόματος συγχρονισμός των αξιολογήσεων από το επίσημο προφίλ <strong>aramcreations</strong> στο Vinted. Οι κριτικές προβάλλονται αυτόματα στη βιτρίνα του καταστήματος.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handleSyncVintedReviews}
                                                    disabled={isSyncingVintedReviews}
                                                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-xs disabled:opacity-50 shrink-0"
                                                >
                                                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingVintedReviews ? 'animate-spin' : ''}`} />
                                                    <span>{isSyncingVintedReviews ? 'Συγχρονισμός...' : 'Συγχρονισμός Vinted'}</span>
                                                </button>
                                            </div>

                                            {/* Progress or Status Feedback (Rule 2) */}
                                            {isSyncingVintedReviews && (
                                                <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-2xl space-y-2 animate-fade-in">
                                                    <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                                                        <span>{vintedSyncStep}</span>
                                                        <span>{vintedSyncPercent}%</span>
                                                    </div>
                                                    <div className="w-full bg-teal-100 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className="bg-teal-600 h-full transition-all duration-300 rounded-full"
                                                            style={{ width: `${vintedSyncPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {vintedSyncError && (
                                                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs space-y-1 animate-fade-in">
                                                    <div className="font-bold flex items-center gap-2">
                                                        <X className="w-4 h-4 text-rose-600 shrink-0" />
                                                        <span>Σφάλμα συγχρονισμού Vinted:</span>
                                                    </div>
                                                    <p className="font-mono text-[11px] text-rose-900 bg-white/70 p-2 rounded-lg border border-rose-200">
                                                        {vintedSyncError}
                                                    </p>
                                                </div>
                                            )}

                                            {vintedSyncSuccess && (
                                                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-fade-in">
                                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                                    <span>{vintedSyncSuccess}</span>
                                                </div>
                                            )}

                                            {/* Metrics Cards */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
                                                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Βαθμολογία</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-2xl font-bold font-mono text-stone-900">{vintedReviewsData.stats.ratingScore || 5.0}</span>
                                                        <div className="flex text-amber-500">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
                                                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Σύνολο Κριτικών</span>
                                                    <span className="text-2xl font-bold font-mono text-stone-900">{vintedReviewsData.stats.feedbackCount || 10}</span>
                                                    <span className="text-[10px] text-stone-500 block">100% Θετικές</span>
                                                </div>

                                                <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
                                                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Ενεργά Προϊόντα</span>
                                                    <span className="text-2xl font-bold font-mono text-stone-900">{vintedReviewsData.stats.itemCount || 106}</span>
                                                    <span className="text-[10px] text-stone-500 block">Κατάλογος Vinted</span>
                                                </div>

                                                <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
                                                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Προφίλ Vinted</span>
                                                    <a
                                                        href={`https://www.vinted.gr/member/${vintedReviewsData.stats.memberId || '231329281'}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 mt-1 truncate"
                                                    >
                                                        <span>@{vintedReviewsData.stats.login || 'aramcreations'}</span>
                                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Reviews List */}
                                            <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-4">
                                                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-wider text-stone-900">
                                                            Αποθηκευμένες Αξιολογήσεις ({vintedReviewsData.reviews.length || 10})
                                                        </h4>
                                                        <p className="text-[11px] text-stone-500">
                                                            Όλες οι κριτικές ελέγχονται αυτόματα και αφαιρούνται τα τυποποιημένα μηνύματα κατάστασης.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                                    {(vintedReviewsData.reviews.length > 0 ? vintedReviewsData.reviews : [
                                                        { id: 1, userLogin: 'vasileiasefer', rating: 5, formattedDate: '27 Οκτωβρίου 2026', feedback: 'Τα προϊόντα έφτασαν σε τέλεια κατάσταση, η συσκευασία τους πολύ προσεγμένη και με οδηγίες χρήσης για το πώς να τα προσέξω.', sellerReply: 'Σας ευχαριστώ πολύ!' },
                                                        { id: 2, userLogin: 'piscesismysign', rating: 5, formattedDate: '26 Σεπτεμβρίου 2026', feedback: 'Το κολιέ είναι πραγματικά πανέμορφο! Το λουλούδι το κάνει πολύ ξεχωριστό και φαίνεται ακόμη πιο όμορφο από κοντά. Πολύ προσεγμένη δουλειά και λεπτομέρεια.', sellerReply: 'Ευχαριστώ πολύ!' },
                                                        { id: 3, userLogin: 'zoioulia', rating: 5, formattedDate: '10 Σεπτεμβρίου 2026', feedback: 'Ολα τέλεια, ευχαριστώ!', sellerReply: 'Εγώ ευχαριστώ πολύ!' },
                                                        { id: 4, userLogin: 'alkistisgln', rating: 5, formattedDate: '7 Σεπτεμβρίου 2026', feedback: 'Τέλειο το κολιέ και πολύ καλή συσκευασία', sellerReply: 'Ευχαριστώ πάρα πολύ!' },
                                                        { id: 5, userLogin: 'dosdosss', rating: 5, formattedDate: '3 Σεπτεμβρίου 2026', feedback: 'Άμεση αποστολή, τέλειο κολιέ και μου έβαλε και δωράκι ένα μπρελόκ! θα ξαναπάρω σίγουρα.', sellerReply: 'Ευχαριστώ πάρα πολύ!' }
                                                    ]).map((rev, idx) => (
                                                        <div key={rev.id || idx} className="p-3.5 rounded-xl border border-stone-100 bg-stone-50/60 text-xs space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-stone-900">{rev.userLogin}</span>
                                                                    <BadgeCheck className="w-3.5 h-3.5 text-teal-600" />
                                                                    <span className="text-[10px] text-stone-400">{rev.formattedDate}</span>
                                                                </div>
                                                                <div className="flex text-amber-500">
                                                                    {[...Array(rev.rating || 5)].map((_, i) => (
                                                                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <p className="text-stone-700 italic">"{rev.feedback}"</p>
                                                            {rev.sellerReply && (
                                                                <div className="pt-1.5 pl-3 border-l-2 border-stone-300 text-[11px] text-stone-600 flex items-center gap-1.5">
                                                                    <CornerDownRight className="w-3 h-3 text-stone-400 shrink-0" />
                                                                    <span>Απάντηση: <em>{rev.sellerReply}</em></span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="text-xs text-stone-500 font-medium hidden sm:block">
                                        Οι ρυθμίσεις αποθηκεύονται απευθείας στη βάση δεδομένων και εφαρμόζονται άμεσα.
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                        <button
                                            type="button"
                                            disabled={mediaPreparing || isSavingSettings}
                                            onClick={() => setIsSettingsOpen(false)}
                                            className="px-5 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition disabled:opacity-40 shadow-2xs"
                                        >
                                            Κλείσιμο
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveSettings}
                                            disabled={isSavingSettings || mediaPreparing}
                                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition shadow-md flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <IconCheck />
                                            {isSavingSettings ? 'Αποθήκευση...' : 'Αποθήκευση Ρυθμίσεων'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {isVintedImportOpen && (
                        <div onClick={(e) => { if (e.target === e.currentTarget && !isVintedImportWorking) setIsVintedImportOpen(false); }} className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 cursor-pointer overflow-y-auto">
                            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-stone-200 cursor-default animate-fade-in">
                                <div className="p-5 border-b border-stone-100 bg-teal-50 flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black text-stone-900">Vinted Import</h2>
                                        <p className="text-xs md:text-sm font-bold text-stone-500 mt-1">Φέρε, έλεγξε και επεξεργάσου τα στοιχεία πριν τα αποθηκεύσεις στον κατάλογο.</p>
                                    </div>
                                    <button type="button" onClick={() => setIsVintedImportOpen(false)} className="text-stone-500 hover:text-stone-900 bg-white p-1 rounded-lg border border-stone-200"><IconX /></button>
                                </div>

                                <div className="p-5 overflow-y-auto space-y-5">
                                    <section className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-2">Vinted links</label>
                                            <textarea
                                                value={vintedLinksText}
                                                onChange={(e) => setVintedLinksText(e.target.value)}
                                                rows={5}
                                                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-y"
                                                placeholder="https://www.vinted.gr/items/..."
                                            />
                                        </div>

                                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                                                    <label className="flex items-start gap-2 text-xs font-bold text-stone-700">
                                                <input
                                                    type="checkbox"
                                                    checked={copyVintedImages}
                                                    onChange={(e) => setCopyVintedImages(e.target.checked)}
                                                    className="mt-0.5 accent-teal-700"
                                                />
                                                <span>Αντιγραφή εικόνων στο Firebase Storage πριν το import</span>
                                                    </label>
                                                    <p className="text-[11px] text-stone-500 leading-relaxed">Άφησέ το ενεργό για να μένουν οι εικόνες δικές σου και να φαίνονται σωστά στο Back Office και στο Shop.</p>
                                                    <p className="text-[10px] text-amber-800 leading-relaxed">Προσοχή: οι χρεώσεις Vinted είναι ενδεικτικές και αφορούν το εκτιμώμενο συνολικό κόστος αγοραστή· επιβεβαίωσε την τιμή πριν την αποθήκευση.</p>
                                                    <details className="rounded-lg border border-stone-200 bg-white p-3">
                                                        <summary className="cursor-pointer text-xs font-black text-stone-700">Προσαρμογή τιμής Vinted</summary>
                                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                                            <label className="text-[10px] font-bold text-stone-600">Σταθερή χρέωση €
                                                                <input type="number" min="0" step="0.01" value={vintedPricingSettings.buyerFixed} onChange={e => setVintedPricingSettings(prev => { const next = { ...prev, buyerFixed: e.target.value }; localStorage.setItem('aram_vinted_fee_settings', JSON.stringify(next)); return next; })} className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-xs" />
                                                            </label>
                                                            <label className="text-[10px] font-bold text-stone-600">Ποσοστό %
                                                                <input type="number" min="0" step="0.1" value={vintedPricingSettings.buyerPercent} onChange={e => setVintedPricingSettings(prev => { const next = { ...prev, buyerPercent: e.target.value }; localStorage.setItem('aram_vinted_fee_settings', JSON.stringify(next)); return next; })} className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-xs" />
                                                            </label>
                                                            <label className="text-[10px] font-bold text-stone-600">Μεταφορικά €
                                                                <input type="number" min="0" step="0.01" value={vintedPricingSettings.shippingMin} onChange={e => setVintedPricingSettings(prev => { const next = { ...prev, shippingMin: e.target.value }; localStorage.setItem('aram_vinted_fee_settings', JSON.stringify(next)); return next; })} className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-xs" />
                                                            </label>
                                                            <label className="text-[10px] font-bold text-stone-600">Στρογγυλοποίηση
                                                                <select value={vintedPricingSettings.rounding} onChange={e => setVintedPricingSettings(prev => { const next = { ...prev, rounding: e.target.value }; localStorage.setItem('aram_vinted_fee_settings', JSON.stringify(next)); return next; })} className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-xs">
                                                                    <option value="up_050">Προς τα πάνω €0,50</option>
                                                                    <option value="none">Χωρίς στρογγυλοποίηση</option>
                                                                </select>
                                                            </label>
                                                        </div>
                                                        <p className="text-[10px] leading-relaxed text-stone-500 mt-2">Η τιμή Shop υπολογίζεται από την τιμή Vinted + τις παραπάνω εκτιμώμενες χρεώσεις. Έλεγξέ την στην προεπισκόπηση πριν την αποθήκευση.</p>
                                                    </details>
                                                    <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleFetchVintedLinks}
                                                    disabled={isVintedImportWorking}
                                                    className="col-span-2 px-4 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-black hover:bg-stone-800 transition disabled:opacity-50"
                                                >
                                                    Φέρε στοιχεία
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setVintedImportItems([]); setVintedImportStatus(''); setVintedImportError(''); }}
                                                    disabled={isVintedImportWorking || !vintedImportItems.length}
                                                    className="px-4 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-black hover:bg-stone-100 transition disabled:opacity-50"
                                                >
                                                    Καθαρισμός preview
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleImportVintedItems}
                                                    disabled={isVintedImportWorking || !vintedImportItems.length}
                                                    className="px-4 py-2.5 bg-teal-700 text-white rounded-lg text-xs font-black hover:bg-teal-800 transition disabled:opacity-50"
                                                >
                                                    Import
                                                </button>
                                            </div>
                                        </div>
                                    </section>

                                    {(vintedImportStatus || vintedImportError) && (
                                        <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${vintedImportError ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                                            {vintedImportError || vintedImportStatus}
                                        </div>
                                    )}

                                    <section>
                                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-stone-500">Preview προϊόντων</h3>
                                            <span className="text-xs font-black text-stone-500">{vintedImportItems.length} προϊόντα</span>
                                        </div>

                                        {vintedImportItems.length === 0 ? (
                                            <div className="border border-dashed border-stone-200 rounded-xl p-8 text-center text-sm font-bold text-stone-400">
                                                Δεν έχεις τραβήξει ακόμα προϊόντα από Vinted links.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {vintedImportItems.map((item, index) => {
                                                    const mediaList = item.mediaList || [];
                                                    return (
                                                        <article key={`${item.sourceId || item.name}-${index}`} className="border border-stone-200 rounded-xl p-3 md:p-4 bg-white">
                                                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                                                                <div className="grid grid-cols-4 gap-2 md:w-56 shrink-0">
                                                                    {mediaList.map((media, mediaIndex) => (
                                                                        <div key={`${media.url}-${mediaIndex}`} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
                                                                            <button
                                                                                type="button"
                                                                                className="absolute bottom-1 left-1 z-10 w-7 h-7 rounded-full bg-white/90 text-stone-800 flex items-center justify-center shadow border border-stone-200"
                                                                                title="Άνοιγμα φωτογραφίας"
                                                                                onClick={() => {
                                                                                    const images = mediaList.filter(entry => entry.type !== 'video' && entry.url).map(entry => ({ url: previewVintedImageSrc(entry.url) }));
                                                                                    if (images.length) setVintedPreviewImage({ images, index: images.findIndex(entry => entry.url === previewVintedImageSrc(media.url)), title: item.name || 'Vinted preview' });
                                                                                }}
                                                                            >
                                                                                <IconEye />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="absolute top-1 right-1 z-10 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center"
                                                                                title="Αφαίρεση φωτογραφίας"
                                                                                onClick={() => removeVintedPreviewMedia(index, mediaIndex)}
                                                                            >
                                                                                <IconX />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="block w-full h-full"
                                                                                title="Άνοιγμα φωτογραφίας"
                                                                                onClick={() => {
                                                                                    const images = mediaList.filter(entry => entry.type !== 'video' && entry.url).map(entry => ({ url: previewVintedImageSrc(entry.url) }));
                                                                                    if (images.length) setVintedPreviewImage({ images, index: images.findIndex(entry => entry.url === previewVintedImageSrc(media.url)), title: item.name || 'Vinted preview' });
                                                                                }}
                                                                            >
                                                                                <img referrerPolicy="no-referrer" src={previewVintedImageSrc(media.url)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    {mediaList.length === 0 && (
                                                                        <div className="col-span-4 aspect-[4/1] rounded-lg border border-dashed border-amber-300 bg-amber-50 flex items-center justify-center p-2 text-center text-[11px] font-bold text-amber-900">
                                                                            Δεν βρέθηκαν εικόνες. Έλεγξε το προϊόν πριν το import.
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                                        <div className="min-w-0">
                                                                            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-1">Preview edit</p>
                                                                            <h4 className="font-black text-stone-900 truncate">{item.name || 'Χωρίς τίτλο'}</h4>
                                                                            <p className="text-xs text-stone-500 mt-1">{item.price || 0}€ τιμή Shop · {item.vintedBasePrice || 0}€ Vinted · {item.category || 'Χωρίς κατηγορία'} · {mediaList.length} εικόνες</p>
                                                                        </div>
                                                                        <button type="button" onClick={() => removeVintedPreviewItem(index)} className="p-1.5 bg-stone-100 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-stone-500 transition" title="Αφαίρεση από preview">
                                                                            <IconX />
                                                                        </button>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        <label className="block">
                                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Τίτλος</span>
                                                                            <input value={item.name || ''} onChange={e => updateVintedPreviewItem(index, { name: e.target.value })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                                        </label>
                                                                        <label className="block">
                                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Τιμή Shop</span>
                                                                            <input type="number" min="0" step="0.01" value={item.price ?? ''} onChange={e => updateVintedPreviewItem(index, { price: e.target.value, vintedPricing: item.vintedPricing ? { ...item.vintedPricing, sitePrice: normalizeVintedPrice(e.target.value), manuallyEdited: true } : null })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                                        </label>
                                                                        <label className="block">
                                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Τιμή βάσης Vinted</span>
                                                                            <input type="number" min="0" step="0.01" value={item.vintedBasePrice ?? ''} onChange={e => updateVintedPreviewItem(index, { vintedBasePrice: e.target.value })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                                        </label>
                                                                        <label className="block">
                                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Likes Vinted</span>
                                                                            <input type="number" min="0" step="1" value={item.vintedFavorites ?? 0} onChange={e => updateVintedPreviewItem(index, { vintedFavorites: Math.max(0, Number(e.target.value) || 0) })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                                        </label>
                                                                        <label className="block">
                                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Views Vinted</span>
                                                                            <input type="number" min="0" step="1" value={item.vintedViews ?? 0} onChange={e => updateVintedPreviewItem(index, { vintedViews: Math.max(0, Number(e.target.value) || 0) })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                                        </label>
                                                                        <label className="block">
                                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Κατηγορία</span>
                                                                            <select value={item.category || 'Άλλα'} onChange={e => updateVintedPreviewItem(index, { category: e.target.value })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white">
                                                                                {[...new Set([...BASE_CATEGORIES, item.category].filter(Boolean))].map(category => <option key={category} value={category}>{category}</option>)}
                                                                            </select>
                                                                        </label>
                                                                        <label className="block">
                                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Κατάσταση</span>
                                                                            <select value={item.status || 'Διαθέσιμο'} onChange={e => updateVintedPreviewItem(index, { status: e.target.value, stock: e.target.value === 'Πουλήθηκε' ? 0 : Math.max(1, Number(item.stock) || 1) })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white">
                                                                                {[...new Set([...BASE_STATUSES, item.status].filter(Boolean))].map(status => <option key={status} value={status}>{status}</option>)}
                                                                            </select>
                                                                        </label>
                                                                        <label className="block md:col-span-2">
                                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Περιγραφή</span>
                                                                            <textarea value={item.description || ''} onChange={e => updateVintedPreviewItem(index, { description: e.target.value })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white min-h-24 resize-y" />
                                                                        </label>
                                                                        <label className="block">
                                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Υλικά</span>
                                                                            <input value={(item.materials || []).join(', ')} onChange={e => updateVintedPreviewItem(index, { materials: splitVintedList(e.target.value) })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                                        </label>
                                                                        <label className="block">
                                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Χρώματα</span>
                                                                            <input value={(item.colors || []).join(', ')} onChange={e => updateVintedPreviewItem(index, { colors: splitVintedList(e.target.value) })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                                        </label>
                                                                        <label className="block">
                                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Φωτογραφίες</span>
                                                                            <span className="block text-sm text-stone-700">{mediaList.length} στην προεπισκόπηση (έως 4 μικρογραφίες εμφανίζονται ανά προϊόν)</span>
                                                                        </label>
                                                                        {item.vintedPricing && <p className="md:col-span-2 text-[11px] text-stone-500">Εκτίμηση: {item.vintedBasePrice}€ + {item.vintedPricing.buyerFixed}€ + {Number(item.vintedPricing.buyerPercent).toFixed(1)}% + {item.vintedPricing.shippingMin}€ = {Number(item.vintedPricing.estimatedTotal).toFixed(2)}€, στρογγυλοποίηση {item.vintedPricing.rounding === 'none' ? 'καμία' : 'προς τα πάνω ανά 0,50€'}.</p>}
                                                                    </div>

                                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                                        {(item.materials || []).slice(0, 5).map(material => (
                                                                            <span key={`m-${material}`} className="text-[11px] font-bold px-2 py-1 bg-stone-100 text-stone-700 rounded-full">{material}</span>
                                                                        ))}
                                                                        {(item.colors || []).slice(0, 5).map(color => (
                                                                            <span key={`c-${color}`} className="text-[11px] font-bold px-2 py-1 bg-teal-50 text-teal-800 rounded-full">{color}</span>
                                                                        ))}
                                                                    </div>

                                                                    {item.notes && (
                                                                        <p className="text-xs text-stone-500 leading-relaxed mt-3 line-clamp-2">{item.notes}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </section>
                                </div>

                                <div className="p-5 border-t border-stone-100 bg-stone-50 flex flex-col sm:flex-row justify-end gap-3">
                                    <button type="button" onClick={() => setIsVintedImportOpen(false)} className="px-6 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm font-bold hover:bg-stone-100 transition">Κλείσιμο</button>
                                    <button type="button" onClick={handleImportVintedItems} disabled={isVintedImportWorking || !vintedImportItems.length} className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-black hover:bg-stone-800 transition disabled:opacity-50">
                                        {isVintedImportWorking ? 'Δουλεύει...' : 'Import στο Back Office'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {vintedPreviewImage && (
                        <ImageLightbox images={vintedPreviewImage.images} index={vintedPreviewImage.index} title={vintedPreviewImage.title}
                            onIndexChange={index => setVintedPreviewImage(previous => previous && ({ ...previous, index }))}
                            onClose={() => setVintedPreviewImage(null)} />
                    )}

                    {isHistoryOpen && (
                        <div onClick={(e) => { if (e.target === e.currentTarget) setIsHistoryOpen(false); }} className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 cursor-pointer overflow-y-auto">
                            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden border border-stone-200 cursor-default animate-fade-in">
                                <div className="p-5 border-b border-stone-100 bg-amber-50 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-black text-stone-800">Ιστορικό εκδόσεων</h2>
                                        <p className="text-xs font-bold text-stone-500">Τελευταίες {versionHistory.length} αλλαγές. Οι νέες καταγραφές αποθηκεύονται ιδιωτικά στο cloud· το παλαιότερο τοπικό ιστορικό παραμένει σε αυτόν τον browser.</p>
                                    </div>
                                    <button onClick={() => setIsHistoryOpen(false)} className="text-stone-500 hover:text-stone-900 bg-white p-1 rounded-lg border border-stone-200"><IconX /></button>
                                </div>
                                <div className="max-h-[60vh] overflow-y-auto p-5 space-y-3">
                                    <CatalogBackups />
                        {historySaveError && <p role="alert" className="p-3 text-sm text-rose-700">{historySaveError}</p>}
                        {versionHistory.length === 0 && (
                                        <div className="text-center p-10 text-stone-400 font-bold border border-dashed border-stone-200 rounded-xl">Δεν υπάρχει ακόμη ιστορικό εκδόσεων.</div>
                                    )}
                                    {versionHistory.map((entry, idx) => (
                                        <div key={`${entry.timestamp}-${entry.id}-${idx}`} className="border border-stone-200 rounded-xl p-4 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{entry.type}</span>
                                                    <span className="text-xs text-stone-400">{new Date(entry.timestamp).toLocaleString('el-GR')}</span>
                                                </div>
                                                <p className="font-black text-stone-800">{entry.name || 'Προϊόν'}</p>
                                                <p className="text-xs text-stone-500">{entry.message || 'Αλλαγή έκδοσης'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleRestoreHistoryEntry(entry)} disabled={!canRestoreHistoryEntry(entry)} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 transition disabled:opacity-40 disabled:cursor-not-allowed">
                                                        Επαναφορά
                                                    </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-5 border-t border-stone-100 bg-stone-50 flex justify-between gap-3">
                                    <button onClick={() => { if (window.confirm('Να καθαριστεί μόνο το τοπικό ιστορικό; Οι εγγραφές cloud διατηρούνται.')) { setVersionHistory(previous => previous.filter(entry => entry.cloudId)); localStorage.removeItem('aram_version_history'); } }} className="px-4 py-2 bg-white border border-stone-200 text-stone-500 rounded-lg text-xs font-bold hover:bg-stone-100 transition">Καθαρισμός τοπικού ιστορικού</button>
                                    <button onClick={() => setIsHistoryOpen(false)} className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-bold hover:bg-stone-800 transition">Κλείσιμο</button>
                                </div>
                            </div>
                        </div>
                    )}


                    {showUndoToast && lastAction && (
                        <div className="fixed bottom-4 right-4 bg-stone-900 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-fade-in border border-stone-700">
                            <span className="text-sm font-medium">{lastAction.message}</span>
                            <button onClick={handleUndo} className="text-emerald-400 font-bold text-sm hover:underline flex items-center gap-1"><IconUndo /> Αναίρεση</button>
                            <button onClick={() => setShowUndoToast(false)} className="text-stone-400 hover:text-white ml-2"><IconX /></button>
                        </div>
                    )}
                    {showRedoToast && redoAction && (
                        <div className="fixed bottom-4 right-4 bg-white text-stone-800 px-5 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-fade-in border border-stone-200">
                            <span className="text-sm font-medium">Η ενέργεια αναιρέθηκε.</span>
                            <button onClick={handleRedo} className="text-stone-900 font-bold text-sm hover:underline">Επαναφορά</button>
                            <button onClick={() => setShowRedoToast(false)} className="text-stone-400 hover:text-stone-800 ml-2"><IconX /></button>
                        </div>
                    )}
                </div>
            );
        }
