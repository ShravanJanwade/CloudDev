import { create } from 'zustand';

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
}

interface EditorState {
  openFiles: OpenFile[];
  activeFile: string | null;
  modifiedFiles: Set<string>;
  
  openFile: (file: OpenFile) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileDirty: (path: string, isDirty: boolean) => void;
  markFileModified: (path: string) => void;
  clearModified: (path: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openFiles: [],
  activeFile: null,
  modifiedFiles: new Set(),

  openFile: (file) => {
    const { openFiles } = get();
    const exists = openFiles.find(f => f.path === file.path);
    
    if (exists) {
      set({ activeFile: file.path });
    } else {
      set({
        openFiles: [...openFiles, file],
        activeFile: file.path,
      });
    }
  },

  closeFile: (path) => {
    const { openFiles, activeFile, modifiedFiles } = get();
    const newFiles = openFiles.filter(f => f.path !== path);
    
    let newActive = activeFile;
    if (activeFile === path) {
      const index = openFiles.findIndex(f => f.path === path);
      newActive = newFiles[Math.max(0, index - 1)]?.path || null;
    }
    
    // Remove from modifiedFiles if closing
    const newModified = new Set(modifiedFiles);
    newModified.delete(path);
    
    set({ openFiles: newFiles, activeFile: newActive, modifiedFiles: newModified });
  },

  setActiveFile: (path) => set({ activeFile: path }),

  updateFileContent: (path, content) => {
    set((state) => ({
      openFiles: state.openFiles.map(f =>
        f.path === path ? { ...f, content } : f
      ),
    }));
  },

  markFileDirty: (path, isDirty) => {
    set((state) => ({
      openFiles: state.openFiles.map(f =>
        f.path === path ? { ...f, isDirty } : f
      ),
    }));
  },

  markFileModified: (path) => {
    set((state) => ({
      modifiedFiles: new Set(state.modifiedFiles).add(path),
    }));
  },

  clearModified: (path) => {
    set((state) => {
      const newModified = new Set(state.modifiedFiles);
      newModified.delete(path);
      return { modifiedFiles: newModified };
    });
  },
}));

