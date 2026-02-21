/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@/components/common/Card';
import { Users, UserCheck, Clock, Award } from 'lucide-react';
import type { User } from '@/types';

interface TeamMetricsProps {
  teamMembers: User[];
}

const TeamMetrics: React.FC<TeamMetricsProps> = ({ teamMembers }) => {
  const totalMembers = teamMembers.length;
  const activeMembers = teamMembers.length; // In a real app, this would filter active members
  const averageResponse = '1.8h'; // This would be calculated from actual data
  const completionRate = '94.2%'; // This would be calculated from actual data

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-primary-50">
            <Users className="h-6 w-6 text-primary-700" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-500">Total Members</p>
            <p className="text-2xl font-semibold mt-1">{totalMembers}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-success-50">
            <UserCheck className="h-6 w-6 text-success-700" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-500">Active Members</p>
            <p className="text-2xl font-semibold mt-1">{activeMembers}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-warning-50">
            <Clock className="h-6 w-6 text-warning-700" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-500">Avg. Response Time</p>
            <p className="text-2xl font-semibold mt-1">{averageResponse}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-teal-50">
            <Award className="h-6 w-6 text-teal-700" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-500">Completion Rate</p>
            <p className="text-2xl font-semibold mt-1">{completionRate}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TeamMetrics;
