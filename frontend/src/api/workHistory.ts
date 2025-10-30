/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { WorkHistory, WorkHistoryEntry, WorkHistoryMetrics } from '@/types';

export interface WorkHistoryRecord extends WorkHistory {
  _id: string;
  performedBy?: string;
}

export interface WorkHistoryRequest extends WorkHistory {
  performedBy: string;
}

const createDefaultMetrics = (): WorkHistoryMetrics => ({
  safety: {
    incidentRate: 0,
    lastIncidentDate: '',
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
    averageResponseTime: '',
    overtimeHours: 0,
    taskEfficiencyRate: 0,
  },
  improvement: {
    costSavings: 0,
    suggestionsSubmitted: 0,
    suggestionsImplemented: 0,
    processImprovements: 0,
  },
});

export const createEmptyWorkHistory = (): WorkHistory => ({
  metrics: createDefaultMetrics(),
  recentWork: [],
});

const normalizeMetrics = (metrics?: Partial<WorkHistoryMetrics>): WorkHistoryMetrics => {
  const defaults = createDefaultMetrics();
  if (!metrics) {
    return defaults;
  }

  return {
    safety: { ...defaults.safety, ...metrics.safety },
    people: {
      ...defaults.people,
      ...metrics.people,
      certifications: metrics.people?.certifications ?? defaults.people.certifications,
    },
    productivity: { ...defaults.productivity, ...metrics.productivity },
    improvement: { ...defaults.improvement, ...metrics.improvement },
  };
};

const normalizeRecentWork = (entries?: WorkHistoryEntry[]): WorkHistoryEntry[] => {
  if (!entries || !Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry, index) => ({
    ...entry,
    id: entry.id && entry.id.length > 0 ? entry.id : `entry-${index}`,
  }));
};

export const normalizeWorkHistory = <T extends Partial<WorkHistoryRecord>>(record: T): WorkHistoryRecord => ({
  _id: String(record._id ?? ''),
  performedBy: record.performedBy ? String(record.performedBy) : undefined,
  metrics: normalizeMetrics(record.metrics),
  recentWork: normalizeRecentWork(record.recentWork),
});

export const fetchWorkHistoryForMember = async (memberId: string): Promise<WorkHistoryRecord | null> => {
  const { data } = await http.get<WorkHistoryRecord[]>('/work-history', {
    params: { performedBy: memberId },
  });

  if (!data || data.length === 0) {
    return null;
  }

  return normalizeWorkHistory(data[0]);
};

export const createWorkHistoryRecord = async (
  payload: WorkHistoryRequest,
): Promise<WorkHistoryRecord> => {
  const { data } = await http.post<WorkHistoryRecord>('/work-history', payload);
  return normalizeWorkHistory(data);
};

export const updateWorkHistoryRecord = async (
  id: string,
  payload: WorkHistoryRequest,
): Promise<WorkHistoryRecord> => {
  const { data } = await http.put<WorkHistoryRecord>(`/work-history/${id}`, payload);
  return normalizeWorkHistory(data);
};

