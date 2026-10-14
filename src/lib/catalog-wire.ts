// Explicit tagged tuples avoid collisions with arbitrary legacy object keys.
export function wire(value: any): any {
  if (value === undefined) return ['undefined'];
  if (value === null || typeof value !== 'object') return ['value', value];
  if (value._methodName && typeof value._toFieldTransform === 'function') {
    const name = value._methodName;
    if (!['serverTimestamp', 'deleteField', 'increment', 'arrayUnion', 'arrayRemove'].includes(name)) throw Error('Unsupported Firestore transform.');
    return ['transform', name, wire(value._operand ?? value._elements)];
  }
  if (value instanceof Date) return ['date', value.toISOString()];
  if (typeof value.toMillis === 'function' && Number.isInteger(value.seconds)) return ['timestamp', value.seconds, value.nanoseconds];
  if (typeof value.latitude === 'number' && typeof value.longitude === 'number' && value.constructor.name === 'GeoPoint') return ['geo', value.latitude, value.longitude];
  if (typeof value.toBase64 === 'function') return ['bytes', value.toBase64()];
  if (value instanceof Uint8Array) return ['bytes', btoa(Array.from(value).map(v => String.fromCharCode(v)).join(''))];
  if (value.path && value.firestore && value.id) return ['reference', value.path];
  if (Array.isArray(value)) return ['array', value.map(wire)];
  return ['map', Object.keys(value).sort().map(key => [key, wire(value[key])])];
}
export const wireEqual = (a: any, b: any) => JSON.stringify(wire(a)) === JSON.stringify(wire(b));
export type CatalogOperation = { method: 'set' | 'update' | 'delete' | 'sync'; path: string; data?: any; merge?: boolean; mergeFields?: string[] };

export function projectionPath(path: string) {
  const parts = path.split('/');
  if (parts.length !== 2) return null;
  return parts[0] === 'jewelry' ? `publicCatalog/${parts[1]}` : parts[0] === 'portfolio' ? `publicPortfolio/${parts[1]}` : path === 'settings/shop' ? 'publicSettings/shop' : null;
}
