/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Model, Types, type HydratedDocument } from 'mongoose';

export interface ITeamMember {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role:
    | 'global_admin'
    | 'plant_admin'
    | 'department_leader'
    | 'area_leader'
    | 'team_leader'
    | 'team_member'
    | 'general_manager'
    | 'assistant_general_manager'
    | 'operations_manager'
    | 'assistant_department_leader'
    | 'technical_team_member'
    | 'admin'
    | 'supervisor'
    | 'manager';
  department: Types.ObjectId;
  managerId?: Types.ObjectId;
  employeeId: string;
  tenantId: Types.ObjectId;
  plant?: Types.ObjectId;
  status?: string;
}

export type TeamMemberDocument = HydratedDocument<ITeamMember>;

const teamMemberSchema = new Schema<ITeamMember>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: [
        'global_admin',
        'plant_admin',
        'department_leader',
        'area_leader',
        'team_leader',
        'team_member',
        'general_manager',
        'assistant_general_manager',
        'operations_manager',
        'assistant_department_leader',
        'technical_team_member',
        'admin',
        'supervisor',
        'manager',
      ],
      required: true,
      default: 'team_member',
    },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    managerId: { type: Schema.Types.ObjectId, ref: 'TeamMember' },
    employeeId: { type: String, required: true, unique: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', index: true },
    status: { type: String, default: 'Active' },
  },
  { timestamps: true }
);
 
const TeamMember: Model<ITeamMember> = mongoose.model<ITeamMember>(
  'TeamMember',
  teamMemberSchema,
);

export default TeamMember;
