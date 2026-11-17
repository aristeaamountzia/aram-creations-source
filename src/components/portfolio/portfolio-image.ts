import { prepareImageUpload } from '../../lib/image-upload';

export const compressPortfolioImage = (file: File): Promise<File> => prepareImageUpload(file, 1600, 0.85, true);
