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
  Stack,
  Text,
  useComputedColorScheme,
  useMantineTheme,
} from '@mantine/core';
import Badge from '@/components/common/Badge';
import Avatar from '@/components/common/Avatar';
import Button from '@/components/common/Button';
import WorkHistoryCard from './WorkHistoryCard';
import { Users } from 'lucide-react';
import type { Department, TeamMember, WorkHistory, WorkHistoryEntry } from '@/types';
import { getTeamRoleLabel, normalizeTeamRole } from '@/constants/teamRoles';
import { useBorderPreferences } from '@/context/BorderPreferencesContext';

interface TeamTableProps {
  teamMembers: TeamMember[];
  departments: Department[];
  search: string;
  onRowClick: (member: TeamMember) => void;
}

const toRgba = (color: string | undefined, alpha: number, fallback: string) => {
  const hexColor = color?.trim() || fallback;

  if (!hexColor.startsWith('#')) {
    return hexColor;
  }

  const normalized = hexColor.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char.repeat(2))
          .join('')
      : normalized.padEnd(6, '0');

  const red = Number.parseInt(expanded.substring(0, 2), 16);
  const green = Number.parseInt(expanded.substring(2, 4), 16);
  const blue = Number.parseInt(expanded.substring(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const TeamTable: React.FC<TeamTableProps> = ({
  teamMembers,
  departments,
  search,
  onRowClick,
}) => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme('dark');
  const { borderConfig, updateBorderConfig, resetBorderConfig } = useBorderPreferences();

  const departmentNameById = useMemo(() => {
    return departments.reduce<Record<string, string>>((acc, department) => {
      acc[department.id] = department.name;
      return acc;
    }, {});
  }, [departments]);

  const defaultBorderColor =
    colorScheme === 'dark'
      ? theme.colors.dark?.[4] ?? theme.colors.gray?.[7] ?? '#2b2d42'
      : theme.colors.gray?.[4] ?? theme.colors.dark?.[4] ?? '#2b2d42';

  const borderColor = borderConfig.color?.trim() ? borderConfig.color : defaultBorderColor;
  const borderWidth = Number.isFinite(borderConfig.width) ? borderConfig.width : 1;
  const borderRadius = Number.isFinite(borderConfig.radius) ? borderConfig.radius : 12;

  const containerBackground = useMemo(() => {
    const baseColor = colorScheme === 'dark' ? theme.colors.dark?.[6] : theme.colors.gray?.[0];
    const alpha = colorScheme === 'dark' ? 0.55 : 0.9;
    return toRgba(baseColor, alpha, colorScheme === 'dark' ? '#1a1b1e' : '#ffffff');
  }, [colorScheme, theme]);

  const headerBackground = useMemo(() => {
    const baseColor = colorScheme === 'dark' ? theme.colors.dark?.[5] : theme.colors.gray?.[1];
    const alpha = colorScheme === 'dark' ? 0.75 : 0.8;
    return toRgba(baseColor, alpha, colorScheme === 'dark' ? '#25262b' : '#f1f3f5');
  }, [colorScheme, theme]);

  const borderStyles = useMemo(() => {
    const hasBorder = borderWidth > 0;
    const containerBorder = hasBorder ? `${borderWidth}px solid ${borderColor}` : undefined;
    const cellBorder = hasBorder ? `${Math.max(1, borderWidth)}px solid ${borderColor}` : undefined;

    return {
      container: {
        border: containerBorder,
        borderRadius: `${borderRadius}px`,
        overflow: 'hidden',
        background: containerBackground,
        backdropFilter: 'blur(6px)',
        transition:
          'border-color 150ms ease, border-width 150ms ease, border-radius 150ms ease, background-color 150ms ease',
      },
      table: {
        borderColor,
      },
      headerCell: {
        borderBottom: cellBorder,
        backgroundColor: headerBackground,
      },
      bodyCell: {
        borderBottom: cellBorder,
      },
    } as const;
  }, [borderColor, borderWidth, borderRadius, containerBackground, headerBackground]);

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
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-dashed border-neutral-200 dark:border-neutral-700">
        <div className="p-4">
          <Group align="flex-end" gap="lg" wrap="wrap">
            <Stack gap={6} style={{ minWidth: 200 }}>
              <Text size="sm" fw={600} c="dimmed">
                Border color
              </Text>
              <ColorInput
                format="hex"
                value={borderColor}
                size="sm"
                onChange={(value) => updateBorderConfig({ color: value })}
                swatches={['#2b2d42', '#6366f1', '#22c55e', '#f97316', '#ec4899']}
              />
            </Stack>
            <Stack gap={6} style={{ minWidth: 140 }}>
              <Text size="sm" fw={600} c="dimmed">
                Border width (px)
              </Text>
              <NumberInput
                value={borderWidth}
                min={0}
                max={12}
                step={0.5}
                size="sm"
                hideControls
                onChange={(value) =>
                  updateBorderConfig({
                    width:
                      typeof value === 'number'
                        ? value
                        : Number.parseFloat(value) || 0,
                  })
                }
              />
            </Stack>
            <Stack gap={6} style={{ minWidth: 220 }}>
              <Group justify="space-between" gap={4} wrap="nowrap">
                <Text size="sm" fw={600} c="dimmed">
                  Border radius
                </Text>
                <Text size="sm" c="dimmed">
                  {Math.round(borderRadius)}px
                </Text>
              </Group>
              <Slider
                value={borderRadius}
                min={0}
                max={48}
                step={1}
                onChange={(value) => updateBorderConfig({ radius: value })}
                label={(value) => `${Math.round(value)}px`}
              />
            </Stack>
            <div className="ml-auto flex items-center">
              <Button variant="outline" size="sm" onClick={resetBorderConfig}>
                Reset
              </Button>
            </div>
          </Group>
        </div>
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
                            <Link to={`/team-members/${member.id}`} className="hover:underline">
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
                      {member.department
                        ? departmentNameById[member.department] ?? member.department
                        : ''}
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
