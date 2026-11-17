import { IconX } from './icons';
import type { MediaStudio } from './useMediaStudio';

type MediaStudioDialogProps = Pick<
    MediaStudio,
    'IMAGE_EDITOR_ASPECTS' | 'applyImageEditor' | 'canRestoreMediaOriginal' | 'clampImageEditorPan' |
    'closeImageEditor' | 'getImageEditorAspect' | 'getImageEditorPanBounds' | 'getImageEditorPreviewStyle' |
    'handleRestoreEditedMedia' | 'imageEditorError' | 'imageEditorMedia' | 'imageEditorSettings' |
    'imageEditorTarget' | 'isApplyingImageEdit' | 'moveImageEditorDrag' | 'setImageEditorImageInfo' |
    'setImageEditorSettings' | 'startImageEditorDrag' | 'stopImageEditorDrag'
>;

export function MediaStudioDialog(props: MediaStudioDialogProps) {
    const {
        IMAGE_EDITOR_ASPECTS, applyImageEditor, canRestoreMediaOriginal, clampImageEditorPan, closeImageEditor,
        getImageEditorAspect, getImageEditorPanBounds, getImageEditorPreviewStyle, handleRestoreEditedMedia,
        imageEditorError, imageEditorMedia, imageEditorSettings, imageEditorTarget, isApplyingImageEdit,
        moveImageEditorDrag, setImageEditorImageInfo, setImageEditorSettings, startImageEditorDrag,
        stopImageEditorDrag
    } = props;
    if (!(imageEditorTarget && imageEditorMedia)) return null;

    return (
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
                            Μηδενισμός ρυθμίσεων
                        </button>
                        {canRestoreMediaOriginal(imageEditorMedia) && (
                            <button type="button" disabled={isApplyingImageEdit} onClick={async () => {
                                await handleRestoreEditedMedia(imageEditorTarget.scope, imageEditorTarget.index);
                                closeImageEditor();
                            }} className="w-full px-4 py-2.5 border rounded-lg text-sm font-bold">Επαναφορά αρχικής εικόνας</button>
                        )}

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
    );
}
