import React, { useState } from 'react';
import {
  DEFAULT_DESIGN_STUDIO,
  DesignStudio,
  designStudioCss,
  normalizeDesignStudio
} from '../lib/design-studio';

type Props = {
  value?: Partial<DesignStudio>;
  onChange: (value: DesignStudio) => void;
};

type StudioTab = 'presets' | 'palette' | 'typography' | 'header' | 'cards' | 'hero';

const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

const CURATED_PALETTES = [
  { name: 'Χρυσό / Gold', hex: '#c9a35e' },
  { name: 'Κάρβουνο / Charcoal', hex: '#1c1917' },
  { name: 'Ζεστό Λινό / Warm Linen', hex: '#f7f4ed' },
  { name: 'Σύγχρονο Μπλε / Classic Blue', hex: '#2563eb' },
  { name: 'Τερακότα / Terracotta', hex: '#b45309' },
  { name: 'Σμαράγδι / Emerald', hex: '#059669' },
  { name: 'Βιολετί / Royal Violet', hex: '#6253ae' },
  { name: 'Γραφίτης / Slate', hex: '#334155' }
];

const THEME_PRESETS: Array<{
  id: string;
  name: string;
  tagline: string;
  badge: string;
  patch: Partial<DesignStudio>;
}> = [
  {
    id: 'atelier',
    name: 'Atelier Classic',
    tagline: 'Ζεστό εργαστήριο, εκλεπτυσμένη κομψότητα, χρυσές λεπτομέρειες.',
    badge: 'Προτεινόμενο',
    patch: {
      fontFamily: "'Playfair Display', serif",
      baseSize: '16px',
      pageBackground: '#f7f4ed',
      surface: '#fffdfa',
      ink: '#292524',
      muted: '#78716c',
      line: '#e7e5e4',
      accent: '#c9a35e',
      radius: '14px',
      cardRadius: '14px',
      cardPadding: '20px',
      headerBackground: '#1c1917',
      headerInk: '#fffdfa',
      headerMuted: '#c8c0b5',
      navActiveBackground: '#f7f4ed',
      navActiveInk: '#1c1917',
      buttonBackground: '#1c1917',
      buttonInk: '#ffffff',
      buttonRadius: '10px',
      badgeBackground: '#f5f1e9',
      badgeInk: '#1c1917',
      badgeBorder: '#e7e5e4',
      heroOverlay: '0.50',
      heroTitleSize: '42px',
      heroTitleInk: '#ffffff',
      heroBodyInk: '#f5f5f4'
    }
  },
  {
    id: 'dark-luxury',
    name: 'Dark Luxury & Gold',
    tagline: 'Μυστηριώδες μαύρο με λαμπερές χρυσές λεπτομέρειες.',
    badge: 'Luxury',
    patch: {
      fontFamily: "'Cinzel', serif",
      baseSize: '16px',
      pageBackground: '#0d0d0e',
      surface: '#18181b',
      ink: '#f4f4f5',
      muted: '#a1a1aa',
      line: '#27272a',
      accent: '#d4af37',
      radius: '10px',
      cardRadius: '10px',
      cardPadding: '20px',
      headerBackground: '#09090b',
      headerInk: '#f4f4f5',
      headerMuted: '#a1a1aa',
      navActiveBackground: '#d4af37',
      navActiveInk: '#09090b',
      buttonBackground: '#d4af37',
      buttonInk: '#09090b',
      buttonRadius: '8px',
      badgeBackground: '#27272a',
      badgeInk: '#d4af37',
      badgeBorder: '#3f3f46',
      heroOverlay: '0.65',
      heroTitleSize: '40px',
      heroTitleInk: '#ffffff',
      heroBodyInk: '#d4d4d8',
      portfolioCardBackground: '#18181b',
      portfolioCardBorder: '#27272a',
      portfolioCardTitleInk: '#f4f4f5',
      portfolioCardBodyInk: '#a1a1aa'
    }
  },
  {
    id: 'minimal-modern',
    name: 'Minimal Clean Studio',
    tagline: 'Καθαρό λευκό, μοντέρνο Inter sans-serif, ευανάγνωστο και αέρινο.',
    badge: 'Minimal',
    patch: {
      fontFamily: 'Inter, sans-serif',
      baseSize: '15px',
      pageBackground: '#ffffff',
      surface: '#f9fafb',
      ink: '#111827',
      muted: '#6b7280',
      line: '#e5e7eb',
      accent: '#2563eb',
      radius: '12px',
      cardRadius: '12px',
      cardPadding: '18px',
      headerBackground: '#ffffff',
      headerInk: '#111827',
      headerMuted: '#6b7280',
      navActiveBackground: '#111827',
      navActiveInk: '#ffffff',
      buttonBackground: '#111827',
      buttonInk: '#ffffff',
      buttonRadius: '8px',
      badgeBackground: '#f3f4f6',
      badgeInk: '#1f2937',
      badgeBorder: '#e5e7eb',
      heroOverlay: '0.40',
      heroTitleSize: '38px',
      heroTitleInk: '#ffffff',
      heroBodyInk: '#f3f4f6'
    }
  },
  {
    id: 'pure-craft',
    name: 'Artisanal Earth',
    tagline: 'Γήινοι τόνοι τερακότας, λινά υφάσματα και κλασική γραμματοσειρά.',
    badge: 'Craft',
    patch: {
      fontFamily: "'Cormorant Garamond', serif",
      baseSize: '16px',
      pageBackground: '#f4efe8',
      surface: '#faf7f2',
      ink: '#3f3935',
      muted: '#857971',
      line: '#ded5ca',
      accent: '#b45309',
      radius: '16px',
      cardRadius: '16px',
      cardPadding: '22px',
      headerBackground: '#2b2623',
      headerInk: '#faf7f2',
      headerMuted: '#c5bcb4',
      navActiveBackground: '#f4efe8',
      navActiveInk: '#2b2623',
      buttonBackground: '#9a3412',
      buttonInk: '#ffffff',
      buttonRadius: '12px',
      badgeBackground: '#ede5db',
      badgeInk: '#9a3412',
      badgeBorder: '#ded5ca',
      heroOverlay: '0.48',
      heroTitleSize: '44px',
      heroTitleInk: '#ffffff',
      heroBodyInk: '#fef3c7'
    }
  }
];

