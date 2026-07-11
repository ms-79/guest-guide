import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Key, Wifi, Baby, Flame, Trash2, AlertTriangle,
  UtensilsCrossed, Mountain, Zap, ShoppingCart, ExternalLink,
} from 'lucide-react';
import iconAwpass from '@/assets/icon-awpass.svg';
import type { GuestData } from '@/pages/GuestGuide';
import { getHero } from '@/generated/hero';
import GuestGuideLanguageToggle from './GuestGuideLanguageToggle';
import { useGuestGuideLocale } from './GuestGuideLanguageContext';
import { translations } from './translations';

interface Props {
  guestData: GuestData;
  onNavClick?: (section: string) => void;
  logo: string;
  displayName: string;
  propertySlug: string;
}

// Render editable hero copy inline (so **bold** works) without ReactMarkdown's
// wrapping <p> — the surrounding <motion.p> already carries the styling.
const inlineMd = { p: ({ children }: { children?: React.ReactNode }) => <>{children}</> };

const GuestGuideHero = ({ guestData, onNavClick, logo, displayName, propertySlug }: Props) => {
  const { guestName, checkin, checkout } = guestData;
  const { locale } = useGuestGuideLocale();
  const t = translations;

  // Editorial hero copy comes from the Git-backed content layer (per property +
  // locale, editable in /admin). Properties without hero content fall back to the
  // built-in ACHZEIT translations so every guide keeps rendering.
  const hero = getHero(propertySlug, locale);
  const eyebrow = hero?.eyebrow ?? t.heroTagline[locale];
  const introMd = hero?.introMd ?? t.heroIntro[locale];
  const conciergeHint = hero?.conciergeHint ?? t.heroConciergeHint[locale];

  const quickActions = [
    { icon: Key, label: t.navZugang[locale], target: 'zugang' },
    { icon: Wifi, label: t.navWlan[locale], target: 'wlan' },
    { icon: Baby, label: t.navFamilie[locale], target: 'familie' },
    { icon: Flame, label: t.navSauna[locale], target: 'sauna' },
    { icon: ShoppingCart, label: t.navEinkaufen[locale], target: 'einkaufen' },
    { icon: UtensilsCrossed, label: t.navRestaurants[locale], target: 'restaurants' },
    { icon: Mountain, label: t.navAusfluege[locale], target: 'ausfluege' },
    { icon: Zap, label: t.navEAuto[locale], target: 'e-auto' },
    { icon: Trash2, label: t.navCheckout[locale], target: 'checkout' },
    { icon: AlertTriangle, label: t.navNotfall[locale], target: 'notfall' },
  ];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '–';
    const d = new Date(dateStr);
    const loc = locale === 'de' ? 'de-DE' : locale === 'en' ? 'en-GB' : locale === 'es' ? 'es-ES' : locale === 'it' ? 'it-IT' : locale === 'fr' ? 'fr-FR' : 'nl-NL';
    const weekday = d.toLocaleDateString(loc, { weekday: 'short' }).replace('.', '');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${weekday}, ${day}.${month}.${year}`;
  };

  return (
    <section className="relative bg-gradient-to-b from-alpine-charcoal via-alpine-charcoal to-alpine-charcoal/95 text-alpine-snow py-16 md:py-24 px-6">
      {/* Language Toggle - top right */}
      <div className="absolute top-4 right-4 z-10">
        <GuestGuideLanguageToggle />
      </div>

      <div className="max-w-3xl mx-auto text-center">
        <motion.img
          src={logo}
          alt={displayName}
          className="w-28 md:w-36 mx-auto mb-8 brightness-0 invert opacity-80"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ duration: 0.6 }}
        />

        <motion.h1
          className="font-display text-4xl md:text-5xl lg:text-6xl mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
        >
          {t.welcome[locale]} {guestName}
        </motion.h1>

        {/* Premium tagline */}
        <motion.p
          className="text-sm md:text-base tracking-[0.3em] uppercase text-alpine-snow/50 mt-4 mb-8 font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          {eyebrow}
        </motion.p>


        {checkin && checkout && (
          <motion.div
            className="inline-block bg-alpine-snow/15 backdrop-blur-sm rounded-xl px-6 py-4 mb-8 border border-alpine-snow/20 shadow-[0_0_20px_-4px_rgba(255,255,255,0.08)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <p className="text-sm text-alpine-snow/50 uppercase tracking-widest mb-1">{t.stay[locale]}</p>
            <p className="text-alpine-snow/90 font-medium">
              {formatDate(checkin)} – {formatDate(checkout)}
            </p>
          </motion.div>
        )}

        <motion.p
          className="text-alpine-snow/60 max-w-xl mx-auto text-sm md:text-base leading-relaxed mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <ReactMarkdown components={inlineMd}>{introMd}</ReactMarkdown>
        </motion.p>

        {/* Optional subline under the intro */}
        {hero?.subline && (
          <motion.p
            className="text-alpine-snow/50 max-w-xl mx-auto text-sm leading-relaxed mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.42 }}
          >
            <ReactMarkdown components={inlineMd}>{hero.subline}</ReactMarkdown>
          </motion.p>
        )}

        {/* Concierge hint – subtle, no button */}
        {conciergeHint && (
          <motion.p
            className="text-alpine-snow/40 max-w-md mx-auto text-xs md:text-sm leading-relaxed mb-12 italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            {conciergeHint}
          </motion.p>
        )}

        {/* Allgäu Walser Pass */}
        {guestData.awpassLink && (
          <motion.a
            href={guestData.awpassLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-alpine-snow/10 hover:bg-alpine-snow/18 border border-alpine-snow/20 hover:border-alpine-snow/30 rounded-2xl px-6 py-4 mb-8 transition-all duration-200 group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.48 }}
          >
            <img src={iconAwpass} alt="Allgäu Walser Pass" className="w-7 h-7 brightness-0 invert opacity-80" />
            <div className="text-left">
              <p className="text-sm font-medium text-alpine-snow/90 group-hover:text-alpine-snow transition-colors">{t.awpassTitle[locale]}</p>
              <p className="text-xs text-alpine-snow/50">{t.awpassDescription[locale]}</p>
            </div>
            <ExternalLink size={14} className="text-alpine-snow/40 group-hover:text-alpine-snow/70 transition-colors ml-1" />
          </motion.a>
        )}

        {/* Quick Actions */}
        <motion.div
          className="flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {quickActions.map((action) => (
            <button
              key={action.target}
              onClick={() => onNavClick?.(action.target)}
              className="flex items-center gap-2 bg-alpine-snow/8 hover:bg-alpine-snow/15 text-alpine-snow/70 hover:text-alpine-snow px-4 py-2.5 rounded-xl text-sm transition-all duration-200 border border-alpine-snow/8 hover:border-alpine-snow/20"
            >
              <action.icon size={16} />
              <span>{action.label}</span>
            </button>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default GuestGuideHero;
