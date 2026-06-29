import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import type { ChatbotPromptRow } from '@/lib/cms-types';
import { useAdmin } from './AdminContext';

export function PromptsPage() {
  const { selectedSlug, selectedProperty } = useAdmin();
  const qc = useQueryClient();
  const propertyId = selectedProperty?.id ?? null;
  const isGlobal = selectedSlug === 'global';

  const { data: prompt, isLoading } = useQuery({
    queryKey: ['admin', 'prompt', selectedSlug, propertyId],
    queryFn: async (): Promise<ChatbotPromptRow | null> => {
      let q = supabase.from('chatbot_prompts').select('*').is('locale', null).limit(1);
      q = isGlobal ? q.is('property_id', null) : q.eq('property_id', propertyId as string);
      const { data, error } = await q;
      if (error) throw error;
      return (data?.[0] ?? null) as ChatbotPromptRow | null;
    },
    enabled: isGlobal || !!propertyId,
  });

  const [text, setText] = useState('');
  useEffect(() => { setText(prompt?.base_prompt ?? ''); }, [prompt?.id, prompt?.base_prompt]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'prompt'] });

  const saveMutation = useMutation({
    mutationFn: async ({ publish }: { publish: boolean }) => {
      const status = publish ? 'published' : (prompt?.status ?? 'draft');
      if (prompt?.id) {
        const { error } = await supabase.from('chatbot_prompts')
          .update({ base_prompt: text, status, version: (prompt.version ?? 1) + 1 })
          .eq('id', prompt.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('chatbot_prompts').insert({
          property_id: isGlobal ? null : propertyId,
          locale: null,
          base_prompt: text,
          status: publish ? 'published' : 'draft',
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Gespeichert'); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Fehler'),
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Chatbot-Basis-Prompt</h1>
        <p className="text-sm text-muted-foreground">
          {isGlobal
            ? 'Globaler Standard-Prompt (Fallback für alle Properties ohne eigenen Prompt).'
            : `Prompt für ${selectedProperty?.display_name ?? '—'}.`}
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span>Status:</span>
          <Badge variant={prompt?.status === 'published' ? 'default' : 'outline'}>
            {prompt ? (prompt.status === 'published' ? 'Veröffentlicht' : 'Entwurf') : 'Neu'}
          </Badge>
          {prompt && <span className="text-muted-foreground">v{prompt.version}</span>}
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={20}
          className="font-mono text-xs"
          placeholder={isLoading ? 'Lädt…' : 'Prompt-Text…'}
        />

        <p className="text-xs text-muted-foreground">
          Platzhalter: <code>{'{{property_name}}'}</code>, <code>{'{{whatsapp_url}}'}</code>,{' '}
          <code>{'{{whatsapp_number}}'}</code> werden zur Laufzeit ersetzt. Freigegebene AI-Facts und
          veröffentlichte FAQ werden automatisch unter dem Prompt angehängt.
        </p>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => saveMutation.mutate({ publish: false })} disabled={saveMutation.isPending}>
            Als Entwurf speichern
          </Button>
          <Button onClick={() => saveMutation.mutate({ publish: true })} disabled={saveMutation.isPending}>
            Speichern & veröffentlichen
          </Button>
        </div>
      </Card>
    </div>
  );
}
