import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

const LoginPage: React.FC = () => {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="space-y-4 w-full max-w-md">
        {showInstall && (
          <div className="flex justify-center">
            <button
              onClick={promptInstall}
              className="mb-4 px-4 py-2 rounded bg-blue-600 text-white"
            >
              Install App
            </button>
          </div>
        )}
        <LoginForm />
        <div className="flex justify-between text-sm">
          <Link to="/register" className="text-blue-600">Register</Link>
          <Link to="/forgot-password" className="text-blue-600">Forgot Password?</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
