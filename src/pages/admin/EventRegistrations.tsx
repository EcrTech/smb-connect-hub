import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Download, Search, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Json } from '@/integrations/supabase/types';

interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  registration_data: Json;
  original_amount: number | null;
  discount_amount: number | null;
  final_amount: number | null;
  event_coupons: {
    code: string;
  } | null;
}

interface LandingPage {
  id: string;
  title: string;
  slug: string;
}

const EventRegistrations = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

  const { data: landingPage, isLoading: isLoadingPage } = useQuery({
    queryKey: ['landing-page', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_landing_pages')
        .select('id, title, slug')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as LandingPage;
    },
    enabled: !!id && !!userId,
  });

  const { data: registrations, isLoading: isLoadingRegistrations } = useQuery({
    queryKey: ['event-registrations', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          created_at,
          registration_data,
          original_amount,
          discount_amount,
          final_amount,
          event_coupons (
            code
          )
        `)
        .eq('landing_page_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Registration[];
    },
    enabled: !!id && !!userId,
  });

  const filteredRegistrations = registrations?.filter((reg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      reg.first_name.toLowerCase().includes(query) ||
      reg.last_name.toLowerCase().includes(query) ||
      reg.email.toLowerCase().includes(query) ||
      (reg.phone && reg.phone.toLowerCase().includes(query))
    );
  });

  const flattenRegistrationData = (reg: Registration): Record<string, string> => {
    const flat: Record<string, string> = {
      'First Name': reg.first_name,
      'Last Name': reg.last_name,
      'Email': reg.email,
      'Phone': reg.phone || '',
      'Status': reg.status,
      'Registered At': format(new Date(reg.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Original Amount': reg.original_amount?.toString() || '',
      'Discount Amount': reg.discount_amount?.toString() || '',
      'Final Amount': reg.final_amount?.toString() || '',
      'Coupon Code': reg.event_coupons?.code || '',
    };

    // Flatten registration_data JSONB
    if (reg.registration_data && typeof reg.registration_data === 'object') {
      const data = reg.registration_data as Record<string, unknown>;
      Object.entries(data).forEach(([key, value]) => {
        // Skip keys that are already in standard fields
        if (['first_name', 'last_name', 'email', 'phone'].includes(key.toLowerCase())) {
          return;
        }
        flat[key] = String(value ?? '');
      });
    }

    return flat;
  };

  const exportToCSV = () => {
    if (!registrations || registrations.length === 0) return;

    // Get all unique keys across all registrations
    const allKeys = new Set<string>();
    registrations.forEach((reg) => {
      const flat = flattenRegistrationData(reg);
      Object.keys(flat).forEach((key) => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const rows = registrations.map((reg) => {
      const flat = flattenRegistrationData(reg);
      return headers.map((header) => {
        const value = flat[header] || '';
        // Escape quotes and wrap in quotes if contains comma or quote
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registrations-${landingPage?.slug || id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = isLoadingPage || isLoadingRegistrations;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/event-landing-pages')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title={`Registrations: ${landingPage?.title || 'Loading...'}`}
            description={`${filteredRegistrations?.length || 0} total registrations`}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={exportToCSV}
          disabled={!registrations || registrations.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !filteredRegistrations || filteredRegistrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? 'No registrations match your search' : 'No registrations yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Coupon</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">
                      {reg.first_name} {reg.last_name}
                    </TableCell>
                    <TableCell>{reg.email}</TableCell>
                    <TableCell>{reg.phone || '-'}</TableCell>
                    <TableCell>
                      {reg.event_coupons?.code ? (
                        <Badge variant="outline" className="text-xs">
                          {reg.event_coupons.code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {reg.final_amount !== null ? (
                        <div className="text-sm">
                          <span className="font-medium">₹{reg.final_amount.toLocaleString()}</span>
                          {reg.discount_amount && reg.discount_amount > 0 && (
                            <span className="text-green-600 text-xs ml-1">
                              (-₹{reg.discount_amount.toLocaleString()})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(reg.status)}</TableCell>
                    <TableCell>
                      {format(new Date(reg.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRegistration(reg)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedRegistration} onOpenChange={() => setSelectedRegistration(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
            <DialogDescription>
              {selectedRegistration?.first_name} {selectedRegistration?.last_name} - {selectedRegistration?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedRegistration && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p>{selectedRegistration.first_name} {selectedRegistration.last_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{selectedRegistration.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{selectedRegistration.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p>{getStatusBadge(selectedRegistration.status)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Registered At</p>
                  <p>{format(new Date(selectedRegistration.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
                {selectedRegistration.event_coupons?.code && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Coupon Used</p>
                    <Badge variant="outline">{selectedRegistration.event_coupons.code}</Badge>
                  </div>
                )}
              </div>

              {(selectedRegistration.original_amount !== null || selectedRegistration.final_amount !== null) && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Payment Details</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Original</p>
                      <p>₹{selectedRegistration.original_amount?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Discount</p>
                      <p className="text-green-600">-₹{selectedRegistration.discount_amount?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Final</p>
                      <p className="font-semibold">₹{selectedRegistration.final_amount?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedRegistration.registration_data && 
                typeof selectedRegistration.registration_data === 'object' &&
                Object.keys(selectedRegistration.registration_data).length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Custom Form Fields</p>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedRegistration.registration_data as Record<string, unknown>)
                      .filter(([key]) => !['first_name', 'last_name', 'email', 'phone'].includes(key.toLowerCase()))
                      .map(([key, value]) => (
                        <div key={key}>
                          <p className="text-sm font-medium text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p>{String(value ?? '-')}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventRegistrations;
