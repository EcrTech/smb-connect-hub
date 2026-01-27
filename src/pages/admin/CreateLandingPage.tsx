import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Upload, Eye, Save, Loader2, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

const CreateLandingPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [associationId, setAssociationId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('edit');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Fetch associations for dropdown
  const { data: associations } = useQuery({
    queryKey: ['associations-for-landing-page'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('associations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing landing page if editing
  const { data: existingPage, isLoading: isLoadingPage } = useQuery({
    queryKey: ['landing-page', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('event_landing_pages')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingPage) {
      setTitle(existingPage.title);
      setSlug(existingPage.slug);
      setHtmlContent(existingPage.html_content);
      setAssociationId(existingPage.association_id);
      setIsActive(existingPage.is_active);
      setRegistrationEnabled(existingPage.registration_enabled);
      setSlugManuallyEdited(true);
    }
  }, [existingPage]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSlug(generatedSlug);
    }
  }, [title, slugManuallyEdited]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title || !slug || !htmlContent || !associationId) {
        throw new Error('Please fill in all required fields');
      }

      // Validate HTML size (5MB limit)
      if (htmlContent.length > 5 * 1024 * 1024) {
        throw new Error('HTML content exceeds 5MB limit');
      }

      const pageData = {
        title,
        slug,
        html_content: htmlContent,
        association_id: associationId,
        is_active: isActive,
        registration_enabled: registrationEnabled,
        created_by: userId,
        updated_at: new Date().toISOString(),
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from('event_landing_pages')
          .update(pageData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_landing_pages')
          .insert(pageData);
        if (error) {
          if (error.code === '23505') {
            throw new Error('A landing page with this URL slug already exists');
          }
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-landing-pages'] });
      toast.success(isEditing ? 'Landing page updated' : 'Landing page created');
      navigate('/admin/event-landing-pages');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      toast.error('Please upload an HTML file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setHtmlContent(content);
      toast.success('HTML file loaded');
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/event/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const getSanitizedPreviewHtml = () => {
    return DOMPurify.sanitize(htmlContent, {
      ADD_TAGS: ['style', 'link'],
      ADD_ATTR: ['target'],
      WHOLE_DOCUMENT: true,
    });
  };

  if (isEditing && isLoadingPage) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate('/admin/event-landing-pages')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Landing Pages
      </Button>

      <PageHeader
        title={isEditing ? 'Edit Landing Page' : 'Create Landing Page'}
        description="Upload custom HTML for your event landing page with automatic user registration"
      />

      <div className="space-y-6 mt-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Configure the landing page details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Page Title *</Label>
                <Input
                  id="title"
                  placeholder="Annual Summit 2025"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    placeholder="annual-summit-2025"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setSlugManuallyEdited(true);
                    }}
                  />
                  {slug && (
                    <Button variant="outline" size="icon" onClick={copyUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {slug && (
                  <p className="text-xs text-muted-foreground">
                    URL: {window.location.origin}/event/{slug}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="association">Association *</Label>
              <Select value={associationId} onValueChange={setAssociationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an association" />
                </SelectTrigger>
                <SelectContent>
                  {associations?.map((assoc) => (
                    <SelectItem key={assoc.id} value={assoc.id}>
                      {assoc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="is-active">Page is active and publicly accessible</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="registration-enabled"
                  checked={registrationEnabled}
                  onCheckedChange={setRegistrationEnabled}
                />
                <Label htmlFor="registration-enabled">Enable user registration</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HTML Content */}
        <Card>
          <CardHeader>
            <CardTitle>HTML Content</CardTitle>
            <CardDescription>
              Upload an HTML file or paste HTML content directly. Forms in the HTML will automatically
              trigger user registration when submitted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview" disabled={!htmlContent}>
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label
                    htmlFor="html-upload"
                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload HTML File
                  </Label>
                  <input
                    id="html-upload"
                    type="file"
                    accept=".html,.htm"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <span className="text-sm text-muted-foreground">or paste HTML below</span>
                </div>

                <Textarea
                  placeholder="<!DOCTYPE html>
<html>
<head>
  <title>Your Event</title>
</head>
<body>
  <!-- Your event content here -->
  <form>
    <input type='text' name='first_name' placeholder='First Name' required />
    <input type='text' name='last_name' placeholder='Last Name' required />
    <input type='email' name='email' placeholder='Email' required />
    <input type='tel' name='phone' placeholder='Phone' />
    <button type='submit'>Register</button>
  </form>
</body>
</html>"
                  className="font-mono text-sm min-h-[400px]"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                />

                <div className="bg-muted p-4 rounded-lg text-sm">
                  <h4 className="font-medium mb-2">Form Field Names</h4>
                  <p className="text-muted-foreground mb-2">
                    Your HTML form should include these field names for automatic registration:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li><code className="bg-background px-1 rounded">email</code> - Required</li>
                    <li><code className="bg-background px-1 rounded">first_name</code> or <code className="bg-background px-1 rounded">firstName</code> - Required</li>
                    <li><code className="bg-background px-1 rounded">last_name</code> or <code className="bg-background px-1 rounded">lastName</code> - Required</li>
                    <li><code className="bg-background px-1 rounded">phone</code>, <code className="bg-background px-1 rounded">mobile</code>, or <code className="bg-background px-1 rounded">telephone</code> - Optional</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="preview">
                {htmlContent && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Preview (forms are disabled)</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/event/${slug}`, '_blank')}
                        disabled={!isActive || !slug}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open in New Tab
                      </Button>
                    </div>
                    <iframe
                      srcDoc={getSanitizedPreviewHtml()}
                      className="w-full h-[600px] border-0"
                      sandbox="allow-same-origin"
                      title="Preview"
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/event-landing-pages')}
          >
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title || !slug || !htmlContent || !associationId}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? 'Update Landing Page' : 'Create Landing Page'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateLandingPage;
