import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Loader2 } from "lucide-react";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import OtpVerificationPage from "./pages/OtpVerificationPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardLayout from "./components/layout/DashboardLayout";
import UserDashboard from "./pages/dashboard/UserDashboard";
import OrganizerDashboard from "./pages/dashboard/OrganizerDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import ServiceDetailsPage from "./pages/ServiceDetailsPage";
import CreateServicePage from "./pages/CreateServicePage";
import EditServicePage from "./pages/EditServicePage";
import PaymentStatusPage from "./pages/PaymentStatusPage";
import ChatbotPage from "./pages/ChatbotPage";
import VoiceChatPage from "./pages/VoiceChatPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Wait for auth to finish loading before making routing decisions
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to={`/dashboard/${user?.role}`} /> : <LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-otp" element={<OtpVerificationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="user" element={<ProtectedRoute allowedRoles={['user']}><UserDashboard /></ProtectedRoute>} />        <Route path="user/chat" element={<ProtectedRoute allowedRoles={['user']}><ChatbotPage /></ProtectedRoute>} />        <Route path="user/voice" element={<ProtectedRoute allowedRoles={['user']}><VoiceChatPage /></ProtectedRoute>} />        <Route path="organizer" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerDashboard /></ProtectedRoute>} />
        <Route path="organizer/create" element={<ProtectedRoute allowedRoles={['organizer']}><CreateServicePage /></ProtectedRoute>} />
        <Route path="organizer/edit/:id" element={<ProtectedRoute allowedRoles={['organizer']}><EditServicePage /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/service/:id" element={<ProtectedRoute allowedRoles={['user']}><ServiceDetailsPage /></ProtectedRoute>} />

      {/* Payment status page - no auth required, verification via orderId */}
      <Route path="/payment/status" element={<PaymentStatusPage />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
