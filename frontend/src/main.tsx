/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import App from './App';
import AppErrorBoundary from './components/common/AppErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MantineProvider>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </MantineProvider>
    </BrowserRouter>
  </React.StrictMode>
);
