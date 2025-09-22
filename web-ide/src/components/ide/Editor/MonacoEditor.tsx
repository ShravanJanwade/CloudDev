
'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { useEditorStore } from '@/stores/editorStore';
import { useFileSystem } from '@/hooks/useFileSystem';
import { useCollaborationStore } from '@/stores/collaborationStore';

interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  theme: string;
}

const SETTINGS_KEY = 'clouddev_editor_settings';

function loadSettings(): EditorSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }
  return {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    lineNumbers: true,
    minimap: true,
    theme: 'github-dark',
  };
}

interface MonacoEditorProps {
  filePath: string;
  language?: string;
}

export function MonacoEditor({ filePath, language }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const contentRef = useRef<string>(''); // Track current content for save
  const decorationsRef = useRef<string[]>([]); // Track remote decorations
  
  const { writeFile } = useFileSystem();
  const { 
    openFiles, 
    updateFileContent, 
    markFileDirty,
    markFileModified,
  } = useEditorStore();
  
  const { 
    participants, 
    updateCursor,
    updateSelection,
    updateCurrentFile,
    userName,
    roomId,
    socket
  } = useCollaborationStore();

  const [settings, setSettings] = useState<EditorSettings>(loadSettings);
  const [isSaving, setIsSaving] = useState(false);
  const isRemoteUpdate = useRef(false);
  
  // Ref to hold current save handler for stable keybinding
  const handleSaveRef = useRef<() => Promise<void>>(async () => {});

  const file = openFiles.find(f => f.path === filePath);

  // Note: We removed local socket listener for 'code:update' in favor of IDELayout global listener.
  // We needs to detect remote updates via prop changes to prevent echo loops.

  // Keep content ref updated and detect remote changes
  useEffect(() => {
    if (file) {
      if (file.content !== contentRef.current) {
          // Content changed from outside (Store update from Remote)
          // Mark as remote to prevent echo in handleChange
          isRemoteUpdate.current = true;
          contentRef.current = file.content;
      }
    }
  }, [file?.content]);

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChanged = (event: CustomEvent<EditorSettings>) => {
      setSettings(event.detail);
      
      // Apply settings to editor if it exists
      if (editorRef.current) {
        editorRef.current.updateOptions({
          fontSize: event.detail.fontSize,
          tabSize: event.detail.tabSize,
          wordWrap: event.detail.wordWrap ? 'on' : 'off',
          lineNumbers: event.detail.lineNumbers ? 'on' : 'off',
          minimap: { enabled: event.detail.minimap },
        });
        
        // Apply theme using the monaco instance ref
        if (monacoRef.current) {
          monacoRef.current.editor.setTheme(event.detail.theme);
        }
      }
    };

    window.addEventListener('clouddev:settings-changed', handleSettingsChanged as EventListener);
    
    return () => {
      window.removeEventListener('clouddev:settings-changed', handleSettingsChanged as EventListener);
    };
  }, []);

  // COLLABORATION: Generate dynamic CSS for participant cursors
  useEffect(() => {
    if (!roomId) return;

    const styleId = 'collaboration-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const css = participants.map(p => {
      const color = p.color;
      // selection background with opacity
      const selectionColor = `${color}40`; 
      
      return `
        .cursor-${p.id} {
          border-left: 2px solid ${color} !important;
          position: relative;
        }
        .cursor-${p.id}::after {
          content: '${p.name}';
          position: absolute;
          top: -16px;
          left: -2px;
          background-color: ${color};
          color: white;
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 4px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 10;
        }
        .selection-${p.id} {
          background-color: ${selectionColor} !important;
          border-radius: 2px;
        }
      `;
    }).join('\n');

    styleEl.innerHTML = css;

    return () => {
      // Cleanup styles when leaving component/room ? 
      // Maybe not needed strictly on unmount if we want persistence, but good practice
    };
  }, [participants, roomId]);

  // COLLABORATION: Handle file change notification
  useEffect(() => {
    if (roomId && filePath) {
      updateCurrentFile(filePath);
    }
  }, [roomId, filePath, updateCurrentFile]);

  // COLLABORATION: Render remote decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !roomId) return;

    const editor = editorRef.current;
    
    // Filter participants who are in the same file and not me
    const activeParticipants = participants.filter(
      p => p.currentFile === filePath && p.name !== userName
    );

    const newDecorations: any[] = [];

    activeParticipants.forEach(p => {
      if (p.cursor) {
        newDecorations.push({
          range: new monacoRef.current.Range(
            p.cursor.line, 
            p.cursor.column, 
            p.cursor.line, 
            p.cursor.column
          ),
          options: {
            className: `cursor-${p.id}`,
            stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        });
      }

      if (p.selection) {
        newDecorations.push({
          range: new monacoRef.current.Range(
            p.selection.startLine,
            p.selection.startColumn,
            p.selection.endLine,
            p.selection.endColumn
          ),
          options: {
            className: `selection-${p.id}`,
            stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        });
      }
    });

    // Update decorations (Monaco returns new IDs, we must store them to clear next time)
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

  }, [participants, filePath, roomId, userName]);

  // COLLABORATION: Setup local event listeners (in handleEditorDidMount for cleaner access)

  const handleSave = useCallback(async () => {
    if (!filePath || isSaving) return;
    
    // Get content directly from editor for most up-to-date value
    const currentContent = editorRef.current?.getValue() || contentRef.current;
    if (!currentContent && currentContent !== '') return;
    
    setIsSaving(true);
    try {
      console.log('[Editor] Saving file:', filePath);
      await writeFile(filePath, currentContent);
      markFileDirty(filePath, false);
      console.log('[Editor] File saved successfully:', filePath);
    } catch (err) {
      console.error('[Editor] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [filePath, writeFile, markFileDirty, isSaving]);

  // Update ref when handleSave changes
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define GitHub Dark theme
    monaco.editor.defineTheme('github-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'type', foreground: 'ffa657' },
        { token: 'function', foreground: 'd2a8ff' },
        { token: 'variable', foreground: 'c9d1d9' },
        { token: 'constant', foreground: '79c0ff' },
        { token: 'class', foreground: 'ffa657' },
        { token: 'interface', foreground: 'ffa657' },
        { token: 'namespace', foreground: 'ffa657' },
        { token: 'operator', foreground: 'ff7b72' },
        { token: 'parameter', foreground: 'c9d1d9' },
        { token: 'property', foreground: '7ee787' },
        { token: 'tag', foreground: '7ee787' },
        { token: 'attribute.name', foreground: '79c0ff' },
        { token: 'attribute.value', foreground: 'a5d6ff' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#c9d1d9',
        'editor.lineHighlightBackground': '#161b22',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#c9d1d9',
        'editorIndentGuide.background': '#21262d',
        'editorIndentGuide.activeBackground': '#30363d',
        'editorCursor.foreground': '#58a6ff',
        'editor.findMatchBackground': '#ffd33d44',
        'editor.findMatchHighlightBackground': '#ffd33d22',
        'editorBracketMatch.background': '#30363d',
        'editorBracketMatch.border': '#58a6ff',
        'scrollbar.shadow': '#0d1117',
        'scrollbarSlider.background': '#484f5833',
        'scrollbarSlider.hoverBackground': '#484f5855',
        'scrollbarSlider.activeBackground': '#484f5877',
        'minimap.background': '#0d1117',
      },
    });

    // Define GitHub Dark Dimmed theme
    monaco.editor.defineTheme('github-dark-dimmed', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '768390', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'f47067' },
        { token: 'string', foreground: '96d0ff' },
      ],
      colors: {
        'editor.background': '#22272e',
        'editor.foreground': '#adbac7',
      },
    });

    // Define Monokai Theme
    monaco.editor.defineTheme('monokai', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '75715e' },
        { token: 'keyword', foreground: 'f92672' },
        { token: 'string', foreground: 'e6db74' },
        { token: 'number', foreground: 'ae81ff' },
        { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
        { token: 'function', foreground: 'a6e22e' },
        { token: 'variable', foreground: 'f8f8f2' },
        { token: 'operator', foreground: 'f92672' },
        { token: 'tag', foreground: 'f92672' },
        { token: 'attribute.name', foreground: 'a6e22e' },
      ],
      colors: {
        'editor.background': '#272822',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#3e3d32',
        'editor.selectionBackground': '#49483e',
        'editor.inactiveSelectionBackground': '#353b45',
        'editorLineNumber.foreground': '#90908a',
        'editorLineNumber.activeForeground': '#f8f8f2',
      },
    });

    // Define Dracula Theme
    monaco.editor.defineTheme('dracula', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4' },
        { token: 'keyword', foreground: 'ff79c6' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'type', foreground: '8be9fd', fontStyle: 'italic' },
        { token: 'function', foreground: '50fa7b' },
        { token: 'variable', foreground: 'f8f8f2' },
        { token: 'operator', foreground: 'ff79c6' },
        { token: 'tag', foreground: 'ff79c6' },
      ],
      colors: {
        'editor.background': '#282a36',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#44475a',
        'editor.selectionBackground': '#44475a',
        'editorLineNumber.foreground': '#6272a4',
        'editorLineNumber.activeForeground': '#f8f8f2',
      },
    });

    // Define Nord Theme
    monaco.editor.defineTheme('nord', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '616e88' },
        { token: 'keyword', foreground: '81a1c1' },
        { token: 'string', foreground: 'a3be8c' },
        { token: 'number', foreground: 'b48ead' },
        { token: 'type', foreground: '8fbcbb' },
        { token: 'function', foreground: '88c0d0' },
        { token: 'variable', foreground: 'd8dee9' },
        { token: 'operator', foreground: '81a1c1' },
      ],
      colors: {
        'editor.background': '#2e3440',
        'editor.foreground': '#d8dee9',
        'editor.lineHighlightBackground': '#3b4252',
        'editor.selectionBackground': '#434c5e',
        'editorLineNumber.foreground': '#4c566a',
        'editorLineNumber.activeForeground': '#d8dee9',
      },
    });

    // Define SynthWave 84 Theme
    monaco.editor.defineTheme('synthwave', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '495495', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'f97e72' },
        { token: 'string', foreground: 'ff8b39' },
        { token: 'number', foreground: 'f97e72' },
        { token: 'type', foreground: '36f9f6' },
        { token: 'function', foreground: '36f9f6' },
        { token: 'variable', foreground: 'fff7f9' },
        { token: 'operator', foreground: 'f97e72' },
      ],
      colors: {
        'editor.background': '#2b213a',
        'editor.foreground': '#b6b1b1',
        'editor.lineHighlightBackground': '#34294f',
        'editor.selectionBackground': '#ffffff30',
        'editorLineNumber.foreground': '#ffffff40',
        'editorLineNumber.activeForeground': '#ffffff80',
      },
    });

    // Define Night Owl Theme
    monaco.editor.defineTheme('night-owl', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '637777', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c792ea' },
        { token: 'string', foreground: 'ecc48d' },
        { token: 'number', foreground: 'f78c6c' },
        { token: 'type', foreground: '82aaff' },
        { token: 'function', foreground: '82aaff' },
        { token: 'variable', foreground: 'd6deeb' },
        { token: 'operator', foreground: 'c792ea' },
        { token: 'tag', foreground: '7fdbca' },
      ],
      colors: {
        'editor.background': '#011627',
        'editor.foreground': '#d6deeb',
        'editor.lineHighlightBackground': '#1d3b53',
        'editor.selectionBackground': '#1d3b53',
        'editorLineNumber.foreground': '#4b6479',
      },
    });

    // Define Solarized Dark Theme
    monaco.editor.defineTheme('solarized-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '586e75', fontStyle: 'italic' },
        { token: 'keyword', foreground: '859900' },
        { token: 'string', foreground: '2aa198' },
        { token: 'number', foreground: 'd33682' },
        { token: 'type', foreground: 'b58900' },
        { token: 'function', foreground: '268bd2' },
        { token: 'variable', foreground: '839496' },
        { token: 'operator', foreground: '859900' },
      ],
      colors: {
        'editor.background': '#002b36',
        'editor.foreground': '#839496',
        'editor.lineHighlightBackground': '#073642',
        'editor.selectionBackground': '#073642',
        'editorLineNumber.foreground': '#586e75',
        'editorLineNumber.activeForeground': '#93a1a1',
      },
    });

    // Define One Dark Pro Theme
    monaco.editor.defineTheme('one-dark-pro', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c678dd' },
        { token: 'string', foreground: '98c379' },
        { token: 'number', foreground: 'd19a66' },
        { token: 'type', foreground: 'e5c07b' },
        { token: 'function', foreground: '61afef' },
        { token: 'variable', foreground: 'abb2bf' },
        { token: 'operator', foreground: '56b6c2' },
      ],
      colors: {
        'editor.background': '#282c34',
        'editor.foreground': '#abb2bf',
        'editor.lineHighlightBackground': '#2c313a',
        'editor.selectionBackground': '#3e4451',
        'editorLineNumber.foreground': '#4b5263',
        'editorLineNumber.activeForeground': '#abb2bf',
      },
    });

    // Define Material Theme
    monaco.editor.defineTheme('material-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '546e7a', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c792ea' },
        { token: 'string', foreground: 'c3e88d' },
        { token: 'number', foreground: 'f78c6c' },
        { token: 'type', foreground: 'ffcb6b' },
        { token: 'function', foreground: '82aaff' },
        { token: 'variable', foreground: 'eeffff' },
        { token: 'operator', foreground: '89ddff' },
        { token: 'tag', foreground: 'f07178' },
      ],
      colors: {
        'editor.background': '#263238',
        'editor.foreground': '#eeffff',
        'editor.lineHighlightBackground': '#303c42',
        'editor.selectionBackground': '#354147',
        'editorLineNumber.foreground': '#546e7a',
        'editorLineNumber.activeForeground': '#eeffff',
      },
    });

    // Set current theme (ensure we use the latest from state/params if needed, 
    // though settings.theme logic in useEffect handles updates, initial load needs this)
    if (settings.theme) {
        monaco.editor.setTheme(settings.theme);
    } else {
        monaco.editor.setTheme('github-dark');
    }

    // Focus editor
    editor.focus();

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveRef.current();
    });

    // COLLABORATION: Add listeners for local cursor/selection changes
    editor.onDidChangeCursorPosition((e: any) => {
      // Only emit if we are in a room
      // We can't access current state of roomId directly reliably in closure if it changes, 
      // but roomId from outer scope is available.
      // However, to be safe and avoid stale closures if roomId changes, we might want to use a ref or check store.
      // But since handleEditorMount runs once, we rely on the component re-mounting OR we need to check store.
      // Actually useCollaborationStore gives us current state? No, it's from render scope. 
      // It's better to check if we are connected.
      
      // For simplicity, we'll check the condition inside. 
      // Note: Since this closure is created once on mount, values like 'roomId' might be stale if they change without re-mount.
      // But MonacoEditor component likely re-mounts or we should use refs.
      
      // Actually, let's use the stable store setters which we have from useCollaborationStore.
      // We'll pass the filePath as well.
      
      updateCursor({ line: e.position.lineNumber, column: e.position.column }, filePath);
    });

    editor.onDidChangeCursorSelection((e: any) => {
      updateSelection({
        startLine: e.selection.startLineNumber,
        startColumn: e.selection.startColumn,
        endLine: e.selection.endLineNumber,
        endColumn: e.selection.endColumn
      }, filePath);
    });

    // Focus editor
    editor.focus();
  };

  const handleChange: OnChange = (value) => {
    if (value !== undefined) {
      // Check for remote update to avoid echo loop
      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        contentRef.current = value;
        return;
      }

      contentRef.current = value;
      updateFileContent(filePath, value);
      markFileDirty(filePath, true);
      markFileModified(filePath);

      // Emit change to others
      if (socket && roomId) {
        socket.emit('code:update', { roomId, filePath, content: value });
      }
    }
  };

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      html: 'html',
      css: 'css',
      scss: 'scss',
      md: 'markdown',
      py: 'python',
      go: 'go',
      rs: 'rust',
      yml: 'yaml',
      yaml: 'yaml',
      sh: 'shell',
      bash: 'shell',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  if (!file) return null;

  return (
    <div className="relative h-full w-full">
    <Editor
      height="100%"
      language={language || getLanguage(filePath)}
      value={file.content}
      onMount={handleEditorMount}
      onChange={handleChange}
      options={{
        minimap: { enabled: settings.minimap, scale: 0.8, showSlider: 'mouseover' },
        fontSize: settings.fontSize,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, monospace',
        fontLigatures: true,
        lineNumbers: settings.lineNumbers ? 'on' : 'off',
        renderLineHighlight: 'line',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap ? 'on' : 'off',
        padding: { top: 16, bottom: 16 },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        cursorWidth: 2,
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true,
          highlightActiveIndentation: true,
        },
        hover: { enabled: true, delay: 300 },
        suggest: {
          showKeywords: true,
          showSnippets: true,
        },
        quickSuggestions: true,
        formatOnPaste: true,
        formatOnType: true,
        renderWhitespace: 'selection',
        folding: true,
        foldingHighlight: true,
        showFoldingControls: 'mouseover',
        matchBrackets: 'always',
        colorDecorators: true,
        linkedEditing: true,
      }}
      loading={
        <div className="flex items-center justify-center h-full bg-[#0d1117]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-4 border-blue-500/20"></div>
              <div className="absolute top-0 left-0 w-10 h-10 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
            </div>
            <p className="text-gray-400 text-sm">Loading editor...</p>
          </div>
        </div>
      }
    />
    {/* Floating Save Button */}
    <div className="absolute bottom-4 right-4 z-10">
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${
          isSaving 
            ? 'bg-blue-600/50 text-blue-200 cursor-wait' 
            : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105 active:scale-95'
        }`}
      >
        {isSaving ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>Save</span>
          </>
        )}
      </button>
    </div>
  </div>
  );
}
