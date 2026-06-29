import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { pickLocale } from '@/lib/knowledge';
import type { ContentStatus, FaqRow, I18nText, TopicRow } from '@/lib/cms-types';
import { useAdmin } from './AdminContext';
import { I18nTextField } from './components/I18nTextField';

interface EditState {
  id?: string;
  question: I18nText;
  answer: I18nText;
  topic_id: string | null;
  scope: 'global' | 'property';
  expose_to_chatbot: boolean;
}

export function FaqsPage() {
  const { selectedSlug, selectedProperty } = useAdmin();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EditState | null>(null);
  const propertyId = selectedProperty?.id ?? null;
  const canScopeToProperty = Boolean(propertyId);

  const { data: topics = [] } = useQuery({
    queryKey: ['admin', 'topics'],
    queryFn: async (): Promise<TopicRow[]> => {
      const { data, error } = await supabase.from('topics').select('*').order('sort_order');
      if (error) throw error;
      return (data ?? []) as TopicRow[];
    },
  });

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['admin', 'faqs', selectedSlug, propertyId],
    queryFn: async (): Promise<FaqRow[]> => {
      let q = supabase.from('faqs').select('*').order('updated_at', { ascending: false });
      q = propertyId ? q.or(`property_id.is.null,property_id.eq.${propertyId}`) : q.is('property_id', null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FaqRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'faqs'] });

  const saveMutation = useMutation({
    mutationFn: async (s: EditState) => {
      const payload = {
        question: s.question,
        answer: s.answer,
        topic_id: s.topic_id,
        expose_to_chatbot: s.expose_to_chatbot,
        property_id: s.scope === 'property' ? propertyId : null,
      };
      if (s.id) {
        const { error } = await supabase.from('faqs').update(payload).eq('id', s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('faqs').insert({ ...payload, status: 'draft' });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Gespeichert'); setEditing(null); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Fehler'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContentStatus }) => {
      const { error } = await supabase.from('faqs').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Status aktualisiert'); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Fehler'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Gelöscht'); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Fehler'),
  });

  const topicLabel = useMemo(() => {
    const map = new Map(topics.map((t) => [t.id, pickLocale(t.label, 'de')]));
    return (id: string | null) => (id ? map.get(id) ?? '—' : '—');
  }, [topics]);

  const startCreate = () => setEditing({
    question: {}, answer: {}, topic_id: null,
    scope: canScopeToProperty ? 'property' : 'global', expose_to_chatbot: true,
  });
  const startEdit = (f: FaqRow) => setEditing({
    id: f.id, question: f.question ?? {}, answer: f.answer ?? {}, topic_id: f.topic_id,
    scope: f.property_id ? 'property' : 'global', expose_to_chatbot: f.expose_to_chatbot,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">FAQ / Wissensbasis</h1>
          <p className="text-sm text-muted-foreground">Nur <strong>veröffentlichte</strong> FAQ werden ausgeliefert.</p>
        </div>
        <Button onClick={startCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Neue FAQ</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Frage (DE)</TableHead>
            <TableHead className="w-28">Thema</TableHead>
            <TableHead className="w-24">Geltung</TableHead>
            <TableHead className="w-24">Chatbot</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-[230px] text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Lädt…</TableCell></TableRow>}
          {!isLoading && faqs.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Noch keine FAQ.</TableCell></TableRow>}
          {faqs.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="max-w-[260px] truncate">{pickLocale(f.question, 'de') || <span className="text-muted-foreground">(leer)</span>}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{topicLabel(f.topic_id)}</TableCell>
              <TableCell><Badge variant="outline">{f.property_id ? 'Property' : 'Global'}</Badge></TableCell>
              <TableCell>{f.expose_to_chatbot ? '✓' : '—'}</TableCell>
              <TableCell><Badge variant={f.status === 'published' ? 'default' : 'outline'}>{f.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}</Badge></TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(f)}>Bearbeiten</Button>
                {f.status === 'draft'
                  ? <Button variant="default" size="sm" onClick={() => statusMutation.mutate({ id: f.id, status: 'published' })}>Veröffentlichen</Button>
                  : <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: f.id, status: 'draft' })}>Zurückziehen</Button>}
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm('Diese FAQ löschen?')) deleteMutation.mutate(f.id); }}>Löschen</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? 'FAQ bearbeiten' : 'Neue FAQ'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <I18nTextField label="Frage" value={editing.question} onChange={(question) => setEditing({ ...editing, question })} />
              <I18nTextField label="Antwort" value={editing.answer} onChange={(answer) => setEditing({ ...editing, answer })} multiline />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Thema</label>
                  <Select value={editing.topic_id ?? 'none'} onValueChange={(v) => setEditing({ ...editing, topic_id: v === 'none' ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Thema" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— kein Thema —</SelectItem>
                      {topics.map((t) => <SelectItem key={t.id} value={t.id}>{pickLocale(t.label, 'de')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Geltung</label>
                  <Select value={editing.scope} onValueChange={(v) => setEditing({ ...editing, scope: v as 'global' | 'property' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="property" disabled={!canScopeToProperty}>{selectedProperty?.display_name ?? 'Property wählen'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm">Im Chatbot-Wissen verwenden</span>
                <Switch checked={editing.expose_to_chatbot} onCheckedChange={(v) => setEditing({ ...editing, expose_to_chatbot: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Abbrechen</Button>
            <Button onClick={() => editing && saveMutation.mutate(editing)} disabled={saveMutation.isPending}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
