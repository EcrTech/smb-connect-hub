import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Upload, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BulkUploadFormProps {
  title: string;
  description: string;
  uploadType: 'associations' | 'companies' | 'users';
  templateFields: string[];
  templateFilename: string;
  backRoute: string;
  associationId?: string;
  companyId?: string;
  instructions?: string[];
  requiredFields?: string[];
}

export function BulkUploadForm({
  title,
  description,
  uploadType,
  templateFields,
  templateFilename,
  backRoute,
  associationId,
  companyId,
  instructions,
  requiredFields
}: BulkUploadFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const downloadTemplate = () => {
    const csvContent = templateFields.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateFilename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const csvData = await file.text();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('process-bulk-upload', {
        body: { 
          type: uploadType, 
          csvData,
          associationId,
          companyId,
          userId: user?.id
        },
      });

      if (error) throw error;

      toast({
        title: "Upload successful",
        description: `Successfully processed ${data.success} records. ${data.failed} failed.`,
      });

      if (data.errors && data.errors.length > 0) {
        console.error('Upload errors:', data.errors);
      }

      navigate(backRoute);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process the CSV file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backRoute)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Upload Instructions:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {instructions ? (
                  instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))
                ) : (
                  <>
                    <li>Download the CSV template below</li>
                    <li>Fill in the required fields</li>
                    <li>Upload the completed CSV file</li>
                  </>
                )}
              </ul>
              {requiredFields && requiredFields.length > 0 && (
                <p className="text-sm mt-2">
                  <strong>Required fields:</strong> {requiredFields.join(', ')}
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>

        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Step 1: Download Template</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Download the CSV template to ensure correct formatting
            </p>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Step 2: Upload Completed CSV</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select your filled CSV file to upload
            </p>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                {uploading ? "Processing..." : "Click to select a CSV file"}
              </p>
              <Button
                onClick={() => document.getElementById('csv-upload')?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Select CSV File"}
              </Button>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
