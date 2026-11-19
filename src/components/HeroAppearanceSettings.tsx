import type { HeroAppearance } from '../lib/hero-appearance';
import { DEFAULT_DESIGN_STUDIO, type DesignStudio } from '../lib/design-studio';

export function HeroAppearanceSettings({ value = {}, defaults = DEFAULT_DESIGN_STUDIO, onChange }: { value?: HeroAppearance; defaults?: DesignStudio; onChange: (value: HeroAppearance) => void }) {
  const fields = [ ['heroTitleSize', 'Μέγεθος τίτλου', 'px', 20, 120], ['heroMinHeight', 'Ύψος Hero', 'px', 280, 1200], ['heroContentWidth', 'Πλάτος κειμένου', 'px', 280, 1600], ['heroTopPadding', 'Επάνω περιθώριο', 'px', 16, 240], ['heroBottomPadding', 'Κάτω περιθώριο', 'px', 16, 240], ['heroOverlay', 'Σκοτεινότητα βίντεο (0–1)', '', 0, 1] ] as const;
  return <section className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
    <h3 className="text-sm font-bold">Εμφάνιση Hero</h3>
    <div className="grid sm:grid-cols-2 gap-4">
      {fields.map(([key, label, unit, min, max]) => <label key={key} className="text-xs space-y-1"><span className="block">{label}</span><input type="number" min={min} max={max} step={key === 'heroOverlay' ? 0.05 : 1} value={parseFloat(value[key] || defaults[key])} onChange={event => { const number = Number(event.target.value); if (Number.isFinite(number) && number >= min && number <= max) onChange({ ...value, [key]: `${number}${unit}` }); }} className="w-full rounded-lg border p-2" /></label>)}
      {([['heroTitleInk', 'Χρώμα τίτλου'], ['heroBodyInk', 'Χρώμα υποτίτλου']] as const).map(([key, label]) => <label key={key} className="text-xs flex items-center justify-between">{label}<input type="color" value={value[key] || defaults[key]} onChange={event => onChange({ ...value, [key]: event.target.value })} /></label>)}
    </div>
    <button type="button" className="text-xs underline" onClick={() => onChange({})}>Χρήση κοινών ρυθμίσεων Design Studio</button>
  </section>;
}
