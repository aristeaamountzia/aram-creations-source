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

export function buildPortfolioRecord(form: PortfolioRecordForm, updatedAt: unknown) {
  const first = form.mediaList[0];
  if (!first) throw new Error('Χρειάζεται τουλάχιστον ένα media αρχείο.');
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
    image: first.url,
    imageUrl: first.url,
    fileType: first.type,
    mediaList: form.mediaList.map(media => ({ ...media })),
    videoUrl: first.type === 'video' ? first.url : form.mediaList.find(media => media.type === 'video')?.url || '',
    isDeleted: false,
    deletedAt: null,
    updatedAt
  };
}
