TenantId type fix for AssetController

Files:
  - backend/types/http.ts                     (RequestUser now includes tenantId)
  - backend/types/express-user.d.ts          (Express.User now includes tenantId; Request also exposes tenantId/siteId)
  - backend/tsconfig.json                     (ensures **/*.d.ts is included)

How to apply:
  1) Drop these files into your project's backend folder, preserving paths.
  2) In VS Code: Command Palette → "TypeScript: Restart TS Server".
  3) Rebuild: npx tsc -p .
  4) Run: npm run dev

Notes:
  - If your project already has a tsconfig, just ensure it includes "**/*.d.ts".
  - Remove siteId from the augmentation if you don't use it.
