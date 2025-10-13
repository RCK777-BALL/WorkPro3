# Login Flow Fix Tasks

The following tasks address the issues discovered during the login audit.

## 1. Request Schema Alignment
- [ ] Update the Zod schema in the login route to accept only the exact payload sent by the frontend (`email`, `password`, optional `remember`).
- [ ] Ensure the frontend's login form sends the correct payload keys and types (`remember` boolean, no `rememberMe`).
- [ ] Add integration tests that cover malformed payloads (missing fields, extra keys, wrong types) to assert the error messaging and status codes.

## 2. Improve Error Feedback
- [ ] Differentiate schema validation failures from credential failures by returning descriptive error messages and logging the validation result server-side.
- [ ] Add structured logging around failed login attempts to aid debugging while avoiding sensitive data exposure.

## 3. Unknown Email Handling
- [ ] Add a unit/integration test that covers login attempts with an unknown email to verify the dummy comparison path.
- [ ] Update onboarding and data seeding scripts to ensure user emails exist where expected.

## 4. Missing Password Hashes
- [ ] Audit the user creation/update flows to guarantee `passwordHash` is populated and selected in queries by default.
- [ ] Add a database migration or script that flags existing users missing a `passwordHash`.
- [ ] Extend the login handler test suite to cover users without hashes to ensure graceful failure and monitoring.

## 5. Password Mismatch Handling
- [ ] Confirm bcrypt comparison errors bubble up correctly and add retry guidance in the UI for end users.
- [ ] Instrument monitoring/metrics for repeated password mismatches to detect brute-force attempts.

## 6. Request Consistency Checks
- [ ] Document the required `POST /auth/login` request format (headers, body) in the API docs.
- [ ] Add contract tests between the frontend client and backend login endpoint to prevent future drift.
