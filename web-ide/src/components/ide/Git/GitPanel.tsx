'use client';

import { useState, useEffect, useCallback } from 'react';
import { GitBranch, RefreshCw, Check, Plus, Minus, File, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { getWebContainer, isWebContainerReady } from '@/lib/webcontainer/instance';
import { useEditorStore } from '@/stores/editorStore';

interface FileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  staged: boolean;
}

// Simulated Git-like version tracking using localStorage
const SNAPSHOTS_KEY = 'clouddev_file_snapshots';
const COMMITS_KEY = 'clouddev_commits';

interface Commit {
  id: string;
  message: string;
  timestamp: number;
  files: string[];
}

function loadSnapshots(): Record<string, string> {
  try {
    const stored = localStorage.getItem(SNAPSHOTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveSnapshots(snapshots: Record<string, string>): void {
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch {
    // Ignore
  }
}

function loadCommits(): Commit[] {
  try {
    const stored = localStorage.getItem(COMMITS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCommits(commits: Commit[]): void {
  try {
    localStorage.setItem(COMMITS_KEY, JSON.stringify(commits));
  } catch {
    // Ignore
  }
}

export function GitPanel() {
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { modifiedFiles } = useEditorStore();

  // Scan for changes
  const scanChanges = useCallback(async () => {
    if (!isWebContainerReady()) return;
    
    setIsLoading(true);
    try {
      const container = await getWebContainer();
      const snapshots = loadSnapshots();
      const newChanges: FileChange[] = [];
      
      // Recursively read all files
      async function scanDir(path: string) {
        try {
          const entries = await container.fs.readdir(path, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = `${path}/${entry.name}`.replace('//', '/');
            
            // Skip node_modules and hidden files
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
            
            if (entry.isDirectory()) {
              await scanDir(fullPath);
            } else {
              try {
                const content = await container.fs.readFile(fullPath, 'utf-8');
                const previousContent = snapshots[fullPath];
                
                if (previousContent === undefined) {
                  // New file
                  newChanges.push({ path: fullPath, status: 'added', staged: false });
                } else if (previousContent !== content) {
                  // Modified file
                  newChanges.push({ path: fullPath, status: 'modified', staged: false });
                }
              } catch {
                // Can't read file, skip
              }
            }
          }
        } catch {
          // Can't read directory, skip
        }
      }
      
      await scanDir('/');
      
      // Check for deleted files
      for (const path of Object.keys(snapshots)) {
        try {
          await container.fs.readFile(path, 'utf-8');
        } catch {
          // File doesn't exist anymore
          newChanges.push({ path, status: 'deleted', staged: false });
        }
      }
      
      setChanges(newChanges);
    } catch (err) {
      console.error('[Git] Scan error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial scan and periodic refresh
  useEffect(() => {
    scanChanges();
    setCommits(loadCommits());
    
    // Rescan when files are modified in the editor
    const interval = setInterval(scanChanges, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, [scanChanges]);

  // Rescan when modifiedFiles changes
  useEffect(() => {
    if (modifiedFiles.size > 0) {
      const timer = setTimeout(scanChanges, 1000);
      return () => clearTimeout(timer);
    }
  }, [modifiedFiles, scanChanges]);

  const toggleStaged = (path: string) => {
    setChanges(prev => prev.map(c => 
      c.path === path ? { ...c, staged: !c.staged } : c
    ));
  };

  const stageAll = () => {
    setChanges(prev => prev.map(c => ({ ...c, staged: true })));
  };

  const unstageAll = () => {
    setChanges(prev => prev.map(c => ({ ...c, staged: false })));
  };

  const handleCommit = async () => {
    const stagedChanges = changes.filter(c => c.staged);
    if (stagedChanges.length === 0 || !commitMessage.trim()) return;
    
    setIsLoading(true);
    try {
      const container = await getWebContainer();
      const snapshots = loadSnapshots();
      
      // Update snapshots for staged files
      for (const change of stagedChanges) {
        if (change.status === 'deleted') {
          delete snapshots[change.path];
        } else {
          try {
            const content = await container.fs.readFile(change.path, 'utf-8');
            snapshots[change.path] = content;
          } catch {
            // Skip if can't read
          }
        }
      }
      
      saveSnapshots(snapshots);
      
      // Create commit record
      const newCommit: Commit = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        message: commitMessage.trim(),
        timestamp: Date.now(),
        files: stagedChanges.map(c => c.path),
      };
      
      const updatedCommits = [newCommit, ...loadCommits()].slice(0, 50); // Keep last 50
      saveCommits(updatedCommits);
      setCommits(updatedCommits);
      
      // Clear staged changes and message
      setChanges(prev => prev.filter(c => !c.staged));
      setCommitMessage('');
      
      console.log('[Git] Commit created:', newCommit.id, commitMessage);
    } catch (err) {
      console.error('[Git] Commit error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const stagedCount = changes.filter(c => c.staged).length;
  const unstagedCount = changes.filter(c => !c.staged).length;

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      <div className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-[#21262d] flex items-center justify-between">
        <span>Source Control</span>
        <div className="flex gap-2">
          <button 
            onClick={scanChanges}
            disabled={isLoading}
            className="hover:text-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Commit Message */}
        <div className="space-y-2">
          <textarea 
            placeholder="Commit message"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                handleCommit();
              }
            }}
            className="w-full bg-[#010409] border border-[#30363d] rounded-md p-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors min-h-[70px] resize-none"
          />
          <button 
            onClick={handleCommit}
            disabled={stagedCount === 0 || !commitMessage.trim() || isLoading}
            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Commit ({stagedCount})
          </button>
        </div>

        {/* Staged Changes */}
        {stagedCount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Staged Changes</span>
              <div className="flex items-center gap-2">
                <span className="bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded text-xs">{stagedCount}</span>
                <button onClick={unstageAll} className="text-gray-500 hover:text-white text-xs">
                  Unstage All
                </button>
              </div>
            </div>
            <div className="bg-[#010409] border border-[#30363d] rounded-md divide-y divide-[#21262d]">
              {changes.filter(c => c.staged).map(change => (
                <div 
                  key={change.path}
                  onClick={() => toggleStaged(change.path)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-[#21262d] cursor-pointer group"
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center ${
                    change.status === 'added' ? 'text-green-400' :
                    change.status === 'deleted' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {change.status === 'added' ? <Plus className="w-3 h-3" /> :
                     change.status === 'deleted' ? <Minus className="w-3 h-3" /> :
                     <File className="w-3 h-3" />}
                  </div>
                  <span className="flex-1 truncate text-gray-300">{change.path.replace(/^\//, '')}</span>
                  <span className={`uppercase text-[10px] font-medium ${
                    change.status === 'added' ? 'text-green-400' :
                    change.status === 'deleted' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {change.status[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Changes */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Changes</span>
            <div className="flex items-center gap-2">
              <span className="bg-[#21262d] px-1.5 py-0.5 rounded text-xs">{unstagedCount}</span>
              {unstagedCount > 0 && (
                <button onClick={stageAll} className="text-gray-500 hover:text-white text-xs">
                  Stage All
                </button>
              )}
            </div>
          </div>
          {unstagedCount === 0 ? (
            <div className="p-4 bg-[#010409] border border-[#30363d] rounded-md text-sm text-gray-500 text-center">
              No changes detected
            </div>
          ) : (
            <div className="bg-[#010409] border border-[#30363d] rounded-md divide-y divide-[#21262d]">
              {changes.filter(c => !c.staged).map(change => (
                <div 
                  key={change.path}
                  onClick={() => toggleStaged(change.path)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-[#21262d] cursor-pointer group"
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center ${
                    change.status === 'added' ? 'text-green-400' :
                    change.status === 'deleted' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {change.status === 'added' ? <Plus className="w-3 h-3" /> :
                     change.status === 'deleted' ? <Minus className="w-3 h-3" /> :
                     <File className="w-3 h-3" />}
                  </div>
                  <span className="flex-1 truncate text-gray-300">{change.path.replace(/^\//, '')}</span>
                  <span className={`uppercase text-[10px] font-medium ${
                    change.status === 'added' ? 'text-green-400' :
                    change.status === 'deleted' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {change.status[0]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commit History */}
        <div className="space-y-1">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {showHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            History ({commits.length})
          </button>
          {showHistory && commits.length > 0 && (
            <div className="bg-[#010409] border border-[#30363d] rounded-md divide-y divide-[#21262d] max-h-48 overflow-y-auto">
              {commits.slice(0, 10).map(commit => (
                <div key={commit.id} className="px-2 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <span className="text-gray-300 truncate flex-1">{commit.message}</span>
                  </div>
                  <div className="mt-1 text-gray-500 text-[10px] pl-5">
                    {new Date(commit.timestamp).toLocaleString()} • {commit.files.length} file(s)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
