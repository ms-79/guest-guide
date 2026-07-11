import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Eye, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { HeroContent, GuideSection, Place, RecommendationItem, Locale } from '@/content/schemas';

// Chatbot facts and recommendations (German) can be edited here; saving opens a
// GitHub pull request via the server-side /api/admin/content/pr endpoint (never a
// direct commit to the base branch). Guide sections remain read-only for now.

type PropertyListItem = { slug: string; displayName: string };

interface ContentBundle {
  slug: string;
  displayName: string;
  facts: Partial<Record<Locale, string>>;
  hero: Partial<Record<Locale, HeroContent>>;
  guide: Partial<Record<Locale, GuideSection[]>>;
  places: Place[];
  recommendations: Partial<Record<Locale, RecommendationItem[]>>;
}

const LOCALE_LABELS: Record<Locale, string> = {
  de: 'Deutsch', en: 'English', es: 'Español', it: 'Italiano', fr: 'Français', nl: 'Nederlands',
};
const ALL_LOCALES: Locale[] = ['de', 'en', 'es', 'it', 'fr', 'nl'];

type AuthState = 'checking' | 'unauthenticated' | 'authenticated';

const api = (path: string, init?: RequestInit) =>
  fetch(`/api/admin/${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });

// AI editorial helper: returns a draft (never publishes). The caller previews
// and explicitly accepts. `mode`: 'create' (from facts) | 'improve' | 'shorten' …
type AiMode = 'create' | 'improve' | 'shorten' | 'lengthen';
async function aiGenerate(body: {
  propertySlug: string; locale: string; mode: AiMode; target: string; currentText?: string;
}): Promise<{ text?: string; error?: string }> {
  try {
    const res = await api('ai/generate', { method: 'POST', body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.text) return { text: data.text };
    return { error: data.error || 'KI-Vorschlag fehlgeschlagen.' };
  } catch {
    return { error: 'Netzwerkfehler.' };
  }
}

// Reusable "Text aus Fakten erstellen" / "Mit KI verbessern" control. Shows a
// draft preview with Übernehmen / Erneut generieren / Abbrechen. Never
// overwrites the field without an explicit Übernehmen click.
const AiAssist = ({
  slug, locale, target, currentText, onAccept,
}: {
  slug: string; locale: Locale; target: string; currentText: string; onAccept: (text: string) => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [mode, setMode] = useState<AiMode>('create');

  const run = async (m: AiMode) => {
    setBusy(true); setError(''); setMode(m);
    const r = await aiGenerate({ propertySlug: slug, locale, mode: m, target, currentText });
    if (r.text) setDraft(r.text); else setError(r.error || 'Fehlgeschlagen.');
    setBusy(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => run('create')} disabled={busy}>
          {busy && mode === 'create' ? 'Erzeuge…' : '✨ Text aus Fakten erstellen'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => run('improve')} disabled={busy || !currentText.trim()}>
          {busy && mode === 'improve' ? 'Verbessere…' : 'Mit KI verbessern'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => run('shorten')} disabled={busy || !currentText.trim()}>
          Kürzen
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {draft !== null && (
        <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">KI-Vorschlag (Vorschau) — nichts wird ohne „Übernehmen" gespeichert:</p>
          <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{draft}</ReactMarkdown></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => { onAccept(draft); setDraft(null); }}>Übernehmen</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => run(mode)} disabled={busy}>Erneut generieren</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>Abbrechen</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Where content goes live: merging an open content PR triggers the Vercel deploy.
// The admin write-flow always branches as `content/<slug>-…` (see api/admin/content/pr.ts),
// so a head-branch prefix search scopes the pulls list to this property's CONTENT PRs
// only — feature PRs (on `claude/…` branches) are excluded.
const contentPullsUrl = (slug: string): string =>
  `https://github.com/ms-79/guest-guide/pulls?q=${encodeURIComponent(`is:pr is:open head:content/${slug}`)}`;

// ---------------------------------------------------------------------------
// Login screen
// ---------------------------------------------------------------------------
const LoginScreen = ({ onSuccess }: { onSuccess: () => void }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api('login', { method: 'POST', body: JSON.stringify({ passcode }) });
      if (res.ok) {
        onSuccess();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Anmeldung fehlgeschlagen.');
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Content-Admin</h1>
          <p className="text-sm text-muted-foreground">Bitte mit dem Zugangscode anmelden.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="passcode">Zugangscode</Label>
            <Input
              id="passcode"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !passcode}>
            {busy ? 'Anmelden…' : 'Anmelden'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

// Editable chatbot-facts card: view rendered markdown, or edit and open a PR.
const FactEditorCard = ({ slug, locale, initial }: { slug: string; locale: string; initial: string }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pr, setPr] = useState<{ url: string; number: number } | null>(null);

  const cancel = () => {
    setDraft(initial);
    setEditing(false);
    setError('');
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api('content/pr', {
        method: 'POST',
        body: JSON.stringify({ propertySlug: slug, kind: 'facts', locale, content: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setPr({ url: data.url, number: data.number });
        setEditing(false);
      } else {
        setError(data.error || 'Pull Request konnte nicht erstellt werden.');
      }
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="uppercase">{locale}</Badge>
          <span className="text-xs text-muted-foreground">facts.{locale}.md</span>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => { setEditing(true); setPr(null); }}>
            Bearbeiten
          </Button>
        )}
      </div>

      {pr && (
        <p className="mb-3 text-sm">
          ✅ Pull Request erstellt:{' '}
          <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            #{pr.number}
          </a>{' '}
          — nach Prüfung der Vercel-Preview mergen, dann geht die Änderung live.
        </p>
      )}

      {editing ? (
        <div className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={18}
            className="font-mono text-xs"
            spellCheck={false}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={busy || !draft.trim() || draft === initial}>
              {busy ? 'Erstelle PR…' : 'Als Pull Request speichern'}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} disabled={busy}>
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{initial}</ReactMarkdown>
        </div>
      )}
    </Card>
  );
};

// German-only recommendations editor. Saving opens a PR writing places.json +
// de.json; other locales are added later (translation). Category/badge/text are
// maintained in German; the Google Maps link replaces manual distances.
type RecEntry = {
  key: string; id: string; category: string; name: string; mapsUrl: string;
  locationLabel: string; showUntil: string; categoryLabel: string; badge: string; descriptionMd: string;
};

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’´`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const CATEGORY_OPTIONS = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'shopping', label: 'Einkaufen' },
  { value: 'excursion', label: 'Ausflug' },
];
let recUid = 0;

const RecommendationsEditor = ({ bundle }: { bundle: ContentBundle }) => {
  const deItems = new Map((bundle.recommendations.de || []).map((i) => [i.placeId, i]));
  const [entries, setEntries] = useState<RecEntry[]>(() =>
    bundle.places.map((p) => {
      const d = deItems.get(p.id);
      return {
        key: p.id, id: p.id, category: p.category, name: p.name, mapsUrl: p.mapsUrl || '',
        locationLabel: p.locationLabel || '', showUntil: p.showUntil || '',
        categoryLabel: d?.categoryLabel || '', badge: d?.badge || '', descriptionMd: d?.descriptionMd || '',
      };
    }),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pr, setPr] = useState<{ url: string; number: number } | null>(null);

  const update = (i: number, patch: Partial<RecEntry>) => setEntries((es) => es.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => setEntries((es) => es.filter((_, idx) => idx !== i));
  const add = () => setEntries((es) => [...es, { key: 'new-' + ++recUid, id: '', category: 'restaurant', name: '', mapsUrl: '', locationLabel: '', showUntil: '', categoryLabel: '', badge: '', descriptionMd: '' }]);
  const move = (i: number, dir: -1 | 1) => setEntries((es) => {
    const j = i + dir; if (j < 0 || j >= es.length) return es;
    const c = es.slice(); [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  const save = async () => {
    setError(''); setPr(null);
    const seen = new Set<string>();
    const places: Record<string, unknown>[] = [];
    const items: Record<string, unknown>[] = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.name.trim()) { setError(`Eintrag ${i + 1}: Name fehlt.`); return; }
      if (!e.mapsUrl.trim()) { setError(`Eintrag ${i + 1} (${e.name}): Google-Maps-Link fehlt.`); return; }
      const base = e.id || slugify(e.name) || 'ort';
      let id = base; let n = 2;
      while (seen.has(id)) id = `${base}-${n++}`;
      seen.add(id);
      const place: Record<string, unknown> = { id, category: e.category, name: e.name.trim(), mapsUrl: e.mapsUrl.trim(), sortOrder: (i + 1) * 10, visibility: 'guest' };
      if (e.locationLabel.trim()) place.locationLabel = e.locationLabel.trim();
      if (e.showUntil.trim()) place.showUntil = e.showUntil.trim();
      places.push(place);
      const item: Record<string, unknown> = { placeId: id, translationStatus: 'source' };
      if (e.categoryLabel.trim()) item.categoryLabel = e.categoryLabel.trim();
      if (e.badge.trim()) item.badge = e.badge.trim();
      if (e.descriptionMd.trim()) item.descriptionMd = e.descriptionMd.trim();
      if (item.categoryLabel || item.badge || item.descriptionMd) items.push(item);
    }
    setBusy(true);
    try {
      const res = await api('content/pr', { method: 'POST', body: JSON.stringify({ propertySlug: bundle.slug, kind: 'recommendations', places, items }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) setPr({ url: data.url, number: data.number });
      else setError(data.error || 'Pull Request konnte nicht erstellt werden.');
    } catch { setError('Netzwerkfehler.'); } finally { setBusy(false); }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Empfehlungen (Deutsch)</h2>
        <Button size="sm" variant="outline" onClick={add}>+ Empfehlung</Button>
      </div>
      <p className="text-xs text-muted-foreground">Nur Deutsch pflegen. „Speichern" legt einen Pull Request an (places.json + de.json); Übersetzungen folgen später.</p>
      {pr && (
        <p className="text-sm">✅ Pull Request erstellt:{' '}
          <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">#{pr.number}</a>{' '}— nach Prüfung der Preview mergen.</p>
      )}
      {entries.map((e, i) => (
        <Card key={e.key} className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="nach oben">↑</Button>
              <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === entries.length - 1} aria-label="nach unten">↓</Button>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(i)}>Entfernen</Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1"><Label>Name</Label><Input value={e.name} onChange={(ev) => update(i, { name: ev.target.value })} /></div>
            <div className="space-y-1"><Label>Kategorie</Label>
              <Select value={e.category} onValueChange={(v) => update(i, { category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2"><Label>Google-Maps-Link</Label><Input value={e.mapsUrl} onChange={(ev) => update(i, { mapsUrl: ev.target.value })} placeholder="https://www.google.com/maps/..." /></div>
            <div className="space-y-1"><Label>Ort (optional)</Label><Input value={e.locationLabel} onChange={(ev) => update(i, { locationLabel: ev.target.value })} placeholder="Oberstdorf" /></div>
            <div className="space-y-1"><Label>Unterzeile (optional)</Label><Input value={e.categoryLabel} onChange={(ev) => update(i, { categoryLabel: ev.target.value })} placeholder="Regionale Küche" /></div>
            <div className="space-y-1"><Label>Badge (optional)</Label><Input value={e.badge} onChange={(ev) => update(i, { badge: ev.target.value })} placeholder="Top-Empfehlung" /></div>
            <div className="space-y-1"><Label>Sichtbar bis (optional)</Label><Input type="date" value={e.showUntil} onChange={(ev) => update(i, { showUntil: ev.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Tipp / Beschreibung (optional)</Label><Textarea rows={2} value={e.descriptionMd} onChange={(ev) => update(i, { descriptionMd: ev.target.value })} /></div>
          </div>
        </Card>
      ))}
      {entries.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Empfehlungen – füge eine hinzu.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Erstelle PR…' : 'Als Pull Request speichern'}</Button>
    </section>
  );
};

// Hero / welcome editor (per locale). Saving opens a PR writing hero/<locale>.json.
// The dynamic greeting ("Willkommen {name}"), dates and reservation data stay in
// Hostaway and are NOT edited here — only the editorial copy.
const HeroEditorCard = ({ slug, locale, initial }: { slug: string; locale: Locale; initial?: HeroContent }) => {
  const [eyebrow, setEyebrow] = useState(initial?.eyebrow || '');
  const [introMd, setIntroMd] = useState(initial?.introMd || '');
  const [subline, setSubline] = useState(initial?.subline || '');
  const [conciergeHint, setConciergeHint] = useState(initial?.conciergeHint || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pr, setPr] = useState<{ url: string; number: number } | null>(null);

  const save = async () => {
    setError(''); setPr(null);
    if (!eyebrow.trim()) { setError('Claim / Eyebrow darf nicht leer sein.'); return; }
    if (!introMd.trim()) { setError('Begrüßungstext darf nicht leer sein.'); return; }
    const hero: Record<string, string> = { eyebrow: eyebrow.trim(), introMd: introMd.trim() };
    if (subline.trim()) hero.subline = subline.trim();
    if (conciergeHint.trim()) hero.conciergeHint = conciergeHint.trim();
    setBusy(true);
    try {
      const res = await api('content/pr', { method: 'POST', body: JSON.stringify({ propertySlug: slug, kind: 'hero', locale, hero }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) setPr({ url: data.url, number: data.number });
      else setError(data.error || 'Pull Request konnte nicht erstellt werden.');
    } catch { setError('Netzwerkfehler.'); } finally { setBusy(false); }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="uppercase">{locale}</Badge>
        <span className="text-sm font-medium">{LOCALE_LABELS[locale]}</span>
        {!initial && <Badge variant="secondary">neu</Badge>}
      </div>
      {pr && (
        <p className="text-sm">✅ Pull Request erstellt:{' '}
          <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">#{pr.number}</a>{' '}— nach Prüfung der Preview mergen.</p>
      )}
      <div className="space-y-1"><Label>Claim / Eyebrow</Label>
        <Input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Eure ACHZEIT beginnt hier." /></div>
      <div className="space-y-1"><Label>Begrüßungstext</Label>
        <Textarea rows={3} value={introMd} onChange={(e) => setIntroMd(e.target.value)} placeholder="Schön, dass ihr da seid …" />
        <p className="text-xs text-muted-foreground">Markdown erlaubt (**fett**).</p>
        <AiAssist slug={slug} locale={locale} target="Begrüßungs-/Willkommenstext (Hero) der Gästemappe" currentText={introMd} onAccept={setIntroMd} /></div>
      <div className="space-y-1"><Label>Subline (optional)</Label>
        <Input value={subline} onChange={(e) => setSubline(e.target.value)} /></div>
      <div className="space-y-1"><Label>Concierge-Hinweis (optional)</Label>
        <Textarea rows={2} value={conciergeHint} onChange={(e) => setConciergeHint(e.target.value)} placeholder="Habt ihr Fragen? Unser digitaler Concierge …" /></div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Erstelle PR…' : 'Als Pull Request speichern'}</Button>
    </Card>
  );
};

const HeroEditor = ({ bundle }: { bundle: ContentBundle }) => {
  // Always offer the required de + en, plus any other locale that already has copy.
  const present = Object.keys(bundle.hero) as Locale[];
  const locales = ALL_LOCALES.filter((l) => l === 'de' || l === 'en' || present.includes(l));
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Hero &amp; Begrüßung</h2>
        <p className="text-xs text-muted-foreground">Claim und Begrüßungstext pro Sprache. Der Gastname und die Aufenthaltsdaten kommen weiterhin live aus Hostaway.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {locales.map((loc) => (
          <HeroEditorCard key={loc} slug={bundle.slug} locale={loc} initial={bundle.hero[loc]} />
        ))}
      </div>
    </section>
  );
};

// Editable guide sections (per locale). Saving opens a PR writing guide/<locale>.json.
// Reuses the AiAssist control ("Text aus Fakten erstellen") on each section body.
type GuidePhase = 'pre_arrival' | 'stay' | 'departure' | 'post_stay';
type GuideVisibility = 'public' | 'guest';
type GuideEntry = {
  uid: string; key: string; title: string; bodyMd: string;
  phase: GuidePhase; visibility: GuideVisibility;
};
const PHASE_OPTIONS: { value: GuidePhase; label: string }[] = [
  { value: 'pre_arrival', label: 'Vor Anreise' },
  { value: 'stay', label: 'Aufenthalt' },
  { value: 'departure', label: 'Abreise' },
  { value: 'post_stay', label: 'Nach Aufenthalt' },
];
// Known standard sections (brief §6B) offered as quick-add with a sensible default.
const STANDARD_SECTIONS: { key: string; title: string; phase: GuidePhase }[] = [
  { key: 'wifi', title: 'WLAN', phase: 'stay' },
  { key: 'zugang', title: 'Zugang', phase: 'pre_arrival' },
  { key: 'checkin', title: 'Check-in', phase: 'pre_arrival' },
  { key: 'checkout', title: 'Check-out', phase: 'departure' },
  { key: 'parken', title: 'Parken', phase: 'pre_arrival' },
  { key: 'kontakt', title: 'Kontakt & Hilfe', phase: 'stay' },
  { key: 'entsorgung', title: 'Müll & Abreise', phase: 'departure' },
];
let guideUid = 0;

const toGuideEntries = (sections: GuideSection[]): GuideEntry[] =>
  [...sections]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      uid: 'g-' + ++guideUid, key: s.key, title: s.title, bodyMd: s.bodyMd,
      phase: s.phase as GuidePhase,
      visibility: (s.visibility === 'public' ? 'public' : 'guest') as GuideVisibility,
    }));

const GuideEditor = ({ bundle }: { bundle: ContentBundle }) => {
  const present = Object.keys(bundle.guide) as Locale[];
  const locales = ALL_LOCALES.filter((l) => l === 'de' || l === 'en' || present.includes(l));
  const [locale, setLocale] = useState<Locale>('de');
  const [entries, setEntries] = useState<GuideEntry[]>(() => toGuideEntries(bundle.guide.de || []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pr, setPr] = useState<{ url: string; number: number } | null>(null);

  const switchLocale = (l: Locale) => {
    setLocale(l);
    setEntries(toGuideEntries(bundle.guide[l] || []));
    setError(''); setPr(null);
  };

  const update = (i: number, patch: Partial<GuideEntry>) =>
    setEntries((es) => es.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => setEntries((es) => es.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => setEntries((es) => {
    const j = i + dir; if (j < 0 || j >= es.length) return es;
    const c = es.slice(); [c[i], c[j]] = [c[j], c[i]]; return c;
  });
  const addBlank = () => setEntries((es) => [...es, { uid: 'g-' + ++guideUid, key: '', title: '', bodyMd: '', phase: 'stay', visibility: 'guest' }]);
  const addStandard = (key: string) => {
    const tmpl = STANDARD_SECTIONS.find((s) => s.key === key);
    if (!tmpl) return;
    setEntries((es) => [...es, { uid: 'g-' + ++guideUid, key: tmpl.key, title: tmpl.title, bodyMd: '', phase: tmpl.phase, visibility: 'guest' }]);
  };

  const save = async () => {
    setError(''); setPr(null);
    const seen = new Set<string>();
    const sections: Record<string, unknown>[] = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.title.trim()) { setError(`Sektion ${i + 1}: Titel fehlt.`); return; }
      if (!e.bodyMd.trim()) { setError(`Sektion ${i + 1} (${e.title}): Text fehlt.`); return; }
      const base = (e.key.trim() || slugify(e.title) || 'sektion');
      let key = base; let n = 2;
      while (seen.has(key)) key = `${base}-${n++}`;
      seen.add(key);
      sections.push({
        key, title: e.title.trim(), bodyMd: e.bodyMd.trim(), phase: e.phase,
        visibility: e.visibility, sortOrder: (i + 1) * 10,
        translationStatus: locale === 'de' ? 'source' : 'reviewed',
      });
    }
    setBusy(true);
    try {
      const res = await api('content/pr', { method: 'POST', body: JSON.stringify({ propertySlug: bundle.slug, kind: 'guide', locale, sections }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) setPr({ url: data.url, number: data.number });
      else setError(data.error || 'Pull Request konnte nicht erstellt werden.');
    } catch { setError('Netzwerkfehler.'); } finally { setBusy(false); }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Gästemappen-Sektionen</h2>
        <div className="w-40">
          <Select value={locale} onValueChange={(v) => switchLocale(v as Locale)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{locales.map((l) => <SelectItem key={l} value={l}>{LOCALE_LABELS[l]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Bearbeiten pro Sprache → „Als Pull Request speichern" (schreibt <code>guide/{locale}.json</code>).
        Dynamische Werte nur als Platzhalter, z. B. <code>{'{{wifiName}}'}</code>. Interne Sektionen
        werden hier nicht angezeigt und bleiben repo-seitig.
      </p>
      {pr && (
        <p className="text-sm">✅ Pull Request erstellt:{' '}
          <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">#{pr.number}</a>{' '}— nach Prüfung der Preview mergen.</p>
      )}

      {entries.map((e, i) => (
        <Card key={e.uid} className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="nach oben">↑</Button>
              <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === entries.length - 1} aria-label="nach unten">↓</Button>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(i)}>Entfernen</Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1"><Label>Titel</Label><Input value={e.title} onChange={(ev) => update(i, { title: ev.target.value })} /></div>
            <div className="space-y-1"><Label>Phase</Label>
              <Select value={e.phase} onValueChange={(v) => update(i, { phase: v as GuidePhase })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PHASE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Text</Label>
            <Textarea rows={4} value={e.bodyMd} onChange={(ev) => update(i, { bodyMd: ev.target.value })} placeholder="Markdown erlaubt. Dynamische Werte als {{platzhalter}}." />
            <AiAssist slug={bundle.slug} locale={locale} target={`Gästemappen-Sektion „${e.title || 'Abschnitt'}"`} currentText={e.bodyMd} onAccept={(t) => update(i, { bodyMd: t })} />
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Weitere Einstellungen</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="space-y-1"><Label>Schlüssel (key)</Label><Input value={e.key} onChange={(ev) => update(i, { key: ev.target.value })} placeholder="wird aus dem Titel abgeleitet" /></div>
              <div className="space-y-1"><Label>Sichtbarkeit</Label>
                <Select value={e.visibility} onValueChange={(v) => update(i, { visibility: v as GuideVisibility })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">Nur mit Gast-Login</SelectItem>
                    <SelectItem value="public">Öffentlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </details>
        </Card>
      ))}
      {entries.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Sektionen für diese Sprache – füge eine hinzu.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={addBlank}>+ Sektion</Button>
        <div className="w-52">
          <Select value="" onValueChange={addStandard}>
            <SelectTrigger><SelectValue placeholder="+ Standard-Sektion…" /></SelectTrigger>
            <SelectContent>{STANDARD_SECTIONS.map((s) => <SelectItem key={s.key} value={s.key}>{s.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Erstelle PR…' : 'Als Pull Request speichern'}</Button>
      </div>
    </section>
  );
};

const ContentView = ({ bundle }: { bundle: ContentBundle }) => {
  const factLocales = Object.keys(bundle.facts) as Locale[];

  return (
    <Tabs defaultValue="facts" className="space-y-6">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="facts">Fakten</TabsTrigger>
        <TabsTrigger value="guide">Gästemappe</TabsTrigger>
        <TabsTrigger value="recommendations">Empfehlungen</TabsTrigger>
      </TabsList>

      {/* Fakten — chatbot facts (central knowledge base) */}
      <TabsContent value="facts" className="space-y-3">
        <h2 className="text-base font-semibold">Chatbot-Facts</h2>
        {factLocales.length === 0 && <p className="text-sm text-muted-foreground">Keine Facts hinterlegt.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {factLocales.map((loc) => (
            <FactEditorCard key={loc} slug={bundle.slug} locale={loc} initial={bundle.facts[loc] || ''} />
          ))}
        </div>
      </TabsContent>

      {/* Gästemappe — hero + editable guide sections (with AI assist) */}
      <TabsContent value="guide" className="space-y-8">
        <HeroEditor bundle={bundle} />
        <GuideEditor bundle={bundle} />
      </TabsContent>

      {/* Empfehlungen — editable (German) */}
      <TabsContent value="recommendations">
        <RecommendationsEditor bundle={bundle} />
      </TabsContent>
    </Tabs>
  );
};

// ---------------------------------------------------------------------------
// Admin page
// ---------------------------------------------------------------------------
const Admin = () => {
  const [auth, setAuth] = useState<AuthState>('checking');
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [bundle, setBundle] = useState<ContentBundle | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState('');

  const loadProperties = useCallback(async () => {
    const res = await api('content');
    if (res.status === 401) {
      setAuth('unauthenticated');
      return;
    }
    if (!res.ok) {
      setError('Fehler beim Laden der Properties.');
      setAuth('authenticated');
      return;
    }
    const data = await res.json();
    setProperties(data.properties || []);
    setAuth('authenticated');
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const selectProperty = async (slug: string) => {
    setSelected(slug);
    setBundle(null);
    setError('');
    setLoadingContent(true);
    try {
      const res = await api(`content?propertySlug=${encodeURIComponent(slug)}`);
      if (res.status === 401) {
        setAuth('unauthenticated');
        return;
      }
      if (!res.ok) {
        setError('Fehler beim Laden des Contents.');
        return;
      }
      setBundle(await res.json());
    } finally {
      setLoadingContent(false);
    }
  };

  const logout = async () => {
    await api('logout', { method: 'POST' }).catch(() => {});
    setAuth('unauthenticated');
    setProperties([]);
    setSelected('');
    setBundle(null);
  };

  if (auth === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (auth === 'unauthenticated') {
    return <LoginScreen onSuccess={loadProperties} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-base font-semibold">Content-Admin</h1>
            <p className="text-xs text-muted-foreground">Bearbeiten &amp; per Pull Request veröffentlichen</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Vorschau: opens the selected property's live guest guide (/:slug). */}
            <Button
              variant="outline"
              size="sm"
              disabled={!selected}
              onClick={() => selected && window.open(`/${selected}`, '_blank', 'noopener,noreferrer')}
            >
              <Eye className="mr-1.5 h-4 w-4" /> Vorschau
            </Button>
            {/* Veröffentlichen: offene Content-Pull-Requests DIESER Property → mergen → Vercel deployt live. */}
            <Button
              variant="outline"
              size="sm"
              disabled={!selected}
              onClick={() =>
                selected && window.open(contentPullsUrl(selected), '_blank', 'noopener,noreferrer')
              }
            >
              <UploadCloud className="mr-1.5 h-4 w-4" /> Veröffentlichen
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>Abmelden</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="max-w-xs space-y-1.5">
          <Label>Property</Label>
          <Select value={selected} onValueChange={selectProperty}>
            <SelectTrigger>
              <SelectValue placeholder="Property auswählen…" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.slug} value={p.slug}>
                  {p.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {loadingContent && <p className="text-sm text-muted-foreground">Lädt…</p>}
        {!loadingContent && bundle && <ContentView bundle={bundle} />}
        {!loadingContent && !bundle && !error && (
          <p className="text-sm text-muted-foreground">Wähle oben eine Property, um ihren Content anzusehen.</p>
        )}
      </main>
    </div>
  );
};

export default Admin;
