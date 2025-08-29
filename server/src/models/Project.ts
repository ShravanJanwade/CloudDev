import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  template: string;
  owner: mongoose.Types.ObjectId;
  collaborators: mongoose.Types.ObjectId[];
  files: Record<string, any>;
  isPublic: boolean;
  lastOpenedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    template: {
      type: String,
      required: true,
      enum: ['react', 'node', 'vanilla', 'nextjs', 'vue'],
      default: 'react',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    files: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    lastOpenedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
projectSchema.index({ owner: 1, updatedAt: -1 });
projectSchema.index({ collaborators: 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
