/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

declare global {
  interface Window {
    initNavBar: () => void;
  }
}

window.initNavBar();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
