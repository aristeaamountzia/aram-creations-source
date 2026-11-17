import { validateMediaFile } from '../../lib/media-validation';

export const compressImage = async (file: File): Promise<File> => {
    const detected = await validateMediaFile(file, 'image');
    // Canvas converts animated GIFs into one still frame. Keep GIFs intact.
    if (detected.mime === 'image/gif') {
        if (file.size > 30 * 1024 * 1024) throw new Error('Το GIF πρέπει να είναι έως 30 MB.');
        return file;
    }
    return new Promise<File>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Δεν διαβάστηκε η εικόνα.'));
        reader.onabort = () => reject(new Error('Η ανάγνωση εικόνας ακυρώθηκε.'));
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Δεν άνοιξε η εικόνα. Επίλεξε έγκυρο JPG, PNG, WebP, AVIF ή GIF.'));
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max_size = 1200;

                if (width > height) {
                    if (width > max_size) {
                        height *= max_size / width;
                        width = max_size;
                    }
                } else {
                    if (height > max_size) {
                        width *= max_size / height;
                        height = max_size;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Δεν ξεκίνησε η επεξεργασία εικόνας.')); return; }
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob?.size) { reject(new Error('Δεν δημιουργήθηκε έγκυρη εικόνα.')); return; }
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', 0.8);
            };
        };
    });
};

export const compressImageBlob = async (blob: Blob, maxSize = 1400, quality = 0.85): Promise<Blob> => {
    if (!blob || !/^image\//i.test(blob.type || '')) return blob;
    if (blob.type === 'image/gif') return blob;

    return new Promise<Blob>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            try {
                let width = img.naturalWidth || img.width;
                let height = img.naturalHeight || img.height;
                const ratio = Math.min(1, maxSize / Math.max(width, height));
                width = Math.max(1, Math.round(width * ratio));
                height = Math.max(1, Math.round(height * ratio));

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((compressedBlob) => {
                    URL.revokeObjectURL(objectUrl);
                    resolve(compressedBlob || blob);
                }, 'image/jpeg', quality);
            } catch (err) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Δεν συμπιέστηκε η εικόνα.'));
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Η εικόνα δεν αποκωδικοποιείται.'));
        };
        img.src = objectUrl;
    });
};
