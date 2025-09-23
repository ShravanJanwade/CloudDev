
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, ExternalLink, Smartphone, Monitor, Loader2, AlertTriangle, CheckCircle, Play, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWebContainer, isWebContainerReady } from '@/lib/webcontainer/instance';

type PreviewStatus = 'waiting' | 'loading' | 'ready' | 'timeout' | 'error';

export function PreviewPanel() {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PreviewStatus>('waiting');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [error, setError] = useState<string | null>(null);
  const [port, setPort] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    async function setupPreview() {
      try {
        // Wait for WebContainer to be ready
        let attempts = 0;
        while (!isWebContainerReady() && attempts < 60) {
          await new Promise(r => setTimeout(r, 500));
          attempts++;
        }

        if (!isWebContainerReady()) {
          if (mountedRef.current) {
            setStatus('error');
            setError('WebContainer failed to boot');
          }
          return;
        }

        const container = await getWebContainer();
        if (!mountedRef.current) return;

        setStatus('loading');
        console.log('[Preview] Setting up server-ready listener...');

        // Listen for server-ready event
        container.on('server-ready', (serverPort: number, serverUrl: string) => {
          console.log('[Preview] Server ready event received:', serverPort, serverUrl);
          if (mountedRef.current) {
            setPort(serverPort);
            setUrl(serverUrl);
            setStatus('ready');
          }
        });

        // Also listen for port events (alternative method)
        container.on('port', (portNumber: number, type: string, portUrl: string) => {
          console.log('[Preview] Port event:', portNumber, type, portUrl);
          if (type === 'open' && mountedRef.current && !url) {
            setPort(portNumber);
            setUrl(portUrl);
            setStatus('ready');
          }
        });

        // Set timeout - but extend it since npm install takes time
        setTimeout(() => {
          if (mountedRef.current && status === 'loading') {
            console.log('[Preview] Timeout waiting for server');
            setStatus('timeout');
          }
        }, 120000); // 2 minute timeout

      } catch (e) {
        console.error('[Preview] Setup error:', e);
        if (mountedRef.current) {
          setStatus('error');
          setError(e instanceof Error ? e.message : 'Failed to setup preview');
        }
      }
    }

    setupPreview();
  }, []);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current && url) {
      // Add cache buster to force reload
      const refreshUrl = url.includes('?') 
        ? `${url}&_t=${Date.now()}` 
        : `${url}?_t=${Date.now()}`;
      iframeRef.current.src = refreshUrl;
    }
  }, [url]);

  const handleOpenExternal = useCallback(() => {
    if (url) {
      // Use local preview wrapper to avoid COOP/COEP issues with new tabs
      // Encode component to safely pass through query params
      const previewUrl = `/preview?url=${encodeURIComponent(url)}`;
      console.log('[Preview] Opening external preview wrapper:', previewUrl);
      window.open(previewUrl, '_blank');
    } else {
      console.warn('[Preview] Cannot open external link: URL is null');
    }
  }, [url]);

  // Retry function for manual retry
  const handleRetry = useCallback(() => {
    setStatus('loading');
    initializingRef.current = false;
    setUrl(null);
    setPort(null);
  }, []);

  // Toggle fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const renderContent = () => {
    switch (status) {
      case 'waiting':
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-blue-500/20"></div>
              <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-gray-300 text-sm font-medium">Waiting for environment...</p>
              <p className="text-gray-500 text-xs mt-1">WebContainer is booting up</p>
            </div>
          </div>
        );
        
      case 'loading':
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-blue-500/20"></div>
              <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-gray-300 text-sm font-medium">Starting dev server...</p>
              <p className="text-gray-500 text-xs mt-1">Installing packages and starting server</p>
            </div>
          </div>
        );
        
      case 'timeout':
        return (
          <div className="flex flex-col items-center gap-4 text-center max-w-xs">
            <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-yellow-500" />
            </div>
            <div>
              <p className="text-yellow-400 font-medium">Server not detected</p>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                Please check the terminal for errors. Make sure npm packages are installed and the dev server is running.
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        );
        
      case 'error':
        return (
          <div className="flex flex-col items-center gap-4 text-center max-w-xs">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <p className="text-red-400 font-medium">Preview error</p>
              <p className="text-gray-500 text-sm mt-2">{error || 'An error occurred'}</p>
            </div>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        );
        
      case 'ready':
        return url ? (
          <div
            className={cn(
              'bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300',
              viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'
            )}
          >
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
              allow="cross-origin-isolated"
            />
          </div>
        ) : null;
        
      default:
        return (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#21262d] flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">No preview available</p>
            <p className="text-gray-500 text-sm mt-1">Run a dev server to see preview</p>
          </div>
        );
    }
  };

  return (
    <div className={cn(
      "flex flex-col bg-[#0d1117] transition-all duration-300",
      isFullscreen ? "fixed inset-0 z-50 w-screen h-screen" : "h-full w-full"
    )}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#010409] border-b border-[#21262d]">
        <button
          onClick={handleRefresh}
          disabled={status !== 'ready'}
          className="p-1.5 hover:bg-[#21262d] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
        
        <div className="flex-1 flex items-center gap-2 bg-[#21262d] rounded-md px-3 py-1 min-w-0">
          {status === 'ready' && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
          {status === 'loading' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />}
          {status === 'waiting' && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />}
          
          <input 
            readOnly
            value={url || (status === 'loading' ? 'Starting server...' : status === 'ready' ? 'Server running' : 'Waiting...')}
            className="bg-transparent border-0 outline-none text-sm text-gray-400 font-mono w-full min-w-0"
            onClick={(e) => e.currentTarget.select()}
          />
        </div>

        <div className="flex items-center gap-0.5 bg-[#21262d] rounded-md p-0.5">
          <button
            onClick={() => setViewMode('desktop')}
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'desktop' ? 'bg-[#30363d] text-white' : 'text-gray-400 hover:text-white'
            )}
            title="Desktop view"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'mobile' ? 'bg-[#30363d] text-white' : 'text-gray-400 hover:text-white'
            )}
            title="Mobile view"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        <button
            onClick={toggleFullscreen}
            className={cn(
              "p-1.5 hover:bg-[#21262d] rounded-md transition-colors",
              isFullscreen ? "text-blue-400" : "text-gray-400"
            )}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
        >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          onClick={handleOpenExternal}
          className="p-1.5 hover:bg-[#21262d] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Open in new tab (May require authentication)"
          disabled={status !== 'ready'}
        >
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Preview content */}
      <div className="flex-1 flex items-center justify-center p-4 bg-[#010409] relative overflow-hidden">
         {/* Background pattern for visual interest */}
         <div className="absolute inset-0 opacity-5 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(#30363d 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
         />
        {renderContent()}
      </div>
    </div>
  );
}
