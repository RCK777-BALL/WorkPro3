# Environment Variables

The application uses the following environment variables. All names use `UPPER_SNAKE_CASE`.

## Backend

| Variable | Description | Default |
| --- | --- | --- |
| `JWT_SECRET` | Secret used to sign JWT tokens | required |
| `MONGO_URI` | MongoDB connection string (supports auth/TLS options). | `mongodb://workpro_app:change-me@localhost:27017/workpro?authSource=workpro&tls=true&tlsCAFile=./docker/mongo/tls/ca.crt` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `PORT` | Port the server listens on | `5010` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiter window in ms | `900000` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `NODE_ENV` | Node environment | `development` |
| `COOKIE_SECURE` | Enable secure cookies | optional |
| `PM_SCHEDULER_CRON` | CRON schedule for PM tasks | `*/5 * * * *` |
| `PM_SCHEDULER_TASK` | Path to PM scheduler task | `./tasks/PMSchedulerTask` |
| `LABOR_RATE` | Hourly labor rate for cost calculations | `50` |
| `DEFAULT_TENANT_ID` | Default tenant identifier | optional |
| `ENABLE_OIDC_SSO` | Enable built-in OIDC providers (Okta/Azure) | `true` |
| `ENABLE_SAML_SSO` | Enable SAML endpoints | `false` |
| `ENABLE_SCIM_API` | Enable SCIM provisioning endpoints | `false` |
| `ENABLE_NOTIFICATION_EMAIL` | Enable notification email delivery | `true` |
| `SCIM_BEARER_TOKEN` | Token expected in `Authorization: Bearer` for SCIM | optional |

### MongoDB bootstrap (Docker Compose/Kubernetes)

| Variable | Description | Default |
| --- | --- | --- |
| `MONGO_INITDB_ROOT_USERNAME` | Root user created by the MongoDB container on first boot. | `workpro_root` |
| `MONGO_INITDB_ROOT_PASSWORD` | Root password created by the MongoDB container on first boot. | `change-me` |
| `MONGO_APP_USER` | Application user created for the `workpro` database. | `workpro_app` |
| `MONGO_APP_PASSWORD` | Application user password for the `workpro` database. | `change-me` |
| `MONGO_APP_DB` | Database name used for the WorkPro app. | `workpro` |

## Frontend

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend API base URL |
| `VITE_WS_URL` | WebSocket URL |
| `VITE_WS_PATH` | WebSocket path |
| `VITE_HTTP_ORIGIN` | (optional) HTTP origin override |
| `VITE_SUPABASE_URL` | (optional) Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | (optional) Supabase anonymous key |
