/*
 * SPDX-License-Identifier: MIT
 */

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
}

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const res = await fetch('/api/calendar');
  if (!res.ok) throw new Error('Failed to fetch calendar');
  return res.json();
}
