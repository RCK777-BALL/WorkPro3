import mongoose, { Schema } from 'mongoose';
const roleSchema = new Schema({
    name: { type: String, required: true, unique: true },
    // Explicit array of permissions. Even though an empty array is a
    // sensible default, mark the field as required so that it is always
    // present on documents and in TypeScript typings.
    permissions: { type: [String], required: true, default: [] },
}, { timestamps: true });
const Role = mongoose.model('Role', roleSchema);
export default Role;
