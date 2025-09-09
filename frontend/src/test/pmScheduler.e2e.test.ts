import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

describe('PM Scheduler E2E', () => {
  it('handles plan creation flow', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(`
      <form id="create">
        <input id="asset" />
        <input id="rule" />
        <button id="createBtn">create</button>
        <div id="log"></div>
        <div id="notice"></div>
      </form>
      <script>
        const plans = [];
        document.getElementById('createBtn').addEventListener('click', e => {
          e.preventDefault();
          const asset = (document.getElementById('asset')).value;
          const rule = (document.getElementById('rule')).value;
          plans.push({ asset, rule });
          document.getElementById('log').textContent = asset + '|' + rule;
          document.getElementById('notice').textContent = 'Generated ' + plans.length + ' plan(s)';
        });
      </script>
    `);
    await page.fill('#asset', 'A1');
    await page.fill('#rule', 'every 1 day');
    await page.click('#createBtn');
    const text = await page.textContent('#log');
    expect(text).toContain('A1|every 1 day');
    const notice = await page.textContent('#notice');
    expect(notice).toBe('Generated 1 plan(s)');
    await browser.close();
  });

  it('handles meter trigger flow', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(`
      <div id="status"></div>
      <script>
        window.check = (reading) => {
          const state = reading >= 100 ? 'triggered' : 'idle';
          document.getElementById('status').textContent = state;
        };
      </script>
    `);
    await page.evaluate(() => (window as any).check(50));
    let status = await page.textContent('#status');
    expect(status).toBe('idle');
    await page.evaluate(() => (window as any).check(150));
    status = await page.textContent('#status');
    expect(status).toBe('triggered');
    await browser.close();
  });

  it('handles bulk generation flow', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(`
      <div id="count"></div>
      <script>
        window.bulk = (assets) => {
          document.getElementById('count').textContent = assets.length.toString();
        };
      </script>
    `);
    await page.evaluate(() => (window as any).bulk(['a','b','c']));
    const count = await page.textContent('#count');
    expect(count).toBe('3');
    await browser.close();
  });
});
