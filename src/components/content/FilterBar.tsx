import React from 'react';
import { CatalogControls, CatalogControlsProps } from '../CatalogControls';

/** Public-catalog name for the existing shared filter infrastructure. */
export function FilterBar(props: CatalogControlsProps) {
  return <CatalogControls {...props} />;
}
