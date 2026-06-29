import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { pickLocale } from '@/lib/knowledge';
import type { AiFactRow, FactStatus, I18nText, TopicRow } from '@/lib/cms-types';
import { useAdmin } from './AdminContext';
import { I18nTextField } from './components/I18nTextField';

const STATUS_META: Record<FactStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Entwurf', variant: 'outline' },
  pending_review: { label: 'Zur Prüfung', variant: 'secondary' },
  approved: { label: 'Freigegeben', variant: 'default' },
  rejected: { label: 'Abgelehnt', variant: 'destructive' },
};

interface EditState {
  id?: string;
  fact: I18nText;
  topic_id: string | null;
  source: string;
  note: string;
  scope: 'global' | 'property';
}

const emptyEdit = (scope: 'global' | 'property'): EditState => ({
  fact: {},
  topic_id: null,
  source: '',
  note: '',
  scope,
});

export function FactsPage() {
  const { selectedSlug, selectedProperty } = useAdmin();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EditState | null>(null);

  const propertyId = selectedProperty?.id ?? null;

  const { data: topics = [] } = useQuery({
    queryKey: ['admin', 'topics'],
    queryFn: async (): Promise<TopicRow[]> => {
      const { data, error } = await supabase.from('topics').select('*').order('sort_order');
      if (error) throw error;
      return (data ?? []) as TopicRow[];
    },
  });

  const { data: facts = [], isLoading } = useQuery({
    queryKey: ['admin', 'facts', selectedSlug, propertyId],
    queryFn: async (): Promise<AiFactRow[]> => {
      let q = supabase.from('ai_facts').select('*').order('updated_at', { ascending: false });
      q = propertyId ? q.or(`property_id.is.null,property_id.eq.${propertyId}`) : q.is('property_id', null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AiFactRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'facts'] });

  const saveMutation = useMutation({
    mutationFn: async (state: EditState) => {
      const payload = {
        fact: state.fact,
        topic_id: state.topic_id,
        source: state.source || null,
        note: state.note || null,
        property_id: state.scope === 'property' ? propertyId : null,
      };
      if (state.id) {
        const { error } = await supabase.from('ai_facts').update(payload).eq('id', state.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_facts').insert({ ...payload, status: 'draft' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Gespeichert');
      setEditing(null);
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Fehler beim Speichern'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FactStatus }) => {
      const patch: Record<string, unknown> = { status };
      if (status === 'approved' || status === 'rejected') {
        const { data: userData } = await supabase.auth.getUser();
        patch.reviewed_by = userData.user?.id ?? null;
        patch.reviewed_at = new Date().toISOString();
      }
      const { error } = await supabase.from('ai_facts').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status aktualisiert');
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Fehler'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_facts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Gelöscht');
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Fehler'),
  });

  const topicLabel = useMemo(() => {
    const map = new Map(topics.map((t) => [t.id, pickLocale(t.label, 'de')]));
    return (id: string | null) => (id ? map.get(id) ?? '—' : '—');
  }, [topics]);

  const canScopeToProperty = Boolean(propertyId);

  const startCreate = () =>
    setEditing(emptyEdit(canScopeToProperty ? 'property' : 'global'));

  const startEdit = (f: AiFactRow) =>
    setEditing({
      id: f.id,
      fact: f.fact ?? {},
      topic_id: f.topic_id,
      source: f.source ?? '',
      note: f.note ?? '',
      scope: f.property_id ? 'property' : 'global',
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">AI-Facts</h1>
          <p className="text-sm text-muted-foreground">
            Geprüfte Fakten für den Chatbot. Nur <strong>freigegebene</strong> Facts werden ausgeliefert.
          </p>
        </div>
        <Button onClick={startCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Neuer Fact
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fakt (DE)</TableHead>
            <TableHead className="w-28">Thema</TableHead>
            <TableHead className="w-24">Geltung</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-[260px] text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow><TableCell colSpan={5} className="text-muted-foreground">Lädt…</TableCell></TableRow>
          )}
          {!isLoading && facts.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-muted-foreground">Noch keine Facts.</TableCell></TableRow>
          )}
          {facts.map((f) => {
            const meta = STATUS_META[f.status];
            return (
              <TableRow key={f.id}>
                <TableCell className="max-w-[280px] truncate">{pickLocale(f.fact, 'de') || <span className="text-muted-foreground">(leer)</span>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{topicLabel(f.topic_id)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{f.property_id ? 'Property' : 'Global'}</Badge>
                </TableCell>
                <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(f)}>Bearbeiten</Button>
                  {f.status === 'draft' && (
                    <Button variant="secondary" size="sm" onClick={() => statusMutation.mutate({ id: f.id, status: 'pending_review' })}>Zur Prüfung</Button>
                  )}
                  {f.status === 'pending_review' && (
                    <>
                      <Button variant="default" size="sm" onClick={() => statusMutation.mutate({ id: f.id, status: 'approved' })}>Freigeben</Button>
                      <Button variant="destructive" size="sm" onClick={() => statusMutation.mutate({ id: f.id, status: 'rejected' })}>Ablehnen</Button>
                    </>
                  )}
                  {f.status === 'approved' && (
                    <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: f.id, status: 'draft' })}>Zurückziehen</Button>
                  )}
                  {f.status === 'rejected' && (
                    <Button variant="secondary" size="sm" onClick={() => statusMutation.mutate({ id: f.id, status: 'pending_review' })}>Erneut einreichen</Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm('Diesen Fact löschen?')) deleteMutation.mutate(f.id); }}>Löschen</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Fact bearbeiten' : 'Neuer Fact'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <I18nTextField
                label="Fakt"
                value={editing.fact}
                onChange={(fact) => setEditing({ ...editing, fact })}
                multiline
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Thema</label>
                  <Select
                    value={editing.topic_id ?? 'none'}
                    onValueChange={(v) => setEditing({ ...editing, topic_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Thema" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— kein Thema —</SelectItem>
                      {topics.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{pickLocale(t.label, 'de')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Geltung</label>
                  <Select
                    value={editing.scope}
                    onValueChange={(v) => setEditing({ ...editing, scope: v as 'global' | 'property' })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="property" disabled={!canScopeToProperty}>
                        {selectedProperty?.display_name ?? 'Property wählen'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quelle (optional)</label>
                <Input value={editing.source} onChange={(e) => setEditing({ ...editing, source: e.target.value })} placeholder="z. B. Gastgeber, Website" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notiz (optional)</label>
                <Textarea rows={2} value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Abbrechen</Button>
            <Button onClick={() => editing && saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
