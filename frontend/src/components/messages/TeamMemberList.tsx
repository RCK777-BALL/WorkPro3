/*
 * SPDX-License-Identifier: MIT
 */

import { Avatar, Badge, Group, Stack, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import type { TeamMember } from '@/types';

interface TeamMemberListProps {
  members: TeamMember[];
}

const MotionDiv = motion.div;

const TeamMemberList = ({ members }: TeamMemberListProps) => {
  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Stack gap="xs" className="mt-3">
      {sortedMembers.map((member) => (
        <MotionDiv
          key={member.id}
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <div className="w-full rounded-xl border border-transparent bg-gray-900/40 px-3 py-2">
            <Group gap="sm" align="center">
              <Avatar radius="xl" color="blue" variant="filled">
                {member.name ? member.name.charAt(0).toUpperCase() : <Users size={16} />}
              </Avatar>
              <div className="flex flex-1 flex-col">
                <Group align="center" justify="space-between" wrap="nowrap">
                  <Text className="truncate text-sm font-semibold text-white" title={member.name}>
                    {member.name}
                  </Text>
                  {member.department && (
                    <Badge color="indigo" variant="light" radius="sm">
                      {member.department}
                    </Badge>
                  )}
                </Group>
                <Group gap="xs" wrap="wrap">
                  {member.role && (
                    <Badge color="gray" variant="light" radius="sm">
                      {member.role.replaceAll('_', ' ')}
                    </Badge>
                  )}
                  {member.employeeId && (
                    <Badge color="blue" variant="light" radius="sm">
                      ID: {member.employeeId}
                    </Badge>
                  )}
                </Group>
                {member.email && (
                  <Text size="xs" className="text-gray-400">
                    {member.email}
                  </Text>
                )}
              </div>
            </Group>
          </div>
        </MotionDiv>
      ))}
      {!sortedMembers.length && <Text className="px-2 text-sm text-gray-500">No team members available.</Text>}
    </Stack>
  );
};

export default TeamMemberList;
