
import { useState, useCallback } from 'react';
import { getWebContainer } from '@/lib/webcontainer/instance';

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  content?: string;
}

export interface SearchResult {
  path: string;
  matches: {
    line: number;
    content: string;
  }[];
}

export function useFileSystem() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper to read directory recursively
  const readDirectoryRecursive = async (container: any, path: string): Promise<FileNode[]> => {
    const entries = await container.fs.readdir(path, { withFileTypes: true });
    
    const nodes: FileNode[] = await Promise.all(
      entries.map(async (entry: any) => {
        const fullPath = `${path}/${entry.name}`.replace('//', '/');
        
        if (entry.isDirectory()) {
          // Optimization: Skip heavy directories
          if (['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
            return {
              name: entry.name,
              type: 'directory' as const,
              path: fullPath,
              children: [], // Don't traverse
            };
          }

          return {
            name: entry.name,
            type: 'directory' as const,
            path: fullPath,
            children: await readDirectoryRecursive(container, fullPath),
          };
        }
        
        return {
          name: entry.name,
          type: 'file' as const,
          path: fullPath,
        };
      })
    );

    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const readDirectory = useCallback(async (path: string = '/') => {
    setLoading(true);
    try {
      const container = await getWebContainer();
      const nodes = await readDirectoryRecursive(container, path);
      setFiles(nodes);
      return nodes;
    } finally {
      setLoading(false);
    }
  }, []);

  const readFile = useCallback(async (path: string): Promise<string> => {
    const container = await getWebContainer();
    return container.fs.readFile(path, 'utf-8');
  }, []);

  const writeFile = useCallback(async (path: string, content: string) => {
    const container = await getWebContainer();
    await container.fs.writeFile(path, content);
    // Refresh handled by watcher
  }, []);

  const createFile = useCallback(async (path: string) => {
    const container = await getWebContainer();
    await container.fs.writeFile(path, '');
    // Refresh handled by watcher
  }, []);

  const createDirectory = useCallback(async (path: string) => {
    const container = await getWebContainer();
    await container.fs.mkdir(path, { recursive: true });
    // Refresh handled by watcher
  }, []);

  const deleteNode = useCallback(async (path: string) => {
    const container = await getWebContainer();
    await container.fs.rm(path, { recursive: true });
    // Refresh handled by watcher
  }, []);

  const renameNode = useCallback(async (oldPath: string, newPath: string) => {
    const container = await getWebContainer();
    const content = await container.fs.readFile(oldPath, 'utf-8');
    await container.fs.writeFile(newPath, content);
    await container.fs.rm(oldPath);
    // Refresh handled by watcher
  }, []);

  const searchFiles = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query || query.length < 2) return [];
    setLoading(true);
    try {
      const container = await getWebContainer();
      const results: SearchResult[] = [];
      
      const searchRecursive = async (dirPath: string) => {
        try {
          const entries = await container.fs.readdir(dirPath, { withFileTypes: true });
          
          for (const entry of entries) {
             const fullPath = `${dirPath}/${entry.name}`.replace('//', '/');
             
             if (entry.isDirectory()) {
               if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue;
               await searchRecursive(fullPath);
             } else if (entry.isFile()) {
               const isMatchName = entry.name.toLowerCase().includes(query.toLowerCase());
               let fileMatches: {line: number, content: string}[] = [];

               // Specify binary extensions to skip reading content
               const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
               const isBinary = binaryExts.some(ext => entry.name.endsWith(ext));

               if (!isBinary) {
                 try {
                    const content = await container.fs.readFile(fullPath, 'utf-8');
                    const lines = content.split('\n');
                    
                    lines.forEach((line: string, index: number) => {
                      if (line.toLowerCase().includes(query.toLowerCase())) {
                        if (fileMatches.length < 10) { // Limit matches per file
                          fileMatches.push({ line: index + 1, content: line.trim() });
                        }
                      }
                    });
                 } catch (e) {
                   // Ignore read errors
                 }
               }
               
               if (isMatchName || fileMatches.length > 0) {
                 results.push({ path: fullPath, matches: fileMatches });
               }
             }
          }
        } catch (e) {
          console.error(`Error searching directory ${dirPath}:`, e);
        }
      };
      
      await searchRecursive('/');
      return results;
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up file watcher
  useState(() => {
    let watcher: any = null;

    const setupWatcher = async () => {
      try {
        const container = await getWebContainer();
        
        // Simple debounce for refresh
        let timeout: NodeJS.Timeout;
        const debouncedRefresh = () => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            readDirectory('/');
          }, 500); // 500ms debounce
        };

        watcher = container.fs.watch('/', { recursive: true }, (event: any, filename: any) => {
          // Ignore frequent changes in node_modules or .git to reduce noise if possible, 
          // though fs.watch might not give full path in all cases.
          // For now, just refresh.
          debouncedRefresh();
        });
      } catch (err) {
        console.error('Failed to setup fs watcher:', err);
      }
    };

    setupWatcher();

    return () => {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
    };
  });

  return {
    files,
    loading,
    readDirectory,
    readFile,
    writeFile,
    createFile,
    createDirectory,
    deleteNode,
    renameNode,
    searchFiles,
    refreshFiles: useCallback(() => readDirectory('/'), [readDirectory]),
  };
}
