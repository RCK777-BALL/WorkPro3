WORKPRO3 Frontend – UI Fix (v2)
==================================

Files provided:
- index.html
- src/main.tsx
- src/App.tsx
- src/components/layout/AppShell.tsx
- src/pages/Dashboard.tsx
- src/pages/Departments.tsx
- src/index.css
- postcss.config.js   (uses @tailwindcss/postcss)
- tailwind.config.ts
- vite.config.ts
- src/lib/http.ts     (shared axios client with auth headers + 401 redirect)
- src/api/departments.ts (safe list call, returns [] if API down)

Install (once):
----------------
npm i react-router-dom axios
npm i -D @vitejs/plugin-react tailwindcss @tailwindcss/postcss postcss autoprefixer

Run:
----
npm run dev

Notes:
------
- Ensure you do NOT have duplicate dependencies in package.json. Remove dupes and run `npm i`.
- If your API URL differs, add a `.env.local` with: VITE_API_URL=http://localhost:5010/api
- Replace the placeholder pages with your real content incrementally.
