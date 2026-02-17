import { useState } from 'react';
import { useRequests } from '../api/useRequests';

const priorities = ['low', 'medium', 'high', 'critical'];

export default function RequestPortal() {
  const { submitRequest } = useRequests();
  const [form, setForm] = useState({
    title: '',
    description: '',
    requesterName: '',
    requesterEmail: '',
    priority: 'medium',
  });
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await submitRequest(form, photos ?? undefined);
      setResult(response.data?.token ?? response.data?.requestId ?? 'Submitted');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Submit a Maintenance Request</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          className="w-full border rounded p-2"
          placeholder="Request title"
          required
        />
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          className="w-full border rounded p-2"
          placeholder="Describe the issue"
          rows={4}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="requesterName"
            value={form.requesterName}
            onChange={handleChange}
            className="w-full border rounded p-2"
            placeholder="Your name"
            required
          />
          <input
            name="requesterEmail"
            value={form.requesterEmail}
            onChange={handleChange}
            className="w-full border rounded p-2"
            placeholder="Email"
            type="email"
          />
        </div>
        <select name="priority" value={form.priority} onChange={handleChange} className="border rounded p-2 w-full">
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input type="file" multiple accept="image/*" onChange={(e) => setPhotos(e.target.files)} />
        <button
          type="submit"
          disabled={submitting}
          className="bg-[var(--wp-color-primary)] text-[var(--wp-color-text)] px-4 py-2 rounded disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
      {result && <p className="mt-4 text-green-600">Request submitted! Tracking token: {result}</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
}

