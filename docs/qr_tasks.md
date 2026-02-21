# QR Code Feature Task Breakdown

## backend
- Add `qrCode` field to asset and inventory/part models and ensure it is persisted.
- Implement QR generation utility in `backend/services/qrCode.ts` used during asset/part create and update flows.
- Expose `qrCode` in asset and part controllers and related REST routes.

## Web frontend
- On asset detail pages (`frontend/src/pages/assets/*`), add a "Print QR Label" action that opens a printable label view.
- On inventory/part detail pages (`frontend/src/pages/inventory/*`), add the same print action.
- Build reusable QR label component under `frontend/src/components/qr` and wire it to the new actions.

## Mobile
- Add QR scan entry flow in `frontend/mobile/src/features/scan` to look up assets, start work orders, and complete them via existing APIs.

## Testing
- Add unit tests for QR generation utility.
- Add UI unit and Playwright e2e tests covering QR rendering and print actions.
