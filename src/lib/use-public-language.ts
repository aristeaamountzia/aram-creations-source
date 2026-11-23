import { createContext, useContext, useMemo } from 'react';
import type { PublicLocale } from './public-locale';

export const PublicLanguage = createContext<PublicLocale>('el');
export function usePublicLanguage() {
  const locale = useContext(PublicLanguage);
  return useMemo(() => ({
    locale,
    t: (greek: string, english: string) => locale === 'en' ? english : greek,
  }), [locale]);
}
