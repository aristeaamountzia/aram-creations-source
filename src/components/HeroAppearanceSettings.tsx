import { galleryHeroFields, type HeroAppearance } from '../lib/hero-appearance';

export function HeroAppearanceSettings({ value = {}, onChange }: { value?: HeroAppearance; onChange: (value: HeroAppearance) => void }) {
  return <section className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
    <h3 className="text-sm font-bold">Εμφάνιση Hero</h3>
    <div className="grid sm:grid-cols-2 gap-4">
      {galleryHeroFields.map(([key, label, unit, min, max]) => (
        <label key={key} className="text-sm space-y-1">
          <span className="block">{label}{unit && ' (px)'}</span>
          <input type="number" min={min} max={max} step={key === 'heroOverlay' ? 0.05 : 1}
            placeholder="Αυτόματο" value={value[key] ? parseFloat(value[key]) : ''}
            onChange={event => {
              const raw = event.target.value;
              onChange({ ...value, [key]: raw === '' ? '' : raw + unit });
            }}
            className="w-full rounded-lg border p-2" />
        </label>
      ))}
    </div>
    <button type="button" className="text-sm underline" onClick={() => onChange({
      ...value, ...Object.fromEntries(galleryHeroFields.map(([key]) => [key, ''])),
    })}>Επαναφορά αυτόματης διάταξης</button>
  </section>;
}
