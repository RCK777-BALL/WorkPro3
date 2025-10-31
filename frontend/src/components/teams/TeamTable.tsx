/*
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ColorInput,
  Group,
  NumberInput,
  Slider,
  Text,
  useComputedColorScheme,
  useMantineTheme,
} from '@mantine/core';
import Badge from '@common/Badge';
import Avatar from '@common/Avatar';
import Button from '@common/Button';
import WorkHistoryCard from './WorkHistoryCard';
import { Users } from 'lucide-react';
import type { TeamMember, WorkHistory, WorkHistoryEntry } from '@/types';
import { getTeamRoleLabel, normalizeTeamRole } from '@/constants/teamRoles';

interface TeamTableProps {
  teamMembers: TeamMember[];
  search: string;
  onRowClick: (member: TeamMember) => void;
}

const TeamTable: React.FC<TeamTableProps> = ({
  teamMembers,
  search,
  onRowClick,
}) => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme('dark');

  const defaultBorderColor =
    colorScheme === 'dark'
      ? theme.colors.dark?.[4] ?? theme.colors.gray?.[7] ?? '#2b2d42'
      : theme.colors.gray?.[4] ?? theme.colors.dark?.[4] ?? '#2b2d42';

  const [borderColor, setBorderColor] = useState<string>(defaultBorderColor);
  const [borderWidth, setBorderWidth] = useState<number>(1);
  const [borderRadius, setBorderRadius] = useState<number>(12);

  const borderStyles = useMemo(() => {
    const width = Math.max(borderWidth, 0);
    return {
      container: {
        border: width > 0 ? `${width}px solid ${borderColor}` : '1px solid transparent',
        borderRadius: `${borderRadius}px`,
        overflow: 'hidden',
        transition: 'border-color 150ms ease, border-width 150ms ease, border-radius 150ms ease',
      },
      table: {
        borderColor,
      },
      headerCell: {
        borderBottom: width > 0 ? `${Math.max(1, Math.round(width))}px solid ${borderColor}` : '1px solid transparent',
      },
      bodyCell: {
        borderBottom:
          width > 0 ? `${Math.max(1, Math.round(width / 1.5))}px solid ${borderColor}` : '1px solid transparent',
      },
    } as const;
  }, [borderColor, borderRadius, borderWidth]);

  const filteredMembers = teamMembers.filter((member) =>
    Object.values(member).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  );

  const getRoleBadgeColor = (role: TeamMember['role']) => {
    const normalized = normalizeTeamRole(role);
    switch (normalized) {
      case 'general_manager':
        return 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300';
      case 'assistant_general_manager':
      case 'department_leader':
      case 'assistant_department_leader':
        return 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-300';
      case 'operations_manager':
      case 'area_leader':
      case 'team_leader':
        return 'bg-accent-100 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300';
      case 'team_member':
      case 'technical_team_member':
        return 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-200';
      default:
        return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/20 dark:text-neutral-300';
    }
  };

  // Updated work history data to match the WorkHistoryCard interface
  const sampleWorkHistory: WorkHistory = {
    metrics: {
      safety: {
        incidentRate: 0.5,
        lastIncidentDate: '2024-01-15',
        safetyCompliance: 98,
        nearMisses: 3,
        safetyMeetingsAttended: 12
      },
      people: {
        attendanceRate: 97,
        teamCollaboration: 4.5,
        trainingHours: 24,
        certifications: ['Safety Protocol', 'Equipment Operation'],
        mentorshipHours: 8
      },
      productivity: {
        completedTasks: 45,
        onTimeCompletion: 92,
        averageResponseTime: '1.8h',
        overtimeHours: 12,
        taskEfficiencyRate: 95
      },
      improvement: {
        costSavings: 15000,
        suggestionsSubmitted: 4,
        suggestionsImplemented: 3,
        processImprovements: 2
      }
    },
    recentWork: [
      {
        id: '1',
        date: '2024-03-15',
        type: 'work_order',
        title: 'HVAC System Maintenance',
        status: 'completed',
        duration: 3,
        notes: 'Completed ahead of schedule'
      },
      {
        id: '2',
        date: '2024-03-14',
        type: 'maintenance',
        title: 'Conveyor Belt Inspection',
        status: 'completed',
        duration: 2
      },
      {
        id: '3',
        date: '2024-03-13',
        type: 'training',
        title: 'Safety Protocol Training',
        status: 'completed',
        duration: 4
      }
    ] as WorkHistoryEntry[]
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-4">
        <Group gap="lg" wrap="wrap" align="flex-end">
          <div className="flex flex-col gap-1">
            <Text size="sm" className="text-neutral-600 dark:text-neutral-300">
              Border color
            </Text>
            <ColorInput
              value={borderColor}
              onChange={setBorderColor}
              format="hex"
              swatches={[
                '#1f2937',
                '#3b82f6',
                '#06b6d4',
                '#f59e0b',
                '#10b981',
                '#ef4444',
                '#8b5cf6',
                '#f472b6',
              ]}
            />
          </div>
          <div className="flex flex-col gap-1 max-w-[120px]">
            <Text size="sm" className="text-neutral-600 dark:text-neutral-300">
              Border width
            </Text>
            <NumberInput
              min={0}
              max={10}
              step={1}
              value={borderWidth}
              onChange={(value) => setBorderWidth(typeof value === 'number' ? value : Number(value) || 0)}
              suffix=" px"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[200px] flex-1">
            <Text size="sm" className="text-neutral-600 dark:text-neutral-300">
              Border radius
            </Text>
            <Slider
              min={0}
              max={32}
              value={borderRadius}
              onChange={setBorderRadius}
              label={(value) => `${value}px`}
              marks={[
                { value: 0, label: '0' },
                { value: 8, label: '8' },
                { value: 16, label: '16' },
                { value: 24, label: '24' },
                { value: 32, label: '32' },
              ]}
            />
          </div>
        </Group>
      </div>
      <div
        className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm"
        style={borderStyles.container}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full" style={borderStyles.table}>
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                  style={borderStyles.headerCell}
                >
                  Member
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                  style={borderStyles.headerCell}
                >
                  Role
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                  style={borderStyles.headerCell}
                >
                  Department
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                  style={borderStyles.headerCell}
                >
                  Email
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                  style={borderStyles.headerCell}
                >
                  Status
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                  style={borderStyles.headerCell}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-800">
              {filteredMembers.map((member) => (
                <React.Fragment key={member.id}>
                  <tr
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors duration-150"
                  >
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      style={borderStyles.bodyCell}
                    >
                      <div className="flex items-center">
                        <Avatar
                          name={member.name}
                          src={member.avatar}
                          size="md"
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-neutral-900 dark:text-white">
                            <Link to={`/teams/${member.id}`} className="hover:underline">
                              {member.name}
                            </Link>
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">
                            {member.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      style={borderStyles.bodyCell}
                    >
                      <Badge
                        text={getTeamRoleLabel(member.role)}
                        className={getRoleBadgeColor(member.role)}
                      />
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400"
                      style={borderStyles.bodyCell}
                    >
                      {member.department ?? ''}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400"
                      style={borderStyles.bodyCell}
                    >
                      {member.email}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      style={borderStyles.bodyCell}
                    >
                      <Badge
                        text="Active"
                        type="status"
                        size="sm"
                        className="bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-300"
                      />
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-right"
                      style={borderStyles.bodyCell}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(selectedMember?.id === member.id ? null : member);
                          onRowClick(member);
                        }}
                      >
                        {selectedMember?.id === member.id ? 'Hide Details' : 'View Details'}
                      </Button>
                    </td>
                  </tr>
                  {selectedMember?.id === member.id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4" style={borderStyles.bodyCell}>
                        <WorkHistoryCard
                          metrics={sampleWorkHistory.metrics}
                          recentWork={sampleWorkHistory.recentWork}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
              <Users className="h-8 w-8 text-neutral-500 dark:text-neutral-400" />
            </div>
            <p className="text-neutral-500 dark:text-neutral-400">No team members found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamTable;
