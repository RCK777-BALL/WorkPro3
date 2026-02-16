import React from 'react';

export type CalibrationCertificateView = {
  id: string;
  instrumentId: string;
  fileName: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  issuedAt?: string;
  expiresAt?: string;
};

interface CertificateRepositoryProps {
  certificates: CalibrationCertificateView[];
  loading?: boolean;
}

export const CertificateRepository: React.FC<CertificateRepositoryProps> = ({
  certificates,
  loading = false,
}) => {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--wp-color-text)]">Calibration Certificates</h3>
        <p className="text-xs text-[var(--wp-color-text-muted)]">Latest uploaded documents</p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-[var(--wp-color-border)]">
        <table className="min-w-full divide-y divide-[var(--wp-color-border)] text-sm">
          <thead className="bg-[var(--wp-color-surface-elevated)]">
            <tr>
              <th className="px-3 py-2 text-left">File</th>
              <th className="px-3 py-2 text-left">Instrument</th>
              <th className="px-3 py-2 text-left">Issued</th>
              <th className="px-3 py-2 text-left">Expires</th>
              <th className="px-3 py-2 text-left">Uploaded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--wp-color-border)] bg-[var(--wp-color-surface)]">
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-[var(--wp-color-text-muted)]" colSpan={5}>
                  Loading certificates...
                </td>
              </tr>
            ) : certificates.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-[var(--wp-color-text-muted)]" colSpan={5}>
                  No certificates uploaded.
                </td>
              </tr>
            ) : (
              certificates
                .slice()
                .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))
                .map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <a
                        className="font-medium text-[var(--wp-color-primary)] hover:underline"
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.fileName}
                      </a>
                      <div className="text-xs text-[var(--wp-color-text-muted)]">by {item.uploadedBy}</div>
                    </td>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">{item.instrumentId}</td>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">
                      {item.issuedAt ? new Date(item.issuedAt).toLocaleDateString() : 'n/a'}
                    </td>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">
                      {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'n/a'}
                    </td>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">
                      {new Date(item.uploadedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
