import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_PORTFOLIO_DESIGN, normalizePortfolioDesign } from './portfolio-settings';
export function usePortfolioDesign() {
  const [design, setDesign] = useState(DEFAULT_PORTFOLIO_DESIGN);
  useEffect(() => onSnapshot(doc(db, 'settings', 'shop'), snapshot => setDesign(normalizePortfolioDesign(snapshot.data()?.portfolioDesign)), error => console.warn('Portfolio settings:', error)), []);
  return design;
}
