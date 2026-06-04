# ── Stage 1: Build (compile native modules) ────────────────────────────────
FROM node:20-alpine AS builder

# Install build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy compiled node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy app source
COPY . .

# Create persistent data directories
RUN mkdir -p /data/uploads/reports /data/uploads/temp

# Symlink uploads and db into /data so they survive container restarts
RUN rm -rf uploads && ln -s /data/uploads uploads

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
