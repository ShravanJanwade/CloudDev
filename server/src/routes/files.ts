import { Router, Response } from 'express';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth';
import { Project } from '../models/Project';

const router = Router();

// Get files for a project
router.get('/:projectId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check access for private projects
    if (!project.isPublic) {
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const isOwner = project.owner.toString() === req.userId;
      const isCollaborator = project.collaborators.some(
        c => c.toString() === req.userId
      );
      
      if (!isOwner && !isCollaborator) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ 
      files: project.files || {},
      lastModified: project.updatedAt
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Save files for a project
router.put('/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { files } = req.body;

    if (!files || typeof files !== 'object') {
      return res.status(400).json({ error: 'Files object is required' });
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.projectId,
        $or: [
          { owner: req.userId },
          { collaborators: req.userId }
        ]
      },
      { 
        $set: { 
          files,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    res.json({ 
      success: true, 
      savedAt: project.updatedAt,
      message: 'Files saved successfully'
    });
  } catch (error) {
    console.error('Save files error:', error);
    res.status(500).json({ error: 'Failed to save files' });
  }
});

// Save a single file
router.post('/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { path, content } = req.body;

    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'File path is required' });
    }

    if (content === undefined) {
      return res.status(400).json({ error: 'File content is required' });
    }

    // Build the update path dynamically
    const updatePath = `files.${path.replace(/\./g, '\\.')}`;

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.projectId,
        $or: [
          { owner: req.userId },
          { collaborators: req.userId }
        ]
      },
      { 
        $set: { 
          [updatePath]: { file: { contents: content } },
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    res.status(201).json({ 
      success: true,
      path,
      savedAt: project.updatedAt
    });
  } catch (error) {
    console.error('Save single file error:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Delete a file
router.delete('/:projectId/:filePath(*)', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { filePath } = req.params;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Build the unset path dynamically
    const unsetPath = `files.${String(filePath).replace(/\./g, '\\.')}`;

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.projectId,
        $or: [
          { owner: req.userId },
          { collaborators: req.userId }
        ]
      },
      { 
        $unset: { [unsetPath]: '' },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    res.json({ 
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
