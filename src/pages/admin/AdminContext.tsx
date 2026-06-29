import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PropertyRow } from '@/lib/cms-types';

interface AdminContextValue {
  properties: PropertyRow[];
  propertiesLoading: boolean;
  /** Currently selected property slug, or 'global' for global-only content. */
  selectedSlug: string;
  setSelectedSlug: (slug: string) => void;
  /** Resolved selected property row (null when 'global' or not found). */
  selectedProperty: PropertyRow | null;
}

const Ctx = createContext<AdminContextValue | null>(null);

const STORAGE_KEY = 'admin.selectedSlug';

export function AdminProvider({ children }: { children: ReactNode }) {
  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['admin', 'properties'],
    queryFn: async (): Promise<PropertyRow[]> => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('display_name');
      if (error) throw error;
      return (data ?? []) as PropertyRow[];
    },
  });

  const [selectedSlug, setSelectedSlugState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || 'global',
  );

  const setSelectedSlug = (slug: string) => {
    setSelectedSlugState(slug);
    localStorage.setItem(STORAGE_KEY, slug);
  };

  // Default to the first property once loaded if nothing valid is selected.
  useEffect(() => {
    if (propertiesLoading || properties.length === 0) return;
    const valid = selectedSlug === 'global' || properties.some((p) => p.slug === selectedSlug);
    if (!valid) setSelectedSlug(properties[0].slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertiesLoading, properties]);

  const selectedProperty = properties.find((p) => p.slug === selectedSlug) ?? null;

  return (
    <Ctx.Provider value={{ properties, propertiesLoading, selectedSlug, setSelectedSlug, selectedProperty }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdmin must be used within AdminProvider');
  return v;
}
