/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import {
  AppShell,
  Burger,
  Group,
  NavLink as MantineNavLink,
  Menu,
  UnstyledButton,
  Breadcrumbs,
  Anchor,
  ActionIcon,
  Text,
  Modal,
  MantineProvider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Command, User } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import ThemeToggle from '@/common/ThemeToggle';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
  label: string;
  to: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', roles: ['admin', 'manager', 'technician', 'viewer'] },
  { label: 'Analytics', to: '/dashboard/analytics', roles: ['admin', 'manager'] },
  { label: 'Reports', to: '/dashboard/reports', roles: ['admin', 'manager'] },
  { label: 'Departments', to: '/departments', roles: ['admin', 'manager'] },
];

export default function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const [commandOpen, setCommandOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();

  const items = navItems.filter((n) => n.roles.includes(user?.role ?? 'viewer'));
  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, idx) => {
    const to = '/' + segments.slice(0, idx + 1).join('/');
    return (
      <Anchor component={Link} to={to} key={to}>
        {seg}
      </Anchor>
    );
  });

  return (
    <MantineProvider defaultColorScheme="light">
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <Breadcrumbs>{breadcrumbs.length ? breadcrumbs : <Text>Home</Text>}</Breadcrumbs>
            </Group>
            <Group>
              <ActionIcon variant="subtle" onClick={() => setCommandOpen(true)} aria-label="Open command palette">
                <Command size={16} />
              </ActionIcon>
              <ThemeToggle />
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <UnstyledButton>
                    <Group gap="xs">
                      <User size={18} />
                      <Text size="sm">{user?.name ?? 'User'}</Text>
                    </Group>
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>{user?.name ?? 'Account'}</Menu.Label>
                  <Menu.Item component={Link} to="/settings">
                    Settings
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item onClick={logout}>Logout</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          {items.map((item) => (
            <MantineNavLink
              key={item.to}
              component={Link}
              to={item.to}
              label={item.label}
            />
          ))}
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>

        <Modal opened={commandOpen} onClose={() => setCommandOpen(false)} title="Command palette">
          <Text size="sm">Command palette placeholder</Text>
        </Modal>
      </AppShell>
    </MantineProvider>
  );
}

