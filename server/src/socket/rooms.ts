import { Server as SocketIOServer } from 'socket.io';

interface Room {
  id: string;
  participants: Map<string, ParticipantInfo>;
  createdAt: Date;
}

interface ParticipantInfo {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; column: number };
  selection?: { start: any; end: any };
}

const rooms = new Map<string, Room>();

// Generate random color for participant
function generateColor(): string {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#06b6d4', // cyan
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function setupRoomHandlers(io: SocketIOServer) {
  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Join room
    socket.on('room:join', ({ roomId, userName }) => {
      const participantId = socket.id;
      const color = generateColor();

      // Join the socket.io room
      socket.join(roomId);

      // Get or create room
      let room = rooms.get(roomId);
      if (!room) {
        room = {
          id: roomId,
          participants: new Map(),
          createdAt: new Date()
        };
        rooms.set(roomId, room);
      }

      // Add participant
      const participant: ParticipantInfo = {
        id: participantId,
        name: userName || `User ${room.participants.size + 1}`,
        color
      };
      room.participants.set(participantId, participant);

      // Notify others in room
      socket.to(roomId).emit('room:participant-joined', {
        participant,
        participantCount: room.participants.size
      });

      // Send current participants to the new user
      socket.emit('room:participants', {
        participants: Array.from(room.participants.values()),
        roomId
      });

      console.log(`👤 ${participant.name} joined room ${roomId}`);
    });

    // Leave room
    socket.on('room:leave', ({ roomId }) => {
      handleLeaveRoom(socket.id, roomId);
    });

    // Update cursor position
    socket.on('cursor:update', ({ roomId, position }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const participant = room.participants.get(socket.id);
      if (participant) {
        participant.cursor = position;
        
        // Broadcast to others in room
        socket.to(roomId).emit('cursor:update', {
          participantId: socket.id,
          position,
          color: participant.color,
          name: participant.name
        });
      }
    });

    // Update selection
    socket.on('selection:update', ({ roomId, selection }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const participant = room.participants.get(socket.id);
      if (participant) {
        participant.selection = selection;
        
        socket.to(roomId).emit('selection:update', {
          participantId: socket.id,
          selection,
          color: participant.color
        });
      }
    });

    // Disconnecting - Access socket.rooms before they are cleared
    socket.on('disconnecting', (reason) => {
      console.log(`🔌 Client disconnecting: ${socket.id} (Reason: ${reason})`);
      
      const socketRooms = Array.from(socket.rooms);
      socketRooms.forEach(roomId => {
        if (roomId !== socket.id) {
          console.log(`clean up: removing ${socket.id} from ${roomId}`);
          handleLeaveRoom(socket.id, roomId);
        }
      });
    });

    // Disconnect (Logging only)
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // Helper function to handle leaving
  function handleLeaveRoom(socketId: string, roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socketId);
   
    room.participants.delete(socketId);

    // Notify others
    io.to(roomId).emit('room:participant-left', {
      participantId: socketId,
      participantCount: room.participants.size
    });

    // Clean up empty rooms
    if (room.participants.size === 0) {
      rooms.delete(roomId);
      console.log(`🗑️  Empty room ${roomId} deleted`);
    } else if (participant) {
      console.log(`👋 ${participant.name} left room ${roomId}`);
    }
  }
}
