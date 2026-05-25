import { useState } from 'react';
import logoAchzeit from '@/assets/logo-achzeit-transparent.webp';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useGuestGuideLocale } from './GuestGuideLanguageContext';
import { translations } from './translations';

const PIN_MAX_ATTEMPTS = 5; // must match backend

interface Props {
  onSubmit: (pin: string) => Promise<'ok' | 'invalid'>;
  failures?: number; // consecutive wrong attempts (tracked by parent)
}

const GuestGuidePinEntry = ({ onSubmit, failures = 0 }: Props) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { locale } = useGuestGuideLocale();
  const t = translations;
  const attemptsLeft = PIN_MAX_ATTEMPTS - failures;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;

    setLoading(true);
    setError(false);

    const result = await onSubmit(pin);
    if (result === 'invalid') {
      setError(true);
      setPin('');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <img src={logoAchzeit} alt="ACHZEIT" className="w-24 mx-auto mb-8 opacity-40" />

        <div className="flex items-center justify-center gap-2 mb-2">
          <Lock size={18} className="text-muted-foreground" />
          <h1 className="font-display text-xl text-foreground">{t.pinTitle[locale]}</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-8">
          {t.pinInstruction[locale]}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            disabled={loading}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(val);
              setError(false);
            }}
            className="w-full text-center text-3xl font-mono tracking-[0.5em] bg-muted border border-border rounded-lg py-4 px-6 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/30 disabled:opacity-50"
            placeholder="• • • •"
            autoFocus
          />

          {error && (
            <div className="space-y-1">
              <p className="text-destructive text-sm">{t.pinInvalid[locale]}</p>
              {failures > 0 && attemptsLeft > 0 && (
                <p className="text-amber-600 dark:text-amber-400 text-xs">
                  {attemptsLeft} {t.pinAttemptsLeft[locale]}
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={pin.length !== 4 || loading}
            className="w-full"
          >
            {loading ? t.pinChecking[locale] : t.pinButton[locale]}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-6">
          {t.pinHint[locale]}
        </p>
      </div>
    </div>
  );
};

export default GuestGuidePinEntry;
