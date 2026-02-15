import React from 'react';

const Admin: React.FC = () => {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">Admin</h1>
        <p className="text-sm text-neutral-500">Manage users, roles, and permissions.</p>
      </header>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Role management</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Configure role templates and permission assignments. Tenant/site scope controls will appear here.
        </p>
      </section>
    </div>
  );
};

export default Admin;
