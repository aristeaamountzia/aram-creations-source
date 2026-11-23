import { loadMediaImage } from './media-files';

type AiMedia = { url: string; type?: string; fileObj?: File; fileName?: string };
type LoadedImage = { img: HTMLImageElement; cleanup: () => void };

/** Keep the same three-image, 768px JPEG input for both admin workspaces. */
export async function prepareAiImages(media: AiMedia[], loadImage = loadMediaImage): Promise<string[]> {
  const selected = media.filter(item => item.type !== 'video' && (item.url || item.fileObj)).slice(0, 3);
  return Promise.all(selected.map(async (item, index) => {
    let loaded: LoadedImage | undefined;
    try {
      loaded = await loadImage(item);
      const { img } = loaded;
      if (!img.width || !img.height) throw new Error('Η εικόνα δεν έχει έγκυρες διαστάσεις.');
      const ratio = Math.min(768 / img.width, 768 / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(Math.round(img.width * ratio), 1);
      canvas.height = Math.max(Math.round(img.height * ratio), 1);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Ο browser δεν διαθέτει canvas για προετοιμασία εικόνας.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.78);
    } catch (error) {
      throw new Error(`Δεν ετοιμάστηκε η εικόνα ${index + 1} για το AI: ${error instanceof Error ? error.message : 'Αποτυχία ανάγνωσης εικόνας.'}`);
    } finally {
      loaded?.cleanup();
    }
  }));
}
