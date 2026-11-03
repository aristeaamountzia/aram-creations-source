import React, { useState } from 'react';
import {
  DEFAULT_DESIGN_STUDIO,
  DesignStudio,
  designStudioCss,
  normalizeDesignStudio
} from '../lib/design-studio';
import { Sparkles, Palette, Type, Sliders, ExternalLink } from 'lucide-react';

type Props = {
  value?: Partial<DesignStudio>;
  onChange: (value: DesignStudio) => void;
};

type StudioTab = 'presets' | 'palette' | 'typography';

const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

const THEME_PRESETS: Array<{
  id: string;
  name: string;
  tagline: string;
  badge: string;
  patch: Partial<DesignStudio>;
}> = [
  {
    id: 'mone-minimal',
    name: 'MONÉ Minimal Luxury',
    tagline: 'Εκλεπτυσμένο high-end editorial: καθαρό stone-white φόντο, μαύρες γραμμές, αέρινα κενά, minimal pill κουμπιά και τυπογραφία Jura.',
    badge: 'MONÉ Style (Προτεινόμενο)',
    patch: {
      fontFamily: 'Jura, sans-serif',
      baseSize: '15px',
      pageBackground: '#fafaf9',
      surface: '#ffffff',
      ink: '#18181b',
      muted: '#71717a',
      line: '#e4e4e7',
      accent: '#18181b',
      radius: '10px',
      cardRadius: '12px',
      cardPadding: '16px',
      sectionGap: '32px',
      headerBackground: '#ffffff',
      headerInk: '#18181b',
      headerMuted: '#71717a',
      headerHeight: '76px',
      navActiveBackground: '#18181b',
      navActiveInk: '#ffffff',
      buttonBackground: '#18181b',
      buttonInk: '#ffffff',
      buttonRadius: '9999px',
      badgeBackground: '#f4f4f5',
      badgeInk: '#18181b',
      badgeBorder: '#e4e4e7',
      badgeRadius: '9999px',
      heroMinHeight: '520px',
      heroOverlay: '0.50',
      heroTitleSize: '40px',
      heroTitleInk: '#ffffff',
      heroBodyInk: '#f4f4f5',
      portfolioCardBackground: '#ffffff',
      portfolioCardBorder: '#e4e4e7',
      portfolioCardTitleInk: '#18181b',
      portfolioCardBodyInk: '#71717a'
    }
  },
  {
    id: 'atelier',
    name: 'Atelier Warm Gold',
    tagline: 'Ζεστή ατμόσφαιρα εργαστηρίου, εκλεπτυσμένη Playfair Display γραμματοσειρά, ζεστό λινό φόντο και διακριτικές λεπτομέρειες ματ χρυσού.',
    badge: 'Warm Botanical',
    patch: {
      fontFamily: "'Playfair Display', serif",
      baseSize: '16px',
      pageBackground: '#fcfaf6',
      surface: '#ffffff',
      ink: '#292524',
      muted: '#78716c',
      line: '#e7e5e4',
      accent: '#b48c48',
      radius: '12px',
      cardRadius: '12px',
      cardPadding: '16px',
      sectionGap: '32px',
      headerBackground: '#ffffff',
      headerInk: '#292524',
      headerMuted: '#78716c',
      headerHeight: '76px',
      navActiveBackground: '#292524',
      navActiveInk: '#ffffff',
      buttonBackground: '#292524',
      buttonInk: '#ffffff',
      buttonRadius: '8px',
      badgeBackground: '#fdf8ee',
      badgeInk: '#926c26',
      badgeBorder: '#ebd9b7',
      badgeRadius: '9999px',
      heroMinHeight: '520px',
      heroOverlay: '0.55',
      heroTitleSize: '42px',
      heroTitleInk: '#ffffff',
      heroBodyInk: '#f5f5f4',
      portfolioCardBackground: '#ffffff',
      portfolioCardBorder: '#e7e5e4',
      portfolioCardTitleInk: '#292524',
      portfolioCardBodyInk: '#78716c'
    }
  },
  {
    id: 'monochrome',
    name: 'Pure Monochrome Editorial',
    tagline: 'Απόλυτη ασπρόμαυρη αρμονία, δυναμική γεωμετρική αντίθεση, αρχιτεκτονικές γραμμές και editorial αισθητική υψηλής ραπτικής.',
    badge: 'High Fashion',
    patch: {
      fontFamily: 'Jura, sans-serif',
      baseSize: '15px',
      pageBackground: '#ffffff',
      surface: '#ffffff',
      ink: '#09090b',
      muted: '#52525b',
      line: '#18181b',
      accent: '#09090b',
      radius: '0px',
      cardRadius: '0px',
      cardPadding: '16px',
      sectionGap: '32px',
      headerBackground: '#ffffff',
      headerInk: '#09090b',
      headerMuted: '#52525b',
      headerHeight: '76px',
      navActiveBackground: '#09090b',
      navActiveInk: '#ffffff',
      buttonBackground: '#09090b',
      buttonInk: '#ffffff',
      buttonRadius: '0px',
      badgeBackground: '#ffffff',
      badgeInk: '#09090b',
      badgeBorder: '#09090b',
      badgeRadius: '0px',
      heroMinHeight: '520px',
      heroOverlay: '0.60',
      heroTitleSize: '40px',
      heroTitleInk: '#ffffff',
      heroBodyInk: '#f4f4f5',
      portfolioCardBackground: '#ffffff',
      portfolioCardBorder: '#e4e4e7',
      portfolioCardTitleInk: '#09090b',
      portfolioCardBodyInk: '#52525b'
    }
  }
];

