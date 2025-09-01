# Frontend

This directory contains the React client built with Vite.

## Install dependencies

```bash
npm install
```

## Start the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` by default.

## Run unit tests

```bash
npm run test
```

This command runs all unit tests in `src/test`, including the offline queue
tests found in `src/test/offlineQueue.test.ts`.

## Run e2e tests

```bash
npm run test:e2e
```

The e2e tests spin up a temporary MongoDB instance using
[`mongodb-memory-server`](https://github.com/nodkz/mongodb-memory-server). On the
first run this package downloads a MongoDB binary from `fastdl.mongodb.org`.
Network access to that domain is therefore required unless you provide the
binary yourself. To run the tests offline, pre-download the binary or set
`DOWNLOAD_DIR` to a directory that already contains it.

## Build for production

```bash
npm run build
```

The optimized bundle is written to the `dist` folder.

## Environment variables

The following variables from `.env.example` configure the frontend:

- `VITE_API_URL` – Base URL for API requests. **This must be set**; the frontend
  throws an error if it's missing.
 - `VITE_SOCKET_URL` – WebSocket endpoint used for real‑time features. **This must be set** to receive live updates; leaving it empty falls back to offline mode.
- `CORS_ORIGIN` – Origin allowed when using the local API server.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the credentials from
your Supabase project dashboard.

### Offline mode

If `VITE_SOCKET_URL` is omitted or the browser goes offline, API requests made
from the Work Orders page are stored in `localStorage` and queued until the
WebSocket reconnects. The queued requests are then flushed automatically.

## Local API server

`backend/server.js` is a lightweight API server for development. It mirrors the main backend's CORS settings so the frontend behaves consistently. Start it with:

```bash
node backend/server.js
```

The server reads `MONGO_URI` and `CORS_ORIGIN` from your `.env`. Ensure `CORS_ORIGIN` matches the Vite dev server URL (e.g. `http://localhost:5173`) and update `VITE_API_URL` and `VITE_SOCKET_URL` if the API runs on a different host or port.

### Inventory route example

To create a new inventory part send a POST request to `/api/inventory` with a body matching the model:

```json
{
  "name": "Bearing",
  "description": "Spare bearing for conveyor",
  "partNumber": "BRG-1001",
  "quantity": 50,
  "unit": "pcs",
  "location": "Aisle 2 Bin 5",
  "minThreshold": 10,
  "reorderThreshold": 20,
  "lastRestockDate": "2023-08-31",
  "vendor": "<vendorId>",
  "asset": "<assetId>"
}
```

### Mobile QR entry

From the Inventory page you can tap **Scan QR** to capture a QR code with your phone's camera. The QR code should contain a JSON representation of the part fields. After scanning, the Add Part dialog opens prefilled with the decoded values for quick entry.

Authenticated example using `curl`:

```bash
curl -X POST "$VITE_API_URL/inventory" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d @part.json
```

## Persisted dashboard settings

The dashboard uses a small zustand store with the `persist` middleware. Your
selected timeframe, department filter, date range and any custom KPIs are saved
to `localStorage` under the key `dashboard-storage`. When you return to the
dashboard, these preferences are automatically loaded so your layout and filters
remain the same across sessions.
