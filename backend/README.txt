Validation middleware fix

Files included:
- backend/types/http.ts
- backend/types/express-user.d.ts
- backend/middleware/validationMiddleware.ts
- backend/tsconfig.json (ensures **/*.d.ts is included)

How to apply:
1) Copy the files into your project's backend folder, preserving the paths.
2) In VS Code, open the folder as 'backend' (lowercase) and run: "TypeScript: Restart TS Server".
3) Run: npx tsc -p .  then  npm run dev.
