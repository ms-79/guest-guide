import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type GuestGuideLocale } from './translations';

interface GuestGuideLanguageContextType {
  locale: GuestGuideLocale;
  setLocale: (locale: GuestGuideLocale) => void;
}

const GuestGuideLanguageContext = createContext<GuestGuideLanguageContextType>({
  locale: 'de',
  setLocale: () => {},
});

export const useGuestGuideLocale = () => useContext(GuestGuideLanguageContext);

interface Props {
  initialLocale?: GuestGuideLocale;
  children: ReactNode;
}

export const GuestGuideLanguageProvider = ({ initialLocale = 'de', children }: Props) => {
  const [locale, setLocaleState] = useState<GuestGuideLocale>(initialLocale);

  const setLocale = useCallback((l: GuestGuideLocale) => {
    setLocaleState(l);
  }, []);

  return (
    <GuestGuideLanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </GuestGuideLanguageContext.Provider>
  );
};
