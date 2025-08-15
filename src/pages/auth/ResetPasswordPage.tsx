import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4 pt-safe">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Password Reset Not Available
          </CardTitle>
          <CardDescription className="text-center">
            We use phone number verification for secure access. No passwords to remember!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Phone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Simply sign in with your phone number and we'll send you a verification code.
            </p>
          </div>

          <Button asChild className="w-full">
            <Link to="/auth/login">Sign in with phone</Link>
          </Button>

          <div className="text-center">
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