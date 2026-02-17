/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Factory, Building2, Route, Network, PackageCheck, CheckCircle2, BookOpen } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { Link } from 'react-router-dom';

const steps = [
  {
    title: 'Select a Plant',
    description: 'Choose the plant where you want to manage departments, lines, and stations.',
    icon: <Factory className="h-6 w-6 text-primary-600" />, 
    actions: [
      'Navigate to the Plants page and pick the facility you want to configure.',
      'Confirm the selection to load its existing departments and equipment hierarchy.',
    ],
    tip: 'You can quickly switch between plants later without losing your progress.',
  },
  {
    title: 'Create Departments',
    description: 'Set up the departments that group your production areas.',
    icon: <Building2 className="h-6 w-6 text-primary-600" />, 
    actions: [
      'Open the Departments page and click “New Department”.',
      'Provide a clear department name and optional description.',
      'Save the department to make it available for assigning lines.',
    ],
    tip: 'Keep naming consistent with on-site signage to make navigation easier for technicians.',
  },
  {
    title: 'Add Lines within Departments',
    description: 'Create production lines that sit inside each department.',
    icon: <Route className="h-6 w-6 text-primary-600" />, 
    actions: [
      'From the Lines page, select the department you created earlier.',
      'Click “Add Line”, enter its name, and choose the parent department.',
      'Save to register the line under the correct department.',
    ],
    tip: 'Use a consistent numbering or naming scheme (e.g., Line A, Line B) for quick lookup.',
  },
  {
    title: 'Create Stations within Lines',
    description: 'Define the stations or work centers that make up each line.',
    icon: <Network className="h-6 w-6 text-primary-600" />, 
    actions: [
      'Open the Stations page and filter by the line you just added.',
      'Click “New Station” and enter its name and optional capacity details.',
      'Save to nest the station inside the selected line.',
    ],
    tip: 'Stations should match physical checkpoints so work orders map cleanly to the floor.',
  },
  {
    title: 'Add Assets to Stations',
    description: 'Place equipment at the right station to complete the hierarchy.',
    icon: <PackageCheck className="h-6 w-6 text-primary-600" />, 
    actions: [
      'Go to the Assets page and choose “Add Asset”.',
      'Assign the asset to the correct plant, department, line, and station.',
      'Attach documents, photos, and key metadata (serial numbers, models, and maintenance intervals).',
    ],
    tip: 'Accurate placement helps technicians locate assets quickly and keeps reports organized.',
  },
];

const quickLinks = [
  { label: 'Manage Plants', to: '/plants' },
  { label: 'Departments', to: '/departments' },
  { label: 'Lines', to: '/lines' },
  { label: 'Stations', to: '/stations' },
  { label: 'Assets', to: '/assets' },
  { label: 'Add Assets to Stations Guide', to: '/documentation/asset-management/assets/add-to-stations' },
];

const AssetManagementGuide: React.FC = () => (
  <div className="space-y-6">
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-primary-700">
        <BookOpen className="h-5 w-5" />
        <span className="text-sm font-medium">Guides / Asset Management</span>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-[var(--wp-color-text)]">Asset Management Setup</h1>
        <p className="text-[var(--wp-color-text-muted)] mt-2 max-w-3xl">
          Build a clear asset hierarchy by selecting a plant, creating departments, adding lines and stations, and
          placing assets where work happens. Follow these steps to keep maintenance and reporting organized.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to} className="inline-flex">
            <Button variant="outline">{link.label}</Button>
          </Link>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {steps.map((step) => (
        <Card key={step.title} className="h-full">
          <div className="flex gap-3 items-start">
            <div className="p-3 rounded-lg bg-primary-50">{step.icon}</div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--wp-color-text)]">{step.title}</h2>
                <p className="text-[var(--wp-color-text-muted)] mt-1">{step.description}</p>
              </div>
              <div className="space-y-2">
                {step.actions.map((action) => (
                  <div key={action} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success-600 mt-0.5" />
                    <p className="text-[var(--wp-color-text)]">{action}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-md bg-primary-50 text-primary-900 text-sm px-3 py-2 border border-primary-100">
                Tip: {step.tip}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

export default AssetManagementGuide;

