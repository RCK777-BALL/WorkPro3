import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import RouteWorkflow from './RouteWorkflow';

describe('RouteWorkflow', () => {
  const tasks = [
    { id: '1', title: 'A' },
    { id: '2', title: 'B' },
  ];

  it('progresses through tasks sequentially', () => {
    render(<RouteWorkflow tasks={tasks} />);
    expect(screen.getByTestId('current-task').textContent).toBe('A');
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByTestId('current-task').textContent).toBe('B');
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByTestId('complete')).toBeInTheDocument();
  });
});
