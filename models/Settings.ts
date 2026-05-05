import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  pexels_api_key: string;
  youtube_refresh_token: string;
  youtube_connected: boolean;
  ollama_model: string;
  default_voice: string;
  output_format: string;
  updated_at: Date;
}

const SettingsSchema = new Schema<ISettings>({
  pexels_api_key: { type: String, default: '' },
  youtube_refresh_token: { type: String, default: '' },
  youtube_connected: { type: Boolean, default: false },
  ollama_model: { type: String, default: 'llama3' },
  default_voice: { type: String, default: 'en-US-ChristopherNeural' },
  output_format: { type: String, default: '1920x1080' },
  updated_at: { type: Date, default: Date.now },
});

const Settings: Model<ISettings> =
  mongoose.models.Settings ||
  mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
