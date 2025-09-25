
'use client';

import dynamic from 'next/dynamic';
import { Plus, Trash2, X, Terminal, ChevronDown } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';

const TerminalInstance = dynamic(
  () => import('./TerminalInstance').then((mod) => mod.TerminalInstance),
  { ssr: false }
);

interface TerminalTab {
  id: string;
  name: string;
}

interface TerminalPanelProps {
  onClose?: () => void;
}

export function TerminalPanel({ onClose }: TerminalPanelProps) {
  const [terminals, setTerminals] = useState<TerminalTab[]>([
    { id: '1', name: 'bash' }
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState<string>('1');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleNewTerminal = useCallback(() => {
    const newId = String(Date.now());
    const newTerminal = { id: newId, name: 'bash' };
    setTerminals(prev => [...prev, newTerminal]);
    setActiveTerminalId(newId);
  }, []);

  const handleCloseTerminal = useCallback(() => {
    if (terminals.length <= 1) {
      // If it's the last terminal, just close the panel but don't delete the terminal state completely
      // or maybe we should? VSCode closes panel if last terminal is killed.
      // Let's call onClose if provided
      onClose?.();
      return;
    }

    setTerminals(prev => {
      const newTerminals = prev.filter(t => t.id !== activeTerminalId);
      // Switch to previous terminal if current is closed
      if (activeTerminalId === prev[prev.length - 1].id) {
        setActiveTerminalId(prev[prev.length - 2].id);
      } else {
        // Find index of current, go to next? or stay? 
        // Simple fallback: set to the last one in the new list
        setActiveTerminalId(newTerminals[newTerminals.length - 1].id);
      }
      return newTerminals;
    });
  }, [activeTerminalId, terminals.length, onClose]);

  const activeTerminal = terminals.find(t => t.id === activeTerminalId) || terminals[0];

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#010409] border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          
          {/* Terminal Selector Dropdown */}
          <div className="relative group">
            <button 
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="uppercase font-semibold tracking-wider">
                {terminals.length > 1 ? `Terminal: ${activeTerminal?.name || 'bash'}` : 'Terminal'} 
                {terminals.length > 1 && ` (${terminals.indexOf(activeTerminal) + 1})`}
              </span>
              {terminals.length > 1 && <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Simple custom dropdown since we don't have Radix Popover installed/configured yet maybe? 
                Actually using absolute positioning for simplicity */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-[#161b22] border border-[#30363d] rounded-md shadow-lg z-50">
                {terminals.map((term, index) => (
                  <button
                    key={term.id}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs hover:bg-[#21262d] transition-colors flex items-center justify-between",
                      activeTerminalId === term.id ? "text-white bg-[#21262d]" : "text-gray-400"
                    )}
                    onClick={() => {
                      setActiveTerminalId(term.id);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <span>{index + 1}: {term.name}</span>
                    {activeTerminalId === term.id && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                  </button>
                ))}
              </div>
            )}
            
            {/* Click outside listener usually needed, but for now simple toggle */}
            {isDropdownOpen && (
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setIsDropdownOpen(false)}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={handleNewTerminal}
            className="p-1.5 hover:bg-[#21262d] rounded-md text-gray-400 hover:text-white transition-colors"
            title="New Terminal"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleCloseTerminal}
            className="p-1.5 hover:bg-[#21262d] rounded-md text-gray-400 hover:text-white transition-colors"
            title="Kill Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#21262d] rounded-md text-gray-400 hover:text-white transition-colors"
            title="Close Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        {terminals.map(term => (
          <div 
            key={term.id} 
            className={cn(
              "absolute inset-0 w-full h-full",
              activeTerminalId === term.id ? "z-10 visible" : "z-0 invisible"
            )}
          >
            <TerminalInstance shouldAutoRun={term.id === '1'} />
          </div>
        ))}
      </div>
    </div>
  );
}
