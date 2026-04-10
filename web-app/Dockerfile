# ─── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Cache npm dependencies
COPY package*.json ./
RUN npm ci --silent

# Build production bundle
COPY . .
RUN npm run build

# ─── Runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx static content
RUN rm -rf ./*

# Copy Vite production build
COPY --from=build /app/dist .

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
