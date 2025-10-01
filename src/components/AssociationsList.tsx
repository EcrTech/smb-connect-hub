import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Mail, Phone, Globe, MapPin, Edit, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EditAssociationDialog } from './association/EditAssociationDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const navigate = useNavigate();
  const [associations, setAssociations] = useState<Association[]>([]);
  const [filteredAssociations, setFilteredAssociations] = useState<Association[]>([]);
  const [displayedAssociations, setDisplayedAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [editingAssociation, setEditingAssociation] = useState<Association | null>(null);
  const [deletingAssociation, setDeletingAssociation] = useState<Association | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    loadAssociations();
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('admin_users')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setIsSuperAdmin(data.is_super_admin || false);
      }
    } catch (error) {
      console.error('Error checking super admin status:', error);
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = associations.filter(
        (association) =>
          association.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          association.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssociations(filtered);
    } else {
      setFilteredAssociations(associations);
    }
    setPage(1);
  }, [searchTerm, associations]);

  useEffect(() => {
    const startIndex = 0;
    const endIndex = page * ITEMS_PER_PAGE;
    setDisplayedAssociations(filteredAssociations.slice(startIndex, endIndex));
    setHasMore(endIndex < filteredAssociations.length);
  }, [page, filteredAssociations]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, loading]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loadMore]);

  const loadAssociations = async () => {
    try {
      const { data, error } = await supabase
        .from('associations')
        .select('*')
        .order('name');

      if (error) throw error;
      setAssociations(data || []);
      setFilteredAssociations(data || []);
    } catch (error) {
      console.error('Error loading associations:', error);
      toast.error('Failed to load associations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (association: Association) => {
    try {
      const { error } = await supabase
        .from('associations')
        .delete()
        .eq('id', association.id);

      if (error) throw error;

      toast.success('Association deleted successfully');
      setDeletingAssociation(null);
      loadAssociations();
    } catch (error: any) {
      console.error('Error deleting association:', error);
      toast.error(error.message || 'Failed to delete association');
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
          <h2 className="text-2xl font-bold">Associations</h2>
          <p className="text-muted-foreground">
            {filteredAssociations.length} of {associations.length} associations
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search associations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayedAssociations.map((association) => (
          <Card 
            key={association.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/admin/associations/${association.id}`)}
          >
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAssociation(association);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {isSuperAdmin && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingAssociation(association);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
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

      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {editingAssociation && (
        <EditAssociationDialog
          association={editingAssociation}
          open={!!editingAssociation}
          onOpenChange={(open) => !open && setEditingAssociation(null)}
          onSuccess={loadAssociations}
        />
      )}

      <AlertDialog open={!!deletingAssociation} onOpenChange={(open) => !open && setDeletingAssociation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Association</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAssociation?.name}"? This action cannot be undone and will also delete all associated companies and members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAssociation && handleDelete(deletingAssociation)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
