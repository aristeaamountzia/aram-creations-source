import { prepareImageUpload } from '../../lib/image-upload';

export const compressImage = (file: File): Promise<File> => prepareImageUpload(file, 1200, 0.8);

export const compressImageBlob = async (blob: Blob, maxSize = 1400, quality = 0.85): Promise<Blob> => {
  if (!blob || !/^image\//i.test(blob.type || '')) return blob;
  return prepareImageUpload(new File([blob], 'imported-image', { type: blob.type }), maxSize, quality);
};
