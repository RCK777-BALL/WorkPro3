import React, { useMemo, useState } from 'react';
import Tree, { RawNodeDatum, RenderCustomNodeElementFn } from 'react-d3-tree';
import { useTeamMembers } from '../../store/useTeamMembers';
import type { TeamMember } from '../../types';

interface OrgChartProps {
  onSelect: (member: TeamMember) => void;
}

interface TreeNode extends RawNodeDatum {
  member: TeamMember;
  children?: TreeNode[];
}

const buildTree = (members: TeamMember[]): TreeNode => {
  const nodeMap = new Map<string, TreeNode>();
  members.forEach((m) => {
    nodeMap.set(m.id, {
      name: m.name,
      attributes: { role: m.role },
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
      role: 'admin',
    },
    children: roots,
  } as TreeNode;
};

const OrgChart: React.FC<OrgChartProps> = ({ onSelect }) => {
  const { members } = useTeamMembers();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const treeData = useMemo(() => buildTree(members), [members]);

  const handleClick = (node: TreeNode) => {
    if (node.member.id === 'root') return;
    setSelectedId(node.member.id);
    onSelect(node.member);
  };

  const renderNode: RenderCustomNodeElementFn = ({ nodeDatum }) => {
    const node = nodeDatum as TreeNode;
    const isSelected = node.member.id === selectedId;
    const fill = isSelected ? '#3b82f6' : '#fff';
    const textColor = isSelected ? '#1e40af' : '#000';

    return (
      <g onClick={() => handleClick(node)}>
        <circle r={15} fill={fill} stroke="#3b82f6" strokeWidth={2} />
        <text x={20} dy={-5} fill={textColor} fontSize={12}>
          {node.member.name}
        </text>
        <text x={20} dy={15} fill={textColor} fontSize={10}>
          {node.member.role}
        </text>
      </g>
    );
  };

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <Tree
        data={treeData as unknown as RawNodeDatum}
        renderCustomNodeElement={renderNode}
        orientation="vertical"
        translate={{ x: 300, y: 50 }}
        pathFunc="elbow"
      />
    </div>
  );
};

export default OrgChart;

