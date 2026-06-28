import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Key, Wifi, Baby, Flame, Trash2, AlertTriangle,
  UtensilsCrossed, Mountain, Zap, ShoppingCart, HelpCircle, Info,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useGuestGuideLocale } from './GuestGuideLanguageContext';
import { translations } from './translations';

const NAV_HEIGHT = 56;
const SCROLL_BY = 160;

interface Props {
  activeSection: string;
  onNavClick: (section: string) => void;
}

const GuestGuideStickyNav = ({ activeSection, onNavClick }: Props) => {
  const { locale } = useGuestGuideLocale();
  const t = translations;
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const navItems = [
    { icon: Key, label: t.navZugang[locale], target: 'zugang' },
    { icon: Wifi, label: t.navWlan[locale], target: 'wlan' },
    { icon: Baby, label: t.navFamilie[locale], target: 'familie' },
    { icon: Info, label: t.navFaq[locale], target: 'faq' },
    { icon: Flame, label: t.navSaunaShort[locale], target: 'sauna' },
    { icon: UtensilsCrossed, label: t.navRestaurants[locale], target: 'restaurants' },
    { icon: ShoppingCart, label: t.navEinkaufen[locale], target: 'einkaufen' },
    { icon: Mountain, label: t.navAusfluege[locale], target: 'ausfluege' },
    { icon: Zap, label: t.navEAuto[locale], target: 'e-auto' },
    { icon: Trash2, label: t.navCheckout[locale], target: 'checkout' },
    { icon: HelpCircle, label: t.navAnleitungen[locale], target: 'anleitungen' },
    { icon: AlertTriangle, label: t.navNotfall[locale], target: 'notfall' },
  ];

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateArrows); ro.disconnect(); };
  }, [updateArrows]);

  useEffect(() => {
    const btn = buttonRefs.current.get(activeSection);
    if (btn && scrollRef.current) {
      const container = scrollRef.current;
      const scrollLeft = btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeSection]);

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -SCROLL_BY, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: SCROLL_BY, behavior: 'smooth' });

  return (
    <nav
      className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60 relative"
      style={{ height: NAV_HEIGHT }}
    >
      {/* Left arrow + fade */}
      <div
        className={`absolute left-0 top-0 h-full flex items-center z-10 pointer-events-none transition-opacity duration-200 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="h-full w-10 bg-gradient-to-r from-background/95 to-transparent" />
        <button
          onClick={scrollLeft}
          aria-label="Scroll left"
          className="absolute left-1 pointer-events-auto p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-8 h-full overflow-x-auto scrollbar-hide mx-auto max-w-[56rem]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {navItems.map((item) => {
          const isActive = activeSection === item.target;
          return (
            <button
              key={item.target}
              ref={(el) => { if (el) buttonRefs.current.set(item.target, el); }}
              onClick={() => onNavClick(item.target)}
              className={`
                flex items-center gap-1.5 whitespace-nowrap shrink-0
                px-3.5 py-2 rounded-full text-sm font-medium
                border transition-colors duration-200
                ${isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                }
              `}
            >
              <item.icon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right arrow + fade */}
      <div
        className={`absolute right-0 top-0 h-full flex items-center z-10 pointer-events-none transition-opacity duration-200 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="h-full w-10 bg-gradient-to-l from-background/95 to-transparent" />
        <button
          onClick={scrollRight}
          aria-label="Scroll right"
          className="absolute right-1 pointer-events-auto p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </nav>
  );
};

export default GuestGuideStickyNav;
