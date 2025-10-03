import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

export default function DeleteTestUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const handleDeleteTestUsers = async () => {
    if (!confirm('Are you sure you want to delete ALL test users from the CSV? This action cannot be undone!')) {
      return;
    }

    try {
      setDeleting(true);
      setShowProgress(true);

      // Read the CSV file emails
      const testEmails = [
        'abram.bahri@outlook.com', 'purab.shere@hotmail.com', 'aaryahi.sagar@outlook.com',
        'divyansh.rajagopal@hotmail.com', 'nitara.singh@zoho.com', 'ehsaan.rege@gmail.com',
        'rhea.sura@zoho.com', 'nirvaan.bala@zoho.com', 'rasha.bir@yahoo.com',
        'raunak.rau@yahoo.com', 'ayesha.ray@gmail.com', 'taran.suri@hotmail.com',
        'tarini.devan@hotmail.com', 'vritika.kaul@hotmail.com', 'hrishita.hari@outlook.com',
        'vanya.sidhu@yahoo.com', 'madhup.zacharia@yahoo.com', 'raghav.ramesh@outlook.com',
        'anika.sarma@hotmail.com', 'baiju.dugal@zoho.com', 'zain.de@yahoo.com',
        'mannat.manda@gmail.com', 'aniruddh.ramaswamy@outlook.com', 'anahi.sawhney@outlook.com',
        'baiju.vora@gmail.com', 'adira.gala@gmail.com', 'eva.krishnan@outlook.com',
        'bhamini.dhar@yahoo.com', 'advik.sampath@hotmail.com', 'arhaan.chhabra@hotmail.com',
        'hrishita.sandhu@yahoo.com', 'anaya.maharaj@gmail.com', 'abram.datta@hotmail.com',
        'nehmat.gara@hotmail.com', 'neelofar.choudhury@hotmail.com', 'vivaan.sheth@hotmail.com',
        'saanvi.suri@hotmail.com', 'ojas.sundaram@zoho.com', 'khushi.gupta@outlook.com',
        'piya.sheth@outlook.com', 'kiaan.ravi@gmail.com', 'badal.handa@yahoo.com',
        'pranay.jaggi@hotmail.com', 'aarush.lal@yahoo.com', 'adah.loyal@zoho.com',
        'divij.saxena@zoho.com', 'indrans.thakkar@yahoo.com', 'vritika.bajaj@yahoo.com',
        'navya.bala@hotmail.com', 'divij.chad@gmail.com', 'mehul.bir@yahoo.com',
        'kashvi.jayaraman@zoho.com', 'zain.suri@yahoo.com', 'priyansh.contractor@zoho.com',
        'riya.goel@hotmail.com', 'hunar.thaker@yahoo.com', 'lakshay.gill@gmail.com',
        'vivaan.buch@yahoo.com', 'miraya.doctor@outlook.com', 'lavanya.mangal@hotmail.com',
        'pihu.kant@outlook.com', 'nishith.loke@zoho.com', 'yasmin.goswami@outlook.com',
        'aarna.devi@outlook.com', 'zara.kulkarni@gmail.com', 'veer.brar@outlook.com',
        'khushi.mandal@hotmail.com', 'inaaya .chaudhry@gmail.com', 'ivana.kannan@outlook.com',
        'devansh.korpal@yahoo.com', 'ryan.keer@zoho.com', 'mahika.savant@outlook.com',
        'hansh.mangat@zoho.com', 'suhana.handa@yahoo.com', 'nishith.bhargava@zoho.com',
        'nayantara.thakur@hotmail.com', 'elakshi.madan@outlook.com', 'zeeshan.arya@yahoo.com',
        'tanya.wadhwa@zoho.com', 'kartik.jain@zoho.com', 'kiaan.karan@outlook.com',
        'uthkarsh.rana@outlook.com', 'krish.bedi@yahoo.com', 'divyansh.dube@outlook.com',
        'shlok.solanki@gmail.com', 'reyansh.rattan@zoho.com', 'adah.borra@yahoo.com',
        'hrishita.loke@gmail.com', 'yakshit.trivedi@hotmail.com', 'vritika.ganesan@zoho.com',
        'mohanlal.lad@yahoo.com', 'darshit.chada@hotmail.com', 'fateh.jayaraman@hotmail.com',
        'tarini.bora@zoho.com', 'jiya.wali@gmail.com', 'jivika.krish@outlook.com',
        'ishita.goda@yahoo.com', 'kashvi.srivastava@gmail.com', 'aarna.chaudhari@outlook.com',
        'farhan.sami@outlook.com'
      ];

      const { data, error } = await supabase.functions.invoke('delete-test-users', {
        body: {
          emails: testEmails,
        },
      });

      if (error) throw error;

      if (data.failed > 0) {
        toast({
          title: 'Partial Success',
          description: `${data.success} users deleted. ${data.failed} failed. Check console for details.`,
          variant: 'default',
        });
        console.error('Delete errors:', data.errors);
      } else {
        toast({
          title: 'Success',
          description: `Successfully deleted ${data.success} test users.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete test users',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setTimeout(() => setShowProgress(false), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Delete Test Users</h1>
          <p className="text-muted-foreground">
            Remove all test users from the bulk upload CSV file
          </p>
        </div>

        <Alert className="mb-6 border-destructive">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <strong className="text-destructive">Warning:</strong> This will permanently delete all 100 test users from your CSV file.
            This action cannot be undone.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Delete Test Users</CardTitle>
            <CardDescription>
              This will delete all users with the following email domains: @outlook.com, @hotmail.com, @zoho.com, @gmail.com, @yahoo.com
              that were created from the test CSV file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-destructive/50 rounded-lg p-8 text-center">
              <Trash2 className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <p className="text-sm text-muted-foreground mb-4">
                Click the button below to delete all 100 test users
              </p>
              <Button 
                onClick={handleDeleteTestUsers} 
                disabled={deleting}
                variant="destructive"
                size="lg"
              >
                {deleting ? 'Deleting...' : 'Delete All Test Users'}
              </Button>
            </div>

            {showProgress && (
              <div className="mt-6">
                <Progress value={deleting ? undefined : 100} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {deleting ? 'Processing deletions...' : 'Complete!'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert className="mt-6">
          <AlertDescription>
            <strong>After deletion:</strong> You can upload the corrected CSV file with:
            <ul className="list-disc list-inside mt-2 ml-4">
              <li>Fixed email on row 69 (remove space)</li>
              <li>Replace #NAME? passwords on rows 25, 43, and 49</li>
              <li>All users will be created fresh with new accounts</li>
            </ul>
          </AlertDescription>
        </Alert>
      </main>
    </div>
  );
}
