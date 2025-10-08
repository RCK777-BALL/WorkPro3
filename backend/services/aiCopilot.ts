/*
 * SPDX-License-Identifier: MIT
 */

export interface AIAssistResult {
  summary: string;
  riskScore: number;
}

type CopilotResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

export async function getWorkOrderAssistance(
  workOrder: { title: string; description?: string }
): Promise<AIAssistResult> {
  const url = process.env.AI_COPILOT_URL;
  const apiKey = process.env.AI_COPILOT_KEY;

  if (!url) return { summary: '', riskScore: 0 };

  const payload = {
    model: process.env.AI_COPILOT_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You summarize maintenance work orders and estimate a risk score from 0 (low) to 1 (high).' },
      { role: 'user', content: `Work order titled "${workOrder.title}" with description "${workOrder.description ?? ''}"` },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'work_order_assist',
        schema: {
          type: 'object',
          properties: { summary: { type: 'string' }, riskScore: { type: 'number' } },
          required: ['summary', 'riskScore'],
        },
      },
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as CopilotResponse; // <<— give it a type
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content');

    const parsed = JSON.parse(content) as Partial<AIAssistResult>;
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      riskScore: typeof parsed.riskScore === 'number' ? parsed.riskScore : 0,
    };
  } catch {
    return { summary: '', riskScore: 0 };
  }
}
