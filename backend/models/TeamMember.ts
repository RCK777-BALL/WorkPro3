/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

 
export interface ITeamMember extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role:
    | 'admin'
    | 'supervisor'
    | 'department_leader'
    | 'area_leader'
    | 'team_leader'
    | 'team_member';
  department: Types.ObjectId;
  managerId?: Types.ObjectId;
  employeeId: string;
  tenantId: Types.ObjectId;
}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: [
        'admin',
        'supervisor',
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
 
  },
  { timestamps: true }
);
 
const TeamMember: Model<ITeamMember> = mongoose.model<ITeamMember>('TeamMember', teamMemberSchema);
 
export default TeamMember;
