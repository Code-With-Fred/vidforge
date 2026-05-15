import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVideo extends Document {
  topic: string;
  script: string;
  voiceover_path: string;
  video_path: string;
  thumbnail_path: string;
  title: string;
  description: string;
  tags: string[];
  status: 'draft' | 'rendering' | 'ready' | 'posted';
  youtube_url: string;
  youtube_id: string;
  created_at: Date;
}

const VideoSchema = new Schema<IVideo>({
  topic: { type: String, required: true },
  script: { type: String, default: '' },
  voiceover_path: { type: String, default: '' },
  video_path: { type: String, default: '' },
  thumbnail_path: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  tags: { type: [String], default: [] },
  status: {
    type: String,
    enum: ['draft', 'rendering', 'ready', 'posted'],
    default: 'draft',
  },
  youtube_url: { type: String, default: '' },
  youtube_id: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
});

// Add indexes for frequently queried fields
VideoSchema.index({ created_at: -1 });
VideoSchema.index({ status: 1 });
VideoSchema.index({ youtube_url: 1 });
VideoSchema.index({ status: 1, created_at: -1 }); // Compound index for dashboard queries

const Video: Model<IVideo> =
  mongoose.models.Video || mongoose.model<IVideo>('Video', VideoSchema);

export default Video;
