import { Router, Response } from 'express';
import { z } from 'zod';
import { Room, generateRoomCode } from '../models/Room';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const createRoomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  projectId: z.string().optional(),
  maxParticipants: z.number().min(2).max(20).optional(),
  template: z.string().optional(),
});

// Create room
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = createRoomSchema.parse(req.body);
    
    // Generate unique code
    let code = generateRoomCode();
    while (await Room.findOne({ code })) {
      code = generateRoomCode();
    }

    // Generate random color for host
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const room = new Room({
      code,
      name: data.name,
      project: data.projectId,
      template: data.template,
      host: req.userId,
      maxParticipants: data.maxParticipants || 10,
      participants: [{
        userId: req.userId,
        name: req.user!.name,
        color,
        joinedAt: new Date(),
      }],
    });

    await room.save();
    await room.populate('host', 'name email avatar');

    res.status(201).json({ room });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join room by code
router.post('/join/:code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const room = await Room.findOne({ 
      code: { $regex: new RegExp(`^${req.params.code}$`, 'i') },
      isActive: true,
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found or inactive' });
    }

    // Check if already in room
    const alreadyInRoom = room.participants.some(
      (p) => p.userId?.toString() === req.userId
    );

    if (alreadyInRoom) {
      return res.json({ room, message: 'Already in room' });
    }

    // Check capacity
    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Add participant
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
    const usedColors = room.participants.map(p => p.color);
    const availableColors = colors.filter(c => !usedColors.includes(c));
    const color = availableColors[0] || colors[Math.floor(Math.random() * colors.length)];

    room.participants.push({
      userId: req.user!._id,
      name: req.user!.name,
      color,
      joinedAt: new Date(),
    });

    await room.save();
    await room.populate('host', 'name email avatar');

    res.json({ room });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Guest join room by code (no authentication required)
router.post('/join-guest/:code', async (req, res) => {
  try {
    const { guestName } = req.body;
    
    if (!guestName || typeof guestName !== 'string' || guestName.trim().length < 1) {
      return res.status(400).json({ error: 'Guest name is required' });
    }

    const room = await Room.findOne({ 
      code: { $regex: new RegExp(`^${req.params.code}$`, 'i') },
      isActive: true,
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found or inactive' });
    }

    // Check capacity
    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Generate guest color
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
    const usedColors = room.participants.map(p => p.color);
    const availableColors = colors.filter(c => !usedColors.includes(c));
    const color = availableColors[0] || colors[Math.floor(Math.random() * colors.length)];

    // Generate a unique guest ID (not a real user ID)
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Note: We don't persist guest participants in MongoDB since they're temporary
    // The socket.io room handlers will manage their presence

    res.json({ 
      room: {
        code: room.code,
        name: room.name,
      },
      guest: {
        id: guestId,
        name: guestName.trim(),
        color,
      }
    });
  } catch (error) {
    console.error('Guest join room error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Get room by code
router.get('/:code', async (req, res) => {
  try {
    const room = await Room.findOne({ 
      code: { $regex: new RegExp(`^${req.params.code}$`, 'i') },
    })
      .populate('host', 'name email avatar')
      .populate('project', 'name template');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Leave room
router.post('/:code/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const room = await Room.findOneAndUpdate(
      { code: { $regex: new RegExp(`^${req.params.code}$`, 'i') } },
      { 
        $pull: { 
          participants: { userId: req.userId } 
        } 
      },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Close room if empty
    if (room.participants.length === 0) {
      room.isActive = false;
      await room.save();
    }

    res.json({ message: 'Left room' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

// Close room (host only)
router.post('/:code/close', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const room = await Room.findOneAndUpdate(
      { 
        code: { $regex: new RegExp(`^${req.params.code}$`, 'i') },
        host: req.userId,
      },
      { isActive: false },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: 'Room not found or not authorized' });
    }

    res.json({ message: 'Room closed' });
  } catch (error) {
    console.error('Close room error:', error);
    res.status(500).json({ error: 'Failed to close room' });
  }
});

// Get user's rooms
router.get('/user/active', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const rooms = await Room.find({
      isActive: true,
      'participants.userId': req.userId,
    })
      .populate('host', 'name email avatar')
      .sort({ updatedAt: -1 })
      .limit(10);

    res.json({ rooms });
  } catch (error) {
    console.error('Get user rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

export default router;
