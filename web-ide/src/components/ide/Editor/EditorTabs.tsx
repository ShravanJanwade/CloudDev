
'use client';

import { useEditorStore } from '@/stores/editorStore';
import { X, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

// Get file icon color by extension
const getFileColor = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase();
  const colorMap: Record<string, string> = {
    js: 'text-yellow-400',
    jsx: 'text-cyan-400',
    ts: 'text-blue-400',
    tsx: 'text-blue-400',
    json: 'text-yellow-300',
    html: 'text-orange-400',
    css: 'text-purple-400',
    md: 'text-gray-400',
  };
  return colorMap[ext || ''] || 'text-gray-400';
};

export function EditorTabs() {
  const { openFiles, activeFile, setActiveFile, closeFile } = useEditorStore();

  if (openFiles.length === 0) {
    return (
      <div className="h-9 bg-[#010409] border-b border-[#21262d]" />
    );
  }

  return (
    <div className="flex bg-[#010409] overflow-x-auto border-b border-[#21262d] scrollbar-thin scrollbar-thumb-gray-700">
      {openFiles.map((file) => (
        <div
          key={file.path}
          className={cn(
            "group flex items-center min-w-[120px] max-w-[200px] cursor-pointer text-sm select-none transition-all duration-150",
            activeFile === file.path 
              ? "bg-[#0d1117] text-white border-t-2 border-t-blue-500" 
              : "bg-[#010409] text-gray-400 hover:bg-[#0d1117]/50 border-t-2 border-t-transparent"
          )}
          onClick={() => setActiveFile(file.path)}
        >
          <div className="flex-1 px-3 py-2 truncate flex items-center gap-2">
            <FileCode className={cn("w-4 h-4", getFileColor(file.name))} />
            <span className={cn("truncate", file.isDirty && "italic")}>{file.name}</span>
            {file.isDirty && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
          </div>
          <button
            className={cn(
              "p-1.5 mr-1 rounded-md transition-all duration-150",
              "opacity-0 group-hover:opacity-100",
              "hover:bg-[#21262d]"
            )}
            onClick={(e) => {
              e.stopPropagation();
              closeFile(file.path);
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
