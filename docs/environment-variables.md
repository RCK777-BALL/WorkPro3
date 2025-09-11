# Environment Variables

The application uses the following environment variables. All names use `UPPER_SNAKE_CASE`.

## Backend

| Variable | Description | Default |
| --- | --- | --- |
| `JWT_SECRET` | Secret used to sign JWT tokens | required |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/platinum_cmms` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `PORT` | Port the server listens on | `5010` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiter window in ms | `900000` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `NODE_ENV` | Node environment | `development` |
| `COOKIE_SECURE` | Enable secure cookies | optional |
| `PM_SCHEDULER_CRON` | CRON schedule for PM tasks | `*/5 * * * *` |
| `PM_SCHEDULER_TASK` | Path to PM scheduler task | `./tasks/pmSchedulerTask` |
| `DEFAULT_TENANT_ID` | Default tenant identifier | optional |

## Frontend

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend API base URL |
| `VITE_WS_URL` | WebSocket URL |
| `VITE_WS_PATH` | WebSocket path |
| `VITE_HTTP_ORIGIN` | (optional) HTTP origin override |
| `VITE_SUPABASE_URL` | (optional) Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | (optional) Supabase anonymous key |

