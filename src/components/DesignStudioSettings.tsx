import { normalizeDesignStudio, visualThemes, type DesignStudio, type VisualTheme } from '../lib/design-studio';

const themeNames: Record<VisualTheme, string> = { atelier: 'Atelier', classic: 'Κλασικό', modern: 'Modern · Inter' };

const labels = [
  ['brandName', 'Όνομα μάρκας'],
  ['shopNavLabel', 'Ετικέτα Shop'],
  ['portfolioNavLabel', 'Ετικέτα Portfolio'],
  ['cartLabel', 'Ετικέτα καλαθιού'],
  ['contactLabel', 'Ετικέτα επικοινωνίας'],
] as const;

interface Props {
  value?: Partial<DesignStudio>;
  onChange: (value: DesignStudio) => void;
  theme: VisualTheme;
  onThemeChange: (value: VisualTheme) => void;
}

export function DesignStudioSettings({ value, onChange, theme, onThemeChange }: Props) {
  const design = normalizeDesignStudio(value);
  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <label className="block text-base font-semibold" htmlFor="site-visual-theme">Θέμα ιστοτόπου</label>
        <select id="site-visual-theme" value={theme} onChange={event => {
          const selected = visualThemes.find(option => option === event.target.value);
          if (selected) onThemeChange(selected);
        }} className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 sm:max-w-xs">
          {visualThemes.map(option => <option key={option} value={option}>{themeNames[option]}</option>)}
        </select>
        <p className="mt-2 text-sm text-stone-600">Εφαρμόζεται στο Shop, στο Portfolio και στο Back Office μετά την αποθήκευση.</p>
      </div>
      <div className="studio-theme-preview" data-visual-theme={theme}>
        <strong>{design.brandName}</strong>
        <p>{design.shopCaption}</p>
        <span>{design.shopNavLabel}</span>
      </div>
      <h3 className="text-base font-semibold">Ταυτότητα και πλοήγηση</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {labels.map(([key, label]) => (
          <label key={key} className="space-y-1 text-sm">
            <span className="block font-medium">{label}</span>
            <input type="text" maxLength={70} value={design[key]} onChange={event => onChange({ ...design, [key]: event.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
        ))}
      </div>
    </section>
  );
}
