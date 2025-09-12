
'use client';
import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { IDELayout } from '@/components/ide/IDELayout';
import { templates, TemplateKey } from '@/lib/utils/templates';
import { mountFiles, getWebContainer, cleanFileSystem } from '@/lib/webcontainer/instance';
import { useFileSystem } from '@/hooks/useFileSystem';
import { useCollaborationStore } from '@/stores/collaborationStore';

export default function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
    const searchParams = useSearchParams();
    const templateName = searchParams.get('template') as TemplateKey;
    const isRoomMode = searchParams.get('room') === 'true';
    const { refreshFiles } = useFileSystem();
    const [mounted, setMounted] = useState(false);
    
    const { connect, joinRoom } = useCollaborationStore();
    
    // Unwrap params if needed, though mostly using searchParams for template
    const { projectId } = use(params);

    // Connect to collaboration server if in room mode
    useEffect(() => {
        if (isRoomMode && projectId) {
            // Generate a user name (could be from auth in future)
            const userName = `User-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
            connect('http://localhost:3001', userName);
            
            // Join room after short delay to ensure connection
            setTimeout(() => {
                joinRoom(projectId);
            }, 1000);
        }
    }, [isRoomMode, projectId, connect, joinRoom]);

    useEffect(() => {
        let mountedInEffect = true;
        
        async function init() {
            if (mounted) return;
            try {
                // Ensure booted - getWebContainer handles the boot promise
                await getWebContainer();

                if (templateName && templates[templateName]) {
                    console.log('[Editor] Mounting template:', templateName);
                    
                    // Clean existing files first to prevent stale content from previous sessions
                    await cleanFileSystem();
                    
                    await mountFiles(templates[templateName].files);
                    
                    if (!mountedInEffect) return;
                    setMounted(true);
                    
                    // Small delay before refreshing files
                    setTimeout(async () => {
                        if (mountedInEffect) {
                            await refreshFiles();
                        }
                    }, 500);
                }
            } catch (err) {
                console.error('[Editor] Failed to mount template:', err);
            }
        }
        
        init();
        
        return () => { mountedInEffect = false; };
    }, [templateName, mounted, refreshFiles]);

    return <IDELayout />;
}
