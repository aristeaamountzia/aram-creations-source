export const MAX_CV_BYTES = 3 * 1024 * 1024;
export function validateBiography(value: unknown) {
  if (typeof value !== 'string' || value.length > 12000) throw new Error('Η παρουσίαση πρέπει να έχει έως 12.000 χαρακτήρες.');
  return value.trim();
}
export async function validateCv(file: File) {
  if (!file.size || file.size > MAX_CV_BYTES) throw new Error('Ανέβασε βιογραφικό PDF έως 3 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('Το βιογραφικό πρέπει να είναι έγκυρο αρχείο PDF.');
  return bytes;
}
