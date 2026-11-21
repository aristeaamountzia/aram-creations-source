import { normalizeDesignStudio, type DesignStudio } from '../lib/design-studio';

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
}

export function DesignStudioSettings({ value, onChange }: Props) {
  const design = normalizeDesignStudio(value);
  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h3 className="text-base font-semibold">Ταυτότητα και πλοήγηση</h3>
        <p className="mt-1 text-sm text-stone-600">Το Shop και το Portfolio χρησιμοποιούν τις ίδιες ετικέτες και το ασπρόμαυρο θέμα.</p>
      </div>
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
