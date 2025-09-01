import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface Field {
  name: string;
  label: string;
  type?: string;
}

const Portal: React.FC = () => {
  const { slug = 'default' } = useParams();
  const [fields, setFields] = useState<Field[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch(`/api/request-portal/${slug}`)
      .then((res) => res.json())
      .then((data) => setFields(Array.isArray(data) ? data : []))
      .catch(() => setFields([]));
  }, [slug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/request-portal/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, captcha: formData.captcha || 'valid-captcha' }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm font-medium">
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type={field.type || 'text'}
            value={formData[field.name] || ''}
            onChange={handleChange}
            className="border p-2 w-full"
          />
        </div>
      ))}
      <div>
        <label htmlFor="captcha" className="block text-sm font-medium">
          CAPTCHA
        </label>
        <input
          id="captcha"
          name="captcha"
          type="text"
          value={formData.captcha || ''}
          onChange={handleChange}
          className="border p-2 w-full"
        />
      </div>
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Submit
      </button>
    </form>
  );
};

export default Portal;
