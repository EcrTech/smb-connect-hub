import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building, Mail, Phone, Globe, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  is_active: boolean;
  is_verified: boolean;
  subscription_tier: string;
  associations: {
    name: string;
  };
}

export function CompaniesList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = companies.filter(
        (company) =>
          company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          company.associations?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCompanies(filtered);
    } else {
      setFilteredCompanies(companies);
    }
  }, [searchTerm, companies]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          associations (
            name
          )
        `)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
      setFilteredCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Companies</h2>
          <p className="text-muted-foreground">
            {filteredCompanies.length} of {companies.length} companies
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCompanies.map((company) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Building className="h-8 w-8 text-primary" />
                <div className="flex gap-1">
                  <Badge variant={company.is_active ? 'default' : 'secondary'}>
                    {company.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {company.is_verified && (
                    <Badge variant="outline">Verified</Badge>
                  )}
                </div>
              </div>
              <CardTitle className="mt-2">{company.name}</CardTitle>
              <CardDescription>
                <Badge variant="secondary" className="mt-1">
                  {company.associations?.name}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {company.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {company.description}
                </p>
              )}
              {company.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{company.email}</span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {company.website}
                  </a>
                </div>
              )}
              {company.city && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {company.city}
                    {company.state && `, ${company.state}`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
