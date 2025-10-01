import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Mail, Phone, Globe, MapPin, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { EditAssociationDialog } from './association/EditAssociationDialog';

interface Association {
  id: string;
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  is_active: boolean;
}

export function AssociationsList() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAssociation, setEditingAssociation] = useState<Association | null>(null);

  useEffect(() => {
    loadAssociations();
  }, []);

  const loadAssociations = async () => {
    try {
      const { data, error } = await supabase
        .from('associations')
        .select('*')
        .order('name');

      if (error) throw error;
      setAssociations(data || []);
    } catch (error) {
      console.error('Error loading associations:', error);
      toast.error('Failed to load associations');
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Associations</h2>
          <p className="text-muted-foreground">
            {associations.length} total associations
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {associations.map((association) => (
          <Card key={association.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Building2 className="h-8 w-8 text-primary" />
                <div className="flex items-center gap-2">
                  <Badge variant={association.is_active ? 'default' : 'secondary'}>
                    {association.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setEditingAssociation(association)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="mt-2">{association.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {association.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {association.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{association.contact_email}</span>
                </div>
              )}
              {association.contact_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{association.contact_phone}</span>
                </div>
              )}
              {association.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={association.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {association.website}
                  </a>
                </div>
              )}
              {association.city && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {association.city}
                    {association.state && `, ${association.state}`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {editingAssociation && (
        <EditAssociationDialog
          association={editingAssociation}
          open={!!editingAssociation}
          onOpenChange={(open) => !open && setEditingAssociation(null)}
          onSuccess={loadAssociations}
        />
      )}
    </div>
  );
}
