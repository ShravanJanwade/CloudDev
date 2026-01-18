import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { connectDatabase } from './config/database';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import roomRoutes from './routes/rooms';
import fileRoutes from './routes/files';
import chatRoutes from './routes/chats';
import whiteboardRoutes from './routes/whiteboards';
import { setupCollaborationHandlers } from './socket/collaboration';
import { setupRoomHandlers } from './socket/rooms';

import { requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Request logging
app.use(requestLogger);

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const isVercel = origin.endsWith('.vercel.app');
    const isAllowed = allowedOrigins.includes(origin);

    if (isAllowed || isVercel) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Socket.io setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Setup socket handlers
setupCollaborationHandlers(io);
setupRoomHandlers(io);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/whiteboards', whiteboardRoutes);

// Root route
app.get('/', (req: express.Request, res: express.Response) => {
  res.json({ status: 'active', message: 'CloudDev API is running' });
});

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API info
app.get('/api', (req: express.Request, res: express.Response) => {
  res.json({
    name: 'CloudDev API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      projects: '/api/projects',
      rooms: '/api/rooms',
      files: '/api/files',
      chats: '/api/chats',
      whiteboards: '/api/whiteboards',
    },
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler as express.ErrorRequestHandler);

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    httpServer.listen(PORT, () => {
      console.log('╔══════════════════════════════════════════╗');
      console.log('║                                          ║');
      console.log('║   🚀 CloudDev Server Running!            ║');
      console.log('║                                          ║');
      console.log(`║   📡 HTTP:   http://localhost:${PORT}       ║`);
      console.log(`║   � Socket: ws://localhost:${PORT}         ║`);
      console.log('║   📦 MongoDB: Connected                  ║');
      console.log('║                                          ║');
      console.log('╚══════════════════════════════════════════╝');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io, app };
export default app;
