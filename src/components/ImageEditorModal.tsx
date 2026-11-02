import React, { useState, useRef, useEffect } from 'react';

export interface ImageEditorModalProps {
  open: boolean;
  imageUrl: string;
  title?: string;
  onClose: () => void;
  onSave: (editedDataUrl: string) => void;
}

type AspectRatio = 'free' | '1:1' | '4:5' | '16:9';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  open,
  imageUrl,
  title = 'Εικόνα',
  onClose,
  onSave
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(100);
  const [aspect, setAspect] = useState<AspectRatio>('free');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const isGif = /\.gif($|\?)/i.test(imageUrl);

  // Reset adjustments whenever a new image opens
  useEffect(() => {
    if (open) {
      setRotation(0);
      setZoom(100);
      setAspect('free');
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setErrorMessage(isGif ? 'Προσοχή: Τα αρχεία κινούμενου GIF (animation) δεν υποστηρίζονται για περικοπή/επεξεργασία, καθώς θα απολεσθεί η κίνηση.' : null);
    }
  }, [open, imageUrl, isGif]);

  if (!open || !imageUrl) return null;

  const handleApplyChanges = () => {
    if (isGif) {
      alert('Η επεξεργασία αρχείων GIF (animation) δεν υποστηρίζεται για αποφυγή απώλειας κίνησης.');
      return;
    }
    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        // Determine dimensions based on rotation
        const isRotated = Math.abs(rotation % 180) === 90;
        const sourceWidth = isRotated ? img.naturalHeight : img.naturalWidth;
        const sourceHeight = isRotated ? img.naturalWidth : img.naturalHeight;

        let targetWidth = sourceWidth;
        let targetHeight = sourceHeight;

        if (aspect === '1:1') {
          const size = Math.min(sourceWidth, sourceHeight);
          targetWidth = size;
          targetHeight = size;
        } else if (aspect === '4:5') {
          targetWidth = sourceWidth;
          targetHeight = Math.round(sourceWidth * 1.25);
        } else if (aspect === '16:9') {
          targetWidth = sourceWidth;
          targetHeight = Math.round(sourceWidth * (9 / 16));
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Apply filters
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

        // Transform for rotation and zoom
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        const scale = zoom / 100;
        ctx.scale(scale, scale);

        ctx.drawImage(
          img,
          -img.naturalWidth / 2,
          -img.naturalHeight / 2,
          img.naturalWidth,
          img.naturalHeight
        );
        ctx.restore();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        onSave(dataUrl);
        setIsProcessing(false);
        onClose();
      };

      img.onerror = () => {
        setIsProcessing(false);
        // Fallback: save existing url
        onSave(imageUrl);
        onClose();
      };

      img.src = imageUrl;
    } catch {
      setIsProcessing(false);
      onClose();
    }
  };

  const handleReset = () => {
    setRotation(0);
    setZoom(100);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setAspect('free');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Επεξεργασία Εικόνας"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200 animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h2 className="text-base font-black text-stone-900">Επεξεργασία & Περικοπή Εικόνας</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {title} · Περιστροφή, ζουμ, προσαρμογή αναλογίας και φωτεινότητας
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-800 flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Body: Preview + Controls */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-6 p-6">
          {/* Visual Preview Box */}
          <div className="flex flex-col items-center justify-center bg-stone-900 rounded-xl p-4 overflow-hidden min-h-[320px] relative shadow-inner">
            <div
              className={`relative overflow-hidden transition-all duration-200 flex items-center justify-center ${
                aspect === '1:1'
                  ? 'aspect-square w-full max-w-[340px]'
                  : aspect === '4:5'
                  ? 'aspect-[4/5] w-full max-w-[300px]'
                  : aspect === '16:9'
                  ? 'aspect-video w-full max-w-[420px]'
                  : 'w-full h-full max-h-[380px]'
              }`}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain transition-transform duration-150"
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom / 100})`,
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                }}
              />
              {/* Dashed crop grid guide */}
              {aspect !== 'free' && (
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/60 rounded-lg grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>
              )}
            </div>
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white/90 text-[10px] font-mono px-2 py-1 rounded">
              {rotation}° · {zoom}% · {aspect}
            </div>
          </div>

          {/* Interactive Controls Panel */}
          <div className="space-y-5">
            {/* Aspect Ratio Presets */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
                Αναλογία Διαστάσεων (Crop)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    ['free', 'Ελεύθερο'],
                    ['1:1', '1:1 Τετράγωνο'],
                    ['4:5', '4:5 Κάθετο'],
                    ['16:9', '16:9 Ευρύ']
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAspect(val)}
                    className={`px-2.5 py-2 text-xs font-bold rounded-lg border transition ${
                      aspect === val
                        ? 'bg-stone-900 border-stone-900 text-white shadow-sm'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rotation Controls */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-500">
                  Περιστροφή
                </label>
                <span className="text-xs font-mono font-bold text-stone-700">{rotation}°</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRotation(r => (r - 90) % 360)}
                  className="flex-1 py-2 px-3 border border-stone-200 rounded-lg text-xs font-bold hover:bg-stone-50 transition flex items-center justify-center gap-1.5"
                >
                  ↺ -90° Αριστερά
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="flex-1 py-2 px-3 border border-stone-200 rounded-lg text-xs font-bold hover:bg-stone-50 transition flex items-center justify-center gap-1.5"
                >
                  ↻ +90° Δεξιά
                </button>
              </div>
            </div>

            {/* Zoom Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-500">
                  Ζουμ (Zoom)
                </label>
                <span className="text-xs font-mono font-bold text-stone-700">{zoom}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="250"
                step="5"
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="w-full accent-stone-900 cursor-pointer"
              />
            </div>

            {/* Image Adjustments (Brightness, Contrast, Saturation) */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <label className="block text-xs font-black uppercase tracking-wider text-stone-500">
                Ρυθμίσεις Φωτισμού & Χρώματος
              </label>

              <div>
                <div className="flex justify-between text-xs text-stone-600 mb-1">
                  <span>Φωτεινότητα</span>
                  <span className="font-mono">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="2"
                  value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  className="w-full accent-stone-900 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-stone-600 mb-1">
                  <span>Αντίθεση (Contrast)</span>
                  <span className="font-mono">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="2"
                  value={contrast}
                  onChange={e => setContrast(Number(e.target.value))}
                  className="w-full accent-stone-900 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-stone-600 mb-1">
                  <span>Κορεσμός (Saturation)</span>
                  <span className="font-mono">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={saturation}
                  onChange={e => setSaturation(Number(e.target.value))}
                  className="w-full accent-stone-900 cursor-pointer"
                />
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-1.5 text-xs font-bold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition"
              >
                Επαναφορά Αρχικών Ρυθμίσεων
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 border border-stone-200 rounded-lg text-sm font-bold text-stone-600 hover:bg-white transition"
          >
            Ακύρωση
          </button>
          <button
            type="button"
            onClick={handleApplyChanges}
            disabled={isProcessing}
            className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? 'Επεξεργασία…' : 'Εφαρμογή & Αποθήκευση'}
          </button>
        </div>
      </div>
    </div>
  );
};

