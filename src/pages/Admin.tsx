import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

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

// Phase 3: chatbot facts can be edited here; saving opens a GitHub pull request
// via the server-side /api/admin/content/pr endpoint (never a direct commit to
// the base branch). Guide sections & recommendations remain read-only for now.

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

const ContentView = ({ bundle }: { bundle: ContentBundle }) => {
  const factLocales = Object.keys(bundle.facts) as Locale[];
  const guideLocales = Object.keys(bundle.guide) as Locale[];
  const recLocales = Object.keys(bundle.recommendations) as Locale[];

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

      {/* Recommendations */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Empfehlungen</h2>
        {bundle.places.length === 0 && <p className="text-sm text-muted-foreground">Keine Orte hinterlegt.</p>}
        {bundle.places.length > 0 && (
          <Card className="p-4">
            <div className="mb-3 text-xs text-muted-foreground">recommendations/places.json</div>
            <div className="space-y-2">
              {bundle.places.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="font-medium">{p.name}</span>
                  <code className="text-xs text-muted-foreground">{p.id}</code>
                  <Badge variant="outline">{p.category}</Badge>
                  <VisibilityBadge visibility={p.visibility} />
                  {p.distanceText && <span className="text-xs text-muted-foreground">{p.distanceText}</span>}
                  {p.mapsUrl && (
                    <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                      Karte
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
        {recLocales.map((loc) => (
          <Card key={loc} className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="uppercase">{loc}</Badge>
              <span className="text-xs text-muted-foreground">recommendations/{loc}.json</span>
            </div>
            <div className="space-y-3">
              {(bundle.recommendations[loc] || []).map((item) => (
                <div key={item.placeId} className="rounded-md border border-border p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <code className="text-xs text-muted-foreground">{item.placeId}</code>
                    <Badge variant="outline">{item.translationStatus}</Badge>
                  </div>
                  {item.descriptionMd && (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{item.descriptionMd}</ReactMarkdown>
                    </div>
                  )}
                  {item.tipMd && (
                    <p className="mt-1 text-sm text-muted-foreground">💡 {item.tipMd}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>
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
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-base font-semibold">Content-Admin</h1>
            <p className="text-xs text-muted-foreground">Nur-Lese-Ansicht (Phase 2)</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>Abmelden</Button>
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
