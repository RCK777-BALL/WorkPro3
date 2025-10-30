/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Avatar from '@/components/common/Avatar';
import WorkHistoryCard from '@/components/teams/WorkHistoryCard';
import { teamMembers } from '@/utils/data';
import http from '@/lib/http';
import { createEmptyWorkHistory, fetchWorkHistoryForMember, createWorkHistoryRecord, updateWorkHistoryRecord } from '@/api/workHistory';
import type { WorkHistory, PermitActivitySummary } from '@/types';
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

  const [workHistory, setWorkHistory] = useState<WorkHistory>(() => createEmptyWorkHistory());
  const [workHistoryId, setWorkHistoryId] = useState<string | null>(null);
  const [loadingWorkHistory, setLoadingWorkHistory] = useState(false);
  const [workHistoryError, setWorkHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadWorkHistory = async () => {
      try {
        setLoadingWorkHistory(true);
        const record = await fetchWorkHistoryForMember(member.id);
        if (!isMounted) {
          return;
        }
        if (record) {
          setWorkHistory({ metrics: record.metrics, recentWork: record.recentWork });
          setWorkHistoryId(record._id && record._id.length > 0 ? record._id : null);
        } else {
          setWorkHistory(createEmptyWorkHistory());
          setWorkHistoryId(null);
        }
        setWorkHistoryError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setWorkHistory(createEmptyWorkHistory());
        setWorkHistoryId(null);
        setWorkHistoryError('Unable to load work history');
      } finally {
        if (isMounted) {
          setLoadingWorkHistory(false);
        }
      }
    };

    loadWorkHistory();

    return () => {
      isMounted = false;
    };
  }, [member.id]);

  const handleWorkHistorySave = async (updated: WorkHistory) => {
    const payload = {
      ...updated,
      performedBy: member.id,
    };

    setWorkHistoryError(null);
    let saved;
    if (workHistoryId) {
      saved = await updateWorkHistoryRecord(workHistoryId, payload);
    } else {
      saved = await createWorkHistoryRecord(payload);
    }

    setWorkHistory({ metrics: saved.metrics, recentWork: saved.recentWork });
    setWorkHistoryId(saved._id && saved._id.length > 0 ? saved._id : workHistoryId);
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
          {loadingWorkHistory ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500 shadow-sm">
              Loading work history…
            </div>
          ) : (
            <>
              {workHistoryError && (
                <p className="mb-2 text-sm text-error-600" role="alert">
                  {workHistoryError}
                </p>
              )}
              <WorkHistoryCard
                metrics={workHistory.metrics}
                recentWork={workHistory.recentWork}
                onSave={handleWorkHistorySave}
              />
            </>
          )}
        </div>
      </div>
  );
};

export default TeamMemberProfile;
