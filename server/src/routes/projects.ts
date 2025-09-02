import { Router, Response } from 'express';
import { z } from 'zod';
import { Project } from '../models/Project';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  template: z.enum(['react', 'node', 'vanilla', 'nextjs', 'vue']),
  isPublic: z.boolean().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  files: z.record(z.any()).optional(),
  isPublic: z.boolean().optional(),
});

// Get all projects for current user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.userId },
        { collaborators: req.userId },
      ],
    })
      .sort({ lastOpenedAt: -1 })
      .limit(50)
      .populate('owner', 'name email avatar')
      .lean();

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('collaborators', 'name email avatar');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check access
    const isOwner = req.userId && project.owner._id.toString() === req.userId;
    const isCollaborator = req.userId && project.collaborators.some(
      (c: any) => c._id.toString() === req.userId
    );
    
    if (!project.isPublic && !isOwner && !isCollaborator) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update last opened
    if (isOwner || isCollaborator) {
      await Project.findByIdAndUpdate(req.params.id, { lastOpenedAt: new Date() });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = createProjectSchema.parse(req.body);

    const project = new Project({
      ...data,
      owner: req.userId,
      files: {}, // Will be populated by WebContainer
    });

    await project.save();
    await project.populate('owner', 'name email avatar');

    res.status(201).json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateProjectSchema.parse(req.body);
    
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ owner: req.userId }, { collaborators: req.userId }],
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    Object.assign(project, data);
    await project.save();
    await project.populate('owner', 'name email avatar');

    res.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Save project files
router.post('/:id/save', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { files } = req.body;
    
    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [{ owner: req.userId }, { collaborators: req.userId }],
      },
      { $set: { files } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project saved', project });
  } catch (error) {
    console.error('Save project error:', error);
    res.status(500).json({ error: 'Failed to save project' });
  }
});

// Delete project
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      owner: req.userId, // Only owner can delete
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Add collaborator
router.post('/:id/collaborators', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Find user by email
    const { User } = await import('../models/User');
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (project.collaborators.includes(user._id)) {
      return res.status(400).json({ error: 'User is already a collaborator' });
    }

    project.collaborators.push(user._id);
    await project.save();

    res.json({ message: 'Collaborator added' });
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

export default router;
