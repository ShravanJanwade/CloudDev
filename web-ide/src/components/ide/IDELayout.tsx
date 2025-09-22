'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileExplorer } from './FileTree/FileExplorer';
import { MonacoEditor } from './Editor/MonacoEditor';
import { EditorTabs } from './Editor/EditorTabs';
import { TerminalPanel } from './Terminal/TerminalPanel';
import { BottomPanel } from './BottomPanel/BottomPanel';
import { PreviewPanel } from './Preview/PreviewPanel';
import { ActivityBar } from './Sidebar/ActivityBar';
import { SearchPanel } from './Search/SearchPanel';
import { GitPanel } from './Git/GitPanel';
import { ChatPanel } from '../collaboration/ChatPanel';
import { WhiteboardPanel } from '../collaboration/WhiteboardPanel';
import { CollaborationTopbar } from '../collaboration/CollaborationTopbar';
import { SettingsModal } from '../ui/SettingsModal';
import { useEditorStore } from '@/stores/editorStore';
import { useFileSystem } from '@/hooks/useFileSystem';
import { useWebContainer } from '@/hooks/useWebContainer';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api/client';
import { exportFileSystem, cleanFileSystem, mountFiles } from '@/lib/webcontainer/instance';
import { AlertCircle, RefreshCw, Loader2, Plus, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

// LocalStorage keys for persisting UI state
const UI_STATE_KEY = 'clouddev_ui_state_v3';

interface UIState {
  showTerminal: boolean;
  showPreview: boolean;
  showChat: boolean;
  showWhiteboard: boolean;
  sidebarWidth: number;
  terminalHeight: number;
  previewWidth: number;
  collaborationWidth: number;
}

function loadUIState(): UIState {
  try {
    const stored = localStorage.getItem(UI_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return { 
    showTerminal: true, 
    showPreview: true, 
    showChat: false,
    showWhiteboard: false,
    sidebarWidth: 250,
    terminalHeight: 300,
    previewWidth: 400,
    collaborationWidth: 350,
  };
}

function saveUIState(state: Partial<UIState>): void {
  try {
    const current = loadUIState();
    localStorage.setItem(UI_STATE_KEY, JSON.stringify({ ...current, ...state }));
  } catch {
    // Ignore errors
  }
}

export function IDELayout() {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<'files' | 'search' | 'git' | null>('files');
  
  // Load persisted UI state
  const initialState = loadUIState();
  const [showTerminal, setShowTerminal] = useState(initialState.showTerminal);
  const [isBottomExpanded, setIsBottomExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(initialState.showPreview);
  const [showChat, setShowChat] = useState(initialState.showChat);
  const [showWhiteboard, setShowWhiteboard] = useState(initialState.showWhiteboard);
  const [sidebarWidth, setSidebarWidth] = useState(initialState.sidebarWidth);
  const [terminalHeight, setTerminalHeight] = useState(initialState.terminalHeight);
  const [previewWidth, setPreviewWidth] = useState(initialState.previewWidth);
  const [collaborationWidth, setCollaborationWidth] = useState(initialState.collaborationWidth);
  
  const [isResizing, setIsResizing] = useState<'sidebar' | 'terminal' | 'preview' | 'collaboration' | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { files, refreshFiles, loading: filesLoading, createFile, createDirectory, writeFile } = useFileSystem();
  const { activeFile, updateFileContent, markFileModified } = useEditorStore();
  const { isBooting, error, retry } = useWebContainer();
  const { status: collaborationStatus, roomId, connect, joinRoom, socket } = useCollaborationStore();
  const { user } = useAuthStore();
  const requestSyncRef = useRef(false);

  // Sync Logic: Handle FS synchronization between Host and Guest
  useEffect(() => {
    if (!socket || !roomId) return;

    // Handler: Respond to sync request (Host logic)
    const onSyncRequest = async ({ requesterId }: { requesterId: string }) => {
        if (files && files.length > 0) {
            console.log('[Sync] Received request, exporting FS...');
            try {
                const fsTree = await exportFileSystem();
                socket.emit('project:sync:data', { roomId, targetId: requesterId, files: fsTree });
            } catch (e) {
                console.error('[Sync] Export failed:', e);
            }
        }
    };

    // Handler: Receive sync data (Guest logic)
    const onSyncData = async ({ files: syncedFiles }: { files: any }) => {
        console.log('[Sync] Received files, mounting...');
        try {
            await cleanFileSystem();
            await mountFiles(syncedFiles);
            await refreshFiles();
            console.log('[Sync] Complete');
            alert('Files synced successfully! 🚀\n\nPlease run "npm install" then "npm run dev" in the terminal to start the server.');
        } catch (e) {
            console.error('[Sync] Mount failed:', e);
        }
    };

    // Handler: Receive code update (Global Sync)
    const onCodeUpdate = async ({ filePath, content }: { filePath: string, content: string }) => {
        console.log('[Sync] Code update received for:', filePath);
        // Update in-memory editor state
        updateFileContent(filePath, content);
        markFileModified(filePath); // Optional: mark as modified to indicate changes
        
        // Update WebContainer filesystem so server picks it up
        try {
            await writeFile(filePath, content);
        } catch(e) {
            console.error('[Sync] Failed to write to FS:', e);
        }
    };

    socket.on('project:sync:request', onSyncRequest);
    socket.on('project:sync:data', onSyncData);
    socket.on('code:update', onCodeUpdate);

    return () => {
        socket.off('project:sync:request', onSyncRequest);
        socket.off('project:sync:data', onSyncData);
        socket.off('code:update', onCodeUpdate);
    };
  }, [socket, roomId, files, refreshFiles]);

  // Sync Logic: Trigger request if joining as a guest (empty files)
  useEffect(() => {
    if (socket && roomId && files.length === 0 && !filesLoading && !requestSyncRef.current) {
         console.log('[Sync] Requesting files...');
         socket.emit('project:sync:request', { roomId });
         requestSyncRef.current = true;
    }
  }, [socket, roomId, files.length, filesLoading]);

  // Persist UI state changes
  useEffect(() => {
    saveUIState({ sidebarWidth, terminalHeight, previewWidth, collaborationWidth });
  }, [sidebarWidth, terminalHeight, previewWidth, collaborationWidth]);

  const toggleTerminal = useCallback(() => {
    setShowTerminal(prev => {
      const newValue = !prev;
      saveUIState({ showTerminal: newValue });
      return newValue;
    });
  }, []);

  const togglePreview = useCallback(() => {
    setShowPreview(prev => {
      const newValue = !prev;
      saveUIState({ showPreview: newValue });
      return newValue;
    });
  }, []);

  const toggleChat = useCallback(() => {
    setShowChat(prev => {
      const newValue = !prev;
      // If turning on chat, turn off whiteboard
      if (newValue) {
        setShowWhiteboard(false);
        saveUIState({ showChat: true, showWhiteboard: false });
      } else {
        saveUIState({ showChat: false });
      }
      return newValue;
    });
  }, []);

  const toggleWhiteboard = useCallback(() => {
    setShowWhiteboard(prev => {
      const newValue = !prev;
      // If turning on whiteboard, turn off chat
      if (newValue) {
        setShowChat(false);
        saveUIState({ showWhiteboard: true, showChat: false });
      } else {
        saveUIState({ showWhiteboard: false });
      }
      return newValue;
    });
  }, []);

  const handleShare = useCallback(async () => {
    if (roomId) {
      alert('You are already in a collaboration room. Use the "Invite" button in the top bar to share the code.');
      return;
    }
    
    try {
      // Create a new room
      const result = await api.createRoom({ name: 'Untitled Room' });
      if (result.data?.room) {
        const code = result.data.room.code;
        const name = user?.name || `Guest-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        
        connect(socketUrl, name);
        setTimeout(() => joinRoom(code), 500);
      }
    } catch (err) {
      console.error('Failed to start collaboration:', err);
      alert('Failed to start collaboration session.');
    }
  }, [roomId, user, connect, joinRoom]);

  const handlePanelChange = useCallback((panel: 'files' | 'search' | 'git') => {
    setActivePanel(curr => curr === panel ? null : panel);
  }, []);

  // Resize Logic
  const startResizing = (direction: 'sidebar' | 'terminal' | 'preview' | 'collaboration') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(direction);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing === 'sidebar') {
        const newWidth = Math.max(150, Math.min(600, e.clientX - 48));
        setSidebarWidth(newWidth);
      } else if (isResizing === 'terminal') {
        const containerHeight = window.innerHeight;
        const newHeight = Math.max(100, Math.min(800, containerHeight - e.clientY));
        setTerminalHeight(newHeight);
      } else if (isResizing === 'preview') {
        const collaborationW = (showChat || showWhiteboard) ? collaborationWidth : 0;
        const newWidth = Math.max(300, Math.min(1000, window.innerWidth - e.clientX - collaborationW));
        setPreviewWidth(newWidth);
      } else if (isResizing === 'collaboration') {
        const newWidth = Math.max(250, Math.min(600, window.innerWidth - e.clientX));
        setCollaborationWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = isResizing === 'terminal' ? 'row-resize' : 'col-resize';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, showChat, showWhiteboard, collaborationWidth]);

  useEffect(() => {
    if (!isBooting && !error) {
      refreshFiles();
    }
  }, [isBooting, error, refreshFiles]);

  // Booting state
  if (isBooting) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-500/30"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
          </div>
          <div className="text-center">
            <p className="text-white text-lg font-medium">Booting Environment</p>
            <p className="text-gray-400 text-sm mt-1">Initializing WebContainer...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const isMultiTabError = error.includes('another tab');
    return (
      <div className="h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-center max-w-lg mx-auto p-8 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-red-400 text-lg font-medium">Failed to Start Environment</p>
          <p className="text-gray-400 mt-3 text-sm leading-relaxed">{error}</p>
          {isMultiTabError ? (
            <div className="mt-6 space-y-3">
              <p className="text-gray-500 text-xs">WebContainers can only run in one browser tab at a time.</p>
              <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh Page
              </button>
            </div>
          ) : (
            <button onClick={retry} className="mt-6 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  const showCollaboration = showChat || showWhiteboard;

  return (
    <div className="h-screen flex bg-[#0d1117] text-white overflow-hidden">
      {/* Activity Bar */}
      <ActivityBar 
        activePanel={activePanel} 
        onPanelChange={handlePanelChange}
        onToggleTerminal={toggleTerminal}
        onTogglePreview={togglePreview}
        onOpenSettings={() => setShowSettings(true)}
        onToggleChat={toggleChat}
        onToggleWhiteboard={toggleWhiteboard}
        onShare={handleShare}
        showChat={showChat}
        showWhiteboard={showWhiteboard}
        onExit={() => router.push('/')}
      />

      {/* Main Container */}
      <div className="flex-1 flex min-w-0">
        
        {/* Sidebar */}
        {activePanel && (
          <>
            <div style={{ width: sidebarWidth }} className="flex flex-col border-r border-[#21262d] flex-shrink-0">
              {activePanel === 'files' && (
                   <div className="h-full bg-[#0d1117] flex flex-col">
                     <div className="flex-1 overflow-y-auto">
                       <FileExplorer files={files} />
                     </div>
                   </div>
              )}
              {activePanel === 'search' && <div className="h-full"><SearchPanel /></div>}
              {activePanel === 'git' && <div className="h-full"><GitPanel /></div>}
            </div>
            
            {/* Sidebar Resizer */}
            <div 
              onMouseDown={startResizing('sidebar')}
              className="w-1 bg-[#21262d] hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0 z-10"
            />
          </>
        )}

        {/* Editor Area (Includes Terminal) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* Collaboration Topbar - shown when in a room */}
          {roomId && (
            <CollaborationTopbar 
              roomCode={roomId} 
              onLeaveRoom={() => router.push('/')} 
            />
          )}

          {/* Editor & Tabs */}
          <div className="flex-1 flex flex-col min-h-0">
            <EditorTabs />
            <div className="flex-1 relative">
               {activeFile ? (
                 <MonacoEditor filePath={activeFile} />
               ) : (
                 <div className="h-full flex items-center justify-center text-gray-500">
                   <div className="text-center">
                     <div className="w-16 h-16 rounded-full bg-[#21262d] flex items-center justify-center mx-auto mb-4">
                       <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                     </div>
                     <p className="text-lg font-medium text-gray-400">No file open</p>
                     <p className="text-sm mt-1 text-gray-500">Select a file from the explorer to start editing</p>
                   </div>
                 </div>
               )}
            </div>
          </div>

              {/* Bottom Panel (Terminal / Console) */}
          <div
            className={cn(
              "flex-shrink-0 border-t border-[#30363d] bg-[#0d1117] flex flex-col transition-all duration-300",
              !showTerminal && "hidden"
            )}
            style={{ height: isBottomExpanded ? '60vh' : terminalHeight }}
          >
            <div 
              onMouseDown={(e) => {
                if (isBottomExpanded) setIsBottomExpanded(false);
                startResizing('terminal')(e);
              }}
              className="h-1 bg-[#21262d] hover:bg-blue-500 cursor-row-resize transition-colors flex-shrink-0 z-10"
            />
            <div className="flex-1 min-h-0 w-full relative">
               <BottomPanel 
                    onClose={toggleTerminal} 
                    isExpanded={isBottomExpanded} 
                    onToggleExpand={() => setIsBottomExpanded(prev => !prev)}
                />
            </div>
          </div>

        </div>

        {/* Preview */}
        {/* Preview - Always rendered but hidden when toggled off to preserve state */}
        <div className={cn("flex flex-row flex-shrink-0 h-full", !showPreview && "hidden")}>
             <div 
               onMouseDown={startResizing('preview')}
               className="w-1 bg-[#21262d] hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0 z-10 h-full"
             />
             <div style={{ width: previewWidth }} className="flex-shrink-0 border-l border-[#21262d] h-full">
               <PreviewPanel />
             </div>
        </div>

        {/* Collaboration Panel (Chat or Whiteboard) */}
        {showCollaboration && (
          <>
            <div 
               onMouseDown={startResizing('collaboration')}
               className="w-1 bg-[#21262d] hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0 z-10"
             />
            <div style={{ width: collaborationWidth }} className="flex-shrink-0 border-l border-[#21262d]">
              {showChat && <ChatPanel />}
              {showWhiteboard && <WhiteboardPanel />}
            </div>
          </>
        )}

      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
