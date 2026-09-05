# ==========================================
# Stage 1: Build & Dependency Installation
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci --only=production

# ==========================================
# Stage 2: Production Minimal Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set non-root environment & node env
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy source code and assets
COPY src/ ./src/
COPY public/ ./public/
COPY init-scripts/ ./init-scripts/

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]
