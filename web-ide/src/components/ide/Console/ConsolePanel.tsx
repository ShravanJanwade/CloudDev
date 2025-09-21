
'use client';

import { Ban, Search, Info, AlertTriangle, XCircle, Terminal } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Mock logs for now, or hook into window messages
interface LogEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  source?: string;
  timestamp: number;
}

export function ConsolePanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('');

  // Listen for logs from preview (if we can implement that bridge later)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Basic security check - in a real app, verify origin more strictly
      if (event.data && event.data.type === 'console-log') {
        const newLog: LogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          type: event.data.level || 'log',
          message: typeof event.data.args === 'object' ? JSON.stringify(event.data.args) : String(event.data.args),
          timestamp: Date.now(),
          source: 'Preview' 
        };
        setLogs(prev => [...prev, newLog]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const clearLogs = () => setLogs([]);

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-gray-300 font-mono text-xs">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-[#30363d]">
        <button 
            onClick={clearLogs}
            className="p-1 hover:bg-[#21262d] rounded text-gray-400 hover:text-gray-200" 
            title="Clear Console"
        >
          <Ban className="w-3.5 h-3.5" />
        </button>
        <div className="relative flex-1 max-w-xs">
           <Search className="absolute left-2 top-1.5 w-3 h-3 text-gray-500" />
           <input 
             value={filter}
             onChange={(e) => setFilter(e.target.value)}
             placeholder="Filter" 
             className="w-full bg-[#010409] border border-[#30363d] rounded pl-7 pr-2 py-0.5 focus:outline-none focus:border-blue-500 transition-colors"
           />
        </div>
        <div className="flex-1"></div>
        <span className="text-gray-500 italic px-2">Preview Logs</span>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                <div className="flex flex-col items-center text-center max-w-sm gap-2">
                    <Terminal className="w-8 h-8 opacity-20 mb-2" />
                    <p className="font-medium text-gray-400">Ready to capture logs</p>
                    <p className="text-xs opacity-70 leading-relaxed">
                        Console logs from your app (`console.log`, `warn`, `error`) will appear here automatically.
                    </p>
                    <div className="text-xs bg-[#161b22] px-3 py-2 rounded border border-[#30363d] mt-2 opacity-60">
                         Try adding <code>console.log('Hello')</code> to your code!
                    </div>
                </div>
            </div>
        )}
        
        {filteredLogs.map(log => (
          <div key={log.id} className={cn(
            "flex items-start gap-2 py-1 px-1 border-b border-[#21262d] last:border-0 hover:bg-[#161b22]",
            log.type === 'error' && "bg-red-500/5 text-red-200",
            log.type === 'warn' && "bg-yellow-500/5 text-yellow-200"
          )}>
            <div className="shrink-0 mt-0.5">
               {log.type === 'error' && <XCircle className="w-3 h-3 text-red-400" />}
               {log.type === 'warn' && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
               {log.type === 'info' && <Info className="w-3 h-3 text-blue-400" />}
               {log.type === 'log' && <div className="w-3 h-3" />} 
            </div>
            <div className="break-all whitespace-pre-wrap">{log.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
