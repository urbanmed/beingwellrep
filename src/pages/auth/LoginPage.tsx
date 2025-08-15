import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, Phone } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  
  const { signIn, signInWithPhone } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        navigate(from, { replace: true });
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

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await signInWithPhone(phone, password);
      
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        navigate(from, { replace: true });
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
        <CardContent className="px-8 pb-8">
          <Tabs value={loginMethod} onValueChange={(value) => setLoginMethod(value as 'email' | 'phone')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
              <TabsTrigger value="email" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Phone className="h-4 w-4" />
                Phone
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-6 mt-0">
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="medical-label font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-background border-border/50 focus:border-primary/50 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="medical-label font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 bg-background border-border/50 focus:border-primary/50 focus:ring-primary/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground/70 hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Link
                    to="/auth/forgot-password"
                    className="text-sm text-primary hover:underline story-link font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" className="w-full h-12 medical-heading font-semibold" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="phone" className="space-y-6 mt-0">
              <form onSubmit={handlePhoneSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="phoneLogin" className="medical-label font-medium">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="phoneLogin"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-12 bg-background border-border/50 focus:border-primary/50 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phonePassword" className="medical-label font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="phonePassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 bg-background border-border/50 focus:border-primary/50 focus:ring-primary/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground/70 hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 medical-heading font-semibold" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/auth/signup" className="text-primary hover:underline story-link font-semibold">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};