import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Upload, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

export default function BulkUploadUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const downloadTemplate = () => {
    const csvContent = 'email,first_name,last_name,phone,company_email,role,designation,department,password\n' +
      'user@example.com,John,Doe,+91-9999999999,,admin,Manager,Operations,SecurePass123!\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Template Downloaded',
      description: 'users_template.csv has been downloaded',
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Error',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        
        const { data, error } = await supabase.functions.invoke('process-bulk-upload', {
          body: {
            type: 'users',
            csvData: text,
          },
        });

        if (error) throw error;

        if (data.failed > 0) {
          toast({
            title: 'Partial Success',
            description: `${data.success} users created successfully. ${data.failed} failed. Check console for details.`,
            variant: 'default',
          });
          console.error('Upload errors:', data.errors);
        } else {
          toast({
            title: 'Success',
            description: `Successfully created ${data.success} users. Users will receive email invitations.`,
          });
        }

        event.target.value = '';
      };

      reader.readAsText(file);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process CSV file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => navigate('/admin/delete-test-users')}
          >
            Delete Test Users
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Bulk Upload Users</h1>
          <p className="text-muted-foreground">
            Upload CSV file to create user accounts and link them to companies
          </p>
        </div>

        <Alert className="mb-6">
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Upload a CSV file to create user accounts. Users can optionally be linked to companies and will receive email invitations.
            <br />
            <strong>Required fields:</strong> email, first_name, last_name
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Upload Users CSV</CardTitle>
            <CardDescription>
              The CSV file should include: email, first_name, last_name, phone, company_email, role, designation, department, password (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Click to upload or drag and drop your CSV file
              </p>
              <label>
                <Button disabled={uploading} asChild>
                  <span>{uploading ? 'Uploading...' : 'Select CSV File'}</span>
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              
              {uploading && (
                <div className="mt-6">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-2">Processing users...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
