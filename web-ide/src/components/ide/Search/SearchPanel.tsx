
'use client';

import { Search, Loader2, FileCode, ChevronRight, ChevronDown } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { useFileSystem, SearchResult } from '@/hooks/useFileSystem';
import { useEditorStore } from '@/stores/editorStore';

export function SearchPanel() {
  const [query, setQuery] = useState(''); // Raw query state
  const [debouncedQuery, setDebouncedQuery] = useState(''); // Debounced query
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const { searchFiles } = useFileSystem();
  const { openFile } = useEditorStore();
  
  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Execute search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const searchResults = await searchFiles(debouncedQuery);
        setResults(searchResults);
        // Expand all by default
        setExpandedFiles(new Set(searchResults.map(r => r.path)));
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery, searchFiles]);

  const toggleFile = (path: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFiles(newExpanded);
  };

  const handleResultClick = (path: string, line?: number) => {
    // For now we just open the file.
    // In a real impl, we would want to scroll to the line.
    // EditorStore doesn't support scrolling to line yet, but we can at least open it.
    
    // We need file content properly. OpenFile will check existing or we might need to fetch content?
    // useEditorStore openFile expects content. 
    // Usually FileExplorer fetches content before opening.
    // Let's assume we need to handle that or rely on editor loading mechanism?
    // Ideally we assume the editor fetches content if not provided, OR we fetch it here.
    // But EditorStore::openFile requires content.
    // Let's rely on EditorStore logic being robust or fetch it.
    // Actually IDELayout handles loading content if activeFile changes? 
    // IDELayout::activeFile just sets local state.
    // Let's check EditorStore again. openFile takes OpenFile object.
    
    // Simplification: We will call a helper that might exist or we fetch content here.
    // Actually, let's just use useFileSystem to read context first.
    openFileFromSearch(path, line);
  };

  const openFileFromSearch = async (path: string, line?: number) => {
    try {
        // We know we are inside a client component with access to filesystem
        // Re-importing getWebContainer wouldn't work easily inside here if we didn't export it
        // typically. But we are in the same hook context technically? No.
        // We can just add a helper in useFileSystem or just fetch it here via a new hook call?
        // Wait, we have searchFiles but not readFile exposed? We do!
        // We need to bring in readFile from useFileSystem
        // But hook rules... we can't call hook conditionally.
        // We need to destructure readFile from the hook above.
        // Let's restructure the component to get readFile.
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <SearchPanelContent 
        query={query} 
        setQuery={setQuery} 
        results={results} 
        isSearching={isSearching}
        expandedFiles={expandedFiles}
        toggleFile={toggleFile}
        onOpen={handleResultClick}
    />
  );
}

// Split content for cleaner logic with hooks
function SearchPanelContent({ 
  query, setQuery, results, isSearching, expandedFiles, toggleFile, onOpen 
}: any) {
    const { readFile } = useFileSystem(); // separate instance but shares WebContainer singleton
    const { openFile } = useEditorStore();

    const handleOpen = async (path: string, line?: number) => {
        try {
            const content = await readFile(path);
            const name = path.split('/').pop() || '';
            openFile({
                path,
                name,
                content,
                isDirty: false
            });
            // TODO: Scroll to line
        } catch (e) {
            console.error("Failed to open file", e);
        }
    };

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
        <div className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-[#21262d] flex items-center justify-between">
            <span>Search</span>
            {isSearching && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
        </div>
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
            <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search" 
                    className="w-full bg-[#010409] border border-[#30363d] rounded-md py-1.5 pl-9 pr-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    autoFocus
                />
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4">
                {results.length === 0 && query.length >= 2 && !isSearching && (
                    <div className="text-center text-gray-500 text-sm mt-8">
                        No results found.
                    </div>
                )}
                
                {query.length < 2 && (
                    <div className="text-center text-gray-500 text-xs mt-4">
                        Type at least 2 characters to search.
                    </div>
                )}

                <div className="space-y-1">
                    {results.map((result: SearchResult) => (
                        <div key={result.path} className="flex flex-col">
                            <button 
                                onClick={() => toggleFile(result.path)}
                                className="flex items-center gap-1.5 px-2 py-1 hover:bg-[#21262d] rounded text-left group"
                            >
                                {expandedFiles.has(result.path) ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                                )}
                                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-sm text-gray-300 truncate font-mono">
                                    {result.path.split('/').pop()}
                                </span>
                                <span className="text-xs text-gray-600 ml-auto truncate max-w-[100px]">
                                    {result.path.split('/').slice(0, -1).join('/')}
                                </span>
                            </button>
                            
                            {expandedFiles.has(result.path) && (
                                <div className="ml-4 pl-2 border-l border-[#30363d] mt-0.5 space-y-0.5">
                                    {/* Allow clicking the file entry itself if no matches (filename match) */}
                                    {result.matches.length === 0 && (
                                        <button 
                                            onClick={() => handleOpen(result.path)}
                                            className="w-full text-left px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-[#21262d] rounded truncate"
                                        >
                                            Filename match
                                        </button>
                                    )}

                                    {result.matches.map((match, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleOpen(result.path, match.line)}
                                            className="w-full text-left px-2 py-1 group hover:bg-[#21262d] rounded flex items-start gap-2"
                                        >
                                            <span className="text-xs text-gray-500 whitespace-nowrap pt-0.5 min-w-[24px]">
                                                {match.line}:
                                            </span>
                                            <span className="text-xs text-gray-400 font-mono truncate group-hover:text-white">
                                                {match.content}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}
