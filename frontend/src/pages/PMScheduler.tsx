/*
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { Event as RBCEvent, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Button from '@/components/common/Button';
import AssetSelector from '@/pm/AssetSelector';
import RecurrenceRuleForm from '@/pm/RecurrenceRuleForm';

interface Plan {
  asset: string;
  nextDue: string;
}

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
}

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const PMScheduler: React.FC = () => {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [assets, setAssets] = useState<string[]>([]);
  const [rule, setRule] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [notice, setNotice] = useState('');
 

  const generate = () => {
    const next = new Date().toISOString().slice(0, 10);
    const newPlans = assets.map(a => ({ asset: a, nextDue: next }));
    setPlans(prev => [...prev, ...newPlans]);
    setNotice(`Generated ${newPlans.length} plan${newPlans.length !== 1 ? 's' : ''}`);
    setAssets([]);
    setRule('');
  };

  const events = useMemo(
    () =>
      plans.map(p => ({
        title: p.asset,
        start: new Date(p.nextDue),
        end: new Date(p.nextDue),
      })),
    [plans]
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">PM Scheduler</h1>
        <div className="space-x-2">
          <Button
            variant={view === 'calendar' ? 'primary' : 'outline'}
            onClick={() => setView('calendar')}
          >
            Calendar
          </Button>
          <Button
            variant={view === 'list' ? 'primary' : 'outline'}
            onClick={() => setView('list')}
          >
            List
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <AssetSelector value={assets} onChange={setAssets} />
        <RecurrenceRuleForm value={rule} onChange={setRule} />
        <Button
          variant="primary"
          onClick={generate}
          disabled={!assets.length || !rule}
        >
          Generate Plans
        </Button>
        {notice && <p className="text-sm text-success-700">{notice}</p>}
      </div>

      {view === 'calendar' ? (
        <div className="border p-4">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            selectable
            onSelectEvent={(e: RBCEvent) => {
              setSelectedEvent({
                title: e.title as string,
                start: e.start as Date,
                end: e.end as Date,
              });
              setSelectedDate(null);
            }}
            onSelectSlot={(slot: SlotInfo) => {
              setSelectedDate(slot.start as Date);
              setSelectedEvent(null);
            }}
          />
          {selectedEvent && (
            <div className="mt-4 p-2 border rounded">
              <p className="font-semibold">{selectedEvent.title}</p>
              <p>{selectedEvent.start.toDateString()}</p>
            </div>
          )}
          {selectedDate && (
            <div className="mt-4 p-2 border rounded">
              <p className="font-semibold">Selected Date</p>
              <p>{selectedDate.toDateString()}</p>
            </div>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {plans.map((p, i) => (
            <li key={i} className="py-2 flex justify-between">
              <span>{p.asset}</span>
              <span>{p.nextDue}</span>
            </li>
          ))}
          {plans.length === 0 && (
            <li className="py-2 text-neutral-500">No plans</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default PMScheduler;
