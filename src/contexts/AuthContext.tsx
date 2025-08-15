import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (phone: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signIn: (phone: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  verifyPhoneOTP: (phone: string, token: string) => Promise<{ error: any }>;
  resendPhoneOTP: (phone: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (phone: string, firstName: string, lastName: string) => {
    const { error } = await supabase.auth.signUp({
      phone,
      password: '', // Phone signup doesn't use password initially
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const signIn = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const verifyPhoneOTP = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms'
    });
    return { error };
  };

  const resendPhoneOTP = async (phone: string) => {
    const { error } = await supabase.auth.resend({
      type: 'sms',
      phone: phone,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    verifyPhoneOTP,
    resendPhoneOTP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};