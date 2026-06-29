import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { LOCALES, type CmsLocale, type I18nText } from '@/lib/cms-types';

interface Props {
  label: string;
  value: I18nText;
  onChange: (next: I18nText) => void;
  multiline?: boolean;
  /** Locales that must be filled (shown with a marker when empty). */
  requiredLocales?: CmsLocale[];
}

const LOCALE_LABELS: Record<CmsLocale, string> = {
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  fr: 'Français',
  nl: 'Nederlands',
};

/** Tabbed editor for a multilingual text value across all 6 locales. */
export function I18nTextField({ label, value, onChange, multiline, requiredLocales = ['de'] }: Props) {
  const [active, setActive] = useState<CmsLocale>('de');

  const set = (locale: CmsLocale, text: string) => onChange({ ...value, [locale]: text });

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex flex-wrap gap-1">
        {LOCALES.map((loc) => {
          const filled = (value[loc] ?? '').trim() !== '';
          const required = requiredLocales.includes(loc);
          return (
            <button
              key={loc}
              type="button"
              onClick={() => setActive(loc)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                active === loc ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted',
              )}
            >
              {loc.toUpperCase()}
              <span className={cn('ml-1', filled ? 'text-emerald-500' : required ? 'text-destructive' : 'text-muted-foreground/50')}>
                {filled ? '●' : '○'}
              </span>
            </button>
          );
        })}
      </div>
      {multiline ? (
        <Textarea
          rows={4}
          value={value[active] ?? ''}
          onChange={(e) => set(active, e.target.value)}
          placeholder={`${label} — ${LOCALE_LABELS[active]}`}
        />
      ) : (
        <Input
          value={value[active] ?? ''}
          onChange={(e) => set(active, e.target.value)}
          placeholder={`${label} — ${LOCALE_LABELS[active]}`}
        />
      )}
    </div>
  );
}
