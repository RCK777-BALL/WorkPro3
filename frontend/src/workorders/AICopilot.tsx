import { useState } from 'react';
import Button from '../components/common/Button';
import http from '../lib/http';

interface Props {
  workOrderId: string;
}

const AICopilot: React.FC<Props> = ({ workOrderId }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [risk, setRisk] = useState<number | null>(null);
  const [error, setError] = useState('');

  const fetchAssist = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await http.get(`/workorders/${workOrderId}/assist`);
      setSummary(res.data.summary);
      setRisk(res.data.riskScore);
    } catch (_err) {
      setError('Unable to fetch suggestions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-md p-4 space-y-3">
      <Button onClick={fetchAssist} loading={loading} variant="outline">
        Get AI Suggestions
      </Button>
      {error && <div className="text-error-600 text-sm">{error}</div>}
      {summary && (
        <div className="text-sm">
          <div className="font-semibold mb-1">Summary</div>
          <p className="mb-2">{summary}</p>
          <div className="font-semibold">Risk Score: {risk?.toFixed(2)}</div>
        </div>
      )}
    </div>
  );
};

export default AICopilot;
