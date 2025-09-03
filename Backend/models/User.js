import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
// ✅ Schema definition
const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['admin', 'manager', 'technician', 'viewer'],
        default: 'viewer',
    },
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    employeeId: { type: String, required: true, unique: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
    },
    colorScheme: {
        type: String,
        default: 'default',
    },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
}, { timestamps: true });
// ✅ Password hashing
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    }
    catch (err) {
        next(err);
    }
});
// ✅ Export model
const User = mongoose.model('User', userSchema);
export default User;
