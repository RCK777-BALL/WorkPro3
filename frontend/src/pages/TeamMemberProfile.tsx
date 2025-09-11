import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Avatar from '@/components/common/Avatar';
import WorkHistoryCard from '@/components/teams/WorkHistoryCard';
import { teamMembers } from '@/utils/data';
import type { WorkHistory, WorkType } from '@/types';
 

const TeamMemberProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const member = teamMembers.find(m => m.id === id);

  if (!member) {
    return (
      <p className="text-neutral-500">Member not found.</p>
    );
  }

  const manager = member.managerId ? teamMembers.find(m => m.id === member.managerId) : null;
  const subordinates = teamMembers.filter(m => m.managerId === member.id);

  const sampleWorkHistory: WorkHistory = {
    metrics: {
      safety: {
        incidentRate: 0.5,
        lastIncidentDate: '2024-01-15',
        safetyCompliance: 98,
        nearMisses: 3,
        safetyMeetingsAttended: 12,
      },
      people: {
        attendanceRate: 97,
        teamCollaboration: 4.5,
        trainingHours: 24,
        certifications: ['Safety Protocol', 'Equipment Operation'],
        mentorshipHours: 8,
      },
      productivity: {
        completedTasks: 45,
        onTimeCompletion: 92,
        averageResponseTime: '1.8h',
        overtimeHours: 12,
        taskEfficiencyRate: 95,
      },
      improvement: {
        costSavings: 15000,
        suggestionsSubmitted: 4,
        suggestionsImplemented: 3,
        processImprovements: 2,
      },
    },
    recentWork: [
      {
        id: '1',
        date: '2024-03-15',
        type: 'work_order',
        title: 'HVAC System Maintenance',
        status: 'completed',
        duration: 3,
        notes: 'Completed ahead of schedule',
      },
      {
        id: '2',
        date: '2024-03-14',
        type: 'maintenance',
        title: 'Conveyor Belt Inspection',
        status: 'completed',
        duration: 2,
      },
      {
        id: '3',
        date: '2024-03-13',
        type: 'training',
        title: 'Safety Protocol Training',
        status: 'completed',
        duration: 4,
      },
    ] as { id: string; date: string; type: WorkType; title: string; status: string; duration: number; notes?: string }[],
  };

  return (
    <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 flex items-center space-x-4">
          <Avatar name={member.name} src={member.avatar} size="lg" />
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">{member.name}</h2>
            <p className="text-neutral-500">{member.role}</p>
            <p className="text-neutral-500">{member.email}</p>
            <p className="text-neutral-500">{member.phone}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 space-y-4">
          <div>
            <h3 className="font-semibold">Manager</h3>
            {manager ? (
              <Link to={`/teams/${manager.id}`} className="text-primary-600 hover:underline">
                {manager.name}
              </Link>
            ) : (
              <span className="text-neutral-500">None</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold">Subordinates</h3>
            {subordinates.length ? (
              <ul className="list-disc list-inside">
                {subordinates.map((sub) => (
                  <li key={sub.id}>
                    <Link to={`/teams/${sub.id}`} className="text-primary-600 hover:underline">
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-neutral-500">None</span>
            )}
          </div>
        </div>

        <WorkHistoryCard metrics={sampleWorkHistory.metrics} recentWork={sampleWorkHistory.recentWork} />
      </div>
  );
};

export default TeamMemberProfile;
