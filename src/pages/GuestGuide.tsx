import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';

import { getProperty, getCanonicalHostForSlug, type PropertyConfig } from '@/config/properties';
import GuestGuideHero from '@/components/guest-guide/GuestGuideHero';
import GuestGuideStickyNav from '@/components/guest-guide/GuestGuideStickyNav';
import GuestGuideContent from '@/components/guest-guide/GuestGuideContent';
import GuestGuidePinEntry from '@/components/guest-guide/GuestGuidePinEntry';
import GuestGuideChatbot from '@/components/guest-guide/GuestGuideChatbot';
import { GuestGuideLanguageProvider } from '@/components/guest-guide/GuestGuideLanguageContext';
import { useGuestGuideLocale } from '@/components/guest-guide/GuestGuideLanguageContext';
import { mapHostawayLanguage, type GuestGuideLocale } from '@/components/guest-guide/translations';
import { translations } from '@/components/guest-guide/translations';


export interface GuestData {
  guestName: string;
  checkin: string;
  checkout: string;
  boxCode: string;
  wifiPassword: string;
  guestLanguage: GuestGuideLocale;
  awpassLink: string;
}

const FALLBACK_DATA: GuestData = {
  guestName: 'Gast',
  checkin: '',
  checkout: '',
  boxCode: '– – – –',
  wifiPassword: '',
  guestLanguage: 'de',
  awpassLink: '',
};

type GuideState = 'loading' | 'pin' | 'loaded' | 'no_reservation' | 'error' | 'rate_limited';

const fetchWithRetry = async (url: string, opts: RequestInit, retries = 2): Promise<Response> => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, opts);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Netzwerkfehler');
};

