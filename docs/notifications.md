# Notifications

## Inbox APIs

The notifications inbox supports pagination, filtering, and bulk mark-as-read.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/notifications/inbox` | List notifications for the signed-in user (supports `page`, `limit`, `read`, `category`). |
| `POST` | `/api/notifications/read-all` | Mark all unread notifications in the inbox as read. |

The inbox response includes `items`, `total`, `page`, `limit`, and `unreadCount` fields.

## Feature flag: email delivery

Use `ENABLE_NOTIFICATION_EMAIL=false` to disable notification emails (in-app and socket delivery still function).
