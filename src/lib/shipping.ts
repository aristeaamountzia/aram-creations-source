export interface ShippingSettings {
  boxnowPrice: number;
  boxnowFreeThreshold: number;
  courierPrice: number;
  courierFreeThreshold: number;
  customNotes?: string;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  boxnowPrice: 2.5, boxnowFreeThreshold: 45,
  courierPrice: 4, courierFreeThreshold: 50, customNotes: ''
};

export function normalizeShippingSettings(raw?: Partial<ShippingSettings> | null): ShippingSettings {
  const amount = (value: unknown, fallback: number) => {
    if (value == null || value === '') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : fallback;
  };
  return {
    boxnowPrice: amount(raw?.boxnowPrice, DEFAULT_SHIPPING_SETTINGS.boxnowPrice),
    boxnowFreeThreshold: amount(raw?.boxnowFreeThreshold, DEFAULT_SHIPPING_SETTINGS.boxnowFreeThreshold),
    courierPrice: amount(raw?.courierPrice, DEFAULT_SHIPPING_SETTINGS.courierPrice),
    courierFreeThreshold: amount(raw?.courierFreeThreshold, DEFAULT_SHIPPING_SETTINGS.courierFreeThreshold),
    customNotes: String(raw?.customNotes || '')
  };
}
