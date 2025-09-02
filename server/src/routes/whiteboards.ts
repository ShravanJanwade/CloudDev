import { Router, Response } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { Whiteboard } from '../models/Whiteboard';

const router = Router();

// Get whiteboard for a room
router.get('/:roomCode', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    let whiteboard = await Whiteboard.findOne({ 
      roomCode: String(req.params.roomCode).toUpperCase() 
    });
    
    // Create new whiteboard if doesn't exist
    if (!whiteboard) {
      whiteboard = new Whiteboard({
        roomCode: String(req.params.roomCode).toUpperCase(),
        strokes: []
      });
      await whiteboard.save();
    }

    res.json({ 
      whiteboard: {
        id: whiteboard._id,
        name: whiteboard.name,
        strokes: whiteboard.strokes,
        backgroundColor: whiteboard.backgroundColor,
        updatedAt: whiteboard.updatedAt
      }
    });
  } catch (error) {
    console.error('Get whiteboard error:', error);
    res.status(500).json({ error: 'Failed to fetch whiteboard' });
  }
});

// Save strokes to whiteboard
router.put('/:roomCode', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { strokes, backgroundColor, name } = req.body;

    const updateFields: Record<string, unknown> = {};
    
    if (strokes !== undefined) {
      if (!Array.isArray(strokes)) {
        return res.status(400).json({ error: 'Strokes must be an array' });
      }
      updateFields.strokes = strokes.slice(-10000); // Limit to 10k strokes
    }
    
    if (backgroundColor) {
      updateFields.backgroundColor = backgroundColor;
    }
    
    if (name) {
      updateFields.name = name.slice(0, 100);
    }

    const whiteboard = await Whiteboard.findOneAndUpdate(
      { roomCode: String(req.params.roomCode).toUpperCase() },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    res.json({ 
      success: true,
      savedAt: whiteboard.updatedAt
    });
  } catch (error) {
    console.error('Save whiteboard error:', error);
    res.status(500).json({ error: 'Failed to save whiteboard' });
  }
});

// Add a single stroke
router.post('/:roomCode/stroke', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { stroke } = req.body;

    if (!stroke || !stroke.id || !stroke.points) {
      return res.status(400).json({ error: 'Valid stroke object is required' });
    }

    const strokeData = {
      id: stroke.id,
      userId: req.userId,
      points: stroke.points,
      color: stroke.color || '#ffffff',
      size: stroke.size || 3,
      tool: stroke.tool || 'pen',
      timestamp: new Date()
    };

    const whiteboard = await Whiteboard.findOneAndUpdate(
      { roomCode: String(req.params.roomCode).toUpperCase() },
      { 
        $push: { 
          strokes: {
            $each: [strokeData],
            $slice: -10000
          }
        }
      },
      { new: true, upsert: true }
    );

    res.status(201).json({ 
      success: true,
      stroke: strokeData
    });
  } catch (error) {
    console.error('Add stroke error:', error);
    res.status(500).json({ error: 'Failed to add stroke' });
  }
});

// Clear whiteboard
router.delete('/:roomCode', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const whiteboard = await Whiteboard.findOneAndUpdate(
      { roomCode: String(req.params.roomCode).toUpperCase() },
      { $set: { strokes: [] } },
      { new: true }
    );

    if (!whiteboard) {
      return res.status(404).json({ error: 'Whiteboard not found' });
    }

    res.json({ 
      success: true,
      message: 'Whiteboard cleared'
    });
  } catch (error) {
    console.error('Clear whiteboard error:', error);
    res.status(500).json({ error: 'Failed to clear whiteboard' });
  }
});

// Undo last stroke
router.post('/:roomCode/undo', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const whiteboard = await Whiteboard.findOneAndUpdate(
      { roomCode: String(req.params.roomCode).toUpperCase() },
      { $pop: { strokes: 1 } },
      { new: true }
    );

    if (!whiteboard) {
      return res.status(404).json({ error: 'Whiteboard not found' });
    }

    res.json({ 
      success: true,
      strokeCount: whiteboard.strokes.length
    });
  } catch (error) {
    console.error('Undo stroke error:', error);
    res.status(500).json({ error: 'Failed to undo stroke' });
  }
});

export default router;
