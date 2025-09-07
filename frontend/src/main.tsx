import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <h1>Hello WorkPro</h1>;
}

const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
