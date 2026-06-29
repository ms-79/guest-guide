import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Sparkles, MessageSquareText, FileText, Building2, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAdmin } from '../AdminContext';

const NAV = [
  { to: '/admin/facts', label: 'AI-Facts', icon: Sparkles },
  { to: '/admin/faqs', label: 'FAQ', icon: MessageSquareText },
  { to: '/admin/prompts', label: 'Chatbot-Prompt', icon: FileText },
  { to: '/admin/properties', label: 'Properties', icon: Building2 },
];

export function AdminLayout({ children, userEmail }: { children: ReactNode; userEmail: string }) {
  const { properties, selectedSlug, setSelectedSlug } = useAdmin();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <p className="text-sm font-semibold">Guest Guide CMS</p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        </div>

        <div className="p-3 border-b border-border space-y-1.5">
          <label className="text-xs text-muted-foreground">Property</label>
          <Select value={selectedSlug} onValueChange={setSelectedSlug}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Property wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">🌐 Global (alle Properties)</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.slug} value={p.slug}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/60',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
