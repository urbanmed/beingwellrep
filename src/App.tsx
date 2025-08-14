import { type FC, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { FamilyMemberProvider } from "@/contexts/FamilyMemberContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import Index from "./pages/Index";
import Upload from "./pages/Upload";
import Summaries from "./pages/Summaries";
import Reports from "./pages/Reports";
import Vault from "./pages/Vault";
import ReportDetail from "./pages/ReportDetail";
import AIAssistant from "./pages/AIAssistant";
import Prescriptions from "./pages/Prescriptions";
import Cards from "./pages/Cards";

import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Concierge from "./pages/Concierge";

import NotFound from "./pages/NotFound";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import OnboardingPage from "./pages/auth/OnboardingPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { VerifyPage } from "./pages/auth/VerifyPage";
import { PhoneVerifyPage } from "./pages/auth/PhoneVerifyPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import Analytics from "./pages/admin/Analytics";
import ContentManagement from "./pages/admin/ContentManagement";
import MedicalData from "./pages/admin/MedicalData";
import SosMonitoring from "./pages/admin/SosMonitoring";
import SystemHealth from "./pages/admin/SystemHealth";
import AuditLogs from "./pages/admin/AuditLogs";
import Settings from "./pages/admin/Settings";
import CustomPrompts from "./pages/admin/CustomPrompts";
import ProcessingQueuePanel from "./components/processing/ProcessingQueuePanel";
import HealthInsightsPanel from "./components/insights/HealthInsightsPanel";
import ExportCenter from "./components/export/ExportCenter";
import ImportCenter from "./components/import/ImportCenter";
import NotificationsPage from "./pages/NotificationsPage";

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

const ProtectedMobileLayout: FC<{children: ReactNode}> = ({ children }) => (
  <ProtectedRoute>
    <FamilyMemberProvider>
      <MobileLayout>
        {children}
      </MobileLayout>
    </FamilyMemberProvider>
  </ProtectedRoute>
);

const AppRoutes: FC = () => (
  <Routes>
    {/* Protected Routes */}
    <Route path="/" element={<ProtectedMobileLayout><Index /></ProtectedMobileLayout>} />
    <Route path="/upload" element={<ProtectedMobileLayout><Upload /></ProtectedMobileLayout>} />
    <Route path="/summaries" element={<ProtectedMobileLayout><Summaries /></ProtectedMobileLayout>} />
    <Route path="/vault" element={<ProtectedMobileLayout><Vault /></ProtectedMobileLayout>} />
    <Route path="/reports" element={<ProtectedMobileLayout><Reports /></ProtectedMobileLayout>} />
    <Route path="/prescriptions" element={<ProtectedMobileLayout><Prescriptions /></ProtectedMobileLayout>} />
    <Route path="/cards" element={<ProtectedMobileLayout><Cards /></ProtectedMobileLayout>} />
    <Route path="/reports/:id" element={
      <ProtectedRoute>
        <FamilyMemberProvider>
          <ReportDetail />
        </FamilyMemberProvider>
      </ProtectedRoute>
    } />
    <Route path="/profile" element={<ProtectedMobileLayout><Profile /></ProtectedMobileLayout>} />
    <Route path="/profile/edit" element={
      <ProtectedRoute>
        <FamilyMemberProvider>
          <ProfileEdit />
        </FamilyMemberProvider>
      </ProtectedRoute>
    } />
    <Route path="/ai-assistant" element={<ProtectedMobileLayout><AIAssistant /></ProtectedMobileLayout>} />
    <Route path="/concierge" element={<ProtectedMobileLayout><Concierge /></ProtectedMobileLayout>} />
    <Route path="/notifications" element={<ProtectedMobileLayout><NotificationsPage /></ProtectedMobileLayout>} />
    
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

      {/* Legacy redirect for old onboarding path */}
      <Route path="/onboarding" element={<Navigate to="/auth/onboarding" replace />} />
    
      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
);

const App: FC = () => {
  return (
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
  );
};

export default App;