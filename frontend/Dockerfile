# ---------- Build Stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# install deps with cache leverage
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

# copy source and shared type assets
COPY frontend ./
COPY backend/shared ../backend/shared
COPY shared ../shared

ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_SOCKET_PATH=/socket.io
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_SOCKET_PATH=$VITE_SOCKET_PATH

RUN npm run build

# ---------- Production Stage ----------
FROM nginx:1.27-alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
