import React from 'react';

export const CalibrationExport: React.FC = () => {
  const handleExport = (): void => {
    // Placeholder export handler
    // Actual export implementation will stream calibration data
    // or trigger a file download when backend support is available.
    // eslint-disable-next-line no-console
    console.info('Calibration export requested');
  };

  return (
    <div className="calibration-export">
      <h3>Calibration Export</h3>
      <button type="button" onClick={handleExport}>
        Export calibration data
      </button>
    </div>
  );
};
