import { Router, Response } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { Room } from '../models/Room';

const router = Router();

// Get chat history for a room
router.get('/:roomCode', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const room = await Room.findOne({ code: String(req.params.roomCode).toUpperCase() });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get paginated messages (newest first, then reverse for chronological order)
    const totalMessages = room.chatHistory.length;
    const messages = room.chatHistory
      .slice()
      .reverse()
      .slice(skip, skip + limitNum)
      .reverse();

    res.json({ 
      messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalMessages,
        hasMore: skip + limitNum < totalMessages
      }
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Post a chat message
router.post('/:roomCode', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { message, userName } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }

    const chatMessage = {
      userId: req.userId,
      userName: userName || 'Anonymous',
      message: message.trim(),
      timestamp: new Date()
    };

    const room = await Room.findOneAndUpdate(
      { code: String(req.params.roomCode).toUpperCase(), isActive: true },
      { 
        $push: { 
          chatHistory: {
            $each: [chatMessage],
            $slice: -500 // Keep only last 500 messages
          }
        }
      },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: 'Room not found or inactive' });
    }

    res.status(201).json({ 
      success: true,
      message: chatMessage
    });
  } catch (error) {
    console.error('Post chat message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete chat history (room host only)
router.delete('/:roomCode', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const room = await Room.findOneAndUpdate(
      { 
        code: String(req.params.roomCode).toUpperCase(),
        host: req.userId
      },
      { $set: { chatHistory: [] } },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: 'Room not found or you are not the host' });
    }

    res.json({ 
      success: true,
      message: 'Chat history cleared'
    });
  } catch (error) {
    console.error('Delete chat history error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

export default router;
