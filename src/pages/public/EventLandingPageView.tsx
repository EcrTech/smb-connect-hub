import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DOMPurify from 'dompurify';

interface LandingPageData {
  id: string;
  title: string;
  slug: string;
  html_content: string;
  registration_enabled: boolean;
  association: {
    name: string;
    logo: string | null;
  } | null;
}

const EventLandingPageView = () => {
  const { slug } = useParams<{ slug: string }>();
  const [landingPage, setLandingPage] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [registrationMessage, setRegistrationMessage] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchLandingPage = async () => {
      if (!slug) {
        setError('Invalid page URL');
        setLoading(false);
        return;
      }

      try {
        const { data, error: funcError } = await supabase.functions.invoke('get-landing-page', {
          body: null,
          headers: {},
        });

        // Use query parameter approach instead
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-landing-page?slug=${encodeURIComponent(slug)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError('Event page not found');
          } else {
            setError('Failed to load event page');
          }
          setLoading(false);
          return;
        }

        const pageData = await response.json();
        setLandingPage(pageData);
      } catch (err) {
        console.error('Error fetching landing page:', err);
        setError('Failed to load event page');
      } finally {
        setLoading(false);
      }
    };

    fetchLandingPage();
  }, [slug]);

  // Handle form submissions from the iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'event-registration') {
        const formData = event.data.data;
        
        if (!landingPage) return;

        setRegistrationStatus('submitting');
        setRegistrationMessage('');

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-event-registration`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                landing_page_id: landingPage.id,
                email: formData.email,
                first_name: formData.first_name || formData.firstName || formData.name?.split(' ')[0] || '',
                last_name: formData.last_name || formData.lastName || formData.name?.split(' ').slice(1).join(' ') || '',
                phone: formData.phone || formData.mobile || formData.telephone || null,
                registration_data: formData
              }),
            }
          );

          const result = await response.json();

          if (!response.ok) {
            setRegistrationStatus('error');
            setRegistrationMessage(result.error || 'Registration failed');
            return;
          }

          setRegistrationStatus('success');
          setRegistrationMessage(result.message);

          // Notify the iframe about successful registration
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'registration-success', message: result.message },
            '*'
          );
        } catch (err) {
          console.error('Registration error:', err);
          setRegistrationStatus('error');
          setRegistrationMessage('An error occurred during registration');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [landingPage]);

  // Inject the form interception script into the HTML
  const getEnhancedHtml = (html: string): string => {
    const sanitizedHtml = DOMPurify.sanitize(html, {
      ADD_TAGS: ['style', 'script', 'link'],
      ADD_ATTR: ['target', 'onclick', 'onsubmit'],
      WHOLE_DOCUMENT: true,
    });

    const formInterceptScript = `
      <script>
        (function() {
          // Intercept all form submissions
          document.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const form = e.target;
            const formData = new FormData(form);
            const data = {};
            
            formData.forEach(function(value, key) {
              data[key] = value;
            });
            
            // Send to parent window
            window.parent.postMessage({
              type: 'event-registration',
              data: data
            }, '*');
          });

          // Listen for registration result
          window.addEventListener('message', function(e) {
            if (e.data?.type === 'registration-success') {
              // Show success message in the form area
              const forms = document.querySelectorAll('form');
              forms.forEach(function(form) {
                form.innerHTML = '<div style="padding: 20px; text-align: center; color: #16a34a; font-size: 18px;">' +
                  '<svg style="width: 48px; height: 48px; margin: 0 auto 10px;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>' +
                  '<p style="margin: 0; font-weight: bold;">Registration Successful!</p>' +
                  '<p style="margin: 10px 0 0; font-size: 14px;">' + e.data.message + '</p>' +
                '</div>';
              });
            }
          });
        })();
      </script>
    `;

    // Insert script before closing body tag
    if (sanitizedHtml.includes('</body>')) {
      return sanitizedHtml.replace('</body>', formInterceptScript + '</body>');
    } else {
      return sanitizedHtml + formInterceptScript;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading event page...</p>
        </div>
      </div>
    );
  }

  if (error || !landingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'The event page you are looking for does not exist or has been deactivated.'}
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Status overlay for registration feedback */}
      {registrationStatus !== 'idle' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6 text-center">
            {registrationStatus === 'submitting' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium">Processing your registration...</p>
              </>
            )}
            {registrationStatus === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium text-green-600 mb-2">Registration Successful!</p>
                <p className="text-muted-foreground">{registrationMessage}</p>
                <Button className="mt-4" onClick={() => setRegistrationStatus('idle')}>
                  Close
                </Button>
              </>
            )}
            {registrationStatus === 'error' && (
              <>
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <p className="text-lg font-medium text-destructive mb-2">Registration Failed</p>
                <p className="text-muted-foreground">{registrationMessage}</p>
                <Button className="mt-4" onClick={() => setRegistrationStatus('idle')}>
                  Try Again
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Render the landing page HTML in an iframe for isolation */}
      <iframe
        ref={iframeRef}
        srcDoc={getEnhancedHtml(landingPage.html_content)}
        className="w-full min-h-screen border-0"
        sandbox="allow-scripts allow-forms allow-same-origin"
        title={landingPage.title}
      />
    </div>
  );
};

export default EventLandingPageView;
