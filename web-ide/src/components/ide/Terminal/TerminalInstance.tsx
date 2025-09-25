
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { getWebContainer, isWebContainerReady } from '@/lib/webcontainer/instance';
import 'xterm/css/xterm.css';

interface TerminalInstanceProps {
  onData?: (data: string) => void;
  shouldAutoRun?: boolean;
}

export function TerminalInstance({ onData, shouldAutoRun = false }: TerminalInstanceProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const shellProcessRef = useRef<any>(null);
  const [status, setStatus] = useState<'waiting' | 'connecting' | 'connected' | 'error'>('waiting');
  const initAttempts = useRef(0);

  const initTerminal = useCallback(() => {
    const container = terminalRef.current;
    if (!container) return false;
    if (xtermRef.current) return true; // Already initialized
    
    // Wait for container to have dimensions
    const rect = container.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) {
      return false; // Container not ready
    }

    console.log('[Terminal] Initializing xterm with dimensions:', rect.width, rect.height);

    // Initialize xterm with GitHub-dark theme
    const terminal = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, monospace',
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowProposedApi: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(container);
    
    // Force fit after opening
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.log('[Terminal] Initial fit error:', e);
      }
    });

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.write('\x1b[38;2;88;166;255m● Connecting to WebContainer...\x1b[0m\r\n');
    setStatus('connecting');

    // Connect to shell
    connectShell(terminal);
    
    return true;
  }, []);

  // Connect to WebContainer shell
  const connectShell = useCallback(async (terminal: Terminal) => {
    try {
      // Wait for WebContainer to be ready
      let attempts = 0;
      while (!isWebContainerReady() && attempts < 30) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
      
      const container = await getWebContainer();
      
      terminal.write('\x1b[38;2;63;185;80m✓ Connected to WebContainer\x1b[0m\r\n\r\n');
      
      const shellProcess = await container.spawn('jsh', {
        terminal: {
          cols: terminal.cols || 80,
          rows: terminal.rows || 24,
        },
      });

      shellProcessRef.current = shellProcess;
      setStatus('connected');

      // Pipe shell output to terminal
      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        })
      ).catch((err: Error) => {
        console.log('[Terminal] Output stream closed:', err.message);
      });

      // Pipe terminal input to shell
      const input = shellProcess.input.getWriter();
      terminal.onData((data) => {
        input.write(data).catch(() => {});
        onData?.(data);
      });

      // Handle resize
      terminal.onResize(({ cols, rows }) => {
        try {
          shellProcess.resize({ cols, rows });
        } catch (e) {
          // Ignore resize errors
        }
      });

      // Fit again now that shell is connected
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          // Ignore
        }
      }

      // Auto-run npm install && npm run dev after a brief delay
      // Auto-run npm install && npm run dev if requested
      if (shouldAutoRun) {
        setTimeout(async () => {
          try {
            // Check if package.json exists (meaning we have a project to run)
            try {
              await container.fs.readFile('/package.json', 'utf-8');
            } catch {
              // No package.json, don't auto-run
              return;
            }
            
            terminal.write('\r\n\x1b[38;2;88;166;255m● Auto-running: npm install && npm run dev\x1b[0m\r\n\r\n');
            input.write('npm install && npm run dev\n');
          } catch (e) {
            console.log('[Terminal] Auto-run skipped:', e);
          }
        }, 1000);
      }
      
    } catch (err) {
      console.error('[Terminal] Shell connection error:', err);
      terminal.write('\r\n\x1b[38;2;255;123;114m✖ Failed to connect to shell\x1b[0m\r\n');
      terminal.write('\x1b[38;2;110;118;129mThe WebContainer may still be booting. Please wait...\x1b[0m\r\n');
      setStatus('error');
      
      // Retry connection after delay
      setTimeout(() => {
        if (xtermRef.current) {
          terminal.write('\r\n\x1b[38;2;88;166;255m● Retrying connection...\x1b[0m\r\n');
          setStatus('connecting');
          connectShell(terminal);
        }
      }, 3000);
    }
  }, [onData]);

  // Initialize on mount with retry logic
  useEffect(() => {
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout>;

    const tryInit = () => {
      if (!mounted) return;
      
      const success = initTerminal();
      if (!success && initAttempts.current < 20) {
        initAttempts.current++;
        retryTimer = setTimeout(tryInit, 200);
      }
    };

    // Start trying to init after a brief delay to let layout settle
    retryTimer = setTimeout(tryInit, 100);

    return () => {
      mounted = false;
      clearTimeout(retryTimer);
    };
  }, [initTerminal]);

  // Handle container resize
  useEffect(() => {
    const container = terminalRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      // Check if container is actually visible in DOM
      if (!container.offsetParent) {
        return;
      }

      for (const entry of entries) {
        if (entry.contentRect.width === 0 || entry.contentRect.height === 0) {
          return;
        }
      }

      // Try to init if not yet initialized
      if (!xtermRef.current) {
        initTerminal();
        return;
      }

      // Fit terminal to new size
      if (fitAddonRef.current) {
        requestAnimationFrame(() => {
          try {
            // Double check visibility before fitting
            if (!container.offsetParent) return;
            
            const dims = fitAddonRef.current?.proposeDimensions();
            if (dims && dims.cols && dims.rows && dims.cols > 1 && dims.rows > 1) {
              fitAddonRef.current?.fit();
              
              // Sync shell size
              if (shellProcessRef.current) {
                shellProcessRef.current.resize({ cols: dims.cols, rows: dims.rows });
              }
            }
          } catch (e) {
            // Ignore fit errors
          }
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [initTerminal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      xtermRef.current?.dispose();
      xtermRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={terminalRef} 
      className="h-full w-full bg-[#0d1117] overflow-hidden"
      style={{ minWidth: 200, minHeight: 100 }}
    />
  );
}
