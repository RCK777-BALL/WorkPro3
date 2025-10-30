/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Avatar from '@/components/common/Avatar';
import WorkHistoryCard from '@/components/teams/WorkHistoryCard';
import { teamMembers } from '@/utils/data';
import http from '@/lib/http';
import type { WorkHistory, PermitActivitySummary } from '@/types';
import {
  createWorkHistory,
  fetchWorkHistoryByMember,
  updateWorkHistory,
} from '@/api/workHistory';

const EMPTY_WORK_HISTORY: WorkHistory = {
  metrics: {
    safety: {
      incidentRate: 0,
      lastIncidentDate: '1970-01-01',
      safetyCompliance: 0,
      nearMisses: 0,
      safetyMeetingsAttended: 0,
    },
    people: {
      attendanceRate: 0,
      teamCollaboration: 0,
      trainingHours: 0,
      certifications: [],
      mentorshipHours: 0,
    },
    productivity: {
      completedTasks: 0,
      onTimeCompletion: 0,
      averageResponseTime: '0h',
      overtimeHours: 0,
      taskEfficiencyRate: 0,
    },
    improvement: {
      costSavings: 0,
      suggestionsSubmitted: 0,
      suggestionsImplemented: 0,
      processImprovements: 0,
    },
  },
  recentWork: [],
};
const TeamMemberProfile = () => {
  const { id } = useParams<{ id: string }>();
  const member = teamMembers.find(m => m.id === id);
  const [permitActivity, setPermitActivity] = useState<PermitActivitySummary | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [workHistory, setWorkHistory] = useState<WorkHistory>(EMPTY_WORK_HISTORY);
  const [workHistoryId, setWorkHistoryId] = useState<string | null>(null);
  const [loadingWorkHistory, setLoadingWorkHistory] = useState(true);
  const [workHistoryError, setWorkHistoryError] = useState<string | null>(null);

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

  const loadWorkHistory = useCallback(async () => {
    if (!member?.id) {
      return;
    }

    try {
      setLoadingWorkHistory(true);
      const result = await fetchWorkHistoryByMember(member.id);
      if (result) {
        setWorkHistoryId(result._id);
        setWorkHistory({
          metrics: result.metrics ?? EMPTY_WORK_HISTORY.metrics,
          recentWork: Array.isArray(result.recentWork) ? result.recentWork : [],
        });
        setWorkHistoryError(null);
      } else {
        setWorkHistoryId(null);
        setWorkHistory(EMPTY_WORK_HISTORY);
        setWorkHistoryError(null);
      }
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        setWorkHistoryId(null);
        setWorkHistory(EMPTY_WORK_HISTORY);
        setWorkHistoryError(null);
      } else {
        setWorkHistoryError('Unable to load work history.');
      }
    } finally {
      setLoadingWorkHistory(false);
    }
  }, [member?.id]);

  useEffect(() => {
    void loadWorkHistory();
  }, [loadWorkHistory]);

  const handleSaveWorkHistory = useCallback(async (updated: WorkHistory) => {
    if (!member?.id) {
      return;
    }

    const payload = { ...updated, memberId: member.id };
    const saved = workHistoryId
      ? await updateWorkHistory(workHistoryId, payload)
      : await createWorkHistory(payload);

    setWorkHistoryId(saved._id);
    setWorkHistory({
      metrics: saved.metrics ?? EMPTY_WORK_HISTORY.metrics,
      recentWork: Array.isArray(saved.recentWork) ? saved.recentWork : [],
    });
    setWorkHistoryError(null);
  }, [member?.id, workHistoryId]);

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
          {loadingWorkHistory ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-500 shadow-sm">
              Loading work history…
            </div>
          ) : workHistoryError ? (
            <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-error-600">{workHistoryError}</p>
              <button
                type="button"
                onClick={() => {
                  void loadWorkHistory();
                }}
                className="inline-flex items-center justify-center rounded-md border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-600 transition hover:border-primary-300 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Retry
              </button>
            </div>
          ) : (
            <WorkHistoryCard
              metrics={workHistory.metrics}
              recentWork={workHistory.recentWork}
              onSave={handleSaveWorkHistory}
            />
          )}
        </div>
      </div>
  );
};

export default TeamMemberProfile;
