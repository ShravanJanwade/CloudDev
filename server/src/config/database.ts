import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clouddev';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    // In serverless/cloud environments, we might want to log more details
    if (error instanceof Error) {
      console.error('Error Name:', error.name);
      console.error('Error Message:', error.message);
    }
    console.error('Please check your MONGODB_URI environment variable.');
    
    // Don't exit immediately in production to allow health checks to run
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

export default mongoose;
