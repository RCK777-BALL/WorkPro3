# ---------- Build Stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies with maximum cache reuse
COPY backend/package*.json ./backend/
COPY backend/tsconfig*.json ./backend/
WORKDIR /app/backend
RUN npm ci

# Copy the full backend source (node_modules excluded via .dockerignore)
WORKDIR /app
COPY backend ./backend
COPY shared ./shared

WORKDIR /app/backend
RUN npm run build
RUN npm prune --omit=dev

# ---------- Production Stage ----------
FROM node:20-alpine

WORKDIR /app

# Copy compiled output and node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY backend/package*.json ./

EXPOSE 5010
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://127.0.0.1:5010/health || exit 1
CMD ["node", "dist/backend/server.js"]
