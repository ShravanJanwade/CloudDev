
'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  FileCode,
  FileJson,
  FileType,
  Loader2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editorStore';
import { useFileSystem, FileNode } from '@/hooks/useFileSystem';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

interface FileNodeProps {
  node: FileNode;
  depth?: number;
  selectedPath: string | null;
  onSelect: (path: string, type: 'file' | 'directory') => void;
  creatingState: { type: 'file' | 'directory', parentPath: string } | null;
  onCreateConfirm: (name: string) => void;
  onCreateCancel: () => void;
}

// Enhanced file icons
const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, { icon: typeof File; color: string }> = {
    js: { icon: FileCode, color: 'text-yellow-400' },
    jsx: { icon: FileCode, color: 'text-cyan-400' },
    ts: { icon: FileCode, color: 'text-blue-400' },
    tsx: { icon: FileCode, color: 'text-blue-400' },
    json: { icon: FileJson, color: 'text-yellow-300' },
    html: { icon: FileCode, color: 'text-orange-400' },
    css: { icon: FileType, color: 'text-purple-400' },
    scss: { icon: FileType, color: 'text-pink-400' },
    md: { icon: File, color: 'text-gray-400' },
    py: { icon: FileCode, color: 'text-green-400' },
    go: { icon: FileCode, color: 'text-cyan-400' },
  };
  return iconMap[ext || ''] || { icon: File, color: 'text-gray-400' };
};

// Inline Input Component for renaming/creating
function InlineInput({ 
  initialValue = "", 
  placeholder, 
  onConfirm, 
  onCancel,
  icon: Icon,
  iconColor,
  depth 
}: { 
  initialValue?: string, 
  placeholder: string, 
  onConfirm: (val: string) => void, 
  onCancel: () => void,
  icon: any,
  iconColor: string,
  depth: number
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
        inputRef.current.focus();
        // Select all text if it's a rename (has initial value), otherwise empty
        if (initialValue) inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (value.trim()) onConfirm(value.trim());
      else onCancel();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div 
        className="flex items-center gap-1.5 px-2 py-1 mx-1"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
        <span className="w-4" /> {/* Indent for arrow space */}
        <Icon className={cn("w-4 h-4 flex-shrink-0", iconColor)} />
        <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
                // Optional: Confirm on blur? Standard behavior is usually cancel or confirm. 
                // VS Code confirms. Let's confirm if value exists.
                if (value.trim()) onConfirm(value.trim());
                else onCancel();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="bg-[#0d1117] text-sm px-1.5 py-0.5 outline-none border border-blue-500 rounded flex-1 min-w-0"
        />
    </div>
  );
}

function FileNodeComponent({ 
    node, 
    depth = 0, 
    selectedPath, 
    onSelect,
    creatingState,
    onCreateConfirm,
    onCreateCancel
}: FileNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [isRenaming, setIsRenaming] = useState(false);
  
  const { openFile, activeFile, openFiles } = useEditorStore();
  const { deleteNode, renameNode, refreshFiles, readFile } = useFileSystem();

  const isSelected = selectedPath === node.path;
  const isTargetForCreation = creatingState?.parentPath === node.path;
  const isActive = activeFile === node.path;
  const isOpen = openFiles.some(f => f.path === node.path);
  const { icon: FileIcon, color } = getFileIcon(node.name);

  // Expand if we are creating something inside this folder
  useEffect(() => {
    if (isTargetForCreation && !isExpanded) {
        setIsExpanded(true);
    }
  }, [isTargetForCreation]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path, node.type);
    
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
    } else {
      try {
        const content = await readFile(node.path);
        openFile({ path: node.path, name: node.name, content, isDirty: false });
      } catch (err) {
        console.error('Failed to read file', err);
      }
    }
  };

  const handleRename = async (newName: string) => {
    if (newName && newName !== node.name) {
      const newPath = node.path.replace(node.name, newName);
      await renameNode(node.path, newPath);
      await refreshFiles();
    }
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    if (confirm(`Delete ${node.name}?`)) {
      await deleteNode(node.path);
      await refreshFiles();
    }
  };

  if (isRenaming) {
      return (
          <InlineInput 
            initialValue={node.name}
            placeholder={node.name}
            onConfirm={handleRename}
            onCancel={() => setIsRenaming(false)}
            icon={node.type === 'directory' ? Folder : FileIcon}
            iconColor={node.type === 'directory' ? 'text-blue-400' : color}
            depth={depth}
          />
      );
  }

  return (
    <div>
    <ContextMenu>
      <ContextMenuTrigger>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded-md mx-1 transition-all duration-150',
              'hover:bg-[#21262d]',
              (isSelected || isActive) && 'bg-[#21262d] ring-1 ring-blue-500/50',
              isOpen && !isActive && 'text-blue-400'
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={handleClick}
          >
            {node.type === 'directory' ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="w-4" />
                <FileIcon className={cn('w-4 h-4 flex-shrink-0', color)} />
              </>
            )}
            
            <span className="text-sm text-gray-300 truncate select-none">{node.name}</span>
          </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="bg-[#161b22] border-[#30363d] shadow-xl">
        <ContextMenuItem onClick={() => setIsRenaming(true)} className="text-gray-300 hover:bg-[#21262d] focus:bg-[#21262d]">
          <Edit2 className="w-4 h-4 mr-2 text-yellow-400" /> Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDelete} className="text-red-400 hover:bg-red-500/20 focus:bg-red-500/20">
          <Trash2 className="w-4 h-4 mr-2" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

    {/* Render Children */}
    {node.type === 'directory' && isExpanded && (
        <div>
            {/* If creating a new file/folder INSIDE this directory (as first child for visibility) */}
            {isTargetForCreation && (
                <InlineInput 
                    placeholder={creatingState.type === 'file' ? 'New File.tsx' : 'New Folder'}
                    onConfirm={onCreateConfirm}
                    onCancel={onCreateCancel}
                    icon={creatingState.type === 'directory' ? Folder : File}
                    iconColor={creatingState.type === 'directory' ? 'text-blue-400' : 'text-gray-400'}
                    depth={depth + 1}
                />
            )}
            
            {node.children?.map((child) => (
                <FileNodeComponent
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  selectedPath={selectedPath}
                  onSelect={onSelect}
                  creatingState={creatingState}
                  onCreateConfirm={onCreateConfirm}
                  onCreateCancel={onCreateCancel}
                />
            ))}
        </div>
    )}
    </div>
  );
}

