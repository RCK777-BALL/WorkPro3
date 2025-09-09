import React, { useState } from 'react';
import Button from '../components/common/Button';
import AssetSelector from '../pm/AssetSelector';
import RecurrenceRuleForm from '../pm/RecurrenceRuleForm';

interface Plan {
  asset: string;
  nextDue: string;
}

const PMScheduler: React.FC = () => {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [assets, setAssets] = useState<string[]>([]);
  const [rule, setRule] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);

  const generate = () => {
    const next = new Date().toISOString().slice(0, 10);
    const newPlans = assets.map(a => ({ asset: a, nextDue: next }));
    setPlans([...plans, ...newPlans]);
    setAssets([]);
    setRule('');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">PM Scheduler</h1>
        <div className="space-x-2">
          <Button
            variant={view === 'calendar' ? 'primary' : 'outline'}
            onClick={() => setView('calendar')}
          >
            Calendar
          </Button>
          <Button
            variant={view === 'list' ? 'primary' : 'outline'}
            onClick={() => setView('list')}
          >
            List
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <AssetSelector value={assets} onChange={setAssets} />
        <RecurrenceRuleForm value={rule} onChange={setRule} />
        <Button
          variant="primary"
          onClick={generate}
          disabled={!assets.length || !rule}
        >
          Generate Plans
        </Button>
      </div>

      {view === 'calendar' ? (
        <div className="border p-4 min-h-[200px]">
          Calendar view placeholder ({plans.length} plans)
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {plans.map((p, i) => (
            <li key={i} className="py-2 flex justify-between">
              <span>{p.asset}</span>
              <span>{p.nextDue}</span>
            </li>
          ))}
          {plans.length === 0 && (
            <li className="py-2 text-neutral-500">No plans</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default PMScheduler;
