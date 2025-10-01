import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Upload } from 'lucide-react';
import { CompaniesList } from '@/components/CompaniesList';

export default function AdminCompanies() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/admin/bulk-upload-companies')}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
              <Button onClick={() => navigate('/admin/create-company')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Company
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <CompaniesList />
      </main>
    </div>
  );
}
