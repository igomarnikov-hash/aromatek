# === Stage 1: Build frontend ===
FROM node:20-alpine AS frontend-build

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm install --silent
COPY frontend/ ./
RUN npm run build

# === Stage 2: Production ===
FROM node:20-alpine

RUN apk add --no-cache curl tini

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production --silent

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-build /build/frontend/dist ./frontend/dist

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R node:node /app/data

# Non-root user
USER node

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/aromapro.db

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fs http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/server.js"]
