import useAppStore from '../store/appStore.js';
import { translations } from './translations.js';

export function useI18n() {
  const locale = useAppStore((s) => s.locale);

  const t = (key, fallback) => {
    const value = translations[locale]?.[key];
    if (value) return value;
    if (fallback) return fallback;
    return key;
  };

  return { locale, t };
}
