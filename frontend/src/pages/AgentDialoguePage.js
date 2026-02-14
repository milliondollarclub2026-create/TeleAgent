import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Search,
  Loader2,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
  Flame,
  Thermometer,
  Snowflake,
  Radio,
  MessagesSquare
} from 'lucide-react';
import AiOrb from '../components/Orb/AiOrb';

// Telegram icon (paper plane only)
const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
  </svg>
);

// Bitrix CRM icon
const BitrixCRMIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
);

// Google Sheets icon
const GoogleSheetsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-7h8v2H8v-2zm0 3h8v2H8v-2zm0-6h4v2H8V10z"/>
  </svg>
);

// Instagram icon
const InstagramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ongoing', label: 'Ongoing', icon: Radio },
  { id: 'hot', label: 'Hot', icon: Flame },
  { id: 'warm', label: 'Warm', icon: Thermometer },
  { id: 'cold', label: 'Cold', icon: Snowflake },
];

// Modern, refined hotness styling with subtle dot indicators
const hotnessConfig = {
  hot: {
    dotColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    label: 'Hot'
  },
  warm: {
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-600',
    label: 'Warm'
  },
  cold: {
    dotColor: 'bg-sky-500',
    textColor: 'text-sky-600',
    label: 'Cold'
  },
};

// Helper to format relative time
const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Check if conversation is ongoing (activity within 15 minutes)
const isOngoing = (lastMessageAt) => {
  if (!lastMessageAt) return false;
  const lastMessage = new Date(lastMessageAt);
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return lastMessage > fifteenMinutesAgo;
};

