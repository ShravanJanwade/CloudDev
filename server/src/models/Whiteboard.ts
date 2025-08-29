import mongoose, { Document, Schema } from 'mongoose';

export interface IWhiteboardStroke {
  id: string;
  userId: mongoose.Types.ObjectId;
  points: number[][];
  color: string;
  size: number;
  tool: 'pen' | 'eraser' | 'highlighter';
  timestamp: Date;
}

export interface IWhiteboard extends Document {
  _id: mongoose.Types.ObjectId;
  roomCode: string;
  name: string;
  strokes: IWhiteboardStroke[];
  backgroundColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const whiteboardStrokeSchema = new Schema({
  id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  points: [[Number]],
  color: { type: String, default: '#ffffff' },
  size: { type: Number, default: 3 },
  tool: { type: String, enum: ['pen', 'eraser', 'highlighter'], default: 'pen' },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const whiteboardSchema = new Schema<IWhiteboard>(
  {
    roomCode: { 
      type: String, 
      required: true, 
      uppercase: true,
      index: true 
    },
    name: { 
      type: String, 
      default: 'Untitled Whiteboard',
      maxlength: 100
    },
    strokes: [whiteboardStrokeSchema],
    backgroundColor: {
      type: String,
      default: '#0d1117'
    }
  },
  { 
    timestamps: true 
  }
);

// Compound index for room lookups
whiteboardSchema.index({ roomCode: 1, updatedAt: -1 });

// Limit strokes to prevent memory issues
whiteboardSchema.pre('save', function(next) {
  if (this.strokes.length > 10000) {
    this.strokes = this.strokes.slice(-10000);
  }
  next();
});

export const Whiteboard = mongoose.model<IWhiteboard>('Whiteboard', whiteboardSchema);
