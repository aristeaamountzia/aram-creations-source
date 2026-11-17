/// <reference lib="webworker" />
const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = async ({ data: file }: MessageEvent<File>) => {
  let images: any[] = [];
  try {
    const url = new URL('/codecs/heif-1.23.5/libheif-bundle.mjs', location.origin).href;
    const { default: factory } = await import(/* @vite-ignore */ url);
    const lib = await factory();
    images = new lib.HeifDecoder().decode(new Uint8Array(await file.arrayBuffer()));
    const image = images[0];
    if (!image) throw new Error('Το HEIC/HEIF δεν περιέχει αναγνώσιμη εικόνα.');
    const width = image.get_width(), height = image.get_height();
    if (width <= 0 || height <= 0 || width * height > 100_000_000) throw new Error('Οι διαστάσεις HEIC/HEIF δεν είναι έγκυρες ή υπερβαίνουν τα 100 megapixel.');
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Δεν ξεκίνησε η αποκωδικοποίηση HEIC/HEIF.');
    const pixels = context.createImageData(width, height);
    await new Promise<void>((resolve, reject) => image.display(pixels, (result: unknown) => result ? resolve() : reject(new Error('Απέτυχε η αποκωδικοποίηση HEIC/HEIF.'))));
    context.putImageData(pixels, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    scope.postMessage({ blob });
  } catch (error) {
    scope.postMessage({ error: error instanceof Error ? error.message : String(error) });
  } finally {
    for (const image of images) image.free?.();
  }
};
export {};
