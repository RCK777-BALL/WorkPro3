import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from './Button';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-error-100 rounded-full">
          <AlertTriangle className="w-8 h-8 text-error-600" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4">{t('error.title')}</h2>
        <p className="text-neutral-600 text-center mb-6">{error.message}</p>
        <div className="text-center">
          <Button
            variant="primary"
            onClick={resetErrorBoundary}
          >
            {t('error.tryAgain')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
