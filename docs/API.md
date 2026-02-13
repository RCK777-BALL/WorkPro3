# API Overview

## Authentication
- `POST /auth/login` – obtain access token
- `POST /auth/refresh` – refresh token

## Assets
- `GET /assets` – list assets
- `POST /assets` – create asset
- `GET /assets/:assetId` – asset detail

## Work Orders
- `GET /work-orders` – list work orders
- `POST /work-orders` – create work order
- `GET /work-orders/:workOrderId` – work order detail

## Preventive Maintenance
- `GET /pm` – list PM tasks
- `POST /pm` – create PM task

## Purchase Orders
- `GET /purchase-orders` – list POs
- `POST /purchase-orders` – create PO
- `POST /purchase-orders/:purchaseOrderId/receive` – receive PO

## Offline Sync
- `POST /sync/actions` – submit offline action queue

## Health & Metrics
- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
