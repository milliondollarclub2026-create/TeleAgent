import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import LoginPage from "./pages/LoginPage";
import ConfirmEmail from "./pages/ConfirmEmail";
import ResetPassword from "./pages/ResetPassword";
import DashboardLayout from "./layouts/DashboardLayout";
import AgentsPage from "./pages/AgentsPage";
import AgentOnboarding from "./pages/AgentOnboarding";
import AgentDashboard from "./pages/AgentDashboard";
import LeadsPage from "./pages/LeadsPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import SalesAgentPage from "./pages/SalesAgentPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/confirm-email" element={<ConfirmEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/agents/new" element={<AgentOnboarding />} />
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/agents" replace />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="agents/:agentId" element={<AgentDashboard />} />
            <Route path="agents/:agentId/settings" element={<SalesAgentPage />} />
            <Route path="dashboard" element={<Navigate to="/agents" replace />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="connections" element={<ConnectionsPage />} />
            <Route path="sales-agent" element={<SalesAgentPage />} />
            <Route path="knowledge-base" element={<KnowledgeBasePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/agents" replace />} />
        </Routes>
        <Toaster position="bottom-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
