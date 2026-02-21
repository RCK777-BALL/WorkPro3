/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@/components/common/Card';
import { ArrowUp, ArrowDown } from 'lucide-react';

const MaintenanceMetrics: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-white">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Completion Rate</p>
            <p className="text-2xl font-semibold mt-1 text-white">94.2%</p>
            <div className="flex items-center mt-2 text-white">
              <ArrowUp size={16} />
              <span className="text-sm ml-1">2.1% from last month</span>
            </div>
          </div>
          <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Overdue Tasks</p>
            <p className="text-2xl font-semibold mt-1 text-white">7</p>
            <div className="flex items-center mt-2 text-white">
              <ArrowUp size={16} />
              <span className="text-sm ml-1">3 more than last week</span>
            </div>
          </div>
          <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Scheduled This Week</p>
            <p className="text-2xl font-semibold mt-1 text-white">23</p>
            <div className="flex items-center mt-2 text-white">
              <ArrowUp size={16} />
              <span className="text-sm ml-1">5 more than last week</span>
            </div>
          </div>
          <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Average Duration</p>
            <p className="text-2xl font-semibold mt-1 text-white">2.4h</p>
            <div className="flex items-center mt-2 text-white">
              <ArrowDown size={16} />
              <span className="text-sm ml-1">0.3h less than average</span>
            </div>
          </div>
          <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MaintenanceMetrics;
