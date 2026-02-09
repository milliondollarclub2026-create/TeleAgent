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
import CRMChatPage from "./pages/CRMChatPage";
import LeadsPage from "./pages/LeadsPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import SalesAgentPage from "./pages/SalesAgentPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";

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
    return <Navigate to="/agents" replace />;
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
      
      {/* Protected routes */}
      <Route path="/agents/new" element={<ProtectedRoute><AgentOnboarding /></ProtectedRoute>} />
      <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/app/agents" replace />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/:agentId" element={<AgentDashboard />} />
        <Route path="agents/:agentId/crm-chat" element={<CRMChatPage />} />
        <Route path="agents/:agentId/settings" element={<SalesAgentPage />} />
        <Route path="leads" element={<LeadsPage />} />
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
        <Toaster position="bottom-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
