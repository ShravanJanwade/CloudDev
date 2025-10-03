
'use client';

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';

interface CursorPosition {
  line: number;
  column: number;
}

interface SelectionRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

interface Participant {
  id: string; // Socket ID
  userId?: string; // DB User ID
  name: string;
  color: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  currentFile?: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string | number | Date;
}

interface CollaborationState {
  socket: Socket | null;
  roomId: string | null;
  status: ConnectionStatus;
  participants: Participant[];
  chatMessages: ChatMessage[];
  userName: string;
  error: string | null;
  
  connect: (serverUrl: string, userName: string) => void;
  disconnect: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  sendChatMessage: (message: string) => void;
  updateCursor: (position: CursorPosition, filePath?: string) => void;
  updateSelection: (selection: SelectionRange | null, filePath?: string) => void;
  updateCurrentFile: (filePath: string) => void;
  clearError: () => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  socket: null,
  roomId: null,
  status: 'disconnected',
  participants: [],
  chatMessages: [],
  userName: 'Anonymous',
  error: null,

  connect: (serverUrl = SOCKET_URL, userName) => {
    const { socket: existingSocket } = get();
    if (existingSocket?.connected) return;

    set({ userName, status: 'reconnecting' });

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true // Ensure fresh connection
    });

    socket.on('connect', () => {
      console.log('✅ Connected to collaboration server');
      set({ status: 'connected', error: null });
      
      // Re-join room if we were in one
      const { roomId } = get();
      if (roomId) {
        socket.emit('room:join', { roomId, userName });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from collaboration server:', reason);
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, you need to manually reconnect
        socket.connect();
      }
      set({ status: 'disconnected' });
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      set({ status: 'error', error: err.message });
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
      set({ status: 'reconnecting' });
    });

    // Room events
    socket.on('room:participants', ({ participants }) => {
      set({ participants });
    });

    socket.on('room:participant-joined', ({ participant }) => {
      set(state => ({
        participants: [...state.participants, participant]
      }));
    });

    socket.on('room:participant-left', ({ participantId }) => {
      set(state => ({
        participants: state.participants.filter(p => p.id !== participantId)
      }));
    });

    // Chat events
    socket.on('chat:message', (message: ChatMessage) => {
      set(state => ({
        chatMessages: [...state.chatMessages, message]
      }));
    });

    socket.on('chat:history', (messages: ChatMessage[]) => {
      set({ chatMessages: messages });
    });

    // Cursor & Selection events
    socket.on('cursor:update', ({ participantId, position, filePath }) => {
      set(state => ({
        participants: state.participants.map(p =>
          p.id === participantId ? { ...p, cursor: position, currentFile: filePath || p.currentFile } : p
        )
      }));
    });

    socket.on('selection:update', ({ participantId, selection, filePath }) => {
      set(state => ({
        participants: state.participants.map(p =>
          p.id === participantId ? { ...p, selection, currentFile: filePath || p.currentFile } : p
        )
      }));
    });

    socket.on('participant:file_change', ({ participantId, filePath }) => {
      set(state => ({
        participants: state.participants.map(p => 
          p.id === participantId ? { ...p, currentFile: filePath } : p
        )
      }));
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ 
        socket: null, 
        status: 'disconnected', 
        roomId: null, 
        participants: [], 
        chatMessages: [] 
      });
    }
  },

  joinRoom: (roomId) => {
    const { socket, userName } = get();
    if (!socket) return;

    socket.emit('room:join', { roomId, userName });
    socket.emit('chat:get-history', { roomId });
    
    set({ roomId });
  },

  leaveRoom: () => {
    const { socket, roomId } = get();
    if (!socket || !roomId) return;

    socket.emit('room:leave', { roomId });
    set({ roomId: null, participants: [], chatMessages: [] });
  },

  sendChatMessage: (message) => {
    const { socket, roomId, userName } = get();
    if (!socket || !roomId) return;

    const chatMessage = {
      roomId,
      message,
      userName,
      timestamp: Date.now()
    };

    socket.emit('chat:message', chatMessage);
  },

  updateCursor: (position, filePath) => {
    const { socket, roomId } = get();
    if (!socket || !roomId) return;
    
    socket.emit('cursor:update', { roomId, position, filePath });
  },

   updateSelection: (selection, filePath) => {
    const { socket, roomId } = get();
    if (!socket || !roomId) return;
    
    socket.emit('selection:update', { roomId, selection, filePath });
  },

  updateCurrentFile: (filePath) => {
    const { socket, roomId } = get();
    if (!socket || !roomId) return;

    socket.emit('participant:file_change', { roomId, filePath });
  },

  clearError: () => set({ error: null })
}));

