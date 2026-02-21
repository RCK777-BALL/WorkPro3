import React from 'react';

const Admin: React.FC = () => {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Admin</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)]">Manage users, roles, and permissions.</p>
      </header>

      <section className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--wp-color-text)]">Role management</h2>
        <p className="mt-2 text-sm text-[var(--wp-color-text-muted)]">
          Configure role templates and permission assignments. Tenant/site scope controls will appear here.
        </p>
      </section>
    </div>
  );
};

export default Admin;

