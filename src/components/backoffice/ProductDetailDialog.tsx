import { IconX, IconImage, IconBox, IconClone, IconExternalLink } from './icons';
import { sanitizeVintedDescription as stripVintedCondition } from '../../lib/vinted-sanitizer';
import { inventoryLabel } from '../../lib/stock-edit';
import { MediaDownload } from '../MediaDownload';
import type { ProductWorkspace } from './useProductWorkspace';
import type { CatalogOptions } from './useCatalogOptions';
import type { ProductActions } from './createProductActions';

type ProductDetailDialogProps = Pick<
    ProductWorkspace,
    'activeDetailMediaIdx' | 'currentItem' | 'isDetailOpen' | 'setActiveDetailMediaIdx' | 'setIsDetailOpen'
> &
    Pick<CatalogOptions, 'getStatusColor'> &
    Pick<ProductActions, 'handleCloneItem' | 'handleDeleteItem' | 'handleOpenEdit'>;

export function ProductDetailDialog(props: ProductDetailDialogProps) {
    const {
        activeDetailMediaIdx, currentItem, getStatusColor, handleCloneItem, handleDeleteItem, handleOpenEdit,
        isDetailOpen, setActiveDetailMediaIdx, setIsDetailOpen
    } = props;
    if (!(isDetailOpen && currentItem)) return null;

    return (
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
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusColor(inventoryLabel(currentItem))}`}>
                                {inventoryLabel(currentItem)}
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
    );
}