export function DesignStudioSettings({ value, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<StudioTab>('presets');
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

  const update = (key: keyof DesignStudio, next: string) =>
    applyChanges({ ...d, [key]: next });

  const parseNumber = (val: string, fallback: number = 0) => {
    const n = Number.parseFloat(val);
    return Number.isNaN(n) ? fallback : n;
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
      {/* Quick Swatches Bar */}
      <div className="flex gap-1 mt-2 pt-2 border-t border-stone-100">
        {CURATED_PALETTES.slice(0, 5).map(swatch => (
          <button
            key={swatch.hex}
            type="button"
            title={swatch.name}
            onClick={() => update(name, swatch.hex)}
            className="w-4 h-4 rounded-full border border-stone-300 transition-transform hover:scale-125"
            style={{ backgroundColor: swatch.hex }}
          />
        ))}
      </div>
    </div>
  );

  const SliderField = ({
    label,
    name,
    min,
    max,
    step = 1,
    unit = 'px'
  }: {
    label: string;
    name: keyof DesignStudio;
    min: number;
    max: number;
    step?: number;
    unit?: string;
  }) => {
    const raw = parseNumber(d[name], min);
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-stone-700">{label}</label>
          <span className="text-xs font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
            {d[name]}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={raw}
          onChange={e => update(name, `${e.target.value}${unit}`)}
          className="w-full accent-stone-900 cursor-pointer mt-2"
        />
      </div>
    );
  };

  const OpacityField = ({
    label,
    name
  }: {
    label: string;
    name: keyof DesignStudio;
  }) => {
    const percent = Math.round(parseNumber(d[name], 0.5) * 100);
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-stone-700">{label}</label>
          <span className="text-xs font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
            {percent}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={percent}
          onChange={e => update(name, String((Number(e.target.value) / 100).toFixed(2)))}
          className="w-full accent-stone-900 cursor-pointer mt-2"
        />
      </div>
    );
  };

  const TextField = ({
    label,
    name,
    placeholder
  }: {
    label: string;
    name: keyof DesignStudio;
    placeholder?: string;
  }) => (
    <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-xs">
      <label className="block text-xs font-bold text-stone-700 mb-1">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs bg-stone-50 outline-none focus:bg-white focus:border-stone-400"
        value={d[name]}
        onChange={e => update(name, e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 text-xs leading-relaxed text-violet-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <strong className="text-sm font-black text-violet-900">
            Aram Design Studio & Presets
          </strong>
          <p className="mt-0.5 text-violet-800 text-xs">
            Πλήρης έλεγχος της εμφάνισης του Shop και του Portfolio με 1 κλικ ή αναλυτικά sliders.
            Όλες οι αλλαγές εμφανίζονται αμέσως στην προεπισκόπηση.
          </p>
        </div>
        <button
          type="button"
          onClick={() => applyChanges(DEFAULT_DESIGN_STUDIO)}
          className="shrink-0 px-3 py-1.5 bg-white border border-violet-200 text-violet-800 font-bold rounded-lg text-xs hover:bg-violet-100 transition shadow-xs"
        >
          Επαναφορά Αρχικών
        </button>
      </div>

      {/* Interactive Live Preview Box */}
      <section
        aria-label="Ζωντανή προεπισκόπηση"
        className="overflow-hidden rounded-2xl border border-stone-300 shadow-md transition-all"
        style={{
          background: d.pageBackground,
          color: d.ink,
          fontFamily: d.fontFamily
        }}
      >
        {/* Mock Header */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-3 border-b border-black/5"
          style={{
            minHeight: d.headerHeight,
            background: d.headerBackground,
            color: d.headerInk
          }}
        >
          <div>
            <strong className="text-base tracking-wide">{d.brandName}</strong>
            <span className="ml-2 text-[10px] uppercase tracking-wider" style={{ color: d.headerMuted }}>
              {d.shopCaption}
            </span>
          </div>
          <div className="flex gap-2">
            <span
              className="rounded-lg px-3 py-1.5 text-xs font-bold transition"
              style={{
                background: d.navActiveBackground,
                color: d.navActiveInk
              }}
            >
              {d.shopNavLabel}
            </span>
            <span
              className="rounded-lg px-3 py-1.5 text-xs font-bold border"
              style={{ borderColor: `${d.headerInk}30`, color: d.headerInk }}
            >
              {d.portfolioNavLabel}
            </span>
          </div>
        </div>

        {/* Mock Hero + Mock Card */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6 items-center">
          {/* Hero Banner */}
          <div
            className="rounded-xl p-6 relative overflow-hidden flex flex-col justify-center shadow-sm"
            style={{
              minHeight: Math.min(Number.parseInt(d.heroMinHeight, 10) || 280, 240),
              background: `linear-gradient(rgba(0, 0, 0, ${d.heroOverlay}), rgba(0, 0, 0, ${d.heroOverlay})), ${d.accent}`,
              color: d.heroTitleInk
            }}
          >
            <span
              className="text-[10px] uppercase tracking-[0.2em] font-black"
              style={{ color: d.heroBodyInk }}
            >
              Aram Creations
            </span>
            <strong
              className="mt-1 font-bold leading-tight"
              style={{ fontSize: `min(${d.heroTitleSize}, 26px)` }}
            >
              Χειροποίητες Δημιουργίες
            </strong>
            <p className="mt-1.5 text-xs opacity-90 max-w-sm" style={{ color: d.heroBodyInk }}>
              Μοναδικά κοσμήματα από υγρό γυαλί, ασήμι 925 και αποξηραμένα άνθη.
            </p>
            <button
              type="button"
              className="mt-4 self-start text-xs font-bold transition shadow-sm hover:opacity-90"
              style={{
                background: d.buttonBackground,
                color: d.buttonInk,
                borderRadius: d.buttonRadius,
                padding: `${d.buttonPaddingY} ${d.buttonPaddingX}`
              }}
            >
              Δείτε τη Συλλογή
            </button>
          </div>

          {/* Mock Product / Portfolio Card */}
          <div
            className="rounded-xl border p-4 shadow-sm transition"
            style={{
              background: d.surface,
              borderColor: d.line,
              borderRadius: d.cardRadius
            }}
          >
            <div className="aspect-[4/3] bg-stone-200 rounded-lg overflow-hidden flex items-center justify-center relative mb-3">
              <span className="text-xs text-stone-500 font-bold">Φωτογραφία Έργου</span>
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
              Κολιέ · Υγρό Γυαλί
            </span>
            <h4 className="font-bold text-sm mt-0.5" style={{ color: d.ink }}>
              Midnight Blossom Necklace
            </h4>
            <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: d.line }}>
              <span className="font-bold text-base" style={{ color: d.ink }}>
                45.00€
              </span>
              <span
                className="text-xs font-bold px-3 py-1 shadow-xs"
                style={{
                  background: d.buttonBackground,
                  color: d.buttonInk,
                  borderRadius: d.buttonRadius
                }}
              >
                Απόκτηση
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-stone-200 pb-2">
        {(
          [
            ['presets', 'Προεπιλογές Στιλ (Presets)'],
            ['palette', 'Χρώματα & Παλέτα'],
            ['typography', 'Τυπογραφία & Μεγέθη'],
            ['header', 'Κεφαλίδα & Μενού'],
            ['cards', 'Κάρτες & Badges'],
            ['hero', 'Hero Αρχικής & Βίντεο']
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === tab
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Theme Presets (1-Click) */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          <p className="text-xs text-stone-500">
            Επίλεξε ένα από τα έτοιμα curated στιλ για άμεση αλλαγή ολόκληρου του καταστήματος με 1
            κλικ:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THEME_PRESETS.map(preset => (
              <div
                key={preset.id}
                className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-base font-black text-stone-900">{preset.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed mb-4">{preset.tagline}</p>
                  {/* Mini Palette Dots */}
                  <div className="flex gap-2 mb-4">
                    <span
                      className="w-5 h-5 rounded-full border shadow-xs"
                      style={{ backgroundColor: preset.patch.pageBackground }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border shadow-xs"
                      style={{ backgroundColor: preset.patch.headerBackground }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border shadow-xs"
                      style={{ backgroundColor: preset.patch.accent }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border shadow-xs"
                      style={{ backgroundColor: preset.patch.buttonBackground }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => applyChanges({ ...d, ...preset.patch })}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ColorField label="Φόντο Σελίδας" name="pageBackground" hint="Κυρίως background" />
          <ColorField label="Επιφάνειες / Κάρτες" name="surface" hint="Κάρτες και πάνελ" />
          <ColorField label="Κύριο Κείμενο" name="ink" hint="Τίτλοι και ονόματα" />
          <ColorField label="Δευτερεύον Κείμενο" name="muted" hint="Υπότιτλοι & περιγραφές" />
          <ColorField label="Γραμμές & Περιθώρια" name="line" hint="Borders και διαχωριστικά" />
          <ColorField label="Κύριο Χρώμα Accent" name="accent" hint="Τόνος επωνυμίας" />
        </div>
      )}

      {/* Tab 3: Typography */}
      {activeTab === 'typography' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
              <label className="block text-xs font-bold text-stone-700 mb-2">
                Οικογένεια Γραμματοσειράς
              </label>
              <select
                value={d.fontFamily}
                onChange={e => update('fontFamily', e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs bg-stone-50 outline-none focus:bg-white"
              >
                <option value="Jura, sans-serif">Jura (Μοντέρνα, τεχνολογική, καθαρή)</option>
                <option value="'Playfair Display', serif">Playfair Display (Κλασική, πολυτελής, serif)</option>
                <option value="'Cinzel', serif">Cinzel (Αρχοντική, κοσμηματοποιία, premium)</option>
                <option value="'Cormorant Garamond', serif">Cormorant Garamond (Χειροποίητη, καλλιτεχνική)</option>
                <option value="Inter, sans-serif">Inter (Μινιμαλιστική, σύγχρονη)</option>
                <option value="'Montserrat', sans-serif">Montserrat (Γεωμετρική, ευανάγνωστη)</option>
              </select>
            </div>
            <SliderField label="Βασικό Μέγεθος Κειμένου" name="baseSize" min={13} max={20} unit="px" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SliderField label="Απόσταση Τμημάτων (Section Gap)" name="sectionGap" min={16} max={64} unit="px" />
            <SliderField label="Γενική Ακτίνα Καμπυλότητας" name="radius" min={0} max={28} unit="px" />
          </div>
        </div>
      )}

      {/* Tab 4: Header & Nav */}
      {activeTab === 'header' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ColorField label="Header Φόντο" name="headerBackground" />
            <ColorField label="Header Κείμενο" name="headerInk" />
            <ColorField label="Header Δευτερεύον" name="headerMuted" />
            <ColorField label="Ενεργό Tab Φόντο" name="navActiveBackground" />
            <ColorField label="Ενεργό Tab Κείμενο" name="navActiveInk" />
            <SliderField label="Ύψος Header" name="headerHeight" min={54} max={110} unit="px" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Όνομα Brand" name="brandName" placeholder="aram.creations" />
            <TextField label="Υπότιτλος Shop" name="shopCaption" placeholder="Χειροποίητα κοσμήματα" />
            <TextField label="Κουμπί Shop" name="shopNavLabel" placeholder="Shop" />
            <TextField label="Κουμπί Portfolio" name="portfolioNavLabel" placeholder="Portfolio" />
          </div>
        </div>
      )}

      {/* Tab 5: Cards & Badges */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SliderField label="Ακτίνα Καρτών (Border Radius)" name="cardRadius" min={0} max={32} unit="px" />
            <SliderField label="Εσωτερικό Padding Καρτών" name="cardPadding" min={10} max={36} unit="px" />
            <SliderField label="Ακτίνα Κουμπιών (Button Radius)" name="buttonRadius" min={0} max={32} unit="px" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ColorField label="Badge Φόντο" name="badgeBackground" />
            <ColorField label="Badge Κείμενο" name="badgeInk" />
            <ColorField label="Badge Περίγραμμα" name="badgeBorder" />
            <SliderField label="Badge Ακτίνα" name="badgeRadius" min={0} max={20} unit="px" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ColorField label="Κύριο Κουμπί Φόντο" name="buttonBackground" />
            <ColorField label="Κύριο Κουμπί Κείμενο" name="buttonInk" />
          </div>
        </div>
      )}

      {/* Tab 6: Hero & Media */}
      {activeTab === 'hero' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <OpacityField label="Σκούρυνση Video Hero (Overlay)" name="heroOverlay" />
            <SliderField label="Ελάχιστο Ύψος Hero" name="heroMinHeight" min={250} max={700} unit="px" />
            <SliderField label="Μέγεθος Τίτλου Hero" name="heroTitleSize" min={24} max={56} unit="px" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ColorField label="Χρώμα Τίτλου Hero" name="heroTitleInk" />
            <ColorField label="Χρώμα Υπότιτλου Hero" name="heroBodyInk" />
          </div>
        </div>
      )}
    </div>
  );
}
