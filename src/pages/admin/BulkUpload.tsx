import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Upload, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BulkUpload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'associations' | 'companies' | 'users'>('associations');

  const downloadTemplate = (type: string) => {
    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'associations':
        csvContent = 'name,description,contact_email,contact_phone,website,address,city,state,country,postal_code\n';
        csvContent += 'Example Association,"Sample description",contact@example.com,+91-1234567890,https://example.com,"123 Main St",Mumbai,Maharashtra,India,400001\n';
        filename = 'associations_template.csv';
        break;
      case 'companies':
        csvContent = 'association_email,name,description,email,phone,website,address,city,state,country,postal_code,gst_number,pan_number,business_type,industry_type\n';
        csvContent += 'association@example.com,Example Company,"Sample company",company@example.com,+91-9876543210,https://company.com,"456 Business Rd",Mumbai,Maharashtra,India,400002,22AAAAA0000A1Z5,AAAAA0000A,Private Limited,Technology\n';
        filename = 'companies_template.csv';
        break;
      case 'users':
        csvContent = 'email,first_name,last_name,phone,company_email,role,designation,department\n';
        csvContent += 'user@example.com,John,Doe,+91-9999999999,company@example.com,admin,Manager,Operations\n';
        filename = 'users_template.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Template Downloaded',
      description: `${filename} has been downloaded`,
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
            type: uploadType,
            csvData: text,
          },
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: `Successfully processed ${data.success} records. ${data.failed || 0} failed.`,
        });

        // Reset file input
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
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Bulk Upload</h1>
          <p className="text-muted-foreground">
            Upload CSV files to create multiple records at once
          </p>
        </div>

        <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="associations">Associations</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="associations" className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Upload a CSV file to create multiple associations. Download the template to see the required format.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Upload Associations</CardTitle>
                <CardDescription>
                  Required fields: name, contact_email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => downloadTemplate('associations')} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Upload a CSV file to create multiple companies. Companies will be linked to associations via email.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Upload Companies</CardTitle>
                <CardDescription>
                  Required fields: association_email, name, email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => downloadTemplate('companies')} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Upload a CSV file to create user accounts and link them to companies. Users will receive email invitations.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Upload Users</CardTitle>
                <CardDescription>
                  Required fields: email, first_name, last_name, company_email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => downloadTemplate('users')} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
