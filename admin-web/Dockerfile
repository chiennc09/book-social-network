# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm ci --no-audit --prefer-offline

# Copy source
COPY . .

# Build args → Vite env vars (injected at BUILD time, baked into static bundle)
ARG VITE_API_GATEWAY_URL=http://localhost:8888
ARG VITE_MINIO_PUBLIC_URL=http://localhost:9000
ARG VITE_MINIO_BUCKET=book-social-network

ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL
ENV VITE_MINIO_PUBLIC_URL=$VITE_MINIO_PUBLIC_URL
ENV VITE_MINIO_BUCKET=$VITE_MINIO_BUCKET

RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our optimised nginx config
COPY nginx.conf /etc/nginx/conf.d/admin.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
