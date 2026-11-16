export interface PortfolioMediaEntry {
  url: string;
  type: 'image' | 'video';
  title?: string;
  originalUrl?: string;
}

export interface PortfolioRecordForm {
  title: string;
  category: string;
  year: string;
  medium: string;
  dimensions: string;
  origin: string;
  status: string;
  description: string;
  detailsText: string;
  featured: boolean;
  inquiryOnly: boolean;
  mediaList: PortfolioMediaEntry[];
}

export function replacePortfolioImage(media: PortfolioMediaEntry[], index: number, expectedUrl: string, url: string) {
  const previous = media[index];
  if (previous?.url !== expectedUrl || previous.type !== 'image') throw new Error('Η εικόνα έχει αλλάξει. Άνοιξε ξανά το έργο.');
  return media.map((entry, position) => {
    if (position !== index) return entry;
    const { originalUrl = entry.url, ...fields } = entry;
    return url === originalUrl ? { ...fields, url } : { ...fields, url, originalUrl };
  });
}

export function portfolioMediaFields(mediaList: PortfolioMediaEntry[]) {
  const first = mediaList[0];
  if (!first) throw new Error('Χρειάζεται τουλάχιστον ένα media αρχείο.');
  return { image: first.url, imageUrl: first.url, fileType: first.type, mediaList,
    videoUrl: mediaList.find(media => media.type === 'video')?.url || '' };
}

export function buildPortfolioRecord(form: PortfolioRecordForm, updatedAt: unknown) {
  return {
    title: form.title.trim(),
    name: form.title.trim(),
    category: form.category,
    year: form.year.trim(),
    medium: form.medium.trim(),
    dimensions: form.dimensions.trim(),
    origin: form.origin.trim(),
    status: form.status.trim(),
    description: form.description.trim(),
    details: form.detailsText.split(/\r?\n/).map(line => line.trim()).filter(Boolean),
    featured: form.featured,
    inquiryOnly: form.inquiryOnly,
    ...portfolioMediaFields(form.mediaList),
    isDeleted: false,
    deletedAt: null,
    updatedAt
  };
}
