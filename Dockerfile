# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build argument for proxy URL (defaults to production proxy)
ARG VITE_API_PROXY_URL=https://recoverylm-proxy-627579746441.us-central1.run.app
ENV VITE_API_PROXY_URL=$VITE_API_PROXY_URL

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 8080 (Cloud Run expects this)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
