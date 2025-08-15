import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Phone } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validatePhone = (phone: string) => {
    // Basic phone validation - adjust as needed
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone) {
      toast({
        title: "Missing phone number",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhone(phone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await signIn(phone);
      
      if (error) {
        toast({
          title: "Failed to send OTP",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "OTP sent",
          description: "Check your phone for the verification code",
        });
        navigate('/auth/phone-verify', { 
          state: { phone, type: 'signin' }
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 pt-safe">
      <Card className="w-full max-w-md animate-fade-in medical-card-shadow border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mb-4 animate-fade-in">
            <img 
              src="/lovable-uploads/6e18c5f3-d6d2-4a2b-865a-590ab23d865a.png" 
              alt="BeingWell Logo" 
              className="h-8 sm:h-12 w-auto mx-auto hover-scale transition-transform duration-200"
            />
          </div>
          <CardDescription className="medical-body text-muted-foreground">
            Sign in to your BeingWell account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 medical-input"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full medical-button-primary" 
              disabled={isLoading}
            >
              {isLoading ? "Sending OTP..." : "Send Verification Code"}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/auth/signup" className="text-primary hover:underline medical-body font-semibold">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;