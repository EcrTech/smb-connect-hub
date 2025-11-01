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
  const [isValidating, setIsValidating] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);
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
    const validateSession = async () => {
      try {
        // Get URL parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        // Check for explicit errors first
        if (error && errorCode === 'otp_expired') {
          toast({
            title: 'Reset Link Expired',
            description: 'This password reset link has expired. Please request a new one from the login page.',
            variant: 'destructive',
          });
          setTimeout(() => navigate('/auth/login'), 3000);
          return;
        }

        // If we have a recovery token in the URL, try to establish session
        if (type === 'recovery' && accessToken) {
          console.log('Recovery token detected, establishing session...');
          
          // The session should be automatically established by Supabase
          // Give it a moment to process
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('Session established successfully');
            setIsValidSession(true);
            setIsValidating(false);
            return;
          }
        }

        // Check if there's already an active session (user might have clicked link before)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Existing session found');
          setIsValidSession(true);
          setIsValidating(false);
          return;
        }

        // No valid session found
        console.log('No valid session found');
        toast({
          title: 'Invalid Reset Link',
          description: 'This password reset link is invalid or has expired. Please request a new one from the login page.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/auth/login'), 3000);
        
      } catch (error) {
        console.error('Error validating session:', error);
        toast({
          title: 'Validation Error',
          description: 'An error occurred while validating your reset link. Please try again.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/auth/login'), 3000);
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, [navigate, toast]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      toast({
        title: 'Password Reset Successful!',
        description: 'Your password has been updated. Redirecting to login...',
      });

      // Sign out and redirect to login after brief delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth/login');
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Failed to Reset Password',
        description: error.message || 'Please try again or request a new reset link from the login page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Validating your reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return null; // Will redirect
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
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>

            <div className="text-center pt-2">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/auth/login')}
                className="text-sm"
              >
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
