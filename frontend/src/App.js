import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Grants from './pages/Grants';
import Proposals from './pages/Proposals';
import Templates from './pages/Templates';
import Documents from './pages/Documents';
import AITools from './pages/AITools';
import Settings from './pages/Settings';
import Budgets from './pages/Budgets';
import ImpactMetrics from './pages/ImpactMetrics';
import Deadlines from './pages/Deadlines';
import Funders from './pages/Funders';
import AIHistory from './pages/AIHistory';
import AdvancedAITools from './pages/AdvancedAITools';
import AIPortfolioTools from './pages/AIPortfolioTools';

// Components
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

// === Batch 04 Gaps & Frontend Mounts ===
import CfAgenticFunderDiscoveryScanningFounda from './pages/CfAgenticFunderDiscoveryScanningFounda';
import CfProposalImpactSimulatorModelingLives from './pages/CfProposalImpactSimulatorModelingLives';
import CfPeerProposalAnalyzerExtractingSucces from './pages/CfPeerProposalAnalyzerExtractingSucces';
import CfMultiFunderStrategyPlannerDiversifyi from './pages/CfMultiFunderStrategyPlannerDiversifyi';
import CfComplianceAuditPrepCoPilotGeneratin from './pages/CfComplianceAuditPrepCoPilotGeneratin';
import CfFunderRelationshipCrmWithAiRecommen from './pages/CfFunderRelationshipCrmWithAiRecommen';
import GapNoRealTimeFunderDeadlineChange from './pages/GapNoRealTimeFunderDeadlineChange';
import GapNoProposalStyleConsistencyEnforcerA from './pages/GapNoProposalStyleConsistencyEnforcerA';
import GapNoRejectionReasonClassifierForPast from './pages/GapNoRejectionReasonClassifierForPast';
import GapBackendIsMonolithicNoRoutesFolder from './pages/GapBackendIsMonolithicNoRoutesFolder';
import GapNoWebhookReceiversForGrantPortal from './pages/GapNoWebhookReceiversForGrantPortal';
import GapNoRealTimeCollaborationOnProposals from './pages/GapNoRealTimeCollaborationOnProposals';
import GapNoFileUploadPipelineForSupporting from './pages/GapNoFileUploadPipelineForSupporting';
import GapNoESignatureIntegrationForProposal from './pages/GapNoESignatureIntegrationForProposal';
import CustomViewsPage from './pages/CustomViewsPage';

// Create Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3501/api';

export const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    navigate('/');
    return user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // If logout API fails, still clear local state
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <AuthContext.Provider value={{ user, login, logout }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
            <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPassword />} />
            <Route path="/reset-password" element={user ? <Navigate to="/" replace /> : <ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/organizations" element={<ProtectedRoute><Organizations /></ProtectedRoute>} />
            <Route path="/grants" element={<ProtectedRoute><Grants /></ProtectedRoute>} />
            <Route path="/proposals" element={<ProtectedRoute><Proposals /></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
            <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
            <Route path="/impact-metrics" element={<ProtectedRoute><ImpactMetrics /></ProtectedRoute>} />
            <Route path="/deadlines" element={<ProtectedRoute><Deadlines /></ProtectedRoute>} />
            <Route path="/funders" element={<ProtectedRoute><Funders /></ProtectedRoute>} />
            <Route path="/ai-history" element={<ProtectedRoute><AIHistory /></ProtectedRoute>} />
            <Route path="/advanced-ai" element={<ProtectedRoute><AdvancedAITools /></ProtectedRoute>} />
            <Route path="/ai-portfolio" element={<ProtectedRoute><AIPortfolioTools /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          {/* // === Batch 04 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-funder-discovery-scanning-founda" element={<CfAgenticFunderDiscoveryScanningFounda />} />
          <Route path="/cf-proposal-impact-simulator-modeling-lives" element={<CfProposalImpactSimulatorModelingLives />} />
          <Route path="/cf-peer-proposal-analyzer-extracting-succes" element={<CfPeerProposalAnalyzerExtractingSucces />} />
          <Route path="/cf-multi-funder-strategy-planner-diversifyi" element={<CfMultiFunderStrategyPlannerDiversifyi />} />
          <Route path="/cf-compliance-audit-prep-co-pilot-generatin" element={<CfComplianceAuditPrepCoPilotGeneratin />} />
          <Route path="/cf-funder-relationship-crm-with-ai-recommen" element={<CfFunderRelationshipCrmWithAiRecommen />} />
          <Route path="/gap-no-real-time-funder-deadline-change" element={<GapNoRealTimeFunderDeadlineChange />} />
          <Route path="/gap-no-proposal-style-consistency-enforcer-a" element={<GapNoProposalStyleConsistencyEnforcerA />} />
          <Route path="/gap-no-rejection-reason-classifier-for-past" element={<GapNoRejectionReasonClassifierForPast />} />
          <Route path="/gap-backend-is-monolithic-no-routes-folder" element={<GapBackendIsMonolithicNoRoutesFolder />} />
          <Route path="/gap-no-webhook-receivers-for-grant-portal" element={<GapNoWebhookReceiversForGrantPortal />} />
          <Route path="/gap-no-real-time-collaboration-on-proposals" element={<GapNoRealTimeCollaborationOnProposals />} />
          <Route path="/gap-no-file-upload-pipeline-for-supporting" element={<GapNoFileUploadPipelineForSupporting />} />
          <Route path="/gap-no-e-signature-integration-for-proposal" element={<GapNoESignatureIntegrationForProposal />} />
          <Route path="/custom-views" element={<ProtectedRoute><CustomViewsPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </AuthContext.Provider>
    </ToastProvider>
  );
}

export default App;
