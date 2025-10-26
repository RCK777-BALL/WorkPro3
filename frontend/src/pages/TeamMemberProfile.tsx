/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Avatar from '@/components/common/Avatar';
import WorkHistoryCard from '@/components/teams/WorkHistoryCard';
import { teamMembers } from '@/utils/data';
import http from '@/lib/http';
import type { WorkHistory, WorkHistoryEntry, PermitActivitySummary } from '@/types';
const TeamMemberProfile = () => {
  const { id } = useParams<{ id: string }>();
  const member = teamMembers.find(m => m.id === id);
  const [permitActivity, setPermitActivity] = useState<PermitActivitySummary | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  if (!member) {
    return (
      <p className="text-neutral-500">Member not found.</p>
    );
  }

  const manager = member.managerId ? teamMembers.find(m => m.id === member.managerId) : null;
  const subordinates = teamMembers.filter(m => m.managerId === member.id);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setLoadingActivity(true);
        const res = await http.get<PermitActivitySummary>('/permits/activity', {
          params: { userId: member.id },
        });
        setPermitActivity(res.data);
        setActivityError(null);
      } catch (err) {
        setActivityError('Unable to load permit activity');
      } finally {
        setLoadingActivity(false);
      }
    };
    if (member.id) {
      loadActivity();
    }
  }, [member.id]);

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
    ] as WorkHistoryEntry[],
  };

  return (
    <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 flex items-center space-x-4">
          <Avatar
            name={member.name}
            size="lg"
            {...(member.avatar ? { src: member.avatar } : {})}
          />
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

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900">Permit Activity</h3>
            {loadingActivity && <p className="text-sm text-neutral-500">Loading activity…</p>}
            {activityError && <p className="text-sm text-error-600">{activityError}</p>}
            {permitActivity && !loadingActivity && !activityError && (
              <div className="space-y-4 text-sm text-neutral-700">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="rounded border bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Permits Involved</div>
                    <div className="text-lg font-semibold text-neutral-900">{permitActivity.totalInvolved}</div>
                  </div>
                  <div className="rounded border bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Pending Approvals</div>
                    <div className="text-lg font-semibold text-neutral-900">{permitActivity.pendingApprovals}</div>
                  </div>
                  <div className="rounded border bg-neutral-50 p-3">
                    <div className="text-xs text-neutral-500">Active Permits</div>
                    <div className="text-lg font-semibold text-neutral-900">{permitActivity.activePermits}</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-700">Recent Actions</h4>
                  <ul className="mt-2 space-y-2">
                    {permitActivity.recentHistory.length ? (
                      permitActivity.recentHistory.map((entry) => (
                        <li key={`${entry.permitId}-${entry.at}`} className="rounded border border-neutral-200 p-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-neutral-900">{entry.permitNumber}</span>
                            <span className="text-xs text-neutral-500">{new Date(entry.at).toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-neutral-500">{entry.action}</div>
                          {entry.notes && <div className="text-xs text-neutral-500">{entry.notes}</div>}
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-neutral-400">No recent permit activity.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <WorkHistoryCard metrics={sampleWorkHistory.metrics} recentWork={sampleWorkHistory.recentWork} />
        </div>
      </div>
  );
};

export default TeamMemberProfile;
