import { render, screen } from '@testing-library/react';
import CalendarView from './CalendarView';
import React from 'react';

describe('CalendarView', () => {
  const events = [
    { id: '1', title: 'Test', date: '2024-01-01T12:00:00Z' },
  ];

  it('renders events', () => {
    render(<CalendarView events={events} timeZone="UTC" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('formats dates in different timezones', () => {
    const { rerender } = render(<CalendarView events={events} timeZone="UTC" />);
    const utcTime = screen.getByTestId('event-time').textContent;
    rerender(<CalendarView events={events} timeZone="America/New_York" />);
    const nyTime = screen.getByTestId('event-time').textContent;
    expect(utcTime).not.toBe(nyTime);
  });
});
