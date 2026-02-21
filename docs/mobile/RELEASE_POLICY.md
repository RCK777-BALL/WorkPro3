# Mobile Release Policy

## Channels
- iOS: TestFlight (internal) -> App Store (production)
- Android: Internal testing track -> Play Store (production)

## Versioning
- Use semantic versioning: `MAJOR.MINOR.PATCH`
- Build number increments every CI release run.

## Release gates
- frontend typecheck and build must pass.
- backend typecheck and build must pass.
- Mobile smoke flow must pass:
  - login
  - open work order list
  - open work order detail
  - sync queue update

## Security controls
- Native shells use secure auth token storage paths, not plain `localStorage`.
- Biometric unlock is required on native mobile shell entry.

## Required release notes
- New features and fixes
- Breaking changes
- Security changes
- Known issues and rollback plan

