import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ConfirmEmail from "./pages/ConfirmEmail";
import ResetPassword from "./pages/ResetPassword";
import DashboardLayout from "./layouts/DashboardLayout";
import AgentsPage from "./pages/AgentsPage";
import AgentOnboarding from "./pages/AgentOnboarding";
import AgentDashboard from "./pages/AgentDashboard";
import AgentSettingsPage from "./pages/AgentSettingsPage";
import AgentTestChatPage from "./pages/AgentTestChatPage";
import CRMChatPage from "./pages/CRMChatPage";
import LeadsPage from "./pages/LeadsPage";
import AgentLeadsPage from "./pages/AgentLeadsPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import SalesAgentPage from "./pages/SalesAgentPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import PricingPage from "./pages/PricingPage";

// Protected route wrapper - redirects to landing if not authenticated
function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Public route wrapper - redirects to agents if already authenticated
function PublicRoute({ children }) {
  const { token } = useAuth();
  if (token) {
    return <Navigate to="/app/agents" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/confirm-email" element={<ConfirmEmail />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      
      {/* Protected routes */}
      <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/app/agents" replace />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/new" element={<AgentOnboarding />} />
        <Route path="agents/:agentId" element={<AgentDashboard />} />
        <Route path="agents/:agentId/settings" element={<AgentSettingsPage />} />
        <Route path="agents/:agentId/test-chat" element={<AgentTestChatPage />} />
        <Route path="agents/:agentId/knowledge" element={<KnowledgeBasePage />} />
        <Route path="agents/:agentId/connections" element={<ConnectionsPage />} />
        <Route path="agents/:agentId/crm-chat" element={<CRMChatPage />} />
        <Route path="agents/:agentId/leads" element={<AgentLeadsPage />} />
        <Route path="leads" element={<LeadsPage />} />
        {/* Legacy routes kept for backward compatibility */}
        <Route path="connections" element={<ConnectionsPage />} />
        <Route path="sales-agent" element={<SalesAgentPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
      </Route>
      
      {/* Legacy routes - redirect to new paths */}
      <Route path="/agents" element={<Navigate to="/app/agents" replace />} />
      <Route path="/agents/:agentId" element={<Navigate to="/app/agents/:agentId" replace />} />
      <Route path="/leads" element={<Navigate to="/app/leads" replace />} />
      <Route path="/connections" element={<Navigate to="/app/connections" replace />} />
      <Route path="/dashboard" element={<Navigate to="/app/agents" replace />} />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="bottom-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
