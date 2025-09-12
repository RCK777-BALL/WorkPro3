/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import App from './App';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <MantineProvider>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </MantineProvider>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
