import { useState } from 'react';
import { useRequests } from '../api/useRequests';

export default function RequestStatus() {
  const { getStatus } = useRequests();
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await getStatus(token.trim());
      setStatus(res.data ?? res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Track Your Request</h1>
      <form className="flex gap-2" onSubmit={lookup}>
        <input
          className="flex-1 border rounded p-2"
          placeholder="Enter tracking token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button className="bg-[var(--wp-color-primary)] text-[var(--wp-color-text)] px-4 py-2 rounded" disabled={loading} type="submit">
          {loading ? 'Loading...' : 'Check'}
        </button>
      </form>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {status && (
        <div className="mt-6 border rounded p-4 space-y-2">
          <p className="font-medium">Status: {status.status}</p>
          <p>Title: {status.title}</p>
          <p>Description: {status.description}</p>
          {status.updates && (
            <div>
              <h2 className="font-semibold">Updates</h2>
              <ul className="list-disc pl-5">
                {status.updates.map((u: any, idx: number) => (
                  <li key={idx}>{u.label}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

