import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from './AdminContext';

export function PropertiesPage() {
  const { properties, propertiesLoading } = useAdmin();

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Properties</h1>
        <p className="text-sm text-muted-foreground">
          Quelle der Wahrheit für Property-Konfiguration. Bearbeitung folgt in einer späteren Phase.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead className="w-28">Listing-ID</TableHead>
            <TableHead className="w-28">Check-in</TableHead>
            <TableHead className="w-24">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {propertiesLoading && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Lädt…</TableCell></TableRow>}
          {properties.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.display_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground font-mono">{p.slug}</TableCell>
              <TableCell>{p.hostaway_listing_id}</TableCell>
              <TableCell>{p.checkin_time ?? '—'}</TableCell>
              <TableCell><Badge variant={p.status === 'active' ? 'default' : 'outline'}>{p.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
