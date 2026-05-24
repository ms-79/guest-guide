import { useGuestGuideLocale } from './GuestGuideLanguageContext';
import { type GuestGuideLocale, LOCALE_LABELS, LOCALE_FLAGS } from './translations';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const LOCALES: GuestGuideLocale[] = ['de', 'en', 'es', 'it', 'fr', 'nl'];

const GuestGuideLanguageToggle = () => {
  const { locale, setLocale } = useGuestGuideLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-alpine-snow/80 hover:text-alpine-snow transition-colors px-2 py-1 rounded-md"
        aria-label="Change language"
      >
        <Globe size={16} />
        <span>{LOCALE_FLAGS[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[160px]">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => { setLocale(l); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-muted transition-colors ${
                l === locale ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'
              }`}
            >
              <span>{LOCALE_FLAGS[l]}</span>
              <span>{LOCALE_LABELS[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GuestGuideLanguageToggle;
