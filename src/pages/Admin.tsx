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
import type { GuideSection, Place, RecommendationItem, Locale } from '@/content/schemas';

// Chatbot facts and recommendations (German) can be edited here; saving opens a
// GitHub pull request via the server-side /api/admin/content/pr endpoint (never a
// direct commit to the base branch). Guide sections remain read-only for now.

type PropertyListItem = { slug: string; displayName: string };

interface ContentBundle {
  slug: string;
  displayName: string;
  facts: Partial<Record<Locale, string>>;
  guide: Partial<Record<Locale, GuideSection[]>>;
  places: Place[];
  recommendations: Partial<Record<Locale, RecommendationItem[]>>;
}

type AuthState = 'checking' | 'unauthenticated' | 'authenticated';

const api = (path: string, init?: RequestInit) =>
  fetch(`/api/admin/${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });

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

// ---------------------------------------------------------------------------
// Read-only content viewer
// ---------------------------------------------------------------------------
const VisibilityBadge = ({ visibility }: { visibility: string }) => (
  <Badge variant={visibility === 'public' ? 'default' : 'secondary'}>{visibility}</Badge>
);

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

const ContentView = ({ bundle }: { bundle: ContentBundle }) => {
  const factLocales = Object.keys(bundle.facts) as Locale[];
  const guideLocales = Object.keys(bundle.guide) as Locale[];

  return (
    <div className="space-y-8">
      {/* Chatbot facts */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Chatbot-Facts</h2>
        {factLocales.length === 0 && <p className="text-sm text-muted-foreground">Keine Facts hinterlegt.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {factLocales.map((loc) => (
            <FactEditorCard key={loc} slug={bundle.slug} locale={loc} initial={bundle.facts[loc] || ''} />
          ))}
        </div>
      </section>

      {/* Guide sections */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Gästemappen-Sektionen</h2>
        {guideLocales.length === 0 && <p className="text-sm text-muted-foreground">Keine Sektionen hinterlegt.</p>}
        {guideLocales.map((loc) => (
          <Card key={loc} className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="uppercase">{loc}</Badge>
              <span className="text-xs text-muted-foreground">guide/{loc}.json</span>
            </div>
            <div className="space-y-3">
              {(bundle.guide[loc] || []).map((s) => (
                <div key={s.key} className="rounded-md border border-border p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-medium">{s.title}</span>
                    <code className="text-xs text-muted-foreground">{s.key}</code>
                    <VisibilityBadge visibility={s.visibility} />
                    <Badge variant="outline">{s.phase}</Badge>
                    <span className="text-xs text-muted-foreground">#{s.sortOrder}</span>
                    <Badge variant="outline">{s.translationStatus}</Badge>
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{s.bodyMd}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>

      {/* Recommendations — editable (German) */}
      <RecommendationsEditor bundle={bundle} />
    </div>
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
