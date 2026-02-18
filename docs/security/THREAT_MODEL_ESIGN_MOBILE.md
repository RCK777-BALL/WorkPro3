# Threat Model: E-Sign + Mobile Auth

## Scope
- Work order e-sign approval flow
- Mobile native session handling
- Offline queue synchronization

## Assets to protect
- Auth tokens
- Signature identity and approval intent
- Compliance evidence payloads

## Threats
- Token theft from browser-accessible storage
- Signature spoofing without signer identity proof
- Tampering with compliance packet exports
- Replay of stale offline mutations

## Mitigations implemented
- Native shell token storage abstraction with secure plugin/preference path and in-memory cache fallback
- Biometric unlock gate for native technician shell access
- Approval API requires reason code and signer full name for approve/reject
- Approval log stores signature hash and signed timestamp
- Compliance packet export includes SHA-256 packet hash header

## Remaining hardening
- Enforce hardware-backed secure storage plugin in production mobile builds
- Add signature intent challenge and second-factor for regulated tenants
- Add signed packet zip format with detached signature manifest
- Add anti-replay nonce for queued offline mutations

