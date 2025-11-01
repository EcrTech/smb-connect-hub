import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/smb-connect-logo.jpg';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [validationTimeout, setValidationTimeout] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    // Set timeout for slow validation
    const timeoutId = setTimeout(() => {
      if (!isValidSession) {
        setValidationTimeout(true);
      }
    }, 10000); // 10 seconds

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // Check for error parameters first
    const error = hashParams.get('error');
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');
    
    if (error) {
      clearTimeout(timeoutId);
      let title = 'Password Reset Link Issue';
      let description = errorDescription?.replace(/\+/g, ' ') || 'This link is invalid or has expired.';
      
      if (errorCode === 'otp_expired') {
        title = 'Reset Link Expired';
        description = 'This password reset link has expired. Password reset links are valid for 1 hour. Please request a new reset link from the login page.';
      }
      
      toast({
        title,
        description,
        variant: 'destructive',
      });
      
      // Redirect to login after showing error
      setTimeout(() => navigate('/auth/login'), 5000);
      return;
    }
    
    // Then check for valid recovery token
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (type === 'recovery' && accessToken) {
      // This is a valid recovery link - Supabase automatically handles the session
      console.log('Recovery token detected, validating session...');
      clearTimeout(timeoutId);
      setIsValidSession(true);
    } else {
      // Check if there's already an active recovery session
      supabase.auth.getSession().then(({ data: { session } }) => {
        clearTimeout(timeoutId);
        if (session) {
          setIsValidSession(true);
        } else {
          toast({
            title: 'Invalid Reset Link',
            description: 'This password reset link is invalid or has expired. Please request a new one from the login page.',
            variant: 'destructive',
          });
          setTimeout(() => navigate('/auth/login'), 2000);
        }
      });
    }

    return () => clearTimeout(timeoutId);
  }, [navigate, toast, isValidSession]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      toast({
        title: 'Password Reset Successful!',
        description: 'Redirecting to login page...',
      });

      // Sign out and redirect to login after brief delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth/login');
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Failed to Reset Password',
        description: error.message || 'An error occurred. Please try again or request a new reset link.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Validating reset link...</p>
              {validationTimeout && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Taking longer than expected?</p>
                  <p className="text-sm text-muted-foreground">
                    If this continues, your reset link may have expired or there may be a network issue.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/auth/login')}
                  >
                    Back to Login
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="SMB Connect" className="h-16 object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
          <CardDescription>
            Enter a new password for your account (minimum 8 characters)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                {...register('password')}
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={loading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                {...register('confirmPassword')}
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