export function DesignStudioSettings({ value, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<StudioTab>('presets');
  const [previewMode, setPreviewMode] = useState<'shop' | 'portfolio'>('shop');
  const d = normalizeDesignStudio(value);

  const applyChanges = (next: DesignStudio) => {
    const site = document.querySelector<HTMLElement>('.aram-site');
    if (site) {
      Object.entries(designStudioCss(next)).forEach(([property, cssValue]) =>
        site.style.setProperty(property, cssValue)
      );
    }
    onChange(next);
  };

  const update = (key: keyof DesignStudio, next: string) => {
    const patch: Partial<DesignStudio> = { [key]: next };
    // Smart cascading updates when primary tokens change for harmonious identity
    if (key === 'accent') {
      patch.buttonBackground = next;
      patch.navActiveBackground = next;
    } else if (key === 'ink') {
      patch.headerInk = next;
      patch.portfolioCardTitleInk = next;
    } else if (key === 'muted') {
      patch.headerMuted = next;
      patch.portfolioCardBodyInk = next;
    } else if (key === 'line') {
      patch.badgeBorder = next;
      patch.portfolioCardBorder = next;
    }
    applyChanges({ ...d, ...patch });
  };

  const applyShapePreset = (shape: 'pill' | 'rounded' | 'sharp') => {
    if (shape === 'pill') {
      applyChanges({
        ...d,
        radius: '10px',
        cardRadius: '12px',
        buttonRadius: '9999px',
        badgeRadius: '9999px'
      });
    } else if (shape === 'rounded') {
      applyChanges({
        ...d,
        radius: '8px',
        cardRadius: '10px',
        buttonRadius: '8px',
        badgeRadius: '8px'
      });
    } else if (shape === 'sharp') {
      applyChanges({
        ...d,
        radius: '0px',
        cardRadius: '0px',
        buttonRadius: '0px',
        badgeRadius: '0px'
      });
    }
  };

  const ColorField = ({
    label,
    name,
    hint
  }: {
    label: string;
    name: keyof DesignStudio;
    hint?: string;
  }) => (
    <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-xs">
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-xs font-bold text-stone-700">{label}</label>
        {hint && <span className="text-[10px] text-stone-400">{hint}</span>}
      </div>
      <div className="flex items-center gap-2">
        <input
          aria-label={label}
          type="color"
          className="h-9 w-12 rounded cursor-pointer border border-stone-200 p-0.5 bg-stone-50"
          value={isHex(d[name]) ? d[name] : '#000000'}
          onChange={e => update(name, e.target.value)}
        />
        <input
          className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 font-mono text-xs uppercase outline-none focus:bg-white focus:border-stone-400"
          value={d[name]}
          onChange={e => update(name, e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Realistic Storefront Miniature Preview Frame */}
      <section
        aria-label="Ζωντανή προεπισκόπηση καταστήματος"
        className="overflow-hidden rounded-2xl border border-stone-300 bg-stone-900 shadow-lg"
      >
        {/* Device Frame Window Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-stone-900 text-stone-300 border-b border-stone-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="ml-2 font-mono text-[11px] text-stone-400 bg-stone-800/80 px-2.5 py-0.5 rounded-md border border-stone-700/60">
              aramcreations.gr/{previewMode}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPreviewMode('shop')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                previewMode === 'shop'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Shop (#shop)
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('portfolio')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                previewMode === 'portfolio'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Portfolio (#portfolio)
            </button>
          </div>
        </div>

        {/* Live Scaled Preview Canvas */}
        <div
          className="p-4 sm:p-5 transition-all"
          style={{
            background: d.pageBackground,
            color: d.ink,
            fontFamily: d.fontFamily
          }}
        >
          {/* Miniature Navigation Header */}
          <div
            className="flex items-center justify-between px-4 py-2.5 rounded-xl border mb-4 shadow-2xs"
            style={{
              background: d.headerBackground,
              color: d.headerInk,
              borderColor: d.line
            }}
          >
            <div className="flex items-center gap-2">
              <strong className="text-sm tracking-wide">{d.brandName}</strong>
              <span className="text-[10px] hidden sm:inline uppercase tracking-wider" style={{ color: d.headerMuted }}>
                {previewMode === 'shop' ? d.shopCaption : d.portfolioCaption}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="px-2.5 py-1 text-[11px] font-bold shadow-2xs"
                style={{
                  background: previewMode === 'shop' ? d.navActiveBackground : 'transparent',
                  color: previewMode === 'shop' ? d.navActiveInk : d.headerInk,
                  borderRadius: d.buttonRadius
                }}
              >
                Shop
              </span>
              <span
                className="px-2.5 py-1 text-[11px] font-bold border"
                style={{
                  background: previewMode === 'portfolio' ? d.navActiveBackground : 'transparent',
                  color: previewMode === 'portfolio' ? d.navActiveInk : d.headerInk,
                  borderColor: previewMode === 'portfolio' ? d.navActiveBackground : d.line,
                  borderRadius: d.buttonRadius
                }}
              >
                Portfolio
              </span>
            </div>
          </div>

          {/* Miniature Hero Banner */}
          <div
            className="rounded-xl p-5 mb-5 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-xs"
            style={{
              background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
              color: d.heroTitleInk
            }}
          >
            <span
              className="text-[9px] uppercase tracking-[0.2em] font-black mb-1 opacity-90"
              style={{ color: d.heroBodyInk }}
            >
              {previewMode === 'shop' ? 'Επίσημη Συλλογή' : 'Έκθεση Έργων Τέχνης'}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              {previewMode === 'shop' ? 'Χειροποίητες Δημιουργίες' : 'Έργα & Δημιουργίες'}
            </h3>
            <p className="text-xs max-w-md mx-auto opacity-90 leading-relaxed mb-3" style={{ color: d.heroBodyInk }}>
              {previewMode === 'shop'
                ? 'Κάθε κομμάτι είναι φτιαγμένο στο χέρι με αγάπη και έμφαση στη λεπτομέρεια.'
                : 'Γλυπτική, σχέδιο, φωτογραφία και μοναδικά αντικείμενα τέχνης.'}
            </p>
            <span
              className="px-4 py-1.5 text-xs font-bold shadow-sm"
              style={{
                background: '#ffffff',
                color: '#18181b',
                borderRadius: d.buttonRadius
              }}
            >
              {previewMode === 'shop' ? 'Ανακάλυψη Συλλογής ↓' : 'Ανάθεση Έργου'}
            </span>
          </div>

          {/* Miniature Products / Portfolio Row */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: d.ink }}>
                {previewMode === 'shop' ? 'Ενδεικτικά Προϊόντα' : 'Ενδεικτικά Έργα'}
              </span>
              <span className="text-[10px] uppercase font-bold" style={{ color: d.muted }}>
                Ζωντανή Εμφάνιση
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: With Discount Strikethrough & Badge */}
              <div
                className="border p-3.5 shadow-2xs flex flex-col justify-between"
                style={{
                  background: d.surface,
                  borderColor: d.line,
                  borderRadius: d.cardRadius
                }}
              >
                <div>
                  <div className="aspect-[4/5] bg-stone-100 rounded-lg overflow-hidden flex items-center justify-center relative mb-2.5">
                    <span className="text-xs text-stone-400 font-bold">Φωτογραφία Έργου</span>
                    {previewMode === 'shop' ? (
                      <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                        -25%
                      </span>
                    ) : (
                      <span
                        className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 border"
                        style={{
                          background: d.badgeBackground,
                          color: d.badgeInk,
                          borderColor: d.badgeBorder,
                          borderRadius: d.badgeRadius
                        }}
                      >
                        Έκθεση
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: d.muted }}>
                    {previewMode === 'shop' ? 'Κολιέ · Υγρό Γυαλί' : 'Custom Objects'}
                  </span>
                  <h4 className="font-bold text-sm mt-0.5 line-clamp-1" style={{ color: d.ink }}>
                    {previewMode === 'shop' ? 'Midnight Blossom Necklace' : 'Phone cases (Ζωγραφισμένες)'}
                  </h4>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t" style={{ borderColor: d.line }}>
                  {previewMode === 'shop' ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-base" style={{ color: d.ink }}>
                        18.00€
                      </span>
                      <span className="text-xs text-stone-400 line-through">
                        24.00€
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-stone-500">
                      Κατόπιν Επικοινωνίας
                    </span>
                  )}
                  <span
                    className="text-xs font-bold px-3 py-1 shadow-2xs"
                    style={{
                      background: d.buttonBackground,
                      color: d.buttonInk,
                      borderRadius: d.buttonRadius
                    }}
                  >
                    {previewMode === 'shop' ? 'Απόκτηση' : 'Λεπτομέρειες'}
                  </span>
                </div>
              </div>

              {/* Card 2: Regular Item */}
              <div
                className="border p-3.5 shadow-2xs flex flex-col justify-between"
                style={{
                  background: d.surface,
                  borderColor: d.line,
                  borderRadius: d.cardRadius
                }}
              >
                <div>
                  <div className="aspect-[4/5] bg-stone-100 rounded-lg overflow-hidden flex items-center justify-center relative mb-2.5">
                    <span className="text-xs text-stone-400 font-bold">Φωτογραφία Έργου</span>
                    <span
                      className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 border"
                      style={{
                        background: d.badgeBackground,
                        color: d.badgeInk,
                        borderColor: d.badgeBorder,
                        borderRadius: d.badgeRadius
                      }}
                    >
                      Διαθέσιμο
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: d.muted }}>
                    {previewMode === 'shop' ? 'Δαχτυλίδια · Ασήμι' : 'Sculptures'}
                  </span>
                  <h4 className="font-bold text-sm mt-0.5 line-clamp-1" style={{ color: d.ink }}>
                    {previewMode === 'shop' ? 'Solitary Stone Ring' : 'Paper Clay Organic Vessel'}
                  </h4>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t" style={{ borderColor: d.line }}>
                  <span className="font-bold text-base" style={{ color: d.ink }}>
                    {previewMode === 'shop' ? '32.00€' : '2024 · Έργο'}
                  </span>
                  <span
                    className="text-xs font-bold px-3 py-1 shadow-2xs"
                    style={{
                      background: d.buttonBackground,
                      color: d.buttonInk,
                      borderRadius: d.buttonRadius
                    }}
                  >
                    {previewMode === 'shop' ? 'Απόκτηση' : 'Λεπτομέρειες'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Streamlined Clean Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === 'presets'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>1. Έτοιμα Θέματα (1-Κλικ)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('palette')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === 'palette'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>2. Χρώματα & Ταυτότητα</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('typography')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === 'typography'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>3. Τυπογραφία & Στρογγυλάδες</span>
        </button>
      </div>

      {/* Tab 1: Theme Presets (1-Click) */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          <p className="text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl p-3 leading-relaxed">
            Επίλεξε ένα από τα 3 ολοκληρωμένα luxury θέματα. Κάθε θέμα ρυθμίζει αυτόματα <strong>όλα τα στοιχεία ταυτόχρονα</strong> (φόντο, γραμματοσειρά, κουμπιά, κάρτες, hero και headers) τόσο στο Shop όσο και στο Portfolio, χωρίς καμία αλληλοεπικάλυψη.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {THEME_PRESETS.map(preset => (
              <div
                key={preset.id}
                className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-black text-stone-900">{preset.name}</h4>
                  </div>
                  <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 mb-2 border border-stone-200">
                    {preset.badge}
                  </span>
                  <p className="text-xs text-stone-600 leading-relaxed mb-4">{preset.tagline}</p>
                  {/* Swatches dots */}
                  <div className="flex gap-2 mb-4">
                    <span
                      className="w-5 h-5 rounded-full border shadow-2xs"
                      title="Φόντο"
                      style={{ backgroundColor: preset.patch.pageBackground }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border shadow-2xs"
                      title="Accent / Κουμπιά"
                      style={{ backgroundColor: preset.patch.accent }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border shadow-2xs"
                      title="Κείμενο"
                      style={{ backgroundColor: preset.patch.ink }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                      applyChanges({ ...d, ...preset.patch });
                      notifyOperationSuccess('Εφαρμογή Θέματος', `Εφαρμόστηκε το θέμα «${preset.name}». Πατήστε Αποθήκευση Ρυθμίσεων για οριστικοποίηση.`);
                    }}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Εφαρμογή {preset.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Palette */}
      {activeTab === 'palette' && (
        <div className="space-y-4">
          <p className="text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl p-3 leading-relaxed">
            Ρύθμισε τα βασικά χρώματα του καταστήματος. Το σύστημα διαθέτει <strong>έξυπνο συγχρονισμό</strong>: αλλάζοντας το <em>Accent</em>, ενημερώνονται αυτόματα όλα τα κουμπιά και οι ενεργές καρτέλες. Αλλάζοντας το <em>Κείμενο</em> ή τις <em>Γραμμές</em>, ακολουθούν αυτόματα οι κάρτες και τα headers.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ColorField label="Φόντο Σελίδας" name="pageBackground" hint="Κυρίως background καταστήματος" />
            <ColorField label="Επιφάνειες / Κάρτες" name="surface" hint="Κάρτες προϊόντων και πάνελ" />
            <ColorField label="Κύριο Χρώμα Accent" name="accent" hint="Κουμπιά αγοράς και ενεργά tabs" />
            <ColorField label="Κύριο Κείμενο & Τίτλοι" name="ink" hint="Ονόματα προϊόντων και τίτλοι" />
            <ColorField label="Δευτερεύον Κείμενο" name="muted" hint="Υπότιτλοι και περιγραφές" />
            <ColorField label="Γραμμές & Περιθώρια" name="line" hint="Διαχωριστικά και περιγράμματα" />
          </div>
        </div>
      )}

      {/* Tab 3: Typography & Shapes */}
      {activeTab === 'typography' && (
        <div className="space-y-5">
          <p className="text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl p-3 leading-relaxed">
            Επίλεξε τη γραμματοσειρά και το βασικό γεωμετρικό σχήμα των κουμπιών και των καρτών με 1 κλικ, χωρίς μπερδεμένα sliders pixel.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
              <label className="block text-xs font-bold text-stone-700 mb-2">
                Οικογένεια Γραμματοσειράς
              </label>
              <select
                value={d.fontFamily}
                onChange={e => update('fontFamily', e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-xs bg-stone-50 outline-none focus:bg-white font-medium"
              >
                <option value="Jura, sans-serif">Jura (Μοντέρνα, τεχνολογική, καθαρή - MONÉ)</option>
                <option value="'Playfair Display', serif">Playfair Display (Κλασική, πολυτελής, serif)</option>
                <option value="'Cinzel', serif">Cinzel (Αρχοντική, κοσμηματοποιία, premium)</option>
                <option value="'Cormorant Garamond', serif">Cormorant Garamond (Χειροποίητη, καλλιτεχνική)</option>
                <option value="Inter, sans-serif">Inter (Μινιμαλιστική, σύγχρονη)</option>
                <option value="'Montserrat', sans-serif">Montserrat (Γεωμετρική, ευανάγνωστη)</option>
              </select>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
              <label className="block text-xs font-bold text-stone-700 mb-2">
                Σχήμα Κουμπιών & Καρτών (Shapes)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyShapePreset('pill')}
                  className="py-2.5 px-2 bg-stone-50 border border-stone-200 hover:border-stone-900 rounded-full text-xs font-bold text-stone-800 transition text-center"
                >
                  Pill (Capsule)
                </button>
                <button
                  type="button"
                  onClick={() => applyShapePreset('rounded')}
                  className="py-2.5 px-2 bg-stone-50 border border-stone-200 hover:border-stone-900 rounded-lg text-xs font-bold text-stone-800 transition text-center"
                >
                  Rounded
                </button>
                <button
                  type="button"
                  onClick={() => applyShapePreset('sharp')}
                  className="py-2.5 px-2 bg-stone-50 border border-stone-200 hover:border-stone-900 rounded-none text-xs font-bold text-stone-800 transition text-center"
                >
                  Sharp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
