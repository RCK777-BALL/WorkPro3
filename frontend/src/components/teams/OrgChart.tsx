/*
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useRef, useState } from 'react';
import Tree, { RawNodeDatum, RenderCustomNodeElementFn, TreeNodeDatum } from 'react-d3-tree';
import { useTeamMembers } from '@/store/useTeamMembers';
import type { TeamMember } from '@/types';
import { getTeamRoleLabel } from '@/constants/teamRoles';
import useResizeObserver from '@/hooks/useResizeObserver';

interface OrgChartProps {
  onSelect: (member: TeamMember) => void;
}

type TreeNode = RawNodeDatum & {
  member: TeamMember;
  children?: TreeNode[];
};

const buildTree = (members: TeamMember[]): TreeNode => {
  const nodeMap = new Map<string, TreeNode>();
  members.forEach((m) => {
    nodeMap.set(m.id, {
      name: m.name,
      attributes: { role: getTeamRoleLabel(m.role) },
      member: m,
      children: [],
    });
  });

  const roots: TreeNode[] = [];
  members.forEach((m) => {
    const node = nodeMap.get(m.id)!;
    if (m.managerId && nodeMap.has(m.managerId)) {
      nodeMap.get(m.managerId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  if (roots.length === 1) return roots[0];
  return {
    name: 'Organization',
    member: {
      id: 'root',
      name: 'Organization',
      email: '',
      role: 'general_manager',
    },
    children: roots,
  } as TreeNode;
};

const OrgChart: React.FC<OrgChartProps> = ({ onSelect }) => {
  const { members } = useTeamMembers();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const treeData = useMemo(() => buildTree(members), [members]);

  const handleClick = (node: TreeNodeDatum & { member: TeamMember }) => {
    if (node.member.id === 'root') return;
    setSelectedId(node.member.id);
    onSelect(node.member);
  };

  const renderNode: RenderCustomNodeElementFn = ({ nodeDatum }) => {
    const typedNode = nodeDatum as TreeNodeDatum & { member: TeamMember };
    const isSelected = typedNode.member.id === selectedId;
    const fill = isSelected ? '#3b82f6' : '#fff';
    const textColor = isSelected ? '#1e40af' : '#000';

    return (
      <g onClick={() => handleClick(typedNode)}>
        <circle r={15} fill={fill} stroke="#3b82f6" strokeWidth={2} />
        <text x={20} dy={-5} fill={textColor} fontSize={12}>
          {typedNode.member.name}
        </text>
        <text x={20} dy={15} fill={textColor} fontSize={10}>
          {getTeamRoleLabel(typedNode.member.role)}
        </text>
      </g>
    );
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(containerRef);
  const translate = useMemo(
    () => ({ x: width / 2, y: Math.max(50, height * 0.05) }),
    [width, height],
  );

  return (
    <div ref={containerRef} className="w-full h-full overflow-y-auto">
      {width > 0 && (
        <Tree
          data={treeData as unknown as RawNodeDatum}
          renderCustomNodeElement={renderNode}
          orientation="vertical"
          translate={translate}
          pathFunc="elbow"
        />
      )}
    </div>
  );
};

export default OrgChart;
