import mongoose, { Document, Schema } from 'mongoose';

export interface IRoomParticipant {
  userId: mongoose.Types.ObjectId;
  name: string;
  color: string;
  joinedAt: Date;
}

export interface IChatMessage {
  userId: mongoose.Types.ObjectId;
  userName: string;
  message: string;
  timestamp: Date;
}

export interface IRoom extends Document {
  _id: mongoose.Types.ObjectId;
  code: string; // 6-character join code
  name: string;
  project?: mongoose.Types.ObjectId;
  host: mongoose.Types.ObjectId;
  participants: IRoomParticipant[];
  chatHistory: IChatMessage[];
  isActive: boolean;
  maxParticipants: number;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      length: 6,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      color: String,
      joinedAt: { type: Date, default: Date.now },
    }],
    chatHistory: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      userName: String,
      message: String,
      timestamp: { type: Date, default: Date.now },
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    maxParticipants: {
      type: Number,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookup by code
roomSchema.index({ code: 1 });
roomSchema.index({ host: 1, isActive: 1 });

// Generate unique room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const Room = mongoose.model<IRoom>('Room', roomSchema);
