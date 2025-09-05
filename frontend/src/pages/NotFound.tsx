import React, { useEffect, useState } from 'react';

const NotFound: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const promptInstall = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setShowInstall(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-red-600 text-xl font-bold p-4">
      {showInstall && (
        <div className="mb-4">
          <button
            onClick={promptInstall}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Install App
          </button>
        </div>
      )}
      404 - Page Not Found
    </div>
  );
};

export default NotFound;
