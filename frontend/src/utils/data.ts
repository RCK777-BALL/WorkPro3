 import type { User } from '@/types';
 

export interface TeamMember extends User {
  phone: string;
  /** Identifier of this member's manager */
  managerId: string | null;
}

export const teamMembers: TeamMember[] = [
  {
    id: 'TM002',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    role: 'general_manager',
    department: 'Operations',
    avatar: 'https://i.pravatar.cc/150?u=sarah',
    phone: '555-0102',
    managerId: null,
  },
  {
    id: 'TM001',
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    role: 'assistant_general_manager',
    department: 'Maintenance',
    avatar: 'https://i.pravatar.cc/150?u=michael',
    phone: '555-0101',
    managerId: 'TM002',
  },
  {
    id: 'TM003',
    name: 'David Wilson',
    email: 'david.wilson@example.com',
    role: 'technical_team_member',
    department: 'Electrical',
    avatar: 'https://i.pravatar.cc/150?u=david',
    phone: '555-0103',
    managerId: 'TM001',
  },
];

