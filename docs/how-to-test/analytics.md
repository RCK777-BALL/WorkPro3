# Analytics Testing Guide

Use this checklist to validate downtime events and maintenance analytics.

## backend API checks

1. Seed data (if needed):
   ```bash
   cd backend
   npm run seed
   ```
2. Validate maintenance metrics JSON:
   ```bash
   curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/analytics/maintenance"
   ```
3. Validate maintenance metrics exports:
   ```bash
   curl -I -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/analytics/maintenance.csv"
   curl -I -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/analytics/maintenance.xlsx"
   ```
4. Downtime events list:
   ```bash
   curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/downtime-events"
   ```
5. Downtime events export:
   ```bash
   curl -I -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/downtime-events/export.csv"
   curl -I -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/downtime-events/export.xlsx"
   ```

## frontend checks

1. Start the app:
   ```bash
   npm run dev
   ```
2. Open **Analytics → Maintenance Dashboard**:
   - Confirm MTTR, MTBF, backlog, and PM compliance values render.
   - Validate CSV/XLSX export buttons download files.
3. Open **Operations → Downtime Events**:
   - Confirm the event table loads.
   - Apply filters and verify the table updates.
   - Validate CSV/XLSX export buttons download files.
