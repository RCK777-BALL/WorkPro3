/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import type { CalendarEvent } from './api';

interface Props {
  events: CalendarEvent[];
  timeZone?: string;
}

const CalendarView: React.FC<Props> = ({ events, timeZone }) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <ul>
      {events.map((evt) => (
        <li key={evt.id} data-testid="event">
          <span>{evt.title}</span>
          <time data-testid="event-time" dateTime={evt.date}>
            {formatter.format(new Date(evt.date))}
          </time>
        </li>
      ))}
    </ul>
  );
};

export default CalendarView;
