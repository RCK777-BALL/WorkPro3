# Mobile API

The mobile API exposes a minimal, versioned surface area for React Native clients under the `/api/mobile/v1` prefix. All routes are JSON-only (except for attachment uploads) and are scoped to the authenticated tenant and user.

## Authentication and scopes

1. Obtain a JWT by calling the existing `/api/auth/login` endpoint and include `client: "mobile"` in the request body.
2. Tokens issued for mobile clients automatically receive the `mobile:access` scope.
3. Every `/api/mobile/*` route requires:
   - A `Bearer` token in the `Authorization` header.
   - The `mobile:access` scope embedded in the JWT.

```jsonc
POST /api/auth/login
{
  "email": "tech@example.com",
  "password": "secret",
  "client": "mobile"
}
```

The response contains the scoped JWT in the `token` field. Reuse that token for all subsequent mobile requests.

## Rate limiting

Mobile routes are protected by a dedicated rate limiter. Defaults can be configured via:

- `MOBILE_RATE_LIMIT_WINDOW_MS` (default `60000` ms)
- `MOBILE_RATE_LIMIT_MAX` (default `120` requests per window)

If the limit is exceeded the API replies with HTTP `429`.

## Work order list

```
GET /api/mobile/v1/work-orders
```

Query parameters:

| Name      | Type   | Description                                   |
|-----------|--------|-----------------------------------------------|
| `page`    | number | Page index (1-based, default `1`).            |
| `limit`   | number | Page size (default `20`, max `100`).          |
| `status`  | string | Optional work-order status filter.            |
| `assigned`| string | Use `assigned=me` to only fetch own jobs.      |
| `search`  | string | Case-insensitive match against the title.     |

Sample response:

```jsonc
{
  "data": {
    "items": [
      {
        "id": "665cb6be21c2c1a1d4302a60",
        "title": "Line 4 bearing inspection",
        "status": "in_progress",
        "priority": "high",
        "type": "preventive",
        "assetId": "665cb6be21c2c1a1d4302331",
        "assignedTo": "665cb69ce1ab8f10d092239b",
        "updatedAt": "2024-05-21T13:26:12.382Z",
        "dueDate": "2024-05-22T12:00:00.000Z",
        "lineId": "663d9e7ab6fdc1524e2cfe11",
        "stationId": "663d9e7ab6fdc1524e2cff02"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 87
    }
  }
}
```

## Asset lookup

```
GET /api/mobile/v1/assets?q=press
```

- `q` / `search`: required case-insensitive term that matches `name` or `serialNumber`.
- `limit`: optional max results (default `10`, max `50`).

The API responds with lightweight asset summaries containing `id`, `name`, `serialNumber`, `type`, `status`, `line`, `station`, and `location`.

## Attachment upload

```
POST /api/mobile/v1/attachments
Content-Type: multipart/form-data
body: { file: <binary> }
```

- Files are capped at 10 MB.
- Uploaded files are stored under `/static/uploads/mobile/` and the response includes the public URL.

Sample response:

```jsonc
{
  "data": {
    "id": "1716309897123-902123456.png",
    "url": "/static/uploads/mobile/1716309897123-902123456.png",
    "mimeType": "image/png",
    "size": 482351,
    "originalName": "bearing.png"
  }
}
```

## Offline queue

The queue helps devices capture work that was created offline and reconcile it later.

### Fetch pending actions

```
GET /api/mobile/v1/offline-queue?status=pending&limit=50
```

Returns the most recent actions for the current user (default status `pending`).

### Enqueue a new action

```
POST /api/mobile/v1/offline-queue
{
  "type": "work_order_update",
  "payload": {
    "workOrderId": "665cb6be21c2c1a1d4302a60",
    "notes": "Completed lubrication checks"
  }
}
```

### Mark an action as processed

```
POST /api/mobile/v1/offline-queue/:id/complete
```

Transitions the action to the `processed` status and stamps `processedAt`.

Each action is automatically scoped to the authenticated user and tenant, so users cannot read or mutate entries belonging to other tenants.
