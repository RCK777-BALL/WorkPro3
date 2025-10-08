/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';

const AppHeader: React.FC = () => {
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <header className="header-gradient flex h-16 items-center justify-between px-4 text-white">
      <span className="text-lg font-semibold">WorkPro</span>
      <span className="flex items-center gap-1 text-xs">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: `var(--color-${online ? 'online' : 'offline'})` }}
        />
        {online ? 'Online' : 'Offline'}
      </span>
    </header>
  );
};

export default AppHeader;
