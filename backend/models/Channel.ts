import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ChannelDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  isDirect: boolean;
  members: Types.ObjectId[];
  createdBy: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const channelSchema = new Schema<ChannelDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    isDirect: { type: Boolean, default: false },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  },
  { timestamps: true }
);

channelSchema.index({ tenantId: 1 });

const Channel: Model<ChannelDocument> = mongoose.model<ChannelDocument>('Channel', channelSchema);

export default Channel;
