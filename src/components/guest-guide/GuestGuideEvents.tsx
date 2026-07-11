import { ExternalLink } from 'lucide-react';
import { useGuestGuideLocale } from './GuestGuideLanguageContext';
import { translations } from './translations';

const CALENDAR_URL = 'https://www.hoernerdoerfer.de/region/veranstaltungskalender';

const GuestGuideEvents = () => {
  const { locale } = useGuestGuideLocale();
  const t = translations;

  return (
    <div className="space-y-4">
      <p className="text-sm">
        {t.eventsIntro[locale]}
      </p>
      <a
        href={CALENDAR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-muted rounded-lg p-4 hover:brightness-95 hover:shadow-md transition w-full"
      >
        <div>
          <h4 className="font-display text-base text-foreground">
            {t.eventCalendar[locale]}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hörnerdörfer · Fischen, Ofterschwang, Bolsterlang & mehr
          </p>
        </div>
        <ExternalLink size={16} className="text-alpine-wood shrink-0" />
      </a>
      <p className="text-xs text-muted-foreground italic pt-1">
        {t.eventSource[locale]}
      </p>
    </div>
  );
};

export default GuestGuideEvents;
