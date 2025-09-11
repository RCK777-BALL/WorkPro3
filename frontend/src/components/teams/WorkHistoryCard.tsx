/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
 import { Calendar, Clock, CheckCircle, AlertTriangle, BarChart2, Shield, Users, Zap, TrendingUp, DollarSign } from 'lucide-react';
import Card from '@/common/Card';
import Badge from '@/common/Badge';

interface WorkHistoryMetrics {
  safety: {
    incidentRate: number;
    safetyCompliance: number;
    nearMisses: number;
    lastIncidentDate: string;
    safetyMeetingsAttended: number;
  };
  people: {
    trainingHours: number;
    certifications: string[];
    teamCollaboration: number;
    attendanceRate: number;
    mentorshipHours: number;
  };
  productivity: {
    completedTasks: number;
    onTimeCompletion: number;
    averageResponseTime: string;
    overtimeHours: number;
    taskEfficiencyRate: number;
  };
  improvement: {
    suggestionsSubmitted: number;
    suggestionsImplemented: number;
    processImprovements: number;
    costSavings: number;
  };
}

interface WorkHistoryEntry {
  id: string;
  date: string;
  type: 'work_order' | 'maintenance' | 'training' | 'safety' | 'improvement';
  title: string;
  status: 'completed' | 'delayed' | 'in_progress';
  duration: number;
  notes?: string;
  category?: 'safety' | 'people' | 'productivity' | 'improvement';
}
 

interface WorkHistoryCardProps {
  metrics: WorkHistoryMetrics;
  recentWork: WorkHistoryEntry[];
}

const WorkHistoryCard: React.FC<WorkHistoryCardProps> = ({
  metrics,
  recentWork
}) => {
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
      year: 'numeric'
    });
  };

  return (
    <Card title="Work History & Performance" className="mt-6">
      <div className="space-y-8">
        {/* Safety Metrics */}
        <div>
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-error-600 mr-2" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Safety</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="text-error-500" size={20} />
                <Badge text={`${metrics.safety.incidentRate}%`} className="bg-error-100 text-error-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Incident Rate</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="text-success-500" size={20} />
                <Badge text={`${metrics.safety.safetyCompliance}%`} className="bg-success-100 text-success-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Safety Compliance</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="text-warning-500" size={20} />
                <Badge text={metrics.safety.nearMisses.toString()} className="bg-warning-100 text-warning-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Near Misses</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="text-neutral-500" size={20} />
                <Badge text={formatDate(metrics.safety.lastIncidentDate)} />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Last Incident</h4>
            </div>
          </div>
        </div>

        {/* People Metrics */}
        <div>
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">People</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Clock className="text-primary-500" size={20} />
                <Badge text={`${metrics.people.trainingHours}h`} className="bg-primary-100 text-primary-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Training Hours</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="text-success-500" size={20} />
                <Badge text={metrics.people.certifications.length.toString()} className="bg-success-100 text-success-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Certifications</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Users className="text-accent-500" size={20} />
                <Badge text={`${metrics.people.teamCollaboration}`} className="bg-accent-100 text-accent-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Team Collaboration</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="text-teal-500" size={20} />
                <Badge text={`${metrics.people.attendanceRate}%`} className="bg-teal-100 text-teal-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Attendance Rate</h4>
            </div>
          </div>
        </div>

        {/* Productivity Metrics */}
        <div>
          <div className="flex items-center mb-4">
            <Zap className="h-5 w-5 text-success-600 mr-2" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Productivity</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="text-success-500" size={20} />
                <Badge text={metrics.productivity.completedTasks.toString()} className="bg-success-100 text-success-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Completed Tasks</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="text-primary-500" size={20} />
                <Badge text={`${metrics.productivity.onTimeCompletion}%`} className="bg-primary-100 text-primary-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">On-Time Completion</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Clock className="text-accent-500" size={20} />
                <Badge text={metrics.productivity.averageResponseTime} className="bg-accent-100 text-accent-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Avg Response Time</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Clock className="text-warning-500" size={20} />
                <Badge text={`${metrics.productivity.overtimeHours}h`} className="bg-warning-100 text-warning-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Overtime Hours</h4>
            </div>
          </div>
        </div>

        {/* Continuous Improvement Metrics */}
        <div>
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-accent-600 mr-2" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Continuous Improvement</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <BarChart2 className="text-primary-500" size={20} />
                <Badge text={metrics.improvement.suggestionsSubmitted.toString()} className="bg-primary-100 text-primary-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Suggestions Submitted</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="text-success-500" size={20} />
                <Badge text={metrics.improvement.suggestionsImplemented.toString()} className="bg-success-100 text-success-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Suggestions Implemented</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="text-accent-500" size={20} />
                <Badge text={metrics.improvement.processImprovements.toString()} className="bg-accent-100 text-accent-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Process Improvements</h4>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="text-teal-500" size={20} />
                <Badge text={`$${metrics.improvement.costSavings.toLocaleString()}`} className="bg-teal-100 text-teal-700" />
              </div>
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Cost Savings</h4>
            </div>
          </div>
        </div>

        {/* Recent Work History */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">Recent Work History</h3>
          <div className="space-y-4">
            {recentWork.map((entry) => (
              <div
                key={entry.id}
                className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
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
                <h4 className="font-medium text-neutral-900 dark:text-white mb-1">{entry.title}</h4>
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
    </Card>
  );
};

export default WorkHistoryCard;
