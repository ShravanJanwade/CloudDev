import { Server as SocketIOServer } from 'socket.io';
import { Room } from '../models/Room';
import { Whiteboard } from '../models/Whiteboard';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

interface WhiteboardStroke {
  id: string;
  userId: string;
  points: number[][];
  color: string;
  size: number;
  tool: string;
  timestamp: Date;
}

// In-memory fallback for rooms not in DB (temporary sessions)
const roomChats = new Map<string, ChatMessage[]>();
const roomWhiteboards = new Map<string, WhiteboardStroke[]>();

export function setupCollaborationHandlers(io: SocketIOServer) {
  io.on('connection', (socket) => {
    // Chat message - persist to MongoDB
    socket.on('chat:message', async ({ roomId, message, userName }) => {
      const chatMessage: ChatMessage = {
        id: `${socket.id}-${Date.now()}`,
        userId: socket.id,
        userName: userName || 'Anonymous',
        message,
        timestamp: new Date()
      };

      try {
        // Try to persist to MongoDB
        const room = await Room.findOneAndUpdate(
          { code: roomId.toUpperCase() },
          { 
            $push: { 
              chatHistory: {
                $each: [{
                  userId: socket.id,
                  userName: userName || 'Anonymous',
                  message,
                  timestamp: new Date()
                }],
                $slice: -500 // Keep last 500 messages
              }
            }
          },
          { new: true }
        );

        if (!room) {
          // Fallback to in-memory for non-DB rooms
          const messages = roomChats.get(roomId) || [];
          messages.push(chatMessage);
          if (messages.length > 500) messages.shift();
          roomChats.set(roomId, messages);
        }
      } catch (error) {
        console.error('[Socket] Failed to persist chat message:', error);
        // Fallback to in-memory
        const messages = roomChats.get(roomId) || [];
        messages.push(chatMessage);
        roomChats.set(roomId, messages);
      }

      // Always broadcast to room
      io.to(roomId).emit('chat:message', chatMessage);
    });

    // Get chat history
    socket.on('chat:get-history', async ({ roomId }) => {
      try {
        // Try to get from MongoDB first
        const room = await Room.findOne({ code: roomId.toUpperCase() });
        if (room && room.chatHistory.length > 0) {
          socket.emit('chat:history', room.chatHistory);
          return;
        }
      } catch (error) {
        console.error('[Socket] Failed to fetch chat history from DB:', error);
      }

      // Fallback to in-memory
      const messages = roomChats.get(roomId) || [];
      socket.emit('chat:history', messages);
    });

    // Typing indicator (no persistence needed)
    socket.on('chat:typing', ({ roomId, userName, isTyping }) => {
      socket.to(roomId).emit('chat:typing', {
        userId: socket.id,
        userName,
        isTyping
      });
    });

    // Whiteboard drawing - persist to MongoDB
    socket.on('whiteboard:draw', async ({ roomId, stroke }) => {
      const whiteboardStroke: WhiteboardStroke = {
        id: stroke.id || `${socket.id}-${Date.now()}`,
        userId: socket.id,
        points: stroke.points,
        color: stroke.color || '#ffffff',
        size: stroke.size || 3,
        tool: stroke.tool || 'pen',
        timestamp: new Date()
      };

      try {
        // Persist to MongoDB
        await Whiteboard.findOneAndUpdate(
          { roomCode: roomId.toUpperCase() },
          { 
            $push: { 
              strokes: {
                $each: [whiteboardStroke],
                $slice: -10000 // Keep last 10k strokes
              }
            }
          },
          { upsert: true }
        );
      } catch (error) {
        console.error('[Socket] Failed to persist whiteboard stroke:', error);
        // Fallback to in-memory
        const strokes = roomWhiteboards.get(roomId) || [];
        strokes.push(whiteboardStroke);
        if (strokes.length > 10000) strokes.shift();
        roomWhiteboards.set(roomId, strokes);
      }

      // Broadcast to others
      socket.to(roomId).emit('whiteboard:draw', whiteboardStroke);
    });

    // Clear whiteboard
    socket.on('whiteboard:clear', async ({ roomId }) => {
      try {
        await Whiteboard.findOneAndUpdate(
          { roomCode: roomId.toUpperCase() },
          { $set: { strokes: [] } }
        );
      } catch (error) {
        console.error('[Socket] Failed to clear whiteboard in DB:', error);
      }
      
      roomWhiteboards.set(roomId, []);
      io.to(roomId).emit('whiteboard:clear');
    });

    // Get whiteboard history
    socket.on('whiteboard:get-history', async ({ roomId }) => {
      try {
        const whiteboard = await Whiteboard.findOne({ roomCode: roomId.toUpperCase() });
        if (whiteboard && whiteboard.strokes.length > 0) {
          socket.emit('whiteboard:history', whiteboard.strokes);
          return;
        }
      } catch (error) {
        console.error('[Socket] Failed to fetch whiteboard history from DB:', error);
      }

      // Fallback to in-memory
      const strokes = roomWhiteboards.get(roomId) || [];
      socket.emit('whiteboard:history', strokes);
    });

    // Undo last stroke
    socket.on('whiteboard:undo', async ({ roomId }) => {
      try {
        await Whiteboard.findOneAndUpdate(
          { roomCode: roomId.toUpperCase() },
          { $pop: { strokes: 1 } }
        );
      } catch (error) {
        console.error('[Socket] Failed to undo stroke in DB:', error);
      }

      const strokes = roomWhiteboards.get(roomId) || [];
      if (strokes.length > 0) {
        strokes.pop();
        roomWhiteboards.set(roomId, strokes);
      }

      io.to(roomId).emit('whiteboard:undo');
    });

    // File change notification (no persistence - real-time only)
    socket.on('file:change', ({ roomId, filePath, operation }) => {
      socket.to(roomId).emit('file:change', {
        filePath,
        operation,
        userId: socket.id
      });
    });

    // Code update (Real-time typing sync)
    socket.on('code:update', ({ roomId, filePath, content }) => {
      socket.to(roomId).emit('code:update', {
        filePath,
        content,
        userId: socket.id
      });
    });

    // Cursor position update
    socket.on('cursor:update', ({ roomId, position, filePath }) => {
      socket.to(roomId).emit('cursor:update', {
        participantId: socket.id,
        position,
        filePath
      });
    });

    // Selection update
    socket.on('selection:update', ({ roomId, selection, filePath }) => {
      socket.to(roomId).emit('selection:update', {
        participantId: socket.id,
        selection,
        filePath
      });
    });

    // Whiteboard cursor update
    socket.on('whiteboard:cursor', ({ roomId, x, y }) => {
      socket.to(roomId).emit('whiteboard:cursor', {
        participantId: socket.id,
        x,
        y
      });
    });

    // Participant file change (which file they are looking at)
    socket.on('participant:file_change', ({ roomId, filePath }) => {
      socket.to(roomId).emit('participant:file_change', {
        participantId: socket.id,
        filePath
      });
    });



    // Project Sync: Request (Guest -> Host)
    socket.on('project:sync:request', ({ roomId }) => {
      // Broadcast to all other clients in the room
      // Ideally, only the "host" should respond, but we rely on client logic for that
      socket.to(roomId).emit('project:sync:request', {
        requesterId: socket.id
      });
    });

    // Project Sync: Data (Host -> Guest)
    socket.on('project:sync:data', ({ roomId, targetId, files }) => {
      // Send directly to the requesting client
      io.to(targetId).emit('project:sync:data', {
        files
      });
    });
  });
}
