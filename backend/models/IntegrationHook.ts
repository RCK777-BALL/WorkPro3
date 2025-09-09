import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IntegrationHookDocument extends Document {
  name: string;
  type: 'webhook' | 'sap' | 'powerbi';
  url?: string;
  events: string[];
  createdAt: Date;
}

const integrationHookSchema = new Schema<IntegrationHookDocument>({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['webhook', 'sap', 'powerbi'] },
  url: { type: String },
  events: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

integrationHookSchema.index({ type: 1, name: 1 });

const IntegrationHook: Model<IntegrationHookDocument> =
  mongoose.model<IntegrationHookDocument>(
    'IntegrationHook',
    integrationHookSchema,
  );

export default IntegrationHook;
