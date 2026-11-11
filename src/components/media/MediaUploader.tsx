import type { ChangeEvent, ReactNode } from 'react';

interface MediaUploaderProps {
  label: ReactNode;
  help?: ReactNode;
  disabled?: boolean;
  inputClassName?: string;
  onFiles: (files: File[]) => void | Promise<void>;
}

export function MediaUploader({ label, help, disabled, inputClassName, onFiles }: MediaUploaderProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (files.length) void onFiles(files);
  };

  return (
    <div>
      <label className="block text-xs font-bold text-stone-600 mb-1">{label}</label>
      {help && <div className="mb-2 text-xs text-stone-500">{help}</div>}
      <input
        type="file"
        accept="image/*,video/*"
        multiple
        disabled={disabled}
        className={inputClassName || 'w-full border border-stone-300 rounded-lg px-4 py-2.5 bg-white cursor-pointer'}
        onChange={handleChange}
      />
    </div>
  );
}
