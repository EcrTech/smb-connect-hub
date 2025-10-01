import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Upload, Mail, Trash2, Users } from 'lucide-react';
import { CreateEmailListDialog } from '@/components/admin/CreateEmailListDialog';
import { BulkEmailDialog } from '@/components/admin/BulkEmailDialog';

interface EmailList {
  id: string;
  name: string;
  description: string | null;
  total_recipients: number;
  created_at: string;
}

export default function AdminEmailLists() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lists, setLists] = useState<EmailList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkEmailDialog, setBulkEmailDialog] = useState<{ open: boolean; listIds: string[] }>({ 
    open: false, 
    listIds: [] 
  });
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  useEffect(() => {
    loadEmailLists();
  }, []);

  const loadEmailLists = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load email lists',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this email list? This will also delete all recipients.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('email_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Email list deleted',
      });

      loadEmailLists();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete email list',
        variant: 'destructive',
      });
    }
  };

  const filteredLists = lists.filter((list) =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (list.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/admin')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Email Lists</h1>
                <p className="text-sm text-muted-foreground">Manage bulk email recipient lists</p>
              </div>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create List
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Search and Actions */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Input
            placeholder="Search email lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          {selectedLists.length > 0 && (
            <Button 
              onClick={() => setBulkEmailDialog({ open: true, listIds: selectedLists })}
              className="whitespace-nowrap"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send to {selectedLists.length} List{selectedLists.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>

        {/* Email Lists */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading email lists...</p>
          </div>
        ) : filteredLists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No email lists found' : 'No email lists yet'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First List
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLists.map((list) => (
              <Card key={list.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedLists.includes(list.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedLists(prev => 
                          prev.includes(list.id) 
                            ? prev.filter(id => id !== list.id)
                            : [...prev, list.id]
                        );
                      }}
                      className="mt-1 w-4 h-4 rounded border-gray-300"
                    />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold">{list.name}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteList(list.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Users className="w-4 h-4" />
                        <span>{list.total_recipients} recipients</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-4">
                        Created {new Date(list.created_at).toLocaleDateString()}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/email-lists/${list.id}`);
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Manage
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBulkEmailDialog({ open: true, listIds: [list.id] });
                          }}
                          disabled={list.total_recipients === 0}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <CreateEmailListDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadEmailLists}
      />
      
      <BulkEmailDialog
        open={bulkEmailDialog.open}
        onOpenChange={(open) => setBulkEmailDialog({ open, listIds: bulkEmailDialog.listIds })}
        listIds={bulkEmailDialog.listIds}
      />
    </div>
  );
}
