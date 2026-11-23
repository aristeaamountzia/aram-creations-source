export type AspectRatio = 'free' | '1:1' | '4:5' | '16:9';
const cropRatios = { '1:1': 1, '4:5': 4 / 5, '16:9': 16 / 9 };

export function imageCropSize(imageWidth: number, imageHeight: number, rotation: number, aspect: AspectRatio) {
  const sideways = Math.abs(rotation % 180) === 90;
  const width = sideways ? imageHeight : imageWidth;
  const height = sideways ? imageWidth : imageHeight;
  const ratio = aspect === 'free' ? width / height : cropRatios[aspect];
  return { width: Math.min(width, height * ratio), height: Math.min(height, width / ratio) };
}
