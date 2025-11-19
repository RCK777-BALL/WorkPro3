import React, { useEffect, useState } from 'react';

interface ApprovalRecord {
  approver: string;
  status: string;
  at: string;
}

interface CompletionRecord {
  id: string;
  templateId: string;
  completedBy: string;
  completedAt: string;
  status: string;
}

interface WorkOrderSafetyStatus {
  workOrderId: string;
  canStart: boolean;
  canClose: boolean;
  missing: string[];
  summary: {
    linkedTemplates: string[];
    approvals: ApprovalRecord[];
    completions: CompletionRecord[];
  };
}

interface Props {
  workOrderId: string;
}

const WorkOrderCompliance: React.FC<Props> = ({ workOrderId }) => {
  const [status, setStatus] = useState<WorkOrderSafetyStatus | null>(null);

  useEffect(() => {
    fetch(`/api/safety/work-orders/${workOrderId}/status`)
      .then((res) => res.json())
      .then((payload) => setStatus(payload.data))
      .catch(() => setStatus(null));
  }, [workOrderId]);

  if (!status) {
    return <p>Loading safety compliance…</p>;
  }

  return (
    <div className="workorder-compliance">
      <header>
        <h3>Safety compliance</h3>
        <p>Gate work order progress on required JSAs, permits, and inspections.</p>
      </header>
      <div className="gate-status">
        <div className={status.canStart ? 'ok' : 'warn'}>
          <strong>Start gate</strong>
          <span>{status.canStart ? 'Ready to start' : 'Link required safety templates'}</span>
        </div>
        <div className={status.canClose ? 'ok' : 'warn'}>
          <strong>Close gate</strong>
          <span>{status.canClose ? 'Ready to close' : 'Pending safety checks'}</span>
        </div>
      </div>

      {status.missing.length > 0 ? (
        <div className="missing">
          <h4>Outstanding items</h4>
          <ul>
            {status.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section>
        <h4>Linked templates</h4>
        <ul>
          {status.summary.linkedTemplates.map((templateId) => (
            <li key={templateId}>{templateId}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4>Approvals</h4>
        <ul>
          {status.summary.approvals.map((approval, index) => (
            <li key={`${approval.approver}-${index}`}>
              {approval.approver}: {approval.status} on {new Date(approval.at).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4>Checklist completions</h4>
        <ul>
          {status.summary.completions.map((completion) => (
            <li key={completion.id}>
              {completion.templateId} — {completion.status} by {completion.completedBy} at{' '}
              {new Date(completion.completedAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default WorkOrderCompliance;
