import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Legacy route redirect component that preserves route params
function LegacyAgentRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/app/agents/${agentId}`} replace />;
}

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
import AgentDialoguePage from "./pages/AgentDialoguePage";
import ConnectionsPage from "./pages/ConnectionsPage";
import GoogleSheetsSetupPage from "./pages/GoogleSheetsSetupPage";
import TelegramSetupPage from "./pages/TelegramSetupPage";
import InstagramSetupPage from "./pages/InstagramSetupPage";
import BitrixSetupPage from "./pages/BitrixSetupPage";
import SalesAgentPage from "./pages/SalesAgentPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import GlobalKnowledgeBasePage from "./pages/GlobalKnowledgeBasePage";
import DocumentTemplatesPage from "./pages/DocumentTemplatesPage";
import SettingsPage from "./pages/SettingsPage";
import AccountPage from "./pages/AccountPage";
import UsageLogsPage from "./pages/UsageLogsPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import PricingPage from "./pages/PricingPage";

// Protected route wrapper - redirects to landing if not authenticated
function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F7F6]">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Public route wrapper - redirects to agents if already authenticated
function PublicRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F7F6]">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
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
        <Route path="agents/:agentId/connections/google-sheets" element={<GoogleSheetsSetupPage />} />
        <Route path="agents/:agentId/connections/telegram" element={<TelegramSetupPage />} />
        <Route path="agents/:agentId/connections/instagram" element={<InstagramSetupPage />} />
        <Route path="agents/:agentId/connections/bitrix" element={<BitrixSetupPage />} />
        <Route path="agents/:agentId/leads" element={<AgentLeadsPage />} />
        <Route path="agents/:agentId/dialogue" element={<AgentDialoguePage />} />
        <Route path="agents/:agentId/dialogue/:customerId" element={<AgentDialoguePage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="analytics" element={<CRMChatPage />} />
        <Route path="dialogue" element={<AgentDialoguePage />} />
        <Route path="dialogue/:customerId" element={<AgentDialoguePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="usage-logs" element={<UsageLogsPage />} />
        {/* Global Knowledge Base */}
        <Route path="global-knowledge" element={<GlobalKnowledgeBasePage />} />
        <Route path="global-knowledge/templates" element={<DocumentTemplatesPage />} />
        {/* Global connections routes */}
        <Route path="connections" element={<ConnectionsPage />} />
        <Route path="connections/telegram" element={<TelegramSetupPage />} />
        <Route path="connections/instagram" element={<InstagramSetupPage />} />
        <Route path="connections/bitrix" element={<BitrixSetupPage />} />
        <Route path="connections/google-sheets" element={<GoogleSheetsSetupPage />} />
        {/* Legacy routes kept for backward compatibility */}
        <Route path="sales-agent" element={<SalesAgentPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
      </Route>
      
      {/* Legacy routes - redirect to new paths */}
      <Route path="/agents" element={<Navigate to="/app/agents" replace />} />
      <Route path="/agents/:agentId" element={<LegacyAgentRedirect />} />
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
        <Toaster position="bottom-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
