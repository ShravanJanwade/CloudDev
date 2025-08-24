
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env from server root
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clouddev';

async function checkDb() {
  console.log('Connecting to:', MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create a temporary schema/model to force collection creation
    const TestSchema = new mongoose.Schema({ name: String, date: Date });
    const TestModel = mongoose.model('TestCollection', TestSchema);

    console.log('📝 Creating test document to force DB creation...');
    const doc = await TestModel.create({ name: 'test', date: new Date() });
    console.log('✅ Test document created:', doc._id);

    console.log('🗑️ Cleaning up test document...');
    await TestModel.deleteOne({ _id: doc._id });
    console.log('✅ Cleanup done.');
    
    console.log('🎉 Database and connection are working!');
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkDb();
