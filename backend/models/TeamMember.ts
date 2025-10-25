/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Model, Types, type HydratedDocument } from 'mongoose';

export interface ITeamMember {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role:
    | 'general_manager'
    | 'assistant_general_manager'
    | 'operations_manager'
    | 'department_leader'
    | 'assistant_department_leader'
    | 'area_leader'
    | 'team_leader'
    | 'team_member'
    | 'technical_team_member'
    | 'admin'
    | 'supervisor'
    | 'manager';
  department: Types.ObjectId;
  managerId?: Types.ObjectId;
  employeeId: string;
  tenantId: Types.ObjectId;
}

export type TeamMemberDocument = HydratedDocument<ITeamMember>;

const teamMemberSchema = new Schema<ITeamMember>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: [
        'general_manager',
        'assistant_general_manager',
        'operations_manager',
        'department_leader',
        'assistant_department_leader',
        'area_leader',
        'team_leader',
        'team_member',
        'technical_team_member',
        'admin',
        'supervisor',
        'manager',
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
 
const TeamMember: Model<ITeamMember> = mongoose.model<ITeamMember>(
  'TeamMember',
  teamMemberSchema,
);

export default TeamMember;
