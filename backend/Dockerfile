# Build stage
FROM node:18.20.4-alpine3.19@sha256:9260fb63ba9120506b517be07630b74c6e149f0533148a5543dacc409a07f9b1 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

# Production stage
FROM node:18.20.4-alpine3.19@sha256:9260fb63ba9120506b517be07630b74c6e149f0533148a5543dacc409a07f9b1
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
EXPOSE 5010
CMD ["node", "dist/backend/server.js"]
