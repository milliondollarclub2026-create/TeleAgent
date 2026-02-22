import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';

const STORAGE_KEY = 'leadrelay-chat-panel-open';
const MOBILE_BREAKPOINT = 1024;

export default function SplitPaneLayout({
  dashboard,
  chat,
  chatOpen: controlledChatOpen,
  onChatOpenChange,
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [localChatOpen, setLocalChatOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const chatOpen = controlledChatOpen !== undefined ? controlledChatOpen : localChatOpen;

  const setChatOpen = useCallback((open) => {
    setLocalChatOpen(open);
    if (onChatOpenChange) onChatOpenChange(open);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(open));
    } catch {}
  }, [onChatOpenChange]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile: Sheet drawer
  if (isMobile) {
    return (
      <div className="h-full relative">
        {dashboard}
        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetTrigger asChild>
            <button
              className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition-colors"
            >
              <MessageSquare className="w-4 h-4" strokeWidth={2} />
              <span className="text-sm font-medium">Ask Bobur</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl">
            {chat}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop: Split pane or collapsed
  if (!chatOpen) {
    return (
      <div className="h-full flex">
        <div className="flex-1 min-w-0">{dashboard}</div>
        <button
          onClick={() => setChatOpen(true)}
          className="flex-shrink-0 w-10 flex flex-col items-center justify-center gap-2 border-l border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Open chat panel"
        >
          <MessageSquare className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
          <span className="text-[10px] font-medium text-slate-500 writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
            Ask Bobur
          </span>
        </button>
      </div>
    );
  }

  // Desktop: Resizable split
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={65} minSize={40}>
        <div className="h-full min-w-0">{dashboard}</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
        <div className="h-full flex flex-col border-l border-slate-100" data-tour="chat-panel">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 flex-shrink-0">
            <span className="text-xs font-medium text-slate-500">Chat with Bobur</span>
            <button
              onClick={() => setChatOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
              title="Collapse chat"
            >
              <X className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 min-h-0">{chat}</div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
