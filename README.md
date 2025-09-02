# WorkPro

This repository contains a small full‑stack app split into two folders:

- **Backend** – Express API server with a MongoDB database and Socket.IO.
- **Frontend** – React client built with Vite.

## Project structure

```
WorkPro/
 Backend/   Express API and tests
  Frontend/  React client and tests
  playground-1.mongodb.js  Sample MongoDB script
```

Run `npm install` inside each folder before development. Node modules are
not committed to the repository.

## Backend setup

1. `cd Backend`
2. Copy `Backend/.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
    Update the required environment variables such as `MONGO_URI`, `JWT_SECRET`,
   and `CORS_ORIGIN`. The example connection string uses
   `mongodb://localhost:27017/platinum_cmms`.
 
3. Seed the database with a tenant and admin account:
   ```bash
   npm run seed:admin
   ```
4. Install dependencies with `npm install`.
5. Start the development server:
   ```bash
   npm run dev
   ```
   The server expects a running MongoDB instance. Override `MONGO_URI` if your
   database is not at the default location.

## Frontend setup

1. `cd Frontend`
2. Copy `Frontend/.env.example` to `.env` and update `VITE_API_URL`,
    `VITE_WS_URL`, and `VITE_WS_PATH`.
 
3. Install dependencies with `npm install`.
4. Run the development server:
   ```bash
   npm run dev
   ```
   The app will open at [http://localhost:5173](http://localhost:5173).

### Offline mode

If `VITE_WS_URL` or `VITE_SOCKET_PATH` is empty, or the browser is offline, work order updates are
queued in `localStorage` under `offline-queue`. Once the WebSocket defined by `VITE_WS_URL` and `VITE_SOCKET_PATH` is restored, the queue is flushed and the requests are sent to the API.

## Docker development

The project includes Dockerfiles for the backend and frontend. Before starting
the stack, define `JWT_SECRET` in your environment or in a `.env` file so Docker
Compose can pass it to the backend container:

```bash
echo "JWT_SECRET=change_me" > .env
docker compose up --build
```

The API is available at `http://localhost:5010` and the web client at
`http://localhost:5173`.

### Kubernetes manifests

Sample manifests live in the `k8s/` folder. Create a secret containing
`JWT_SECRET` before applying the manifests:

```bash
kubectl create secret generic jwt-secret --from-literal=JWT_SECRET=change_me
kubectl apply -f k8s/
```

This will deploy the backend, frontend and ingress resources.

## Running tests

- **Backend**: `cd Backend && npm test`
- **Frontend unit tests**: `cd Frontend && npm run test`
- **Frontend e2e tests**: `cd Frontend && npm run test:e2e`

Both test suites use Vitest and enforce a minimum of 80% code coverage. Backend
tests spin up a temporary MongoDB using `mongodb-memory-server`, which
downloads a MongoDB binary the first time it runs. Make sure network access is
allowed when running the tests for the first time or the download will fail.
See [Backend/tests/README.md](Backend/tests/README.md) for more details about
the download requirement. All pull requests must have a green CI run before
they can be merged. The testing matrix and workflow are described in
[docs/testing.md](docs/testing.md).

## Offline queue

The frontend stores any API requests made while offline in local storage. When
the browser regains connectivity, the queued requests are automatically sent
using the browser's `online` event even if the WebSocket defined by `VITE_WS_URL` and `VITE_SOCKET_PATH` fails to reconnect.

## License

This project is licensed under the [MIT License](LICENSE).


## Dashboard Acceptance Tests

- Real numbers load with API running.
- Live Data ON updates KPIs within 5 s on backend changes.
- Socket outage triggers polling within 10 s.
- Live Data OFF disables socket and polling.
- CSV/PDF export produces correct files.
- Layout customization persists after reload.
- Drill-through links apply correct filters.
