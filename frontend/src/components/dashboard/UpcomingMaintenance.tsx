/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Calendar, Clock, PenTool as Tool } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import type { MaintenanceType } from '@/types';
 

interface MaintenanceItem {
  id: string;
  assetName: string;
  assetId: string;
  date: string;
  type: MaintenanceType;
  assignedTo?: string;
  estimatedDuration: number;
}

interface UpcomingMaintenanceProps {
  maintenanceItems: MaintenanceItem[];
  onComplete?: (id: string) => void;
}

const UpcomingMaintenance: React.FC<UpcomingMaintenanceProps> = ({ maintenanceItems, onComplete }) => {
  // Function to format date in readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Function to determine if date is today
  const isToday = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0);
  };
  
  // Function to determine if date is this week
  const isThisWeek = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastDay = new Date(firstDay);
    lastDay.setDate(lastDay.getDate() + 6);
    
    return date >= firstDay && date <= lastDay;
  };
  
  return (
    <Card 
      title="Upcoming Maintenance"
      subtitle="Next scheduled maintenance activities"
      headerActions={
        <Link to="/maintenance/upcoming" className="text-sm text-primary-700 font-medium hover:text-primary-800">
          View All
        </Link>
      }
    >
      <div className="space-y-4">
        {maintenanceItems.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-white border border-neutral-200 rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{item.assetName}</h4>
                <p className="text-sm text-neutral-500">Asset ID: {item.assetId}</p>
              </div>
              <Badge
                text={item.type}
                size="sm"
              />
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center text-sm">
                <Calendar size={16} className="mr-2 text-neutral-500" />
                <span className={isToday(item.date) ? 'text-error-600 font-medium' : ''}>
                  {isToday(item.date) ? 'Today' : isThisWeek(item.date) ? 'This Week' : formatDate(item.date)}
                </span>
              </div>

              <div className="flex items-center text-sm">
                <Clock size={16} className="mr-2 text-neutral-500" />
                <span>{item.estimatedDuration} {item.estimatedDuration === 1 ? 'hour' : 'hours'}</span>
              </div>

              {item.assignedTo && (
                <div className="flex items-center text-sm col-span-2">
                  <Tool size={16} className="mr-2 text-neutral-500" />
                  <span>Assigned to {item.assignedTo}</span>
                </div>
              )}
            </div>

            {onComplete && (
              <div className="mt-3 text-right">
                <button
                  onClick={() => onComplete(item.id)}
                  className="text-sm text-primary-700 hover:underline"
                  aria-label={`Complete maintenance for ${item.assetName}`}
                >
                  Complete
                </button>
              </div>
            )}
          </div>
        ))}
        
        {maintenanceItems.length === 0 && (
          <div className="py-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
              <Calendar size={24} className="text-neutral-500" />
            </div>
            <p className="text-neutral-500">No upcoming maintenance scheduled</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default UpcomingMaintenance;
