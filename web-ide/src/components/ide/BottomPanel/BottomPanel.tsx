
'use client';

import { Terminal, Bug, Activity, X, Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TerminalPanel } from '../Terminal/TerminalPanel';
import { ConsolePanel } from '../Console/ConsolePanel';

interface BottomPanelProps {
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

type Tab = 'terminal' | 'console';

export function BottomPanel({ onClose, isExpanded, onToggleExpand }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('terminal');

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Tabs Header */}
      <div className="flex items-center justify-between px-2 bg-[#010409] border-b border-[#30363d] flex-shrink-0 z-20 relative">
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab('terminal')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs font-medium border-t-2 transition-colors",
              activeTab === 'terminal' 
                ? "border-[#f78166] text-gray-200 bg-[#0d1117]" 
                : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#161b22]"
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs font-medium border-t-2 transition-colors",
              activeTab === 'console' 
                ? "border-[#f78166] text-gray-200 bg-[#0d1117]" 
                : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#161b22]"
            )}
          >
            <Bug className="w-3.5 h-3.5" />
            Inspect / Console
          </button>
        </div>

        <div className="flex items-center gap-1">
           {onToggleExpand && (
            <button 
                onClick={onToggleExpand}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-[#161b22] rounded"
                title={isExpanded ? "Collapse Panel Height" : "Expand Panel Height"}
            >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
           )}
           <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-[#161b22] rounded"
            title="Close Panel"
           >
            <X className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div className={cn("absolute inset-0 z-10", activeTab === 'terminal' ? 'block' : 'hidden')}>
            {/* Pass generic onClose to Terminal, though BottomPanel handles top-level close */}
            <TerminalPanel onClose={onClose} /> 
        </div>
        <div className={cn("absolute inset-0 z-10", activeTab === 'console' ? 'block' : 'hidden')}>
            <ConsolePanel />
        </div>
      </div>
    </div>
  );
}
