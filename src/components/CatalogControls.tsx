import React from 'react';
import { Search, X } from 'lucide-react';

interface CatalogControlsProps {
  label: string;
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  categories: { id: string; label: string; count?: number }[];
  selectedCategory: string;
  onCategory: (id: string) => void;
  actions: React.ReactNode;
  children?: React.ReactNode;
  accent?: string;
}

/** The same layout and controls serve both public catalogs and their editors. */
export function CatalogControls({ label, search, onSearch, placeholder, categories, selectedCategory, onCategory, actions, children, accent }: CatalogControlsProps) {
  return <section aria-label={label} className="catalog-controls" style={accent ? { '--ui-accent': accent } as React.CSSProperties : undefined}>
    {categories.length > 0 && <nav aria-label={`${label} — κατηγορίες`} className="catalog-categories horizontal-scrollbar">
      {categories.map(category => <button key={category.id} type="button" aria-pressed={selectedCategory === category.id} onClick={() => onCategory(category.id)}>
        {category.label}{category.count !== undefined && <span className="catalog-count">{category.count}</span>}
      </button>)}
    </nav>}
    <div className="catalog-filter-panel">
      <div className="catalog-search">
        <Search aria-hidden="true" />
        <input role="searchbox" aria-label={placeholder} type="text" value={search} onChange={event => onSearch(event.target.value)} placeholder={placeholder} />
        {search && <button type="button" aria-label="Καθαρισμός αναζήτησης" onClick={() => onSearch('')}><X aria-hidden="true" /></button>}
      </div>
      <div className="catalog-filter-actions">{actions}</div>
    </div>
    {children}
  </section>;
}
