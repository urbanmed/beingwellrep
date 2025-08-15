import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export const VerifyPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const { resendConfirmation } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  
  // Get email from navigation state if available
  const stateEmail = location.state?.email || '';

  React.useEffect(() => {
    if (stateEmail) {
      setEmail(stateEmail);
    }
  }, [stateEmail]);

  const handleResendConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await resendConfirmation(email);
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Confirmation email sent",
          description: "Check your email for the verification link.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4 pt-safe">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {emailSent ? (
              <CheckCircle className="h-8 w-8 text-primary" />
            ) : (
              <Mail className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {emailSent ? "Email sent!" : "Verify your email"}
          </CardTitle>
          <CardDescription>
            {emailSent 
              ? "We've sent another verification email to your inbox."
              : "We've sent a verification link to your email address. Click the link in the email to verify your account."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!emailSent && (
              <form onSubmit={handleResendConfirmation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Resend verification email"}
                </Button>
              </form>
            )}

            {emailSent && (
              <Button
                onClick={() => setEmailSent(false)}
                variant="outline"
                className="w-full"
              >
                Send another email
              </Button>
            )}

            <div className="text-center text-sm text-muted-foreground">
              <p>Didn't receive the email? Check your spam folder.</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/auth/login"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};