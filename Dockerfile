FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Copy all source files
COPY . .

# Install backend dependencies
RUN cd backend && rm -f package-lock.json && npm install --production --omit=optional

# Build frontend (skip platform-specific optional native binaries)
RUN cd frontend && rm -f package-lock.json && npm install --omit=optional && npm run build && cp -r dist /app/dist

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "backend/server.js"]
