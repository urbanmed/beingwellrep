import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MobileLayout } from "@/components/layout/MobileLayout";
import Index from "./pages/Index";
import Upload from "./pages/Upload";
import Summaries from "./pages/Summaries";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import NotFound from "./pages/NotFound";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import OnboardingPage from "./pages/auth/OnboardingPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { VerifyPage } from "./pages/auth/VerifyPage";
import { PhoneVerifyPage } from "./pages/auth/PhoneVerifyPage";

// Create QueryClient instance outside of component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const AuthRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return user ? <Navigate to="/" replace /> : <Navigate to="/auth/login" replace />;
};

const AppRoutes: React.FC = () => (
  <Routes>
    {/* Protected Routes */}
    <Route path="/" element={
      <ProtectedRoute>
        <MobileLayout>
          <Index />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/upload" element={
      <ProtectedRoute>
        <MobileLayout>
          <Upload />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/summaries" element={
      <ProtectedRoute>
        <MobileLayout>
          <Summaries />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/reports" element={
      <ProtectedRoute>
        <MobileLayout>
          <Reports />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/profile" element={
      <ProtectedRoute>
        <MobileLayout>
          <Profile />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/profile/edit" element={
      <ProtectedRoute>
        <ProfileEdit />
      </ProtectedRoute>
    } />
    
    {/* Auth Routes */}
    <Route path="/auth" element={<AuthRedirect />} />
    <Route path="/auth/login" element={<LoginPage />} />
    <Route path="/auth/signup" element={<SignupPage />} />
    <Route path="/auth/onboarding" element={
      <ProtectedRoute>
        <OnboardingPage />
      </ProtectedRoute>
    } />
    <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
    <Route path="/auth/verify" element={<VerifyPage />} />
    <Route path="/auth/phone-verify" element={<PhoneVerifyPage />} />
    
    {/* Catch-all route */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;