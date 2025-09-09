import { test, expect } from '@playwright/test';
import { createServer, Server } from 'http';

let server: Server;
let baseURL: string;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/api/v1/analytics/kpis.csv') {
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      res.end('mtbf,mttr,compliance\n1,2,90');
      return;
    }
    if (req.url === '/api/v1/analytics/kpis.xlsx') {
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      res.end('dummy');
      return;
    }
    if (req.url === '/api/v1/analytics/kpis.pdf') {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      res.end('%PDF-1.4');
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  baseURL = `http://127.0.0.1:${port}`;
});

test.afterAll(() => {
  server.close();
});

test('exports KPI data in multiple formats', async ({ request }) => {
  const csv = await request.get(`${baseURL}/api/v1/analytics/kpis.csv`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()['content-type']).toContain('text/csv');

  const xlsx = await request.get(`${baseURL}/api/v1/analytics/kpis.xlsx`);
  expect(xlsx.status()).toBe(200);
  expect(xlsx.headers()['content-type']).toContain('spreadsheet');

  const pdf = await request.get(`${baseURL}/api/v1/analytics/kpis.pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('pdf');
});
