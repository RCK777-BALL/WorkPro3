import mongoose, { Schema } from 'mongoose';
const teamMemberSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
        type: String,
        enum: [
            'admin',
            'manager',
            'department_leader',
            'area_leader',
            'team_leader',
            'team_member',
        ],
        required: true,
    },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    managerId: { type: Schema.Types.ObjectId, ref: 'TeamMember' },
    employeeId: { type: String, required: true, unique: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
}, { timestamps: true });
const TeamMember = mongoose.model('TeamMember', teamMemberSchema);
export default TeamMember;
