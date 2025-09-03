import { describe, it, expect, vi } from 'vitest';
import { getWorkOrderAssistance } from '../services/aiCopilot';

const sampleWorkOrder = { title: 'Pump failure', description: 'Motor overheating' } as any;

describe('aiCopilot service', () => {
  it('composes prompt with work order details', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ summary: 'ok', riskScore: 0.4 }),
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await getWorkOrderAssistance(sampleWorkOrder);
    const body = mockFetch.mock.calls[0][1].body as string;
    expect(body).toContain('Pump failure');
    expect(body).toContain('Motor overheating');
    vi.unstubAllGlobals();
  });

  it('returns fallback on failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fail'));
    vi.stubGlobal('fetch', mockFetch);
    const res = await getWorkOrderAssistance(sampleWorkOrder);
    expect(res).toEqual({ summary: '', riskScore: 0 });
    vi.unstubAllGlobals();
  });
});
