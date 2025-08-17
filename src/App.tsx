import { type FC, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Lazy load main pages
const Index = lazy(() => import("./pages/Index"));
const Upload = lazy(() => import("./pages/Upload"));
const Summaries = lazy(() => import("./pages/Summaries"));
const Vault = lazy(() => import("./pages/Vault"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Prescriptions = lazy(() => import("./pages/Prescriptions"));
const Cards = lazy(() => import("./pages/Cards"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const AccountSettings = lazy(() => import("./components/profile/AccountSettings").then(m => ({ default: m.AccountSettings })));
const Pricing = lazy(() => import("./pages/Pricing"));
const Concierge = lazy(() => import("./pages/Concierge"));
const NotFound = lazy(() => import("./pages/NotFound"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

// Lazy load auth pages
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignupPage = lazy(() => import("./pages/auth/SignupPage"));
const OnboardingPage = lazy(() => import("./pages/auth/OnboardingPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const VerifyPage = lazy(() => import("./pages/auth/VerifyPage").then(m => ({ default: m.VerifyPage })));
const PhoneVerifyPage = lazy(() => import("./pages/auth/PhoneVerifyPage").then(m => ({ default: m.PhoneVerifyPage })));

// Lazy load admin pages - separate chunk
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const ContentManagement = lazy(() => import("./pages/admin/ContentManagement"));
const MedicalData = lazy(() => import("./pages/admin/MedicalData"));
const SosMonitoring = lazy(() => import("./pages/admin/SosMonitoring"));
const SystemHealth = lazy(() => import("./pages/admin/SystemHealth"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const CustomPrompts = lazy(() => import("./pages/admin/CustomPrompts"));
const AIChatMonitoring = lazy(() => import("./pages/admin/AIChatMonitoring"));
const ProcessingQueuePanel = lazy(() => import("./components/processing/ProcessingQueuePanel"));
const HealthInsightsPanel = lazy(() => import("./components/insights/HealthInsightsPanel"));
const ExportCenter = lazy(() => import("./components/export/ExportCenter"));
const ImportCenter = lazy(() => import("./components/import/ImportCenter"));

// Create QueryClient instance outside of component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const AuthRedirect: FC = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return user ? <Navigate to="/" replace /> : <Navigate to="/auth/login" replace />;
};

const AppRoutes: FC = () => (
  <Suspense fallback={<LoadingSpinner />}>
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
    <Route path="/vault" element={
      <ProtectedRoute>
        <MobileLayout>
          <Vault />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/prescriptions" element={
      <ProtectedRoute>
        <MobileLayout>
          <Prescriptions />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/cards" element={
      <ProtectedRoute>
        <MobileLayout>
          <Cards />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/vault/:id" element={
      <ProtectedRoute>
        <MobileLayout>
          <ReportDetail />
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
        <MobileLayout>
          <ProfileEdit />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/profile/settings" element={
      <ProtectedRoute>
        <MobileLayout>
          <AccountSettings />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/ai-assistant" element={
      <ProtectedRoute>
        <MobileLayout>
          <AIAssistant />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/concierge" element={
      <ProtectedRoute>
        <MobileLayout>
          <Concierge />
        </MobileLayout>
      </ProtectedRoute>
    } />
    
    {/* Admin Routes */}
    <Route path="/admin" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="moderator">
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/users" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="admin">
          <AdminLayout>
            <UserManagement />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/analytics" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="moderator">
          <AdminLayout>
            <Analytics />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/content" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="moderator">
          <AdminLayout>
            <ContentManagement />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/medical" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="admin">
          <AdminLayout>
            <MedicalData />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/sos" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="moderator">
          <AdminLayout>
            <SosMonitoring />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/system" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="admin">
          <AdminLayout>
            <SystemHealth />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/audit" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="admin">
          <AdminLayout>
            <AuditLogs />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/prompts" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="admin">
          <AdminLayout>
            <CustomPrompts />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/settings" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="super_admin">
          <AdminLayout>
            <Settings />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/processing" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="moderator">
          <AdminLayout>
            <ProcessingQueuePanel />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/ai-chat" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="moderator">
          <AdminLayout>
            <AIChatMonitoring />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/insights" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="moderator">
          <AdminLayout>
            <HealthInsightsPanel />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/export" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="moderator">
          <AdminLayout>
            <ExportCenter />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/admin/import" element={
      <ProtectedRoute>
        <AdminRoute requiredRole="admin">
          <AdminLayout>
            <ImportCenter />
          </AdminLayout>
        </AdminRoute>
      </ProtectedRoute>
    } />
    <Route path="/notifications" element={
      <ProtectedRoute>
        <MobileLayout>
          <NotificationsPage />
        </MobileLayout>
      </ProtectedRoute>
    } />
    
    {/* Auth Routes */}
    <Route path="/auth" element={<AuthRedirect />} />
    <Route path="/auth/login" element={
      <MobileLayout authMode>
        <LoginPage />
      </MobileLayout>
    } />
    <Route path="/auth/signup" element={
      <MobileLayout authMode>
        <SignupPage />
      </MobileLayout>
    } />
    <Route path="/auth/onboarding" element={
      <ProtectedRoute>
        <MobileLayout>
          <OnboardingPage />
        </MobileLayout>
      </ProtectedRoute>
    } />
    <Route path="/auth/forgot-password" element={
      <MobileLayout authMode>
        <ForgotPasswordPage />
      </MobileLayout>
    } />
    <Route path="/auth/reset-password" element={
      <MobileLayout authMode>
        <ResetPasswordPage />
      </MobileLayout>
    } />
    <Route path="/auth/verify" element={
      <MobileLayout authMode>
        <VerifyPage />
      </MobileLayout>
    } />
    <Route path="/auth/phone-verify" element={
      <MobileLayout authMode>
        <PhoneVerifyPage />
      </MobileLayout>
    } />

      {/* Public Routes */}
      <Route path="/pricing" element={
        <MobileLayout>
          <Pricing />
        </MobileLayout>
      } />

      {/* Legacy redirect for old onboarding path */}
      <Route path="/onboarding" element={<Navigate to="/auth/onboarding" replace />} />
    
      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App: FC = () => {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

export default App;