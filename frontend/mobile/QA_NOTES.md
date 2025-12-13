# Mobile scan and deep-link QA notes

## Device/emulator scenarios
- Camera/scan success: Covered via mocked QR workflow tests that load an asset and advance to the asset step. (Automated)
- Scan failure/permission denial: Error surface verified through invalid JSON payload handling in tests; real device permission prompts not executed in this environment. (Automated)
- Unsupported codes: Payloads with unsupported entity types return actionable errors. (Automated)
- Manual entry: Start-from-input path exercises JSON parsing errors and error recovery paths. (Automated)

## Deep-link navigation
- Asset QR payloads hydrate the asset step and allow work-order creation.
- Unsupported entity types (e.g., parts) block navigation with guard errors.
- Missing record responses or network errors keep the workflow on the scan step with user-facing guidance.

## Persistence/history
- Offline queue actions persist to localStorage and rehydrate on subsequent mounts.
- Conflict acceptance re-queues local changes for retry to preserve user action history.

## Notes
- Physical device/emulator runs and camera permissions were not executed in this environment. Automated coverage focuses on workflow parsing, guard rails, and persistence logic.
