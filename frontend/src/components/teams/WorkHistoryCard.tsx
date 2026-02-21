/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState, useLayoutEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart2,
  Shield,
  Users,
  Zap,
  TrendingUp,
  DollarSign,
  ClipboardList,
  Activity,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import type { WorkHistory, WorkHistoryEntry, WorkHistoryMetrics, WorkType } from '@/types';

interface WorkHistoryCardProps {
  metrics: WorkHistoryMetrics;
  recentWork: WorkHistoryEntry[];
  onSave?: (updated: WorkHistory) => Promise<void> | void;
}

const WorkHistoryCard: React.FC<WorkHistoryCardProps> = ({
  metrics,
  recentWork,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftMetrics, setDraftMetrics] = useState<WorkHistoryMetrics>(metrics);
  const [draftRecentWork, setDraftRecentWork] = useState<WorkHistoryEntry[]>(recentWork);
  const [certificationInput, setCertificationInput] = useState(
    metrics.people.certifications.join(', '),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const certificationTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const noteTextareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const autoResizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) {
      return;
    }

    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    if (!isEditing) {
      return;
    }

    autoResizeTextarea(certificationTextareaRef.current);
    noteTextareaRefs.current.forEach((textarea) => {
      autoResizeTextarea(textarea);
    });
  }, [isEditing, certificationInput, draftRecentWork]);

  const createNoteTextareaRef = (id: string) => (element: HTMLTextAreaElement | null) => {
    if (element) {
      noteTextareaRefs.current.set(id, element);
      autoResizeTextarea(element);
    } else {
      noteTextareaRefs.current.delete(id);
    }
  };

  useEffect(() => {
    if (!isEditing) {
      setDraftMetrics(metrics);
      setDraftRecentWork(recentWork);
      setCertificationInput(metrics.people.certifications.join(', '));
    }
  }, [metrics, recentWork, isEditing]);

  const workTypes: WorkType[] = useMemo(
    () => ['work_order', 'maintenance', 'training', 'safety', 'improvement'],
    [],
  );
  const statusOptions: WorkHistoryEntry['status'][] = useMemo(
    () => ['completed', 'delayed', 'in_progress'],
    [],
  );
  const categoryOptions: Array<NonNullable<WorkHistoryEntry['category']>> = useMemo(
    () => ['safety', 'people', 'productivity', 'improvement'],
    [],
  );

  const inputClasses =
    'mt-1 w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';
  const labelClasses = 'text-sm font-medium text-neutral-700 dark:text-neutral-300';

  type MetricNumberFields = {
    safety: 'incidentRate' | 'safetyCompliance' | 'nearMisses' | 'safetyMeetingsAttended';
    people: 'trainingHours' | 'teamCollaboration' | 'attendanceRate' | 'mentorshipHours';
    productivity: 'completedTasks' | 'onTimeCompletion' | 'overtimeHours' | 'taskEfficiencyRate';
    improvement: 'suggestionsSubmitted' | 'suggestionsImplemented' | 'processImprovements' | 'costSavings';
  };

  type MetricStringFields = {
    safety: 'lastIncidentDate';
    productivity: 'averageResponseTime';
  };

  const handleMetricNumberChange = <S extends keyof MetricNumberFields>(
    section: S,
    field: MetricNumberFields[S],
    value: string,
  ) => {
    const parsedValue = Number(value);
    setDraftMetrics((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: Number.isNaN(parsedValue) ? 0 : parsedValue,
      },
    }));
  };

  const handleMetricStringChange = <S extends keyof MetricStringFields>(
    section: S,
    field: MetricStringFields[S],
    value: string,
  ) => {
    setDraftMetrics((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleWorkChange = <K extends keyof WorkHistoryEntry>(
    index: number,
    key: K,
    value: WorkHistoryEntry[K],
  ) => {
    setDraftRecentWork((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [key]: value,
      };
      return updated;
    });
  };

  const handleSave = async () => {
    const certifications = certificationInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const sanitizedMetrics: WorkHistoryMetrics = {
      ...draftMetrics,
      people: {
        ...draftMetrics.people,
        certifications,
      },
    };

    const sanitizedWork = draftRecentWork.map((entry) => ({
      ...entry,
      duration: Number.isNaN(Number(entry.duration)) ? 0 : Number(entry.duration),
    }));

    const updated: WorkHistory = {
      metrics: sanitizedMetrics,
      recentWork: sanitizedWork,
    };

    try {
      setIsSaving(true);
      setSaveError(null);
      await onSave?.(updated);
      setIsEditing(false);
    } catch (error) {
      setSaveError('Unable to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraftMetrics(metrics);
    setDraftRecentWork(recentWork);
    setCertificationInput(metrics.people.certifications.join(', '));
    setSaveError(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-300';
      case 'delayed':
        return 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-300';
      default:
        return 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-300';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'safety':
        return 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-300';
      case 'people':
        return 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300';
      case 'productivity':
        return 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-300';
      case 'improvement':
        return 'bg-accent-100 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300';
      default:
        return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/20 dark:text-neutral-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card
      title="Work History & Performance"
      className="mt-6"
      headerActions={
        isEditing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isSaving}>
              Save Changes
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )
      }
    >
      {saveError && (
        <p className="mb-4 text-sm text-error-600" role="alert">
          {saveError}
        </p>
      )}

      {isEditing ? (
        <div className="space-y-8">
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Safety</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className={labelClasses}>
                Incident Rate (%)
                <input
                  type="number"
                  step="0.1"
                  value={draftMetrics.safety.incidentRate}
                  onChange={(event) =>
                    handleMetricNumberChange('safety', 'incidentRate', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Safety Compliance (%)
                <input
                  type="number"
                  step="0.1"
                  value={draftMetrics.safety.safetyCompliance}
                  onChange={(event) =>
                    handleMetricNumberChange('safety', 'safetyCompliance', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Near Misses
                <input
                  type="number"
                  value={draftMetrics.safety.nearMisses}
                  onChange={(event) =>
                    handleMetricNumberChange('safety', 'nearMisses', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Safety Meetings Attended
                <input
                  type="number"
                  value={draftMetrics.safety.safetyMeetingsAttended}
                  onChange={(event) =>
                    handleMetricNumberChange('safety', 'safetyMeetingsAttended', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Last Incident Date
                <input
                  type="date"
                  value={draftMetrics.safety.lastIncidentDate}
                  onChange={(event) =>
                    handleMetricStringChange('safety', 'lastIncidentDate', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">People</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className={labelClasses}>
                Training Hours
                <input
                  type="number"
                  value={draftMetrics.people.trainingHours}
                  onChange={(event) =>
                    handleMetricNumberChange('people', 'trainingHours', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Certifications (comma separated)
                <textarea
                  ref={certificationTextareaRef}
                  value={certificationInput}
                  onChange={(event) => {
                    setCertificationInput(event.target.value);
                    autoResizeTextarea(event.target);
                  }}
                  className={`${inputClasses} min-h-[80px]`}
                />
              </label>
              <label className={labelClasses}>
                Team Collaboration Score
                <input
                  type="number"
                  step="0.1"
                  value={draftMetrics.people.teamCollaboration}
                  onChange={(event) =>
                    handleMetricNumberChange('people', 'teamCollaboration', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Attendance Rate (%)
                <input
                  type="number"
                  step="0.1"
                  value={draftMetrics.people.attendanceRate}
                  onChange={(event) =>
                    handleMetricNumberChange('people', 'attendanceRate', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Mentorship Hours
                <input
                  type="number"
                  value={draftMetrics.people.mentorshipHours}
                  onChange={(event) =>
                    handleMetricNumberChange('people', 'mentorshipHours', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Productivity</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className={labelClasses}>
                Completed Tasks
                <input
                  type="number"
                  value={draftMetrics.productivity.completedTasks}
                  onChange={(event) =>
                    handleMetricNumberChange('productivity', 'completedTasks', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                On-Time Completion (%)
                <input
                  type="number"
                  step="0.1"
                  value={draftMetrics.productivity.onTimeCompletion}
                  onChange={(event) =>
                    handleMetricNumberChange('productivity', 'onTimeCompletion', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Average Response Time
                <input
                  type="text"
                  value={draftMetrics.productivity.averageResponseTime}
                  onChange={(event) =>
                    handleMetricStringChange('productivity', 'averageResponseTime', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Overtime Hours
                <input
                  type="number"
                  value={draftMetrics.productivity.overtimeHours}
                  onChange={(event) =>
                    handleMetricNumberChange('productivity', 'overtimeHours', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Task Efficiency Rate (%)
                <input
                  type="number"
                  step="0.1"
                  value={draftMetrics.productivity.taskEfficiencyRate}
                  onChange={(event) =>
                    handleMetricNumberChange('productivity', 'taskEfficiencyRate', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
              Continuous Improvement
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className={labelClasses}>
                Suggestions Submitted
                <input
                  type="number"
                  value={draftMetrics.improvement.suggestionsSubmitted}
                  onChange={(event) =>
                    handleMetricNumberChange('improvement', 'suggestionsSubmitted', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Suggestions Implemented
                <input
                  type="number"
                  value={draftMetrics.improvement.suggestionsImplemented}
                  onChange={(event) =>
                    handleMetricNumberChange('improvement', 'suggestionsImplemented', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Process Improvements
                <input
                  type="number"
                  value={draftMetrics.improvement.processImprovements}
                  onChange={(event) =>
                    handleMetricNumberChange('improvement', 'processImprovements', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
              <label className={labelClasses}>
                Cost Savings ($)
                <input
                  type="number"
                  value={draftMetrics.improvement.costSavings}
                  onChange={(event) =>
                    handleMetricNumberChange('improvement', 'costSavings', event.target.value)
                  }
                  className={inputClasses}
                />
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
              Recent Work History
            </h3>
            <div className="space-y-4">
              {draftRecentWork.map((entry, index) => (
                <div
                  key={entry.id}
                  className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className={labelClasses}>
                      Title
                      <input
                        type="text"
                        value={entry.title}
                        onChange={(event) => handleWorkChange(index, 'title', event.target.value)}
                        className={inputClasses}
                      />
                    </label>
                    <label className={labelClasses}>
                      Date
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(event) => handleWorkChange(index, 'date', event.target.value)}
                        className={inputClasses}
                      />
                    </label>
                    <label className={labelClasses}>
                      Type
                      <select
                        value={entry.type}
                        onChange={(event) =>
                          handleWorkChange(index, 'type', event.target.value as WorkHistoryEntry['type'])
                        }
                        className={inputClasses}
                      >
                        {workTypes.map((type) => (
                          <option key={type} value={type}>
                            {type.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClasses}>
                      Status
                      <select
                        value={entry.status}
                        onChange={(event) =>
                          handleWorkChange(index, 'status', event.target.value as WorkHistoryEntry['status'])
                        }
                        className={inputClasses}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClasses}>
                      Duration (hours)
                      <input
                        type="number"
                        step="0.1"
                        value={entry.duration}
                        onChange={(event) =>
                          handleWorkChange(index, 'duration', Number(event.target.value) || 0)
                        }
                        className={inputClasses}
                      />
                    </label>
                    <label className={labelClasses}>
                      Category
                      <select
                        value={entry.category ?? ''}
                        onChange={(event) =>
                          handleWorkChange(
                            index,
                            'category',
                            (event.target.value || undefined) as WorkHistoryEntry['category'],
                          )
                        }
                        className={inputClasses}
                      >
                        <option value="">None</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className={labelClasses}>
                    Notes
                    <textarea
                      ref={createNoteTextareaRef(entry.id)}
                      value={entry.notes ?? ''}
                      onChange={(event) => {
                        autoResizeTextarea(event.target);
                        handleWorkChange(index, 'notes', event.target.value || undefined);
                      }}
                      className={`${inputClasses} min-h-[80px]`}
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <div className="mb-4 flex items-center">
              <Shield className="mr-2 h-5 w-5 text-error-600" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Safety</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <AlertTriangle className="text-error-500" size={20} />
                  <Badge text={`${metrics.safety.incidentRate}%`} className="bg-error-100 text-error-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Incident Rate</h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <CheckCircle className="text-success-500" size={20} />
                  <Badge text={`${metrics.safety.safetyCompliance}%`} className="bg-success-100 text-success-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Safety Compliance</h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <AlertTriangle className="text-warning-500" size={20} />
                  <Badge text={metrics.safety.nearMisses.toString()} className="bg-warning-100 text-warning-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Near Misses</h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <ClipboardList className="text-primary-500" size={20} />
                  <Badge
                    text={metrics.safety.safetyMeetingsAttended.toString()}
                    className="bg-primary-100 text-primary-700"
                  />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Safety Meetings
                </h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <Calendar className="text-neutral-500" size={20} />
                  <Badge text={formatDate(metrics.safety.lastIncidentDate)} />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Last Incident</h4>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">People</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <Clock className="text-primary-500" size={20} />
                  <Badge text={`${metrics.people.trainingHours}h`} className="bg-primary-100 text-primary-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Training Hours</h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <CheckCircle className="text-success-500" size={20} />
                  <Badge text={metrics.people.certifications.length.toString()} className="bg-success-100 text-success-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Certifications</h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <Users className="text-accent-500" size={20} />
                  <Badge text={`${metrics.people.teamCollaboration}`} className="bg-accent-100 text-accent-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Team Collaboration</h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <Calendar className="text-teal-500" size={20} />
                  <Badge text={`${metrics.people.attendanceRate}%`} className="bg-teal-100 text-teal-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Attendance Rate</h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <ClipboardList className="text-primary-500" size={20} />
                  <Badge text={`${metrics.people.mentorshipHours}h`} className="bg-primary-100 text-primary-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Mentorship Hours</h4>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center">
              <Zap className="mr-2 h-5 w-5 text-success-600" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Productivity</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <CheckCircle className="text-success-500" size={20} />
                  <Badge text={metrics.productivity.completedTasks.toString()} className="bg-success-100 text-success-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Completed Tasks</h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <Calendar className="text-primary-500" size={20} />
                  <Badge text={`${metrics.productivity.onTimeCompletion}%`} className="bg-primary-100 text-primary-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">On-Time Completion</h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <Clock className="text-accent-500" size={20} />
                  <Badge text={metrics.productivity.averageResponseTime} className="bg-accent-100 text-accent-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Avg Response Time</h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <Clock className="text-warning-500" size={20} />
                  <Badge text={`${metrics.productivity.overtimeHours}h`} className="bg-warning-100 text-warning-700" />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Overtime Hours</h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <Activity className="text-success-500" size={20} />
                  <Badge
                    text={`${metrics.productivity.taskEfficiencyRate}%`}
                    className="bg-success-100 text-success-700"
                  />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Task Efficiency</h4>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-accent-600" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Continuous Improvement
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <BarChart2 className="text-primary-500" size={20} />
                  <Badge
                    text={metrics.improvement.suggestionsSubmitted.toString()}
                    className="bg-primary-100 text-primary-700"
                  />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Suggestions Submitted
                </h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <CheckCircle className="text-success-500" size={20} />
                  <Badge
                    text={metrics.improvement.suggestionsImplemented.toString()}
                    className="bg-success-100 text-success-700"
                  />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Suggestions Implemented
                </h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <TrendingUp className="text-accent-500" size={20} />
                  <Badge
                    text={metrics.improvement.processImprovements.toString()}
                    className="bg-accent-100 text-accent-700"
                  />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Process Improvements
                </h4>
              </div>

              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <DollarSign className="text-teal-500" size={20} />
                  <Badge
                    text={`$${metrics.improvement.costSavings.toLocaleString()}`}
                    className="bg-teal-100 text-teal-700"
                  />
                </div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Cost Savings</h4>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
              Recent Work History
            </h3>
            <div className="space-y-4">
              {recentWork.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge
                        text={entry.type.replace('_', ' ')}
                        className={`capitalize ${getCategoryColor(entry.category)}`}
                      />
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {formatDate(entry.date)}
                      </span>
                    </div>
                    <Badge
                      text={entry.status.replace('_', ' ')}
                      className={`capitalize ${getStatusColor(entry.status)}`}
                    />
                  </div>
                  <h4 className="mb-1 font-medium text-neutral-900 dark:text-white">{entry.title}</h4>
                  <div className="flex items-center text-sm text-neutral-500 dark:text-neutral-400">
                    <Clock size={14} className="mr-1" />
                    <span>{entry.duration} hours</span>
                  </div>
                  {entry.notes && (
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{entry.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default WorkHistoryCard;
