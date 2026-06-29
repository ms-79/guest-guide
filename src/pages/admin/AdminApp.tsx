import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AdminProvider } from './AdminContext';
import { AdminLayout } from './components/AdminLayout';
import { AdminLogin } from './AdminLogin';
import { FactsPage } from './FactsPage';
import { FaqsPage } from './FaqsPage';
import { PromptsPage } from './PromptsPage';
import { PropertiesPage } from './PropertiesPage';

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-lg font-semibold">CMS nicht konfiguriert</h1>
          <p className="text-sm text-muted-foreground">
            Setze <code>VITE_SUPABASE_URL</code> und <code>VITE_SUPABASE_ANON_KEY</code> und lade neu.
            Details in <code>supabase/README.md</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <AdminLogin />;

  return (
    <AdminProvider>
      <AdminLayout userEmail={session.user.email ?? ''}>
        <Routes>
          <Route index element={<Navigate to="facts" replace />} />
          <Route path="facts" element={<FactsPage />} />
          <Route path="faqs" element={<FaqsPage />} />
          <Route path="prompts" element={<PromptsPage />} />
          <Route path="properties" element={<PropertiesPage />} />
          <Route path="*" element={<Navigate to="facts" replace />} />
        </Routes>
      </AdminLayout>
    </AdminProvider>
  );
}