// ---------------------------------------------------------------------------
// Rate-limited lockout screen with live countdown
// ---------------------------------------------------------------------------
const RateLimitedScreen = ({
  lockedUntil,
  property,
  onExpired,
}: {
  lockedUntil: number;
  property: PropertyConfig;
  onExpired: () => void;
}) => {
  const { locale } = useGuestGuideLocale();
  const t = translations;

  const secondsLeft = () => Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
  const [secs, setSecs] = useState(secondsLeft);

  useEffect(() => {
    if (secs <= 0) { onExpired(); return; }
    const timer = setTimeout(() => setSecs(secondsLeft()), 1000);
    return () => clearTimeout(timer);
  }, [secs]);

  const min = Math.ceil(secs / 60);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <img src={property.logo} alt={property.displayName} className="w-24 mx-auto mb-8 opacity-40" />
        <p className="text-destructive font-medium mb-2">{t.pinTooManyAttempts[locale]}</p>
        <p className="text-muted-foreground text-sm">
          {t.pinRetryIn[locale]} {min} {t.pinRetryMinutes[locale]}
        </p>
        <div className="mt-4 text-3xl font-mono text-muted-foreground tabular-nums">
          {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
};

const GuestGuideInner = ({ property }: { property: PropertyConfig }) => {
  const [state, setState] = useState<GuideState>('loading');
  const [guestData, setGuestData] = useState<GuestData>(FALLBACK_DATA);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeSection, setActiveSection] = useState('zugang');
  const [pinFailures, setPinFailures] = useState(0);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0); // ms timestamp
  const { locale, setLocale } = useGuestGuideLocale();

  const warmupPromiseRef = useRef<Promise<void> | null>(null);

  const baseUrl = '/api/reservation';
  const headers = { 'Content-Type': 'application/json' };

  const applyGuestData = (body: any) => {
    const lang = mapHostawayLanguage(body.guestLanguage);
    setGuestData({
      guestName: body.guestName || 'Gast',
      checkin: body.checkin || '',
      checkout: body.checkout || '',
      boxCode: body.doorCode || '– – – –',
      wifiPassword: body.wifiPassword || '',
      guestLanguage: lang,
      awpassLink: body.awpassLink || '',
    });

    setLocale(lang);

    if (body.reservationId && body.token) {
      window.history.replaceState(null, '', `${window.location.pathname}?t=${body.reservationId}.${body.token}`);
    }

    setState('loaded');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tParam = params.get('t');
    let reservationId: string | null = null;
    let token: string | null = null;
    if (tParam && tParam.includes('.')) {
      const [id, tok] = tParam.split('.', 2);
      reservationId = id || null;
      token = tok || null;
    }

    const load = async () => {
      if (reservationId && token) {
        try {
          const res = await fetchWithRetry(
            `${baseUrl}?reservationId=${reservationId}&token=${token}&property=${property.slug}`,
            { headers },
          );
          const body = await res.json();

          if (res.ok && body.status === 'ok') {
            applyGuestData(body);
            return;
          }
        } catch {
          // Token invalid/expired → fall through to PIN flow
        }
      }

      setState('pin');

      warmupPromiseRef.current = fetchWithRetry(baseUrl, { headers })
        .then(() => {})
        .catch(() => {});
    };

    load();
  }, []);

  const handlePinSubmit = async (pin: string): Promise<'ok' | 'invalid'> => {
    try {
      const res = await fetchWithRetry(
        `${baseUrl}?pin=${pin}&property=${property.slug}`,
        { headers },
      );
      const body = await res.json();

      if (res.ok && body.status === 'ok') {
        setState('loading');
        setPinFailures(0);
        applyGuestData(body);
        return 'ok';
      } else if (res.status === 429) {
        const retryAfterSec: number = body.retryAfter ?? 900;
        setRateLimitedUntil(Date.now() + retryAfterSec * 1_000);
        setState('rate_limited');
        return 'invalid';
      } else if (body.error === 'invalid_pin') {
        setPinFailures(f => f + 1);
        return 'invalid';
      } else {
        setErrorMsg(body.message || body.error || 'Fehler');
        setState('error');
        return 'invalid';
      }
    } catch {
      setErrorMsg('Verbindungsfehler. Bitte erneut versuchen.');
      setState('error');
      return 'invalid';
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img src={property.logo} alt={property.displayName} className="w-24 mx-auto mb-6 opacity-40" />
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (state === 'no_reservation') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <img src={property.logo} alt={property.displayName} className="w-24 mx-auto mb-6 opacity-40" />
          <h1 className="font-display text-2xl text-foreground mb-3">{translations.noReservationTitle[locale]}</h1>
          <p className="text-muted-foreground text-sm">{translations.noReservationText[locale]}</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <img src={property.logo} alt={property.displayName} className="w-24 mx-auto mb-6 opacity-40" />
          <h1 className="font-display text-2xl text-foreground mb-3">{translations.errorTitle[locale]}</h1>
          <p className="text-muted-foreground text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (state === 'rate_limited') {
    return <RateLimitedScreen
      lockedUntil={rateLimitedUntil}
      property={property}
      onExpired={() => { setPinFailures(0); setState('pin'); }}
    />;
  }

  if (state === 'pin') {
    return <GuestGuidePinEntry onSubmit={handlePinSubmit} failures={pinFailures} logo={property.logo} displayName={property.displayName} />;
  }

  const handleNavClick = (section: string) => {
    setActiveSection(section);
    setTimeout(() => {
      const el = document.getElementById(section);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 56 - 12;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <GuestGuideHero guestData={guestData} onNavClick={handleNavClick} logo={property.logo} displayName={property.displayName} />
      <GuestGuideStickyNav activeSection={activeSection} onNavClick={handleNavClick} />
      <GuestGuideContent guestData={guestData} activeSection={activeSection} onSectionChange={setActiveSection} property={property} />

      <GuestGuideChatbot guestData={guestData} logo={property.logo} propertyName={property.displayName} />

      <div className="max-w-3xl mx-auto px-6 text-center mt-16 pb-12 pt-8 border-t border-border">
        <img src={property.logo} alt={property.displayName} className="w-20 mx-auto mb-3 opacity-30" />
        <p className="text-xs text-muted-foreground mb-3">{translations.footerText[locale]}</p>
        <a
          href={`https://wa.me/${property.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-foreground/80 hover:text-foreground border border-[#25D366]/30 hover:border-[#25D366]/50 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366] shrink-0" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.594-.822-6.338-2.199l-.442-.37-3.238 1.085 1.085-3.238-.37-.442A9.958 9.958 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          <span>{translations.footerWhatsapp[locale]}</span>
        </a>
      </div>
    </div>
  );
};

const GuestGuide = () => {
  const { slug } = useParams<{ slug: string }>();
  const property = getProperty(slug ?? '');

  // Inject Google Analytics if the property has a tracking ID.
  useEffect(() => {
    if (!property?.googleAnalyticsId) return;
    const id = property.googleAnalyticsId;
    if (document.getElementById('ga-script')) return; // already injected
    const s = document.createElement('script');
    s.id = 'ga-script';
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    s.async = true;
    document.head.appendChild(s);
    const i = document.createElement('script');
    i.id = 'ga-init';
    i.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
    document.head.appendChild(i);
  }, [property?.googleAnalyticsId]);

  // Set the favicon per property (ACHZEIT keeps its own, others use Allgäu Stays).
  useEffect(() => {
    if (!property) return;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = property.favicon.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    link.href = property.favicon;
  }, [property]);

  if (!property) {
    return <Navigate to="/404" replace />;
  }

  // Canonical-domain enforcement: each property has a brand home (see BRANDS in
  // properties.ts). If reached via another live host, redirect to the canonical
  // one (slug + query/token preserved). Skipped on localhost and Vercel preview
  // deploys so dev/preview keep working on any host.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isDevHost =
      host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app');
    const canonical = getCanonicalHostForSlug(property.slug);
    if (!isDevHost && canonical && host !== canonical) {
      window.location.replace(
        `https://${canonical}${window.location.pathname}${window.location.search}`,
      );
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
  }

  return (
    <GuestGuideLanguageProvider>
      <GuestGuideInner property={property} />
    </GuestGuideLanguageProvider>
  );
};

export default GuestGuide;
