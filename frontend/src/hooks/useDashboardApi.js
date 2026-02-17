import { useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Custom hook for all CRM Dashboard API calls.
 * Uses axios with auto Bearer token from AuthContext (set globally).
 */
export default function useDashboardApi() {
  // --- Helpers ---
  const apiCall = useCallback(async (method, path, data = null) => {
    try {
      const url = `${API_URL}${path}`;
      let response;

      if (method === 'get') {
        response = await axios.get(url, { params: data });
      } else if (method === 'post') {
        response = await axios.post(url, data);
      } else if (method === 'put') {
        response = await axios.put(url, data);
      } else if (method === 'patch') {
        response = await axios.patch(url, data);
      } else if (method === 'delete') {
        response = await axios.delete(url);
      }

      return { data: response.data, error: null };
    } catch (err) {
      if (axios.isCancel(err)) {
        return { data: null, error: null }; // Silently handle cancelled requests
      }
      const detail = err.response?.data?.detail;
      let message;
      if (!err.response) {
        // Network error — no response received
        message = 'Network error. Please check your connection.';
      } else if (err.response.status >= 500) {
        message = 'Server error. Please try again later.';
      } else {
        message = Array.isArray(detail)
          ? detail.map(d => d.msg).join(', ')
          : (detail || err.message || 'Something went wrong');
      }
      return { data: null, error: message };
    }
  }, []);

  const apiCallWithToast = useCallback(async (method, path, data = null, errorMsg) => {
    const result = await apiCall(method, path, data);
    if (result.error) {
      toast.error(errorMsg || result.error);
    }
    return result;
  }, [apiCall]);

  // --- Onboarding ---
  const startOnboarding = useCallback(() =>
    apiCallWithToast('post', '/api/dashboard/onboarding/start', {}, 'Failed to start onboarding'),
  [apiCallWithToast]);

  const selectCategories = useCallback((categories) =>
    apiCallWithToast('post', '/api/dashboard/onboarding/select', { categories }, 'Failed to select categories'),
  [apiCallWithToast]);

  const submitRefinement = useCallback((answers) =>
    apiCallWithToast('post', '/api/dashboard/onboarding/refine', { answers }, 'Failed to generate dashboard'),
  [apiCallWithToast]);

  const reconfigure = useCallback(() =>
    apiCallWithToast('post', '/api/dashboard/reconfigure', {}, 'Failed to reconfigure dashboard'),
  [apiCallWithToast]);

  // --- Dashboard ---
  const getConfig = useCallback(() =>
    apiCall('get', '/api/dashboard/config'),
  [apiCall]);

  const getWidgets = useCallback(() =>
    apiCall('get', '/api/dashboard/widgets'),
  [apiCall]);

  const addWidget = useCallback((widgetData) =>
    apiCallWithToast('post', '/api/dashboard/widgets', widgetData, 'Failed to add widget'),
  [apiCallWithToast]);

  const deleteWidget = useCallback((widgetId) =>
    apiCallWithToast('delete', `/api/dashboard/widgets/${widgetId}`, null, 'Failed to delete widget'),
  [apiCallWithToast]);

  const getInsights = useCallback(() =>
    apiCall('get', '/api/dashboard/insights'),
  [apiCall]);

  // --- Chat ---
  const sendChatMessage = useCallback((message, conversation_history = []) =>
    apiCall('post', '/api/dashboard/chat', { message, conversation_history }),
  [apiCall]);

  const getChatHistory = useCallback((limit = 50, offset = 0) =>
    apiCall('get', '/api/dashboard/chat/history', { limit, offset }),
  [apiCall]);

  const clearChatHistory = useCallback(() =>
    apiCallWithToast('delete', '/api/dashboard/chat/history', null, 'Failed to clear chat'),
  [apiCallWithToast]);

  // --- Data ---
  const getDataUsage = useCallback(() =>
    apiCall('get', '/api/data/usage'),
  [apiCall]);

  const getSyncStatus = useCallback(() =>
    apiCall('get', '/api/crm/sync/status'),
  [apiCall]);

  const getIntegrationsStatus = useCallback(() =>
    apiCall('get', '/api/integrations/status'),
  [apiCall]);

  return useMemo(() => ({
    // Onboarding
    startOnboarding,
    selectCategories,
    submitRefinement,
    reconfigure,
    // Dashboard
    getConfig,
    getWidgets,
    addWidget,
    deleteWidget,
    getInsights,
    // Chat
    sendChatMessage,
    getChatHistory,
    clearChatHistory,
    // Data
    getDataUsage,
    getSyncStatus,
    getIntegrationsStatus,
  }), [startOnboarding, selectCategories, submitRefinement, reconfigure, getConfig, getWidgets, addWidget, deleteWidget, getInsights, sendChatMessage, getChatHistory, clearChatHistory, getDataUsage, getSyncStatus, getIntegrationsStatus]);
}
