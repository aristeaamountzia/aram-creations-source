// @ts-nocheck
import { ImageLightbox } from './ImageLightbox';
import { CatalogControls } from './CatalogControls';
import { PortfolioDesignSettings } from './PortfolioDesignSettings';
import { DEFAULT_PORTFOLIO_DESIGN, normalizePortfolioDesign, validatePortfolioDesign } from '../lib/portfolio-settings';
import { PortfolioHero, portfolioHeroVideoUrl } from './PortfolioHero';
import React, { useState, useMemo, useEffect, useRef } from "react";
import { persistHistory, loadHistory, restoreHistory } from '../lib/catalog-history';
import { CatalogBackups } from './CatalogBackups';
import { CatalogExcelExport } from './CatalogExcelExport';
import { OrdersManager } from './OrdersManager';
import { VintedRefresh } from './VintedRefresh';
import { MediaDownload } from './MediaDownload';
import { VideoUploadStatus } from './VideoUploadStatus';
import { prepareVideoUpload } from '../lib/video-compression';
import { VIDEO_UPLOAD_HELP } from '../lib/video-policy';
import { editableBlob } from '../lib/media-files';
import { vintedSourceUrl } from '../lib/vinted-refresh';
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
            primaryColor: '#1c1917',
            bgColor: '#fafafa',
            textColor: '#1c1917',
            heroBgColor: '#1c1917',
            heroTitleColor: '#ffffff',
            heroSubtitleColor: '#a8a29e',
            heroTitleSize: 'text-3xl md:text-4xl',
            borderRadius: '0.75rem',
            heroTitle: 'Χειροποίητες Δημιουργίες',
            heroSubtitle: 'Μοναδικές δημιουργίες από μια μεγάλη γκάμα υλικών και τεχνικών. Κάθε κομμάτι είναι φτιαγμένο στο χέρι με αγάπη.',
            heroVideoUrl: '',
            portfolioHeroVideoUrl: '',
            portfolioDesign: DEFAULT_PORTFOLIO_DESIGN,
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
            // Canvas converts animated GIFs into one still frame. Keep GIFs intact.
            if (file?.type === 'image/gif') {
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
                    img.onerror = () => reject(new Error('Δεν άνοιξε η εικόνα. Επίλεξε JPG, PNG, WebP ή GIF.'));
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

            return new Promise((resolve) => {
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
                        resolve(blob);
                    }
                };
                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    resolve(blob);
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
            const prepareLocalVideo = async (file) => {
                const controller = new AbortController();
                videoAbort.current = controller;
                setVideoCompressing(true);
                try { return await prepareVideoUpload(file, setVideoProgress, controller.signal); }
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
            const [activeSettingsTab, setActiveSettingsTab] = useState('fields');
            const [draggedCategoryIdx, setDraggedCategoryIdx] = useState(null);
            const [smartSuggestions, setSmartSuggestions] = useState(null);
            const [selectedItemIds, setSelectedItemIds] = useState([]);
            const [isBulkOpen, setIsBulkOpen] = useState(false);
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
            const [draggedShopIdx, setDraggedShopIdx] = useState(null);
            const [draggedPrivateIdx, setDraggedPrivateIdx] = useState(null);

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
                            aiAssistant: { ...prev.aiAssistant, ...(data.aiAssistant || {}) }
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
                try {
                    const settingsRef = doc(db, "settings", "shop");
                    if (shopSettings.portfolioHeroVideoUrl.trim() && !portfolioHeroVideoUrl(shopSettings.portfolioHeroVideoUrl)) throw new Error('Βάλε έγκυρο σύνδεσμο http ή https για το βίντεο Portfolio.');
                    validatePortfolioDesign(normalizePortfolioDesign(shopSettings.portfolioDesign));
                    const beforeSettings = (await getDoc(settingsRef)).data() || {};
                    const savedSettings = { ...shopSettings, customFields: { customCategories, customCollections, customStatuses, customMaterials, customPlatforms, customColors, statusOptionOrder, collectionOptionOrder, platformOptionOrder, colorOptionOrder, materialOptionOrder, hiddenCategoryOptions, hiddenStatusOptions, hiddenCollectionOptions, hiddenPlatformOptions, hiddenColorOptions, hiddenMaterialOptions } };
                    await setDoc(settingsRef, savedSettings, { merge: true });
                    pushVersionHistory({
                        type: 'SETTINGS_UPDATE',
                        id: 'settings/shop',
                        name: 'Ρυθμίσεις shop',
                        message: 'Αποθηκεύτηκαν οι ρυθμίσεις shop.',
                        collection: 'settings',
                        before: beforeSettings,
                        after: { ...beforeSettings, ...savedSettings }
                    });
                    alert("Οι ρυθμίσεις αποθηκεύτηκαν! Το Shop και το Portfolio ενημερώθηκαν σε πραγματικό χρόνο.");
                } catch (err) {
                    alert("Σφάλμα κατά την αποθήκευση των ρυθμίσεων: " + err.message);
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
                    const prepared = await prepareLocalVideo(file);
                    setStatus('Ανέβασμα συμπιεσμένου βίντεο...');
                    const safeName = prepared.name.replace(/[^a-zA-Z0-9._-]/g, '') || 'hero-video.mp4';
                    const fileRef = firebaseRef(storage, `jewelry/hero/${section}/${Date.now()}-${safeName}`);
                    const task = uploadBytesResumable(fileRef, prepared, { contentType: prepared.type });
                    await new Promise((resolve, reject) => task.on('state_changed', null, reject, resolve));
                    const url = await getDownloadURL(task.snapshot.ref);
                    setShopSettings(prev => ({ ...prev, [isPortfolioHero ? 'portfolioHeroVideoUrl' : 'heroVideoUrl']: url }));
                    setStatus(`Το βίντεο ανέβηκε. Πάτησε Αποθήκευση ρυθμίσεων για να εμφανιστεί στο ${isPortfolioHero ? 'Portfolio' : 'Shop'}.`);
                } catch (error) {
                    setStatus(`Αποτυχία ανεβάσματος: ${error.message}`);
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
                    aiAssistant: { ...base.aiAssistant, ...(shopSettings.aiAssistant || {}) }
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
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
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

            const handleFileSelectShop = async (e) => {
                if (mediaPreparing) return;
                setMediaPreparing(true); setVideoProgress(null);
                const files = Array.from(e.target.files);
                const input = e.target;
                const newMedia = [];
                const errors = [];
                let smartCandidate = null;
                setUploadStatus('Επεξεργασία και συμπίεση αρχείων...');
                try {
                for (const file of files) {
                    try {
                    if (file.type.startsWith('image/')) {
                        const compressedFile = await compressImage(file);
                        const previewUrl = URL.createObjectURL(compressedFile);
                        if (!isEditMode && formShopMediaList.length === 0 && newMedia.length === 0) {
                            smartCandidate = { url: previewUrl, fileName: file.name };
                        }
                        newMedia.push({ url: previewUrl, type: 'image', isNew: true, fileObj: compressedFile, showInShop: true });
                    } else if (file.type.startsWith('video/')) {
                            const prepared = await prepareLocalVideo(file);
                            newMedia.push({ url: URL.createObjectURL(prepared), type: 'video', isNew: true, fileObj: prepared, showInShop: true });
                    }
                    } catch (error) { errors.push(`${file.name}: ${error.message}`); if (error.name === 'AbortError') break; }
                }
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
                } catch (error) { errors.push(error.message); }
                finally {
                    if (errors.length) setVideoProgress({ text: errors.join('\n') });
                    setUploadStatus(''); input.value = ''; setMediaPreparing(false);
                }
            };

            const handleRemoveShopMedia = (idx) => {
                if (formShopMediaList[idx].isNew) URL.revokeObjectURL(formShopMediaList[idx].url);
                const nextList = formShopMediaList.filter((_, i) => i !== idx);
                setFormShopMediaList(nextList);
                if (idx === 0) refreshSmartSuggestionsFromMain(nextList);
            };

            const handleDragStartShop = (e, idx) => { setDraggedShopIdx(idx); e.dataTransfer.effectAllowed = "move"; };
            const handleDropShop = (e, targetIdx) => {
                e.preventDefault();
                if (draggedShopIdx === null || draggedShopIdx === targetIdx) return;
                const newList = [...formShopMediaList];
                const itemToMove = newList[draggedShopIdx];
                newList.splice(draggedShopIdx, 1);
                newList.splice(targetIdx, 0, itemToMove);
                setFormShopMediaList(newList);
                setDraggedShopIdx(null);
                if (draggedShopIdx === 0 || targetIdx === 0) refreshSmartSuggestionsFromMain(newList);
            };

            const handleFileSelectPrivate = async (e) => {
                if (mediaPreparing) return;
                setMediaPreparing(true); setVideoProgress(null);
                const files = Array.from(e.target.files);
                const input = e.target;
                const newMedia = [];
                const errors = [];
                let smartCandidate = null;
                setUploadStatus('Επεξεργασία και συμπίεση αρχείων...');
                try {
                for (const file of files) {
                    try {
                    if (file.type.startsWith('image/')) {
                        const compressedFile = await compressImage(file);
                        const previewUrl = URL.createObjectURL(compressedFile);
                        if (!smartCandidate) smartCandidate = { url: previewUrl, fileName: file.name };
                        newMedia.push({ url: previewUrl, type: 'image', isNew: true, fileObj: compressedFile, showInShop: false });
                    } else if (file.type.startsWith('video/')) {
                            const prepared = await prepareLocalVideo(file);
                            newMedia.push({ url: URL.createObjectURL(prepared), type: 'video', isNew: true, fileObj: prepared, showInShop: false });
                    }
                    } catch (error) { errors.push(`${file.name}: ${error.message}`); if (error.name === 'AbortError') break; }
                }
                const nextPrivateMediaList = [...formPrivateMediaList, ...newMedia];
                setFormPrivateMediaList(nextPrivateMediaList);
                if (smartCandidate) {
                    setUploadStatus('Ανάλυση εικόνας back-office...');
                    await refreshSmartSuggestionsFromMain(formShopMediaList, nextPrivateMediaList);
                }
                } catch (error) { errors.push(error.message); }
                finally {
                    if (errors.length) setVideoProgress({ text: errors.join('\n') });
                    setUploadStatus(''); input.value = ''; setMediaPreparing(false);
                }
            };

            const handleRemovePrivateMedia = (idx) => {
                if (formPrivateMediaList[idx].isNew) URL.revokeObjectURL(formPrivateMediaList[idx].url);
                const nextPrivateMediaList = formPrivateMediaList.filter((_, i) => i !== idx);
                setFormPrivateMediaList(nextPrivateMediaList);
                refreshSmartSuggestionsFromMain(formShopMediaList, nextPrivateMediaList);
            };

            const handleDragStartPrivate = (e, idx) => { setDraggedPrivateIdx(idx); e.dataTransfer.effectAllowed = "move"; };
            const handleDropPrivate = (e, targetIdx) => {
                e.preventDefault();
                if (draggedPrivateIdx === null || draggedPrivateIdx === targetIdx) return;
                const newList = [...formPrivateMediaList];
                const itemToMove = newList[draggedPrivateIdx];
                newList.splice(draggedPrivateIdx, 1);
                newList.splice(targetIdx, 0, itemToMove);
                setFormPrivateMediaList(newList);
                setDraggedPrivateIdx(null);
                refreshSmartSuggestionsFromMain(formShopMediaList, newList);
            };

            const getImageEditorList = (scope) => scope === 'private' ? formPrivateMediaList : formShopMediaList;
            const imageEditorMedia = imageEditorTarget ? getImageEditorList(imageEditorTarget.scope)[imageEditorTarget.index] : null;
            const isAnimatedGifMedia = (media) => media?.fileObj?.type === 'image/gif' || /\.gif(?:$|[?#])/i.test(media?.url || '');
            const IMAGE_EDITOR_ASPECTS = {
                square: { label: '1:1', ratio: 1, width: 1400, height: 1400 },
                portrait: { label: '4:5', ratio: 4 / 5, width: 1120, height: 1400 },
                landscape: { label: '4:3', ratio: 4 / 3, width: 1400, height: 1050 }
            };

            const getImageEditorAspect = (key = imageEditorSettings.cropAspect) => IMAGE_EDITOR_ASPECTS[key] || IMAGE_EDITOR_ASPECTS.square;
            const clampImageEditorZoom = (value) => Math.max(1, Math.min(4, Number(value) || 1));

            const openImageEditor = (scope, index) => {
                const media = getImageEditorList(scope)[index];
                if (!media || media.type === 'video') return;
                if (isAnimatedGifMedia(media)) {
                    alert('Τα GIF διατηρούν την κίνησή τους. Η επεξεργασία με crop ή φίλτρα θα τα μετέτρεπε σε στατική εικόνα, γι\' αυτό δεν εφαρμόζεται.');
                    return;
                }
                setImageEditorError('');
                setImageEditorTarget({ scope, index });
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
                    const updateList = (list) => list.map((media, index) => {
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
                setFormPrice(''); setFormCost(''); setFormStock(1); setFormShopOrder(0); setFormManualLikes(0); setFormManualViews(0); setFormWeight(''); setFormDimensions(''); setFormStorage('');
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
                setFormPrice(item.price ? item.price.toString() : ''); setFormCost(item.cost ? item.cost.toString() : ''); setFormStock(item.stock || 1); setFormShopOrder(item.shopOrder || 0); setFormManualLikes(Math.max(0, Number(item.shopFavorites ?? item.likes ?? 0) || 0)); setFormManualViews(Math.max(0, Number(item.views ?? item.viewCount ?? 0) || 0));
                setFormWeight(item.weight || ''); setFormDimensions(item.dimensions || ''); setFormStorage(item.storage || '');
                setFormMaterials(item.materials || []); setFormColorsArr(item.colors || []); setFormNotes(item.notes || '');
                
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
                setFormPrice(item.price ? item.price.toString() : ''); setFormCost(item.cost ? item.cost.toString() : ''); setFormStock(item.stock || 1); setFormShopOrder(0);
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
                const csvRows = [headers.join(';')];

                jewelryList.forEach(item => {
                    const linksStr = (item.purchaseLinks || item.productLinks || []).map(l => `${l.site}: ${l.url}`).join(' | ');
                    const postedStr = (item.postedPlatforms || []).map(p => `${p.site} ${p.url ? `(${p.url})` : ''} - [${p.showInShop ? 'Ορατό' : 'Κρυφό'}]`).join(' | ');
                    const row = [
                        `"${(item.name || '').replace(/"/g, '""')}"`,
                        `"${(item.category || '').replace(/"/g, '""')}"`,
                        `"${(item.collection || '').replace(/"/g, '""')}"`,
                        `"${(item.status || '').replace(/"/g, '""')}"`,
                        item.stock || 0,
                        item.price || 0,
                        item.cost || 0,
                        `"${(item.colors || []).join(', ')}"`,
                        `"${(item.materials || []).join(', ')}"`,
                        `"${(item.storage || '').replace(/"/g, '""')}"`,
                        `"${linksStr.replace(/"/g, '""')}"`,
                        `"${postedStr.replace(/"/g, '""')}"`,
                        `"${(item.imageUrl || '').replace(/"/g, '""')}"`
                    ];
                    csvRows.push(row.join(';'));
                });

                const csvString = csvRows.join('\n');
                const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' }); 
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `katalogos_aram_creations_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
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

            const vintedPreviewKey = (item) => [
                item.sourcePlatform || '',
                item.sourceId || '',
                item.sourceUrl || '',
                item.name || '',
                item.price || ''
            ].join('|').toLowerCase();

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
                    notes: [description, condition ? `Vinted condition: ${condition}` : ''].filter(Boolean).join('\n'),
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
                const links = vintedLinksText
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(Boolean);

                if (!links.length) {
                    setVintedImportError('Βάλε πρώτα ένα ή περισσότερα Vinted links.');
                    return;
                }

                setIsVintedImportWorking(true);
                setVintedImportError('');
                const fetchedItems = [];
                const errors = [];
                const existingKeys = new Set(vintedImportItems.map(vintedPreviewKey));

                try {
                    for (let index = 0; index < links.length; index += 1) {
                        const link = links[index];
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
                            const key = vintedPreviewKey(item);
                            if (item.name && !existingKeys.has(key)) {
                                existingKeys.add(key);
                                fetchedItems.push(item);
                            } else if (!item.name) {
                                errors.push(`${link}: δεν βρέθηκε τίτλος καταχώρησης.`);
                            }
                        } catch (err) {
                            errors.push(`${link}: ${err.message || 'δεν απάντησε το Vinted importer'}.`);
                        }
                    }

                    setVintedImportItems(prev => [...prev, ...fetchedItems]);
                    const suffix = errors.length ? ` Σφάλματα: ${errors.join(' | ')}` : '';
                    setVintedImportStatus(`Βρέθηκαν ${fetchedItems.length} νέα προϊόντα. Σύνολο preview: ${vintedImportItems.length + fetchedItems.length}.${suffix}`);
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
                const blob = await compressImageBlob(sourceBlob, 1400, 0.85);
                const ext = extensionFromContentType(blob.type);
                const safeName = String(item.sourceId || item.name || 'vinted-item')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .slice(0, 60) || 'vinted-item';
                const storagePath = `jewelry/vinted-imports/${Date.now()}-${safeName}-${mediaIndex + 1}.${ext}`;
                const storageRef = firebaseRef(storage, storagePath);
                const uploadTask = uploadBytesResumable(storageRef, blob, { contentType: blob.type || 'image/jpeg' });

                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', null, reject, resolve);
                });

                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                return {
                    url: downloadUrl,
                    type: 'image',
                    showInShop: true,
                    source: 'vinted',
                    originalUrl: imageUrl
                };
            };

            const prepareVintedItemForImport = async (item, itemIndex, totalItems) => {
                const sourceMedia = item.mediaList || item.media || [];
                if (!copyVintedImages || !sourceMedia.length) {
                    return {
                        ...item,
                        mediaList: sourceMedia.map(media => ({ ...media, showInShop: media.showInShop !== false })),
                        media: sourceMedia.map(media => ({ ...media, showInShop: media.showInShop !== false })),
                        imageUrl: sourceMedia[0]?.url || item.imageUrl || ''
                    };
                }

                const uploadedMedia = [];
                const copyWarnings = [];
                for (let mediaIndex = 0; mediaIndex < sourceMedia.length; mediaIndex += 1) {
                    const media = sourceMedia[mediaIndex];
                    if (!media?.url || media.url.includes('firebasestorage.googleapis.com')) {
                        uploadedMedia.push({ ...media, showInShop: media.showInShop !== false });
                        continue;
                    }

                    setVintedImportStatus(`Αντιγράφω εικόνα ${mediaIndex + 1}/${sourceMedia.length} για προϊόν ${itemIndex + 1}/${totalItems}...`);
                    try {
                        uploadedMedia.push(await uploadVintedExternalImage(media.url, item, mediaIndex));
                    } catch (err) {
                        copyWarnings.push(`εικόνα ${mediaIndex + 1}: ${err.message}`);
                        // Keep the listing usable when Firebase Storage temporarily rejects a copy.
                        uploadedMedia.push({ ...media, showInShop: media.showInShop !== false, external: true });
                    }
                }

                return {
                    ...item,
                    imageUrl: uploadedMedia[0]?.url || item.imageUrl || '',
                    fileType: uploadedMedia[0]?.type || item.fileType || 'image',
                    mediaList: uploadedMedia,
                    media: uploadedMedia,
                    notes: [
                        item.notes || '',
                        copyWarnings.length ? `Προσοχή: Δεν αντιγράφηκαν όλες οι Vinted εικόνες στο Firebase Storage (${copyWarnings.join('; ')}).` : ''
                    ].filter(Boolean).join('\n')
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

                try {
                    for (let index = 0; index < vintedImportItems.length; index += 1) {
                        const rawItem = vintedImportItems[index];
                        if (!(Number(rawItem.price) > 0)) {
                            throw new Error(`Το προϊόν «${rawItem.name || index + 1}» δεν έχει έγκυρη τιμή. Συμπλήρωσε τιμή στην προεπισκόπηση.`);
                        }
                        if (!(rawItem.mediaList || []).length) {
                            throw new Error(`Το προϊόν «${rawItem.name || index + 1}» δεν έχει φωτογραφίες. Πρόσθεσε τουλάχιστον μία φωτογραφία ή αφαίρεσέ το από το preview.`);
                        }
                        const item = await prepareVintedItemForImport(rawItem, index, vintedImportItems.length);
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
                        pushVersionHistory({
                            type: 'ADD',
                            id: docRef.id,
                            name: itemData.name || 'Vinted προϊόν',
                            message: 'Import από Vinted',
                            before: null,
                            after: { ...itemData, id: docRef.id }
                        });
                        imported += 1;
                        setVintedImportStatus(`Import σε εξέλιξη: ${imported}/${vintedImportItems.length}`);
                    }

                    setVintedImportStatus(`Έτοιμο. Περάστηκαν ${imported} προϊόντα στο Back Office.`);
                    setVintedImportItems([]);
                    setVintedLinksText('');
                } catch (err) {
                    setVintedImportError(`Σφάλμα import μετά από ${imported} προϊόντα: ${err.message}`);
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
                        const safeName = fileObj.name.replace(/[^a-zA-Z0-9.\-_]/g, '') || 'image.jpg';
                        const uniqueName = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '_' + safeName;
                        const storageRef = firebaseRef(storage, folder + '/' + uniqueName);
                        const uploadTask = uploadBytesResumable(storageRef, fileObj);

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

                        return getDownloadURL(uploadTask.snapshot.ref);
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
                        notes: formNotes.trim(),
                        imageUrl: mainImage.url,
                        fileType: mainImage.type,
                        mediaList: finalMediaUrls,
                        updatedAt: serverTimestamp()
                    };

                    if (isEditMode && currentItem) {
                        await updateDoc(doc(db, "jewelry", currentItem.id), itemData);
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
                    setIsAddOpen(false);
                } catch (err) {
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
                                await deleteObject(fileRef).catch(err => console.log("Σφάλμα διαγραφής αρχείου:", err));
                            }
                        }
                    }
                    if (isDetailOpen && currentItem && currentItem.id === id) setIsDetailOpen(false);
                } catch (err) {
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

            const toggleSelectedItem = (id) => {
                setSelectedItemIds(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
            };

            const selectVisibleItems = () => {
                setSelectedItemIds(prev => Array.from(new Set([...prev, ...visibleItemIds])));
            };

            const clearBulkSelection = () => {
                setSelectedItemIds([]);
                setIsBulkOpen(false);
                setBulkDraft({ category: '', collection: '', shopPlacement: '', status: '', price: '', materials: [], colors: [], notes: '' });
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
                if (bulkMaterials.length) updates.materials = bulkMaterials;
                if (bulkColors.length) updates.colors = bulkColors;
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

                if (fields.length) {
                    selectedItems.forEach(item => {
                        mergeBulkUpdate(
                            item.id,
                            Object.fromEntries(fields.map(field => [field, item[field] ?? (Array.isArray(updates[field]) ? [] : '')])),
                            updates
                        );
                    });
                }
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
                    clearBulkSelection();
                } catch (err) {
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
                    clearBulkSelection();
                } catch (err) {
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
                    clearBulkSelection();
                } catch (err) {
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
                return <PortfolioManager onBack={() => setActiveCollection('jewelry')} />;
            }

            return (
                <div className="backoffice-view min-h-screen p-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-20 relative">
                    
                    <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-5 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-200">
                        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Κατάλογος">
                            <button type="button" role="tab" aria-selected={false} onClick={() => setActiveCollection('orders')} className="px-3 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-bold">Παραγγελίες</button>
                            <button type="button" role="tab" aria-selected={activeCollection === 'jewelry'} onClick={() => { setActiveCollection('jewelry'); setSelectedCategory('Όλα'); setStatsFilter('all'); }} className={activeCollection === 'jewelry' ? 'px-3 py-2 rounded-lg bg-stone-900 text-white text-sm font-bold' : 'px-3 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-bold'}>Shop</button>
                            <button type="button" role="tab" aria-selected={activeCollection === 'portfolio'} onClick={() => { setActiveCollection('portfolio'); setSelectedCategory('Όλα'); setStatsFilter('all'); }} className={activeCollection === 'portfolio' ? 'px-3 py-2 rounded-lg bg-stone-900 text-white text-sm font-bold' : 'px-3 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-bold'}>Portfolio</button>
                        </div>
                        <div className="flex flex-col gap-3 w-full lg:w-auto">
                            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-3">
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
                            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 pt-3 border-t border-stone-100">
                                <button onClick={handleUndo} disabled={!lastAction} className="flex items-center justify-center px-3 py-2 bg-stone-100 disabled:opacity-40 hover:bg-stone-200 text-stone-700 rounded-lg transition font-bold text-xs" title="Αναίρεση τελευταίας ενέργειας">
                                    <IconUndo /> <span className="ml-2">Undo</span>
                                </button>
                                <button onClick={handleRedo} disabled={!redoAction} className="flex items-center justify-center px-3 py-2 bg-stone-100 disabled:opacity-40 hover:bg-stone-200 text-stone-700 rounded-lg transition font-bold text-xs" title="Επαναφορά τελευταίας αναίρεσης">
                                    Redo
                                </button>
                                <button onClick={() => setIsHistoryOpen(true)} className="flex items-center justify-center px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition font-bold text-xs" title="Ιστορικό εκδόσεων">
                                    Ιστορικό
                                </button>
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
                            <div className="flex flex-wrap bg-stone-200/70 rounded-lg p-1 max-w-full">
                                <button onClick={() => setStatsFilter('available')} className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm ${statsFilter === 'available' ? 'bg-white text-stone-800' : 'text-stone-500 hover:text-stone-700 shadow-none'}`}>Διαθέσιμα</button>
                                <button onClick={() => setStatsFilter('unavailable')} className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm whitespace-nowrap ${statsFilter === 'unavailable' ? 'bg-white text-stone-800' : 'text-stone-500 hover:text-stone-700 shadow-none'}`}>Μη Διαθέσιμα</button>
                                <button onClick={() => setStatsFilter('sold')} className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm whitespace-nowrap ${statsFilter === 'sold' ? 'bg-white text-stone-800' : 'text-stone-500 hover:text-stone-700 shadow-none'}`}>Πωληθέντα</button>
                                <button onClick={() => setStatsFilter('all')} className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm ${statsFilter === 'all' ? 'bg-white text-stone-800' : 'text-stone-500 hover:text-stone-700 shadow-none'}`}>Συνολικά</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{statsCopy.count}</span>
                                <span className="text-2xl font-black text-stone-950">{dashboardStats.count}</span>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{statsCopy.value}</span>
                                <span className="text-2xl font-black text-stone-950">{dashboardStats.value.toFixed(2)}€</span>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{statsCopy.profit}</span>
                                <span className="text-2xl font-black text-stone-950">{dashboardStats.profit.toFixed(2)}€</span>
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {filteredAndSortedJewelry.map((item) => {
                                        const isSold = isSoldItem(item);
                                        const isBulkDragged = draggedProductId && selectedItemIds.includes(draggedProductId) && selectedItemIds.includes(item.id);
                                        return (
                                        <div 
                                            key={item.id}
                                            draggable
                                            onDragStart={(event) => handleProductDragStart(event, item)}
                                            onDragOver={(event) => handleProductDragOver(event, item)}
                                            onDrop={(event) => handleProductDrop(event, item)}
                                            onDragEnd={handleProductDragEnd}
                                            className={`bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition relative cursor-grab active:cursor-grabbing ${selectedItemIds.includes(item.id) ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'} ${dragOverProductId === item.id ? 'ring-2 ring-amber-400 border-amber-300 shadow-lg' : ''} ${draggedProductId === item.id || isBulkDragged ? 'opacity-60 scale-[0.99]' : ''} ${isSold ? 'opacity-80' : ''}`}
                                        >
                                            <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden relative">
                                                <label onClick={(e) => e.stopPropagation()} className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-lg p-1 shadow-sm cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 rounded border-stone-300" checked={selectedItemIds.includes(item.id)} onChange={() => toggleSelectedItem(item.id)} />
                                                </label>
                                                {item.imageUrl ? (
                                                    item.fileType === 'video' ? (
                                                        <video src={item.imageUrl} className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} muted loop autoPlay playsInline />
                                                    ) : (
                                                        <img src={item.imageUrl} className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} alt={item.name} />
                                                    )
                                                ) : <IconImage />}
                                                
                                                {item.mediaList && item.mediaList.length > 1 && (
                                                    <div className="absolute top-2 right-2 bg-stone-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                        🎬 {item.mediaList.length} αρχεία
                                                    </div>
                                                )}
                                                <div className="absolute bottom-2 right-2 flex gap-1 z-10">
                                                    <button onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'up'); }} disabled={isShopOrderMoveDisabled(item, 'up')} className="bg-white/90 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow" title="Πιο πάνω στο Shop">↑</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'down'); }} disabled={isShopOrderMoveDisabled(item, 'down')} className="bg-white/90 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow" title="Πιο κάτω στο Shop">↓</button>
                                                </div>
                                                <div className="absolute bottom-2 left-2 bg-white/90 text-stone-600 text-[10px] font-black px-2 py-1 rounded shadow-sm border border-stone-200">Σύρε</div>

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
                                                    <div className="flex gap-1.5">
                                                        {!isSold && (
                                                            <button onClick={(e) => handleQuickSold(e, item)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition" title="Γρήγορη Πώληση"><IconBolt /></button>
                                                        )}
                                                        <button onClick={() => handleCloneItem(item)} className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded transition" title="Αντιγραφή"><IconClone /></button>
                                                        <button onClick={() => handleViewDetails(item)} className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded transition" title="Προβολή"><IconEye /></button>
                                                        <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded transition" title="Επεξεργασία"><IconEdit /></button>
                                                        <button onClick={() => handleDeleteItem(item.id, item.mediaList, item.imageUrl)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition" title="Διαγραφή"><IconTrash /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            )}

                            {viewMode === 'list' && (
                                <div className="flex flex-col gap-3">
                                    {filteredAndSortedJewelry.map((item) => {
                                        const isSold = isSoldItem(item);
                                        const isBulkDragged = draggedProductId && selectedItemIds.includes(draggedProductId) && selectedItemIds.includes(item.id);
                                        return (
                                        <div
                                            key={item.id}
                                            draggable
                                            onDragStart={(event) => handleProductDragStart(event, item)}
                                            onDragOver={(event) => handleProductDragOver(event, item)}
                                            onDrop={(event) => handleProductDrop(event, item)}
                                            onDragEnd={handleProductDragEnd}
                                            className={`flex flex-col md:flex-row items-start md:items-center p-3 bg-white border rounded-xl shadow-sm gap-4 transition hover:bg-stone-50 cursor-grab active:cursor-grabbing ${selectedItemIds.includes(item.id) ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'} ${dragOverProductId === item.id ? 'ring-2 ring-amber-400 border-amber-300 shadow-lg' : ''} ${draggedProductId === item.id || isBulkDragged ? 'opacity-60 scale-[0.99]' : ''} ${isSold ? 'opacity-80' : ''}`}
                                        >
                                            <div className="hidden md:flex h-10 w-6 items-center justify-center text-stone-300 font-black select-none">::</div>
                                            <label onClick={(e) => e.stopPropagation()} className="flex items-center justify-center p-2 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 rounded border-stone-300" checked={selectedItemIds.includes(item.id)} onChange={() => toggleSelectedItem(item.id)} />
                                            </label>
                                            <div className="w-16 h-16 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-200 relative">
                                                {item.imageUrl ? (
                                                    item.fileType === 'video' ? (
                                                        <video src={item.imageUrl} className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} muted />
                                                    ) : (
                                                        <img src={item.imageUrl} className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} alt={item.name} />
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
                                                {item.storage && <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200">📦 {item.storage}</span>}
                                            </div>
                                            <div className={`font-bold md:w-20 md:text-right ${isSold ? 'text-stone-400' : 'text-stone-900'}`}>
                                                {item.price ? `${item.price}€` : '-'}
                                            </div>
                                            <div className="flex gap-1 mt-3 md:mt-0 w-full md:w-auto justify-end border-t border-stone-100 md:border-none pt-3 md:pt-0">
                                                <button onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'up'); }} disabled={isShopOrderMoveDisabled(item, 'up')} className="p-2 text-amber-700 disabled:text-stone-300 hover:bg-amber-50 rounded-lg transition" title="Πιο πάνω στο Shop">↑</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'down'); }} disabled={isShopOrderMoveDisabled(item, 'down')} className="p-2 text-amber-700 disabled:text-stone-300 hover:bg-amber-50 rounded-lg transition" title="Πιο κάτω στο Shop">↓</button>
                                                {!isSold && (
                                                    <button onClick={(e) => handleQuickSold(e, item)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Γρήγορη Πώληση"><IconBolt /></button>
                                                )}
                                                <button onClick={() => handleCloneItem(item)} className="p-2 text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Αντιγραφή"><IconClone /></button>
                                                <button onClick={() => handleViewDetails(item)} className="p-2 text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Προβολή"><IconEye /></button>
                                                <button onClick={() => handleOpenEdit(item)} className="p-2 text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Επεξεργασία"><IconEdit /></button>
                                                <button onClick={() => handleDeleteItem(item.id, item.mediaList, item.imageUrl)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Διαγραφή"><IconTrash /></button>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            )}
                        </>
                    )}

                    {isBulkOpen && (
                        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
                                <div className="p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-black text-stone-800">Μαζική επεξεργασία</h2>
                                        <p className="text-xs font-bold text-stone-400">{selectedItems.length} προϊόντα επιλεγμένα</p>
                                    </div>
                                    <button onClick={() => setIsBulkOpen(false)} className="text-stone-400 hover:text-stone-800 bg-white p-1 rounded-lg border border-stone-200"><IconX /></button>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <div className="md:col-span-2 border border-amber-100 bg-amber-50/60 rounded-xl p-4">
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
                                        <label className="block text-xs font-bold text-stone-600 mb-1">Κατάσταση</label>
                                        <select className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none" value={bulkDraft.status} onChange={e => setBulkDraft({...bulkDraft, status: e.target.value})}>
                                            <option value="">Καμία αλλαγή</option>
                                            {allFormStatuses.map(stat => <option key={stat} value={stat}>{stat}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-600 mb-1">Τιμή</label>
                                        <input type="number" min="0" step="any" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none" value={bulkDraft.price} onChange={e => setBulkDraft({...bulkDraft, price: e.target.value})} placeholder="Καμία αλλαγή" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <label className="block text-xs font-bold text-indigo-700">Χρώματα</label>
                                            {bulkColors.length > 0 && (
                                                <button type="button" onClick={() => clearBulkTags('colors')} className="text-[11px] font-bold text-stone-500 hover:text-stone-900">Καθαρισμός</button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl max-h-32 overflow-auto">
                                            {allAvailableColors.map(col => {
                                                const isSelected = bulkColors.includes(col);
                                                return (
                                                    <button key={col} type="button" onClick={() => toggleBulkTag('colors', col)} className={`text-[11px] px-2.5 py-1 rounded-md border font-bold transition ${isSelected ? 'bg-indigo-700 border-indigo-700 text-white shadow-sm' : 'bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-100'}`}>
                                                        {isSelected ? '✓ ' : '+ '}{col}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <label className="block text-xs font-bold text-stone-700">Υλικά</label>
                                            {bulkMaterials.length > 0 && (
                                                <button type="button" onClick={() => clearBulkTags('materials')} className="text-[11px] font-bold text-stone-500 hover:text-stone-900">Καθαρισμός</button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 p-3 bg-stone-50 border border-stone-100 rounded-xl max-h-32 overflow-auto">
                                            {allAvailableMaterials.map(mat => {
                                                const isSelected = bulkMaterials.includes(mat);
                                                return (
                                                    <button key={mat} type="button" onClick={() => toggleBulkTag('materials', mat)} className={`text-[11px] px-2.5 py-1 rounded-md border font-bold transition ${isSelected ? 'bg-stone-900 border-stone-900 text-white shadow-sm' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'}`}>
                                                        {isSelected ? '✓ ' : '+ '}{mat}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-600 mb-1">Σχόλια / σημειώσεις</label>
                                        <textarea className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none h-20 resize-none" value={bulkDraft.notes} onChange={e => setBulkDraft({...bulkDraft, notes: e.target.value})} placeholder="Καμία αλλαγή"></textarea>
                                    </div>
                                </div>
                                <div className="p-5 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
                                    <button onClick={() => setIsBulkOpen(false)} className="px-6 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm font-bold hover:bg-stone-100 transition">Κλείσιμο</button>
                                    <button onClick={handleBulkUpdate} className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-bold hover:bg-stone-800 transition shadow-md">Εφαρμογή</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isAddOpen && (
                        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-2 sm:p-4 z-50">
                            
                            {isSaving && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-6 rounded-2xl">
                                    <div className="w-full max-w-sm text-center">
                                        <div className="text-4xl mb-4 animate-bounce">☁️</div>
                                        <h3 className="font-bold text-stone-800 mb-4">{uploadStatus || 'Προετοιμασία...'}</h3>
                                        <div className="w-full bg-stone-200 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                                            <div className="bg-emerald-500 h-3 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                        <p className="text-xl font-black text-emerald-600">{Math.round(uploadProgress)}%</p>
                                        <p className="text-xs text-stone-500 mt-6 font-medium">Παρακαλώ μην κλείσετε το παράθυρο, ο συγχρονισμός είναι σε εξέλιξη...</p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl relative">
                                <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50 rounded-t-2xl">
                                    <div>
                                        <h2 className="text-xl font-bold text-stone-800">
                                            {isEditMode ? 'Επεξεργασία προϊόντος' : 'Νέα καταχώρηση'}
                                        </h2>
                                        <p className="text-xs font-bold text-stone-400">{isEditMode ? 'Επεξεργασία υπάρχουσας καταχώρησης' : 'Νέα καταχώρηση καταλόγου'}</p>
                                    </div>
                                    <button type="button" disabled={mediaPreparing || isSaving} onClick={() => setIsAddOpen(false)} className="text-stone-400 hover:text-stone-800 bg-white p-1 rounded-lg border border-stone-200"><IconX /></button>
                                </div>
                                <div className="px-5 py-3 border-b border-stone-100 bg-white flex gap-2 overflow-x-auto">
                                    {[
                                        ['form-basic', 'Βασικά'],
                                        ['form-pricing', 'Τιμές'],
                                        ['form-tags', 'Χρώματα / Υλικά'],
                                        ['form-links', 'Links'],
                                        ['form-shop-media', 'Εικόνες Shop'],
                                        ['form-private-media', 'Αρχείο'],
                                        ['form-ai', 'AI']
                                    ].map(([id, label]) => (
                                        <button key={id} type="button" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="px-3.5 py-2 text-xs font-black bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg whitespace-nowrap transition border border-stone-200/70">
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                
                                {videoProgress && <div className="px-5 py-2"><VideoUploadStatus value={videoProgress} busy={videoCompressing} onCancel={() => videoAbort.current?.abort()} /></div>}
                                <div className="overflow-y-auto p-6">
                                    <form id="jewelry-form" onSubmit={handleSaveItem} className="flex flex-col gap-8">
                                        <section id="form-ai" className="order-last scroll-mt-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm">
                                            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-violet-100 pb-3 mb-4">
                                                        <div>
                                                            <h3 className="text-sm font-black text-violet-700 uppercase tracking-wider">AI Studio Back-office</h3>
                                                            <p className="text-xs text-violet-700/70 font-medium">Δημιουργεί τίτλους, περιγραφές, χρώματα, υλικά, tags και captions από τα στοιχεία της φόρμας.</p>
                                                        </div>
                                                        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${getBackofficeAiEndpoint() ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {getBackofficeAiEndpoint() ? 'Endpoint ορισμένο' : 'Λείπει endpoint'}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3 mb-3">
                                                        <textarea
                                                            className="w-full border border-violet-200 rounded-lg px-4 py-3 h-24 bg-white focus:bg-white outline-none resize-none text-sm"
                                                            value={aiProductPrompt}
                                                            onChange={e => setAiProductPrompt(e.target.value)}
                                                            placeholder="Προαιρετική οδηγία: π.χ. πιο minimal ύφος, ιδέα για δώρο, περιγραφή για Instagram, πιο luxury τόνος..."
                                                        />
                                                        <div className="space-y-2">
                                                            <div className="relative">
                                                                <input
                                                                    type={showAiAccessCode ? 'text' : 'password'}
                                                                    className="w-full border border-violet-200 rounded-lg pl-3 pr-10 py-2 bg-white outline-none text-sm"
                                                                    value={aiAccessCode}
                                                                    onChange={e => handleAiAccessCodeChange(e.target.value)}
                                                                    placeholder="AI access code"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowAiAccessCode(prev => !prev)}
                                                                    className="absolute inset-y-0 right-0 px-3 text-violet-700/70 hover:text-violet-900"
                                                                    title={showAiAccessCode ? 'Κρύψε τον κωδικό' : 'Δείξε τον κωδικό'}
                                                                    aria-label={showAiAccessCode ? 'Κρύψε τον κωδικό AI' : 'Δείξε τον κωδικό AI'}
                                                                >
                                                                    <IconEye />
                                                                </button>
                                                            </div>
                                                            <p className="text-[10px] leading-relaxed text-violet-700/70">Ο κωδικός μένει σε αυτό το browser session και δεν γράφεται στο HTML ή στο Firebase.</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <button type="button" onClick={() => handleBackofficeAiGenerate('full')} disabled={isAiProductWorking} className="px-4 py-2 bg-violet-700 text-white rounded-lg text-xs font-bold hover:bg-violet-800 disabled:opacity-50 transition">Πλήρης πρόταση</button>
                                                        <button type="button" onClick={() => handleBackofficeAiGenerate('title')} disabled={isAiProductWorking} className="px-4 py-2 bg-white border border-violet-200 text-violet-800 rounded-lg text-xs font-bold hover:bg-violet-100 disabled:opacity-50 transition">Τίτλος</button>
                                                        <button type="button" onClick={() => handleBackofficeAiGenerate('description')} disabled={isAiProductWorking} className="px-4 py-2 bg-white border border-violet-200 text-violet-800 rounded-lg text-xs font-bold hover:bg-violet-100 disabled:opacity-50 transition">Περιγραφή</button>
                                                        <button type="button" onClick={() => handleBackofficeAiGenerate('tags')} disabled={isAiProductWorking} className="px-4 py-2 bg-white border border-violet-200 text-violet-800 rounded-lg text-xs font-bold hover:bg-violet-100 disabled:opacity-50 transition">Χρώματα / Υλικά</button>
                                                        {isAiProductWorking && <span className="text-xs font-bold text-violet-700 px-2 py-2">Το AI γράφει...</span>}
                                                    </div>

                                                    {aiProductError && (
                                                        <div className="mt-3 border border-rose-200 bg-rose-50 text-rose-700 rounded-lg p-3 text-xs font-bold">
                                                            {aiProductError}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="lg:w-80 bg-white border border-violet-100 rounded-xl p-3 min-h-[160px]">
                                                    <div className="flex items-center justify-between gap-2 mb-3">
                                                        <h4 className="text-xs font-black text-violet-700 uppercase tracking-wider">Πρόταση AI</h4>
                                                        {aiProductDraft && (
                                                            <div className="flex gap-1">
                                                                <button type="button" onClick={() => applyAiProductDraft(true)} className="px-2 py-1 bg-violet-50 text-violet-700 border border-violet-100 rounded text-[10px] font-bold">Κενά</button>
                                                                <button type="button" onClick={() => applyAiProductDraft(false)} className="px-2 py-1 bg-violet-700 text-white rounded text-[10px] font-bold">Εφαρμογή</button>
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
                                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">➕ Προσθήκη Νέας...</option>
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
                                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">➕ Προσθήκη Νέας...</option>
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
                                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">➕ Προσθήκη Νέας...</option>
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
                                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">➕ Άλλη Πλατφόρμα...</option>
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
                                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">➕ Άλλη Πλατφόρμα...</option>
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
                                                            {platObj.showInShop ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded ml-1" title="Θα φαίνεται στο Shop">👀 Ορατό</span> : <span className="text-[10px] bg-stone-200 text-stone-500 px-1 rounded ml-1" title="Κρυφό από το Shop">🔒 Κρυφό</span>}
                                                            <button type="button" onClick={() => setFormPostedPlatforms(formPostedPlatforms.filter((_, i) => i !== idx))} className="text-red-500 ml-1"><IconX /></button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </section>

                                        <section id="form-shop-media" className="scroll-mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/55 p-4 shadow-sm">
                                            <h3 className="text-sm font-black text-emerald-500 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Εικονες / Βιντεο (Βιτρινα Shop)</h3>
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-stone-600 mb-1">Αυτά τα αρχεία θα φαίνονται στον πελάτη (Οι εικόνες και τα βίντεο συμπιέζονται αυτόματα. Αρχικό βίντεο έως 1 GB / 10 λεπτά, τελικό έως 30 MB).</label>
                                                <input type="file" accept="image/*,video/*" multiple disabled={mediaPreparing || isSaving} className="w-full border border-emerald-300 rounded-lg px-4 py-2.5 bg-white cursor-pointer" onChange={handleFileSelectShop} />
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
                                                
                                                {formShopMediaList.length > 0 && (
                                                    <div className="mt-4">
                                                        <p className="text-xs text-stone-500 mb-2 italic">Σύρετε ή επιλέξτε εικόνα ή βίντεο για κεντρικό αρχείο προϊόντος. Το πρώτο αρχείο θα είναι το κεντρικό στο Shop.</p>
                                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                            {formShopMediaList.map((media, idx) => (
                                                                <div 
                                                                    key={idx} 
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStartShop(e, idx)}
                                                                    onDragOver={handleDragOver}
                                                                    onDrop={(e) => handleDropShop(e, idx)}
                                                                    className={`relative aspect-square border-2 ${idx === 0 ? 'border-emerald-500 shadow-md' : 'border-stone-200'} bg-stone-100 rounded-xl overflow-hidden group cursor-grab active:cursor-grabbing hover:opacity-90 transition`}
                                                                >
                                                                    {media.type === 'video' ? (
                                                                        <video src={media.url} className="w-full h-full object-cover pointer-events-none" muted />
                                                                    ) : (
                                                                        <img src={media.url} className="w-full h-full object-cover pointer-events-none" />
                                                                    )}
                                                                    
                                                                    <MediaDownload media={media} name={formName || 'aram-media'} className="absolute bottom-1 right-1 z-10" />
                                                                    {media.type !== 'video' && !isAnimatedGifMedia(media) && (
                                                                        <button type="button" onClick={(e) => { e.stopPropagation(); openImageEditor('shop', idx); }} className="absolute top-1 left-1 bg-white/90 hover:bg-white text-stone-800 rounded-full p-1 transition shadow cursor-pointer border border-stone-200" title="Επεξεργασία εικόνας">
                                                                            <IconEdit />
                                                                        </button>
                                                                    )}
                                                                    {canRestoreMediaOriginal(media) && (
                                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleRestoreEditedMedia('shop', idx); }} className="absolute top-9 left-1 bg-amber-100/95 hover:bg-amber-200 text-amber-900 rounded-full p-1 transition shadow cursor-pointer border border-amber-200" title="Επαναφορά αρχικής εικόνας">
                                                                            <IconUndo />
                                                                        </button>
                                                                    )}
                                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveShopMedia(idx); }} className="absolute top-1 right-1 bg-stone-900/80 hover:bg-rose-600 text-white rounded-full p-1 transition shadow cursor-pointer">
                                                                        <IconX />
                                                                    </button>
                                                                     {idx > 0 && <button type="button" onClick={(e) => { e.stopPropagation(); setFormShopMediaList(prev => { const next = [...prev]; const [chosen] = next.splice(idx, 1); next.unshift(chosen); return next; }); }} className="absolute bottom-1 left-1 bg-white/95 text-stone-900 text-[9px] font-bold px-2 py-1 rounded shadow">Ορισμός ως κεντρική</button>}
                                                                    {media.edited && (
                                                                        <span className="absolute top-1 right-9 text-[8px] bg-amber-100 text-amber-900 font-black px-1.5 py-0.5 rounded shadow border border-amber-200">Edited</span>
                                                                    )}
                                                                    {idx === 0 && (
                                                                        <span className="absolute bottom-1 left-1 text-[8px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded shadow">Κεντρική Shop</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </section>

                                        <section id="form-private-media" className="mt-6 scroll-mt-4 rounded-2xl border border-stone-300 bg-stone-100/70 p-4">
                                            <h3 className="text-sm font-black text-stone-500 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Αρχειο (Μονο για το Back-Office)</h3>
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-stone-600 mb-1">Προσωπικές φωτογραφίες και βίντεο που μένουν κρυφά</label>
                                                <p className="mb-2 text-xs text-stone-500">{VIDEO_UPLOAD_HELP}</p>
                                                <input type="file" accept="image/*,video/*" multiple disabled={mediaPreparing || isSaving} className="w-full border border-stone-300 rounded-lg px-4 py-2.5 bg-white cursor-pointer" onChange={handleFileSelectPrivate} />
                                                
                                                {formPrivateMediaList.length > 0 && (
                                                    <div className="mt-4">
                                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                            {formPrivateMediaList.map((media, idx) => (
                                                                <div 
                                                                    key={idx} 
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStartPrivate(e, idx)}
                                                                    onDragOver={handleDragOver}
                                                                    onDrop={(e) => handleDropPrivate(e, idx)}
                                                                    className="relative aspect-square border-2 border-stone-300 bg-stone-200 rounded-xl overflow-hidden group cursor-grab active:cursor-grabbing hover:opacity-90 transition opacity-80"
                                                                >
                                                                    {media.type === 'video' ? (
                                                                        <video src={media.url} className="w-full h-full object-cover pointer-events-none grayscale" muted />
                                                                    ) : (
                                                                        <img src={media.url} className="w-full h-full object-cover pointer-events-none grayscale" />
                                                                    )}
                                                                    
                                                                    <div className="absolute top-1 left-1 bg-stone-800 text-white text-[9px] px-1 rounded shadow-sm">🔒 Κρυφό</div>

                                                                    <MediaDownload media={media} name={formName || 'aram-private-media'} className="absolute top-8 right-1 z-10" />
                                                                    {media.type !== 'video' && !isAnimatedGifMedia(media) && (
                                                                        <button type="button" onClick={(e) => { e.stopPropagation(); openImageEditor('private', idx); }} className="absolute bottom-1 left-1 bg-white/90 hover:bg-white text-stone-800 rounded-full p-1 transition shadow cursor-pointer border border-stone-200" title="Επεξεργασία εικόνας">
                                                                            <IconEdit />
                                                                        </button>
                                                                    )}
                                                                    {canRestoreMediaOriginal(media) && (
                                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleRestoreEditedMedia('private', idx); }} className="absolute bottom-1 right-9 bg-amber-100/95 hover:bg-amber-200 text-amber-900 rounded-full p-1 transition shadow cursor-pointer border border-amber-200" title="Επαναφορά αρχικής εικόνας">
                                                                            <IconUndo />
                                                                        </button>
                                                                    )}
                                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleRemovePrivateMedia(idx); }} className="absolute top-1 right-1 bg-stone-900/80 hover:bg-rose-600 text-white rounded-full p-1 transition shadow cursor-pointer">
                                                                        <IconX />
                                                                    </button>
                                                                    {media.edited && (
                                                                        <span className="absolute top-1 right-9 text-[8px] bg-amber-100 text-amber-900 font-black px-1.5 py-0.5 rounded shadow border border-amber-200">Edited</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-stone-600 mb-1">Περιγραφή / σημειώσεις προϊόντος</label>
                                                <textarea className="w-full border border-stone-200 rounded-lg px-4 py-3 h-24 bg-white focus:bg-white outline-none resize-none" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Περιγραφή που μπορείς να επεξεργαστείς πριν εμφανιστεί στο shop..."></textarea>
                                            </div>
                                        </section>

                                    </form>
                                </div>
                                <div className="p-5 border-t border-stone-100 bg-white rounded-b-2xl flex justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                                    <button type="button" onClick={() => setIsAddOpen(false)} className="px-6 py-2.5 bg-stone-100 text-stone-700 rounded-lg font-bold hover:bg-stone-200 transition" disabled={isSaving || mediaPreparing}>Ακύρωση</button>
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
                                                draggable={false}
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
                        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
                                
                                <div className="w-full md:w-1/2 p-3 md:p-4 bg-stone-50 border-r border-stone-100 flex flex-col justify-center relative">
                                    <div className="aspect-[4/5] md:aspect-square w-full rounded-xl overflow-hidden bg-white flex items-center justify-center relative shadow-inner border border-stone-100">
                                        {(() => {
                                            const currentMediaArray = currentItem.mediaList || (currentItem.imageUrl ? [{ url: currentItem.imageUrl, type: currentItem.fileType || 'image', showInShop: true }] : []);
                                            const activeMedia = currentMediaArray[activeDetailMediaIdx] || currentMediaArray[0];
                                            
                                            if (!activeMedia) return <IconImage />;
                                            return (
                                                <>
                                                    {activeMedia.type === 'video' ? (
                                                        <video src={activeMedia.url} key={activeMedia.url} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                                                    ) : (
                                                        <img src={activeMedia.url} key={activeMedia.url} className="w-full h-full object-cover" alt={currentItem.name} />
                                                    )}
                                                    {activeMedia.showInShop === false && (
                                                        <div className="absolute top-2 right-2 bg-stone-800 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-lg">
                                                            🔒 Κρυφό
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
                                                            <div className="w-full h-full bg-stone-800 flex items-center justify-center text-[10px]">📹</div>
                                                        ) : (
                                                            <img src={m.url} className="w-full h-full object-cover" />
                                                        )}
                                                        {m.showInShop === false && <span className="absolute top-0 right-0 bg-stone-900/90 text-white text-[8px] p-0.5 rounded-bl">🔒</span>}
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
                                                                    {plat.showInShop ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded ml-1" title="Ορατό στο Shop">👀 Ορατό</span> : <span className="text-[10px] bg-stone-200 text-stone-500 px-1 rounded ml-1" title="Κρυφό από το Shop">🔒 Κρυφό</span>}
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
                                            <p className="text-sm text-stone-700 bg-stone-50 p-4 rounded-xl border border-stone-100 whitespace-pre-wrap">{currentItem.notes}</p>
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
                        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                                <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                                    <div className="flex items-center gap-2">
                                        <IconSettings />
                                        <h2 className="text-lg font-bold text-stone-800">Διαχείριση Συστήματος</h2>
                                    </div>
                                    <button disabled={mediaPreparing || isSavingSettings} onClick={() => setIsSettingsOpen(false)} className="text-stone-400 hover:text-stone-800 bg-white p-1 rounded-lg border border-stone-200 disabled:opacity-40"><IconX /></button>
                                </div>

                                <div className="flex flex-wrap border-b border-stone-200 bg-stone-50 px-4 pt-2">
                                    <button 
                                        onClick={() => setActiveSettingsTab('fields')} 
                                        className={`px-4 py-3 font-bold text-sm border-b-2 transition ${activeSettingsTab === 'fields' ? 'border-stone-800 text-stone-800' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                                    >
                                        Προσαρμοσμένα Πεδία
                                    </button>
                                    <button 
                                        onClick={() => setActiveSettingsTab('shop')} 
                                        className={`px-4 py-3 font-bold text-sm border-b-2 transition ${activeSettingsTab === 'shop' ? 'border-stone-800 text-stone-800' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                                    >
                                        Σχεδιασμός Shop
                                    </button>
                                    <button type="button" onClick={() => setActiveSettingsTab('portfolio')}
                                        className={`px-4 py-3 font-bold text-sm border-b-2 transition ${activeSettingsTab === 'portfolio' ? 'border-stone-800 text-stone-800' : 'border-transparent text-stone-500 hover:text-stone-700'}`}>
                                        Σχεδιασμός Portfolio
                                    </button>
                                    <button 
                                        onClick={() => setActiveSettingsTab('assistant')} 
                                        className={`px-4 py-3 font-bold text-sm border-b-2 transition ${activeSettingsTab === 'assistant' ? 'border-stone-800 text-stone-800' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                                    >
                                        AI Back Office
                                    </button>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1">
                                    {activeSettingsTab === 'fields' && (
                                        <div className="animate-fade-in">
                                            <p className="text-xs text-stone-500 mb-6">Διαγράψτε λέξεις που δεν θέλετε να προτείνονται στις φόρμες καταχώρησης.</p>

                                            <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4">
                                                    <div className="flex items-center justify-between gap-3 mb-3">
                                                        <h3 className="text-sm font-black text-indigo-700 uppercase">Σειρά επιλογών χρωμάτων</h3>
                                                        <button onClick={() => handleSortFieldOptionsByUsage('color')} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition">Συχνότερα πρώτα</button>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {settingsColorOptions.map(color => (
                                                            <div
                                                                key={color}
                                                                draggable
                                                                onDragStart={(e) => handleFieldOptionDragStart(e, 'color', color)}
                                                                onDragOver={(e) => e.preventDefault()}
                                                                onDrop={(e) => handleFieldOptionDrop(e, 'color', color)}
                                                                onDragEnd={() => setDraggedFieldOption(null)}
                                                                className="flex items-center gap-2 bg-white border border-indigo-100 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing"
                                                            >
                                                                <IconGripVertical />
                                                                <span className="flex-1 text-sm font-bold text-stone-700">{color}</span>
                                                                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{colorUsageCounts[color] || 0}</span>
                                                                <button onClick={() => handleHideFieldOption('color', color)} className="text-red-500 hover:text-red-700" title="Αφαίρεση από προτάσεις"><IconTrash /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {hiddenColorOptions.length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {hiddenColorOptions.map(color => (
                                                                <button key={color} onClick={() => handleRestoreFieldOption('color', color)} className="text-[11px] px-2 py-1 bg-white border border-indigo-100 rounded text-indigo-700">Επαναφορά {color}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="border border-stone-200 bg-stone-50 rounded-xl p-4">
                                                    <div className="flex items-center justify-between gap-3 mb-3">
                                                        <h3 className="text-sm font-black text-stone-700 uppercase">Σειρά επιλογών υλικών</h3>
                                                        <button onClick={() => handleSortFieldOptionsByUsage('material')} className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-bold hover:bg-stone-100 transition">Συχνότερα πρώτα</button>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {settingsMaterialOptions.map(material => (
                                                            <div
                                                                key={material}
                                                                draggable
                                                                onDragStart={(e) => handleFieldOptionDragStart(e, 'material', material)}
                                                                onDragOver={(e) => e.preventDefault()}
                                                                onDrop={(e) => handleFieldOptionDrop(e, 'material', material)}
                                                                onDragEnd={() => setDraggedFieldOption(null)}
                                                                className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing"
                                                            >
                                                                <IconGripVertical />
                                                                <span className="flex-1 text-sm font-bold text-stone-700">{material}</span>
                                                                <span className="text-[10px] font-black text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">{materialUsageCounts[material] || 0}</span>
                                                                <button onClick={() => handleHideFieldOption('material', material)} className="text-red-500 hover:text-red-700" title="Αφαίρεση από προτάσεις"><IconTrash /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {hiddenMaterialOptions.length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {hiddenMaterialOptions.map(material => (
                                                                <button key={material} onClick={() => handleRestoreFieldOption('material', material)} className="text-[11px] px-2 py-1 bg-white border border-stone-200 rounded text-stone-700">Επαναφορά {material}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                {renderFieldOptionManager({ type: 'category', title: 'Σειρά επιλογών κατηγοριών', options: settingsCategoryOptions, counts: categoryUsageCounts, hiddenOptions: hiddenCategoryOptions })}
                                                {renderFieldOptionManager({ type: 'collection', title: 'Σειρά επιλογών συλλογών', options: settingsCollectionOptions, counts: collectionUsageCounts, hiddenOptions: hiddenCollectionOptions })}
                                                {renderFieldOptionManager({ type: 'status', title: 'Σειρά επιλογών καταστάσεων', options: settingsStatusOptions, counts: statusUsageCounts, hiddenOptions: hiddenStatusOptions })}
                                                {renderFieldOptionManager({ type: 'platform', title: 'Σειρά επιλογών πλατφορμών', options: settingsPlatformOptions, counts: platformUsageCounts, hiddenOptions: hiddenPlatformOptions })}
                                            </div>
                                            
                                            <div className="hidden">
                                                <h3 className="text-sm font-bold text-stone-500 uppercase mb-3 block">Προσαρμοσμένες Κατηγορίες</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {customCategories.length === 0 && <span className="text-sm text-stone-400 italic">Καμία καταχώρηση.</span>}
                                                    {customCategories.map(cat => (
                                                        <span key={cat} className="flex items-center gap-2 bg-stone-100 border border-stone-200 text-sm px-3 py-1 rounded-lg text-stone-700">{cat} <button onClick={() => setCustomCategories(customCategories.filter(c => c !== cat))} className="text-red-500"><IconTrash /></button></span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="hidden">
                                                <h3 className="text-sm font-bold text-stone-500 uppercase mb-3 block">Προσαρμοσμένα Χρώματα</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {customColors.length === 0 && <span className="text-sm text-stone-400 italic">Καμία καταχώρηση.</span>}
                                                    {customColors.map(col => (
                                                        <span key={col} className="flex items-center gap-2 bg-stone-100 border border-stone-200 text-sm px-3 py-1 rounded-lg text-stone-700">{col} <button onClick={() => setCustomColors(customColors.filter(c => c !== col))} className="text-red-500"><IconTrash /></button></span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="hidden">
                                                <h3 className="text-sm font-bold text-stone-500 uppercase mb-3 block">Προσαρμοσμένες Καταστάσεις</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {customStatuses.length === 0 && <span className="text-sm text-stone-400 italic">Καμία καταχώρηση.</span>}
                                                    {customStatuses.map(stat => (
                                                        <span key={stat} className="flex items-center gap-2 bg-stone-100 border border-stone-200 text-sm px-3 py-1 rounded-lg text-stone-700">{stat} <button onClick={() => setCustomStatuses(customStatuses.filter(s => s !== stat))} className="text-red-500"><IconTrash /></button></span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="hidden">
                                                <h3 className="text-sm font-bold text-stone-500 uppercase mb-3 block">Προσαρμοσμένα Υλικά</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {customMaterials.length === 0 && <span className="text-sm text-stone-400 italic">Καμία καταχώρηση.</span>}
                                                    {customMaterials.map(mat => (
                                                        <span key={mat} className="flex items-center gap-2 bg-stone-100 border border-stone-200 text-sm px-3 py-1 rounded-lg text-stone-700">{mat} <button onClick={() => setCustomMaterials(customMaterials.filter(m => m !== mat))} className="text-red-500"><IconTrash /></button></span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="hidden">
                                                <h3 className="text-sm font-bold text-stone-500 uppercase mb-3 block">Προσαρμοσμένες Πλατφόρμες</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {customPlatforms.length === 0 && <span className="text-sm text-stone-400 italic">Καμία καταχώρηση.</span>}
                                                    {customPlatforms.map(plat => (
                                                        <span key={plat} className="flex items-center gap-2 bg-stone-100 border border-stone-200 text-sm px-3 py-1 rounded-lg text-stone-700">{plat} <button onClick={() => setCustomPlatforms(customPlatforms.filter(p => p !== plat))} className="text-red-500"><IconTrash /></button></span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSettingsTab === 'shop' && (
                                        <div className="animate-fade-in space-y-8">
                                            {settingsLoadError && (
                                                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                                                    Δεν ήταν δυνατή η φόρτωση των αποθηκευμένων ρυθμίσεων Shop. Εμφανίζονται οι τοπικές προεπιλογές και δεν πρέπει να θεωρηθούν συγχρονισμένες. {settingsLoadError}
                                                </div>
                                            )}
                                            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                <div className="border border-stone-200 rounded-xl p-4 bg-white">
                                                    <div className="flex items-center justify-between gap-4 mb-3">
                                                        <div>
                                                            <h3 className="text-sm font-black text-stone-800">Ανακοίνωση κορυφής</h3>
                                                            <p className="text-xs text-stone-500 mt-1">Για νέα συλλογή, προσφορά ή σημαντικό μήνυμα.</p>
                                                        </div>
                                                        <label className="inline-flex items-center cursor-pointer">
                                                            <input type="checkbox" className="sr-only peer" checked={shopSettings.announcementEnabled} onChange={e => setShopSettings({...shopSettings, announcementEnabled: e.target.checked})} />
                                                            <span className="relative w-11 h-6 bg-stone-200 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5"></span>
                                                        </label>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <input type="text" maxLength="140" placeholder="π.χ. Νέα καλοκαιρινή συλλογή" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none" value={shopSettings.announcementText} onChange={e => setShopSettings({...shopSettings, announcementText: e.target.value})} />
                                                        <input type="url" placeholder="Προαιρετικό link (https://...)" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none" value={shopSettings.announcementLink} onChange={e => setShopSettings({...shopSettings, announcementLink: e.target.value})} />
                                                    </div>
                                                </div>
                                                <div className="border border-stone-200 rounded-xl p-4 bg-white">
                                                    <h3 className="text-sm font-black text-stone-800 mb-1">Πυκνότητα καταλόγου</h3>
                                                    <p className="text-xs text-stone-500 mb-3">Ρυθμίζει τον αέρα ανάμεσα στα προϊόντα, χωρίς να αλλάζει τις εικόνες ή τα δεδομένα τους.</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            ['comfortable', 'Άνετη'],
                                                            ['compact', 'Πυκνή']
                                                        ].map(([value, label]) => (
                                                            <button key={value} type="button" onClick={() => setShopSettings({...shopSettings, catalogDensity: value})} className={`px-3 py-2.5 border rounded-lg text-sm font-bold transition ${shopSettings.catalogDensity === value ? 'bg-stone-900 border-stone-900 text-white' : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-white'}`}>{label}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </section>
                                            <section className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 items-start">
                                                <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: shopSettings.bgColor, color: shopSettings.textColor, fontFamily: shopSettings.fontFamily === 'Playfair' ? "'Playfair Display', serif" : shopSettings.fontFamily === 'Cinzel' ? "'Cinzel', serif" : `'${shopSettings.fontFamily}', sans-serif` }}>
                                                    <div className="px-4 py-3 border-b flex flex-col items-center gap-2" style={{ borderColor: `${shopSettings.textColor}15` }}>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <img src="data:image/png;base64,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" alt="Aram Creations Logo" className="h-10 w-auto object-contain" onError={(e) => { if (e.currentTarget) (e.currentTarget as HTMLElement).style.display = "none"; }} />
                                                            <span className="text-sm font-black">aram creations</span>
                                                        </div>
                                                        <div className="flex gap-1 overflow-hidden max-w-full">
                                                            {['Όλα', ...shopSettings.categoryOrder.slice(0, 3)].map((cat, idx) => (
                                                                <span key={`${cat}-${idx}`} className="text-[9px] font-bold px-2 py-1 border whitespace-nowrap" style={{ borderRadius: shopSettings.borderRadius, borderColor: idx === 0 ? shopSettings.primaryColor : `${shopSettings.textColor}25`, backgroundColor: idx === 0 ? shopSettings.primaryColor : 'transparent', color: idx === 0 ? '#fff' : shopSettings.textColor }}>{cat}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="px-5 py-7 text-center" style={{ backgroundColor: shopSettings.heroBgColor }}>
                                                        <h3 className="text-xl font-black mb-2" style={{ color: shopSettings.heroTitleColor }}>{shopSettings.heroTitle}</h3>
                                                        <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: shopSettings.heroSubtitleColor }}>{shopSettings.heroSubtitle}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 p-4">
                                                        {[0, 1].map(idx => (
                                                            <div key={idx} className="border overflow-hidden" style={{ borderColor: `${shopSettings.textColor}12`, borderRadius: shopSettings.borderRadius }}>
                                                                <div className="aspect-[4/5]" style={{ backgroundColor: `${shopSettings.textColor}08` }}></div>
                                                                <div className="p-3">
                                                                    <div className="flex justify-between gap-2 mb-2">
                                                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: `${shopSettings.textColor}08` }}>Διαθέσιμο</span>
                                                                        <span className="text-xs font-black">28€</span>
                                                                    </div>
                                                                    <p className="text-xs font-bold">Product preview</p>
                                                                    <p className="text-[9px] uppercase font-bold opacity-50">Κολιέ</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="border border-stone-200 rounded-xl p-4 bg-stone-50">
                                                    <h3 className="text-sm font-black text-stone-700 mb-3">Theme reset</h3>
                                                    <div className="flex flex-col gap-2">
                                                        <button onClick={() => handleResetTheme('default')} className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-100 transition">Default theme</button>
                                                        <button onClick={() => handleResetTheme('minimal')} className="px-4 py-2 bg-stone-900 rounded-lg text-xs font-bold text-white hover:bg-stone-800 transition">Minimal theme</button>
                                                    </div>
                                                </div>
                                            </section>

                                            <section>
                                                <h3 className="text-sm font-black text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Χρωματα Σελιδας (Shop)</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-600 mb-1">Φόντο Σελίδας</label>
                                                        <div className="flex gap-2">
                                                            <input type="color" className="h-10 w-12 rounded cursor-pointer border-0 p-0" value={shopSettings.bgColor} onChange={e => setShopSettings({...shopSettings, bgColor: e.target.value})} />
                                                            <input type="text" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 outline-none uppercase font-mono text-sm" value={shopSettings.bgColor} onChange={e => setShopSettings({...shopSettings, bgColor: e.target.value})} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-600 mb-1">Βασικό Κείμενο <span className="font-normal">(αντίθεση με το φόντο)</span></label>
                                                        <div className="flex gap-2">
                                                            <input type="color" className="h-10 w-12 rounded cursor-pointer border-0 p-0" value={shopSettings.textColor} onChange={e => setShopSettings({...shopSettings, textColor: e.target.value})} />
                                                            <input type="text" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 outline-none uppercase font-mono text-sm" value={shopSettings.textColor} onChange={e => setShopSettings({...shopSettings, textColor: e.target.value})} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-600 mb-1">Βασικό Χρώμα <span className="font-normal">(Κουμπιά & Highlights)</span></label>
                                                        <div className="flex gap-2">
                                                            <input type="color" className="h-10 w-12 rounded cursor-pointer border-0 p-0" value={shopSettings.primaryColor} onChange={e => setShopSettings({...shopSettings, primaryColor: e.target.value})} />
                                                            <input type="text" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 outline-none uppercase font-mono text-sm" value={shopSettings.primaryColor} onChange={e => setShopSettings({...shopSettings, primaryColor: e.target.value})} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>

                                            <section>
                                                <h3 className="text-sm font-black text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Εμφανιση & Γραμματοσειρα</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-600 mb-1">Γραμματοσειρά Shop</label>
                                                        <select 
                                                            className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none"
                                                            value={shopSettings.fontFamily}
                                                            onChange={e => setShopSettings({...shopSettings, fontFamily: e.target.value})}
                                                        >
                                                            <option value="Jura">Jura (Μοντέρνα, Τετραγωνισμένη)</option>
                                                            <option value="Montserrat">Montserrat (Καθαρή, Κλασική)</option>
                                                            <option value="Roboto">Roboto (Απλή, Ευανάγνωστη)</option>
                                                            <option value="Playfair">Playfair Display (Κομψή, Serif)</option>
                                                            <option value="Cinzel">Cinzel (Αρχαιοελληνική, Serif)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-600 mb-1">Στρογγυλάδες (Φωτογραφίες & Κουμπιά)</label>
                                                        <select 
                                                            className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none"
                                                            value={shopSettings.borderRadius}
                                                            onChange={e => setShopSettings({...shopSettings, borderRadius: e.target.value})}
                                                        >
                                                            <option value="0px">Τετράγωνα (Αυστηρό, 0px)</option>
                                                            <option value="0.5rem">Ελαφρώς Στρογγυλεμένα (8px)</option>
                                                            <option value="0.75rem">Στρογγυλεμένα (Κανονικό, 12px)</option>
                                                            <option value="1.5rem">Πολύ Στρογγυλά (Οβάλ, 24px)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </section>

                                            <section>
                                                <h3 className="text-sm font-black text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Χρωματα & Κειμενα Αρχικης (Hero)</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-600 mb-1">Φόντο Κεντρικού Πλαισίου</label>
                                                        <div className="flex gap-2">
                                                            <input type="color" className="h-10 w-12 rounded cursor-pointer border-0 p-0" value={shopSettings.heroBgColor} onChange={e => setShopSettings({...shopSettings, heroBgColor: e.target.value})} />
                                                            <input type="text" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 outline-none uppercase font-mono text-sm" value={shopSettings.heroBgColor} onChange={e => setShopSettings({...shopSettings, heroBgColor: e.target.value})} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-600 mb-1">Χρώμα Τίτλου</label>
                                                        <div className="flex gap-2">
                                                            <input type="color" className="h-10 w-12 rounded cursor-pointer border-0 p-0" value={shopSettings.heroTitleColor} onChange={e => setShopSettings({...shopSettings, heroTitleColor: e.target.value})} />
                                                            <input type="text" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 outline-none uppercase font-mono text-sm" value={shopSettings.heroTitleColor} onChange={e => setShopSettings({...shopSettings, heroTitleColor: e.target.value})} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-600 mb-1">Χρώμα Υπότιτλου</label>
                                                        <div className="flex gap-2">
                                                            <input type="color" className="h-10 w-12 rounded cursor-pointer border-0 p-0" value={shopSettings.heroSubtitleColor} onChange={e => setShopSettings({...shopSettings, heroSubtitleColor: e.target.value})} />
                                                            <input type="text" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 outline-none uppercase font-mono text-sm" value={shopSettings.heroSubtitleColor} onChange={e => setShopSettings({...shopSettings, heroSubtitleColor: e.target.value})} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="block text-xs font-bold text-stone-600 mb-1">Κεντρικός Τίτλος</label>
                                                            <input 
                                                                type="text" 
                                                                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none"
                                                                value={shopSettings.heroTitle}
                                                                onChange={e => setShopSettings({...shopSettings, heroTitle: e.target.value})}
                                                            />
                                                        </div>
                                                        <div className="w-48">
                                                            <label className="block text-xs font-bold text-stone-600 mb-1">Μέγεθος Τίτλου</label>
                                                            <select 
                                                                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none"
                                                                value={shopSettings.heroTitleSize}
                                                                onChange={e => setShopSettings({...shopSettings, heroTitleSize: e.target.value})}
                                                            >
                                                                <option value="text-2xl md:text-3xl">Μικρό</option>
                                                                <option value="text-3xl md:text-4xl">Κανονικό</option>
                                                                <option value="text-4xl md:text-5xl">Μεγάλο</option>
                                                                <option value="text-5xl md:text-6xl">Πολύ Μεγάλο</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-600 mb-1">Υπότιτλος</label>
                                                        <textarea 
                                                            className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none h-20 resize-none"
                                                            value={shopSettings.heroSubtitle}
                                                            onChange={e => setShopSettings({...shopSettings, heroSubtitle: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="rounded-xl border border-stone-200 p-4 space-y-2">
                                                        <label className="block text-xs font-bold text-stone-600">Βίντεο Hero (προαιρετικό)</label>
                                                        <input type="url" placeholder="https://.../video.mp4" value={shopSettings.heroVideoUrl || ''} onChange={e => setShopSettings(prev => ({ ...prev, heroVideoUrl: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                                                        <input type="file" accept="video/*" disabled={mediaPreparing} aria-label="Ανέβασμα βίντεο Hero" onChange={e => { handleHeroVideoUpload(e.target.files?.[0]); e.target.value = ''; }} className="w-full text-xs" />
                                                        <p className="text-xs text-stone-500">{VIDEO_UPLOAD_HELP}</p><VideoUploadStatus value={videoProgress} busy={videoCompressing} onCancel={() => videoAbort.current?.abort()} />{heroUploadStatus && <p role="status" className="text-xs text-stone-600">{heroUploadStatus}</p>}
                                                        {shopSettings.heroVideoUrl && <MediaDownload media={{ url: shopSettings.heroVideoUrl, type: 'video' }} name="aram-hero-video" />}{shopSettings.heroVideoUrl && <video src={shopSettings.heroVideoUrl} controls muted className="max-h-36 w-full rounded-lg bg-black" />}
                                                    </div>
                                                </div>
                                            </section>

                                            <section>
                                                <h3 className="text-sm font-black text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Σειρα Κατηγοριων στο Μενού</h3>
                                                <p className="text-[10px] text-stone-500 mb-3">Σύρετε τις κατηγορίες για να αλλάξετε τη σειρά τους στο μενού του Shop. (Η επιλογή "Όλη η Συλλογή" είναι πάντα πρώτη).</p>
                                                <div className="flex flex-col gap-2">
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
                                                                setShopSettings({...shopSettings, categoryOrder: newOrder});
                                                                setDraggedCategoryIdx(null);
                                                            }}
                                                            className="flex items-center gap-3 bg-white border border-stone-200 p-3 rounded-lg cursor-grab active:cursor-grabbing hover:bg-stone-50 transition shadow-sm"
                                                        >
                                                            <IconGripVertical />
                                                            <span className="font-bold text-sm">{cat}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>

                                            <section>
                                                <h3 className="text-sm font-black text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Βασικα Links (Fallbacks)</h3>
                                                <p className="text-[10px] text-stone-500 mb-3">Αν μια δημιουργία δεν έχει δικό της link, ο πελάτης θα κατευθύνεται εδώ.</p>
                                                <div className="space-y-3">
                                                    {Object.keys(shopSettings.fallbackLinks).map(platform => (
                                                        <div key={platform} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                            <label className="text-xs font-bold text-stone-600 sm:w-24">{platform}</label>
                                                            <input 
                                                                type="url" 
                                                                placeholder={`Link για ${platform}...`}
                                                                className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none"
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
                                        </div>
                                    )}

                                    {activeSettingsTab === 'portfolio' && (
                                        <div className="space-y-6">
                                            <PortfolioDesignSettings value={shopSettings.portfolioDesign} onChange={value => setShopSettings(prev => ({...prev, portfolioDesign:value}))} />
                                            <section className="rounded-xl border border-stone-200 p-4 space-y-3">
                                                <h3 className="text-sm font-bold text-stone-800">Βίντεο αρχικής Portfolio</h3>
                                                <p className="text-sm text-stone-500">Εμφανίζεται πίσω από το «Έργα & Δημιουργίες», χωρίς ήχο και σε επανάληψη. Χωρίς βίντεο παραμένει το λευκό φόντο.</p>
                                                <label htmlFor="portfolio-hero-video-url" className="block text-xs font-bold text-stone-600">Σύνδεσμος αρχείου βίντεο (προαιρετικό)</label>
                                                <input id="portfolio-hero-video-url" type="url" placeholder="https://.../video.mp4" disabled={mediaPreparing || isSavingSettings}
                                                    value={shopSettings.portfolioHeroVideoUrl || ''} onChange={e => setShopSettings(prev => ({ ...prev, portfolioHeroVideoUrl: e.target.value }))}
                                                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                                                <p className="text-xs text-stone-500">Δέχεται YouTube (και Shorts), Vimeo, απευθείας MP4 / WebM ή αρχείο από τον υπολογιστή.</p>
                                                <label htmlFor="portfolio-hero-video-file" className="block text-xs font-bold text-stone-600">Ανέβασμα από υπολογιστή</label>
                                                <input id="portfolio-hero-video-file" type="file" accept="video/*" disabled={mediaPreparing || isSavingSettings}
                                                    aria-label="Ανέβασμα βίντεο Hero Portfolio" onChange={e => { handleHeroVideoUpload(e.target.files?.[0], 'portfolio'); e.target.value = ''; }} className="w-full text-xs" />
                                                <p className="text-xs text-stone-500">{VIDEO_UPLOAD_HELP}</p>
                                                <VideoUploadStatus value={videoProgress} busy={videoCompressing} onCancel={() => videoAbort.current?.abort()} />
                                                {portfolioHeroUploadStatus && <p role="status" className="text-xs text-stone-600">{portfolioHeroUploadStatus}</p>}
                                                {shopSettings.portfolioHeroVideoUrl && <div className="flex flex-wrap items-center gap-3">
                                                    <MediaDownload media={{ url: shopSettings.portfolioHeroVideoUrl, type: 'video' }} name="aram-portfolio-hero-video" />
                                                    <button type="button" disabled={mediaPreparing || isSavingSettings} onClick={() => {
                                                        setShopSettings(prev => ({ ...prev, portfolioHeroVideoUrl: '' }));
                                                        setPortfolioHeroUploadStatus('Το βίντεο αφαιρέθηκε από την προεπισκόπηση. Πάτησε Αποθήκευση Ρυθμίσεων για να εφαρμοστεί.');
                                                    }} className="rounded-lg border border-stone-200 px-3 py-2 text-xs">Αφαίρεση βίντεο</button>
                                                </div>}
                                            </section>
                                            <section>
                                                <h3 className="mb-3 text-xs font-bold text-stone-500">Προεπισκόπηση αρχικής Portfolio</h3>
                                                <div className="overflow-hidden rounded-xl border border-stone-200">
                                                    <PortfolioHero design={normalizePortfolioDesign(shopSettings.portfolioDesign)} videoUrl={shopSettings.portfolioHeroVideoUrl} itemCount={0} categoryCount={0} videoCount={0}
                                                        onContactArtist={() => {}} showContact={false} showStats={false} />
                                                </div>
                                            </section>
                                        </div>
                                    )}
                                    {activeSettingsTab === 'assistant' && (
                                        <div className="animate-fade-in space-y-5">
                                            <section className="border border-violet-100 rounded-xl p-5 bg-violet-50/35 shadow-sm space-y-5">
                                                <div className="flex flex-col md:flex-row md:items-start gap-4 border-b border-violet-100 pb-4">
                                                    <div className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                        <IconBolt />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-black text-violet-800 uppercase tracking-wider">AI Back Office</h3>
                                                        <p className="text-sm text-stone-600 mt-1 leading-relaxed">
                                                            Αυτή η ρύθμιση αφορά μόνο τον βοηθό AI μέσα στη φόρμα καταχώρησης. Δεν εμφανίζεται δημόσιο AI chat στο shop.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-700 mb-1">Back-office AI endpoint</label>
                                                    <input
                                                        type="url"
                                                        placeholder="Άστο κενό στο Netlify ή βάλε http://127.0.0.1:3000/api/backoffice-ai για τοπική δοκιμή"
                                                        className="w-full border border-violet-200 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-300 outline-none text-sm"
                                                        value={assistantSettings.backofficeEndpoint || ''}
                                                        onChange={e => updateAssistantSetting('backofficeEndpoint', e.target.value)}
                                                    />
                                                    <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
                                                        Στο Netlify το κενό endpoint χρησιμοποιεί αυτόματα το /api/backoffice-ai. Για AI προτάσεις χρειάζεται ενεργό Netlify AI Gateway ή GEMINI_API_KEY. Η σύνδεση ως διαχειριστής αρκεί για πρόσβαση· ο AI access code είναι προαιρετικός.
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div className="rounded-lg border border-violet-100 bg-white p-4">
                                                        <p className="text-xs font-black text-stone-800 uppercase tracking-wider">Πού δουλεύει</p>
                                                        <p className="text-xs text-stone-500 mt-2 leading-relaxed">Μόνο στη φόρμα προϊόντος, για τίτλους, περιγραφές, χρώματα, υλικά, tags και captions.</p>
                                                    </div>
                                                    <div className="rounded-lg border border-violet-100 bg-white p-4">
                                                        <p className="text-xs font-black text-stone-800 uppercase tracking-wider">Εικόνες</p>
                                                        <p className="text-xs text-stone-500 mt-2 leading-relaxed">Διαβάζει εικόνες βιτρίνας και εικόνες αρχείου που ανεβάζεις μόνο για back office.</p>
                                                    </div>
                                                    <div className="rounded-lg border border-violet-100 bg-white p-4">
                                                        <p className="text-xs font-black text-stone-800 uppercase tracking-wider">Ασφάλεια</p>
                                                        <p className="text-xs text-stone-500 mt-2 leading-relaxed">Η πρόσβαση περνά από Firebase login και admin email. Δεν αποθηκεύεται AI access code στο Firebase.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Γρήγορος έλεγχος</p>
                                                <p className="text-sm text-amber-900 mt-2 leading-relaxed">
                                                    Αν το AI γράψει σφάλμα στη φόρμα, έλεγξε πρώτα τα Netlify environment variables GEMINI_API_KEY, AI_PROVIDER, GEMINI_MODEL και ADMIN_EMAILS. Για τοπική χρήση πρέπει να είναι ανοιχτός και ο τοπικός AI server.
                                                </p>
                                            </section>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
                                    <button disabled={mediaPreparing || isSavingSettings} onClick={() => setIsSettingsOpen(false)} className="px-6 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm font-bold hover:bg-stone-100 transition disabled:opacity-40">Κλείσιμο</button>
                                    {(activeSettingsTab === 'shop' || activeSettingsTab === 'portfolio' || activeSettingsTab === 'assistant') && (
                                        <button onClick={handleSaveSettings} disabled={isSavingSettings || mediaPreparing} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-md flex items-center gap-2">
                                            {isSavingSettings ? 'Αποθήκευση...' : 'Αποθήκευση Ρυθμίσεων'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}


                    {isVintedImportOpen && (
                        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-3 md:p-4 z-50">
                            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
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
                                                                                <img src={previewVintedImageSrc(media.url)} alt="" className="w-full h-full object-cover" loading="lazy" />
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
                        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">
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




