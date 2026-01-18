
'use client';
import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api/client';
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
        if (!isRoomMode || !projectId) return;

        async function initCollaboration() {
            let actualRoomId = projectId;

            // If we are on the /editor/new route, we need to create a real room
            // and redirect to its code so others can join.
            if (projectId === 'new') {
                try {
                    console.log('[Collab] Creating real room for "new" session...');
                    const result = await api.createRoom({ 
                        name: templateName ? `${templateName} Project` : 'Collaborative Project',
                        template: templateName
                    });

                    if (result.data?.room?.code) {
                        actualRoomId = result.data.room.code;
                        // Silently update the URL so sharing works
                        window.history.replaceState(null, '', `/editor/${actualRoomId}?room=true${templateName ? `&template=${templateName}` : ''}`);
                    }
                } catch (err) {
                    console.error('[Collab] Failed to create persistent room:', err);
                    // Fallback to 'new' but it might not be shareable
                }
            }

            // use correct URL from environment variables
            const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
            const userName = `User-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
            
            console.log('[Collab] Connecting to:', socketUrl);
            connect(socketUrl, userName);
            
            // Join room after short delay to ensure connection
            setTimeout(() => {
                joinRoom(actualRoomId);
            }, 800);
        }

        initCollaboration();
    }, [isRoomMode, projectId, templateName, connect, joinRoom]);

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
