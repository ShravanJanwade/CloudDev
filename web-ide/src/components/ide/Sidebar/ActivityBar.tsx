
'use client';
import { Files, Search, GitBranch, Settings, TerminalSquare, MonitorPlay, MessageSquare, PenTool, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityBarProps {
  activePanel: 'files' | 'search' | 'git' | null;
  onPanelChange: (panel: 'files' | 'search' | 'git') => void;
  onToggleTerminal: () => void;
  onTogglePreview: () => void;
  onOpenSettings: () => void;
  onToggleChat?: () => void;
  onToggleWhiteboard?: () => void;
  onShare?: () => void;
  showChat?: boolean;
  showWhiteboard?: boolean;
  onExit?: () => void;
}

export function ActivityBar({ 
  activePanel, 
  onPanelChange, 
  onToggleTerminal, 
  onTogglePreview,
  onOpenSettings,
  onToggleChat,
  onToggleWhiteboard,
  onShare,
  showChat = false,
  showWhiteboard = false,
  onExit,
}: ActivityBarProps) {
  const topItems = [
    { id: 'files' as const, icon: Files, label: 'Explorer' },
    { id: 'search' as const, icon: Search, label: 'Search' },
    { id: 'git' as const, icon: GitBranch, label: 'Source Control' },
  ];

  return (
    <div className="w-12 h-full flex flex-col bg-[#010409] border-r border-[#21262d] items-center py-2">
      {/* Top section - Navigation */}
      <div className="flex flex-col gap-1">
        {topItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPanelChange(item.id)}
            className={cn(
              "p-3 relative rounded-lg transition-all duration-200",
              activePanel === item.id 
                ? "text-white bg-[#21262d]" 
                : "text-gray-500 hover:text-gray-300 hover:bg-[#21262d]/50"
            )}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
            {activePanel === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500 rounded-r" />
            )}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Collaboration section */}
      {(onToggleChat || onToggleWhiteboard || onShare) && (
        <div className="flex flex-col gap-1 mb-2">
          {onShare && (
             <button 
               onClick={onShare} 
               className="p-3 text-purple-400 hover:text-purple-300 hover:bg-[#21262d]/50 rounded-lg transition-all duration-200"
               title="Collaboration / Invite"
             >
               <Users className="w-5 h-5" />
             </button>
          )}
          {onToggleChat && (
            <button 
              onClick={onToggleChat} 
              className={cn(
                "p-3 rounded-lg transition-all duration-200",
                showChat 
                  ? "text-blue-400 bg-[#21262d]" 
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#21262d]/50"
              )}
              title="Toggle Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          )}
          {onToggleWhiteboard && (
            <button 
              onClick={onToggleWhiteboard} 
              className={cn(
                "p-3 rounded-lg transition-all duration-200",
                showWhiteboard 
                  ? "text-blue-400 bg-[#21262d]" 
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#21262d]/50"
              )}
              title="Toggle Whiteboard"
            >
              <PenTool className="w-5 h-5" />
            </button>
          )}
          <div className="w-8 h-px bg-[#21262d] my-1 mx-auto" />
        </div>
      )}

      {/* Bottom section - Tools */}
      <div className="flex flex-col gap-1">
        <button 
          onClick={onTogglePreview} 
          className="p-3 text-gray-500 hover:text-gray-300 hover:bg-[#21262d]/50 rounded-lg transition-all duration-200" 
          title="Toggle Preview"
        >
          <MonitorPlay className="w-5 h-5" />
        </button>
        
        <button 
          onClick={onToggleTerminal} 
          className="p-3 text-gray-500 hover:text-gray-300 hover:bg-[#21262d]/50 rounded-lg transition-all duration-200"
          title="Toggle Terminal"
        >
          <TerminalSquare className="w-5 h-5" />
        </button>

        <div className="w-8 h-px bg-[#21262d] my-2" />

        <button 
          onClick={onOpenSettings}
          className="p-3 text-gray-500 hover:text-gray-300 hover:bg-[#21262d]/50 rounded-lg transition-all duration-200" 
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
        
        <div className="w-8 h-px bg-[#21262d] my-1" />

        <button 
          onClick={onExit}
          className="p-3 text-red-400 hover:text-red-300 hover:bg-[#21262d]/50 rounded-lg transition-all duration-200" 
          title="Exit to Home"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