const AgentDialoguePage = () => {
  const { agentId, customerId } = useParams();
  const navigate = useNavigate();

  // State
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalConversations, setTotalConversations] = useState(0);

  // Connection status (fetched at tenant level)
  const [bitrixConnected, setBitrixConnected] = useState(false);
  const [sheetsConnected, setSheetsConnected] = useState(false);

  const messagesEndRef = useRef(null);
  const lastFetchedTimestamp = useRef(null);

  // Fetch connection statuses on mount
  useEffect(() => {
    const fetchConnectionStatuses = async () => {
      try {
        const [bitrixRes, sheetsRes] = await Promise.all([
          axios.get(`${API}/bitrix-crm/status`).catch(() => ({ data: { connected: false } })),
          axios.get(`${API}/google-sheets/status`).catch(() => ({ data: { connected: false } }))
        ]);
        setBitrixConnected(bitrixRes.data?.connected || false);
        setSheetsConnected(sheetsRes.data?.connected || false);
      } catch (error) {
        console.error('Failed to fetch connection statuses:', error);
      }
    };
    fetchConnectionStatuses();
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch conversations list
  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        filter,
      });
      if (debouncedSearch) params.append('search', debouncedSearch);

      const response = await axios.get(`${API}/conversations?${params}`);
      setConversations(response.data.conversations || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalConversations(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setConversations([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, filter, debouncedSearch]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId, afterTimestamp = null) => {
    if (!conversationId) return;

    try {
      let url = `${API}/conversations/${conversationId}/messages`;
      if (afterTimestamp) {
        url += `?after=${encodeURIComponent(afterTimestamp)}`;
      }

      const response = await axios.get(url);
      const newMessages = response.data.messages || [];

      if (afterTimestamp && newMessages.length > 0) {
        // Append new messages
        setMessages(prev => [...prev, ...newMessages]);
      } else if (!afterTimestamp) {
        // Replace all messages
        setMessages(newMessages);
      }

      // Update last fetched timestamp
      if (newMessages.length > 0) {
        lastFetchedTimestamp.current = newMessages[newMessages.length - 1].created_at;
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, []);

  // Fetch conversation by customer ID (for deep linking from Leads page)
  const fetchConversationByCustomer = useCallback(async (custId) => {
    try {
      const response = await axios.get(`${API}/conversations/by-customer/${custId}`);
      if (response.data) {
        setSelectedConversation(response.data);
        setMessagesLoading(true);
        await fetchMessages(response.data.id);
        setMessagesLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch conversation by customer:', error);
    }
  }, [fetchMessages]);

  // Initial load and polling for conversation list
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => fetchConversations(true), 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Handle customer ID from URL (deep link from Leads page)
  useEffect(() => {
    if (customerId) {
      fetchConversationByCustomer(customerId);
    }
  }, [customerId, fetchConversationByCustomer]);

  // Polling for selected conversation messages
  useEffect(() => {
    if (!selectedConversation) return;

    const interval = setInterval(() => {
      fetchMessages(selectedConversation.id, lastFetchedTimestamp.current);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConversation, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle conversation selection
  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setMessagesLoading(true);
    lastFetchedTimestamp.current = null;
    await fetchMessages(conversation.id);
    setMessagesLoading(false);

    // Update URL without adding to history - handle both agent context and standalone
    const basePath = agentId
      ? `/app/agents/${agentId}/dialogue`
      : '/app/dialogue';
    navigate(`${basePath}/${conversation.customer_id}`, { replace: true });
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  return (
    <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex flex-col animate-fade-in" data-testid="dialogue-page">
      {/* Header */}
      <div className="mb-2 flex-shrink-0">
        <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">Dialogue</h1>
        <p className="text-slate-500 text-sm mt-0.5">View all conversations with your customers</p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Left Column - Conversation List */}
        <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
          <Card className="bg-white border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-slate-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                  data-testid="dialogue-search-input"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="px-3 py-2 border-b border-slate-100 flex-shrink-0 overflow-x-auto">
              <div className="flex gap-1">
                {FILTERS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleFilterChange(id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      filter === id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    data-testid={`filter-${id}`}
                  >
                    {Icon && <Icon className="w-3 h-3" strokeWidth={2} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" strokeWidth={2} />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <MessagesSquare className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">No conversations</p>
                  <p className="text-xs text-slate-500">
                    {searchQuery || filter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Conversations will appear here'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {conversations.map((conversation) => {
                    const hotness = conversation.leads?.[0]?.final_hotness || 'cold';
                    const ongoing = isOngoing(conversation.last_message_at);
                    const isSelected = selectedConversation?.id === conversation.id;
                    const customer = conversation.customers;

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation)}
                        className={`w-full text-left px-4 py-3.5 transition-all duration-200 relative group ${
                          isSelected
                            ? 'bg-slate-50'
                            : 'hover:bg-slate-50/50'
                        }`}
                        data-testid={`conversation-${conversation.id}`}
                      >
                        {/* Refined left edge indicator - thin and elegant */}
                        <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-all ${
                          hotness === 'hot' ? 'bg-gradient-to-b from-orange-400 to-orange-500' :
                          hotness === 'warm' ? 'bg-gradient-to-b from-amber-400 to-amber-500' : 'bg-gradient-to-b from-sky-400 to-sky-500'
                        } ${isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />

                        <div className="pl-2">
                          {/* Top row: Name + Time/Ongoing */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[13px] font-semibold text-slate-900 truncate max-w-[140px]">
                              {customer?.name || 'Unknown'}
                            </span>
                            {/* Show ONGOING badge OR time */}
                            {ongoing ? (
                              <span className="text-[10px] font-semibold text-white bg-emerald-600 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                LIVE
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">
                                {formatRelativeTime(conversation.last_message_at)}
                              </span>
                            )}
                          </div>

                          {/* Phone */}
                          {customer?.phone && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-2">
                              <Phone className="w-3 h-3" strokeWidth={1.75} />
                              {customer.phone}
                            </p>
                          )}

                          {/* Bottom row: Hotness indicator */}
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${hotnessConfig[hotness]?.dotColor}`} />
                            <span className={`text-[11px] font-medium capitalize ${hotnessConfig[hotness]?.textColor}`}>
                              {hotness}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-slate-500">
                  {totalConversations} conversation{totalConversations !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
                  </Button>
                  <span className="text-xs text-slate-600 px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Chat Viewer */}
        <div className="col-span-12 lg:col-span-8 flex flex-col min-h-0">
          <Card className="bg-white border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
                  {/* Customer Info */}
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-slate-500" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">
                      {selectedConversation.customers?.name || 'Unknown Customer'}
                    </p>
                    {selectedConversation.customers?.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" strokeWidth={1.75} />
                        {selectedConversation.customers.phone}
                      </p>
                    )}
                  </div>
                  {/* Channel & Database Icons - Premium gradient style */}
                  <div className="flex items-center -space-x-1.5">
                    {/* Channel badge - dynamic based on source_channel */}
                    {(selectedConversation.source_channel || 'telegram') === 'instagram' ? (
                      <div
                        className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E1306C] to-[#C13584] flex items-center justify-center shadow-lg shadow-[#E1306C]/30 ring-[2.5px] ring-white"
                        title="Instagram"
                      >
                        <InstagramIcon className="w-[17px] h-[17px] text-white" />
                      </div>
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full bg-gradient-to-br from-[#29B6F6] to-[#0088cc] flex items-center justify-center shadow-lg shadow-[#0088cc]/30 ring-[2.5px] ring-white"
                        title="Telegram"
                      >
                        <TelegramIcon className="w-[17px] h-[17px] text-white ml-[1px]" />
                      </div>
                    )}
                    {/* Show Bitrix if connected at tenant level */}
                    {bitrixConnected && (
                      <div
                        className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF7043] to-[#E64A19] flex items-center justify-center shadow-lg shadow-[#FF5722]/30 ring-[2.5px] ring-white"
                        title="Bitrix24"
                      >
                        <BitrixCRMIcon className="w-[17px] h-[17px] text-white" />
                      </div>
                    )}
                    {/* Show Google Sheets if connected at tenant level */}
                    {sheetsConnected && (
                      <div
                        className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] flex items-center justify-center shadow-lg shadow-[#4CAF50]/30 ring-[2.5px] ring-white"
                        title="Google Sheets"
                      >
                        <GoogleSheetsIcon className="w-[17px] h-[17px] text-white" />
                      </div>
                    )}
                  </div>
                  {isOngoing(selectedConversation.last_message_at) && (
                    <span className="text-[11px] font-semibold text-white bg-emerald-600 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm ml-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400" strokeWidth={2} />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-slate-500">No messages in this conversation</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={msg.id || idx}
                        className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-end gap-2 max-w-[75%] ${msg.sender_type === 'user' ? 'flex-row-reverse' : ''}`}>
                          {/* Avatar */}
                          {msg.sender_type === 'user' ? (
                            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-slate-700">
                              <User className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                            </div>
                          ) : (
                            <AiOrb
                              size={28}
                              colors={['#10b981', '#059669', '#14b8a6']}
                              state="idle"
                              className="flex-shrink-0"
                            />
                          )}

                          {/* Message Bubble */}
                          <div className={`px-4 py-2.5 text-[13px] leading-relaxed ${
                            msg.sender_type === 'user'
                              ? 'bg-slate-800 text-white rounded-2xl rounded-br-md'
                              : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-md shadow-sm'
                          }`}>
                            <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                            <div className={`text-[10px] mt-1 ${
                              msg.sender_type === 'user' ? 'text-slate-400' : 'text-slate-400'
                            }`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <MessagesSquare className="w-7 h-7 text-slate-400" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold font-['Plus_Jakarta_Sans'] text-slate-900 mb-1">
                    Select a conversation
                  </h3>
                  <p className="text-sm text-slate-500 max-w-[280px]">
                    Choose a conversation from the list to view the full chat history
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentDialoguePage;