export function FileExplorer({ files }: { files: FileNode[] }) {
  const { createFile, createDirectory, refreshFiles, loading: filesLoading } = useFileSystem();
  
  // State for selection and creation
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [creatingState, setCreatingState] = useState<{
      type: 'file' | 'directory', 
      parentPath: string 
  } | null>(null);

  const handleSelect = (path: string, type: 'file' | 'directory') => {
      setSelectedPath(path);
  };

  // Determine where to create the new node based on selection
  const getCreationParent = () => {
    if (!selectedPath) return '/';
    // If a file is selected, create in its parent. If a dir is selected, create inside it.
    // We need to find the node type for selectedPath, but we don't have easy lookup map.
    // Simplification: Check if the path ends with an extension (file) or look at the tree.
    // For now, let's assume we can try to infer or search.
    // Actually, pass type in handleSelect makes this easier.
    // But wait, files prop is nested. 
    // Let's search the tree for selectedPath to know its type if we didn't store it.
    // Better: Store selectedType as well? Yes.
    return selectedPath; // Logic handled in button click
  };

  // Helper to find parent path
  const getParentPath = (path: string) => {
      const parts = path.split('/');
      parts.pop();
      return parts.join('/') || '/';
  };

  const startCreation = (type: 'file' | 'directory') => {
      let parent = '/';
      
      if (selectedPath) {
          // Flatten files to check type of selectedPath if needed, or rely on active selection logic.
          // Simplest heuristic: 
          // If we can't easily check type, we can assume:
          // If user clicked a folder, they probably want it inside.
          // If user clicked a file, they probably want it as sibling.
          // Let's rely on `onSelect` updating a ref or state of "selectedIsDirectory".
          // For now, assume if it has no extension it's a folder? No, files can lack extensions.
          // Let's traverse `files` to find selected node type? Expensive?
          // No, let's just create a `selectedType` state.
      }
      
      // Actually, let's do this: 
      // If `selectedPath` is null -> create at root (parent = '/')
      // If `selectedPath` is set -> We need to know if it's a dir. 
      // I'll add `selectedType` state.
  };

  const [selectedType, setSelectedType] = useState<'file' | 'directory' | null>(null);

  const handleCreateClick = (type: 'file' | 'directory') => {
      let parent = '/';
      if (selectedPath && selectedType) {
          if (selectedType === 'directory') {
              parent = selectedPath;
          } else {
              parent = getParentPath(selectedPath);
          }
      }
      setCreatingState({ type, parentPath: parent });
  };

  const handleCreateConfirm = async (name: string) => {
     if (!creatingState) return;
     
     const { type, parentPath } = creatingState;
     const newPath = `${parentPath === '/' ? '' : parentPath}/${name}`;
     
     try {
         if (type === 'file') {
             await createFile(newPath);
         } else {
             await createDirectory(newPath);
         }
         await refreshFiles();
     } catch (err) {
         console.error('Creation failed', err);
         alert('Failed to create. Check if name is valid.');
     } finally {
         setCreatingState(null);
     }
  };

  return (
    <div className="h-full bg-[#0d1117] flex flex-col">
       {/* Header with Actions */}
       <div className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-[#21262d] flex items-center justify-between flex-shrink-0">
         <span>Explorer</span>
         <div className="flex items-center gap-1">
            <button 
              onClick={() => handleCreateClick('file')}
              className="p-1 hover:text-white hover:bg-[#30363d] rounded transition-colors"
              title="New File"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => handleCreateClick('directory')}
              className="p-1 hover:text-white hover:bg-[#30363d] rounded transition-colors"
              title="New Folder"
            >
              <Folder className="w-3.5 h-3.5" />
            </button>
            {filesLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
         </div>
       </div>

      {/* File Tree */}
      <div 
        className="flex-1 overflow-y-auto py-2" 
        onClick={() => {
            // Deselect if clicking on empty space
            setSelectedPath(null);
            setSelectedType(null);
        }}
      >
        {/* If creating at Root level */}
        {creatingState?.parentPath === '/' && (
            <InlineInput 
                placeholder={creatingState.type === 'file' ? 'New File' : 'New Folder'}
                onConfirm={handleCreateConfirm}
                onCancel={() => setCreatingState(null)}
                icon={creatingState.type === 'directory' ? Folder : File}
                iconColor={creatingState.type === 'directory' ? 'text-blue-400' : 'text-gray-400'}
                depth={0}
            />
        )}

        {files.length === 0 && !creatingState ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm px-4">
              <Folder className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-center">No files yet</p>
            </div>
        ) : (
            files.map((file) => (
              <FileNodeComponent 
                key={file.path} 
                node={file} 
                selectedPath={selectedPath}
                onSelect={(path, type) => {
                    setSelectedPath(path);
                    setSelectedType(type);
                }}
                creatingState={creatingState}
                onCreateConfirm={handleCreateConfirm}
                onCreateCancel={() => setCreatingState(null)}
              />
            ))
        )}
      </div>
    </div>
  );
}
