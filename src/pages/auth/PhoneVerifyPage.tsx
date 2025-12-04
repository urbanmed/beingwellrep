import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth, TEST_PHONE, TEST_OTP } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export const PhoneVerifyPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  const { verifyPhoneOTP, resendPhoneOTP, testSignIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const phone = location.state?.phone || '';
  const isTestMode = location.state?.testMode || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length < 6) {
      toast({
        title: "Error",
        description: "Please enter the complete verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Test phone bypass - accept static OTP
      if (phone === TEST_PHONE && otp === TEST_OTP) {
        const { error } = await testSignIn();
        
        if (error) {
          toast({
            title: "Test Login Failed",
            description: "Failed to sign in with test credentials",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Test Login Successful!",
            description: "Signed in with test credentials",
          });
          navigate('/');
        }
        setIsLoading(false);
        return;
      }

      // Test mode with wrong OTP
      if (phone === TEST_PHONE && otp !== TEST_OTP) {
        toast({
          title: "Invalid OTP",
          description: "For test mode, use OTP: 123456",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await verifyPhoneOTP(phone, otp);
      
      if (error) {
        toast({
          title: "Verification Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Phone verified!",
          description: "Your phone number has been successfully verified",
        });
        
        // Check if this is a signup or signin
        const isSignup = location.state?.type === 'signup';
        
        if (isSignup) {
          // For new users, redirect to onboarding
          navigate('/auth/onboarding');
        } else {
          // For existing users, redirect to home
          navigate('/');
        }
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

  const handleResend = async () => {
    if (!phone) {
      toast({
        title: "Error",
        description: "Phone number not found. Please go back and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    
    try {
      const { error } = await resendPhoneOTP(phone);
      
      if (error) {
        toast({
          title: "Failed to resend",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Code sent!",
          description: "A new verification code has been sent to your phone.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification code",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!phone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4 pt-safe">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Error</CardTitle>
            <CardDescription className="text-center">
              Phone number not found. Please try signing up again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/auth/signup">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign Up
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4 pt-safe">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Verify Phone Number</CardTitle>
          <CardDescription className="text-center">
            We've sent a verification code to <strong>{phone}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || otp.length < 6}>
              {isLoading ? "Verifying..." : "Verify Phone Number"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={isResending}
              className="text-primary hover:underline"
            >
              {isResending ? "Sending..." : "Resend code"}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Link to="/auth/signup" className="text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4 inline mr-1" />
              Back to Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};